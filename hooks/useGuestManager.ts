import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../contexts/UserProvider';
import { Guest, Flag, FilterType, ArrivalSession, RoomMove } from '../types';
import { PDFService } from '../services/pdfService';
import { GeminiService } from '../services/geminiService';
import { ExcelService } from '../services/excelService';
import { BATCH_SIZE } from '../constants';
import {
  initializeFirebase,
  isFirebaseEnabled,
  subscribeToAllSessions,
  subscribeToConnectionState,
  keepAlive,
  fetchSession,
  syncSession,
  updateGuestFields,
  trackPresence,
  deleteSessionFromFirebase,
  forceReconnect,
  hardReconnect,
  nuclearReconnect,
  isReconnecting
} from '../services/firebaseService';
import {
  isPMSConfigured,
  getArrivals as getPMSArrivals,
  getRefreshInterval
} from '../services/pmsService';

// Connection status type
export type ConnectionStatus = 'connected' | 'connecting' | 'offline';

// Data source type
export type DataSource = 'pdf' | 'pms';

// Helper to get session ID from URL
const getSessionIdFromURL = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('session');
};

// Helper to update URL with session ID (without page reload)
const updateURLWithSession = (sessionId: string) => {
  if (sessionId) {
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);
    window.history.replaceState({}, '', url.toString());
  }
};

/**
 * Smart merge: remote Firebase sessions are the source of truth, but we protect
 * any guest that has an in-flight local atomic write (pendingIds) from being
 * overwritten before the write round-trips.
 *
 * For non-pending guests, remote always wins (since it may contain other
 * devices' changes). This ensures deletions propagate and data stays consistent.
 */
function mergeRemoteSessions(
  localSessions: ArrivalSession[],
  remoteSessions: ArrivalSession[],
  pendingIds: Set<string>
): ArrivalSession[] {
  if (pendingIds.size === 0) {
    // No pending writes — remote wins entirely (fast path)
    return remoteSessions;
  }

  return remoteSessions.map(remoteSession => {
    const localSession = localSessions.find(s => s.id === remoteSession.id);
    if (!localSession) return remoteSession; // new session from another device

    // Merge guests: remote wins unless guest has pending local write
    const mergedGuests = remoteSession.guests.map(remoteGuest => {
      if (pendingIds.has(remoteGuest.id)) {
        // This guest has a pending local write — keep local version
        const localGuest = localSession.guests.find(g => g.id === remoteGuest.id);
        return localGuest || remoteGuest;
      }
      return remoteGuest; // remote wins
    });

    return { ...remoteSession, guests: mergedGuests };
  });
}

export const useGuestManager = (initialFlags: Flag[]) => {
  // User context
  const { userName } = useUser();
  // Check URL for shared session ID first
  const urlSessionId = getSessionIdFromURL();

  // 1. Initialize from LocalStorage
  const [sessions, setSessions] = useState<ArrivalSession[]>(() => {
    try {
      const saved = localStorage.getItem('gilpin_sessions_v5');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    // Priority: URL session ID > localStorage > empty
    if (urlSessionId) {
      console.log('📱 Joining shared session from URL:', urlSessionId);
      return urlSessionId;
    }
    return localStorage.getItem('gilpin_active_id_v5') || "";
  });

  // Firebase state
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline');
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const keepaliveCleanupRef = useRef<(() => void) | null>(null);
  const connectionCleanupRef = useRef<(() => void) | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track guest IDs with in-flight local writes to avoid clobbering them with remote data
  const pendingLocalUpdates = useRef<Set<string>>(new Set());
  // Generation counter: bumped on every remote update. Persistence effect
  // checks this to skip localStorage writes triggered by remote data.
  const remoteUpdateGen = useRef(0);
  const lastPersistedGen = useRef(0);
  // Timestamp of last data received from Firebase — used to detect stale subscriptions
  const lastRemoteDataTs = useRef(Date.now()); // Init to now to prevent stale watchdog false-positive
  // Track active session ID in a ref so reconnect callbacks always have the latest value
  const activeSessionIdRef = useRef(activeSessionId);
  // Stale subscription watchdog interval ref
  const staleWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Reconnect debounce ref (shared between auto and manual)
  const lastReconnectTsRef = useRef(0);

  // PMS state
  const [dataSource, setDataSource] = useState<DataSource>(() => {
    const saved = localStorage.getItem('gilpin_data_source');
    return (saved === 'pms' && isPMSConfigured()) ? 'pms' : 'pdf';
  });
  const [pmsRefreshEnabled, setPMSRefreshEnabled] = useState(false);
  const pmsRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 2. Computed
  const activeSession = useMemo(() =>
    sessions.find(s => s.id === activeSessionId) || (sessions.length > 0 ? sessions[0] : null)
    , [sessions, activeSessionId]);

  const guests = useMemo(() => activeSession?.guests || [], [activeSession]);

  const arrivalDateStr = useMemo(() =>
    activeSession ? (activeSession.label || activeSession.id) : "No Selection"
    , [activeSession]);

  const isOldFile = useMemo(() => {
    if (!activeSession?.dateObj) return false;
    const fileDate = new Date(activeSession.dateObj);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return fileDate < today;
  }, [activeSession]);

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [auditPhase, setAuditPhase] = useState<'parsing' | 'auditing' | 'applying' | 'complete' | undefined>(undefined);
  const [auditGuestNames, setAuditGuestNames] = useState<string[]>([]);

  // ETA Validation helper
  const validateETA = (eta: string): { valid: boolean; formatted: string } => {
    const cleaned = eta.replace(/[^0-9:]/g, '');
    const match = cleaned.match(/^(\d{1,2}):?(\d{2})$/);
    if (!match) return { valid: false, formatted: eta };
    const hours = parseInt(match[1]);
    const mins = parseInt(match[2]);
    if (hours < 0 || hours > 23 || mins < 0 || mins > 59) {
      return { valid: false, formatted: eta };
    }
    return { valid: true, formatted: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}` };
  };

  // Keep activeSessionIdRef in sync
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // 3. Initialize Firebase + Connection State Monitor
  useEffect(() => {
    setConnectionStatus('connecting');
    const enabled = initializeFirebase();
    setFirebaseEnabled(enabled);

    if (!enabled) {
      setConnectionStatus('offline');
      console.log('📱 Running in offline mode (localStorage only)');
      return;
    }

    console.log('🔥 Firebase real-time sync enabled');

    // If we joined via URL and don't have this session locally, fetch it from Firebase
    if (urlSessionId) {
      const hasSessionLocally = sessions.some(s => s.id === urlSessionId);
      if (!hasSessionLocally) {
        console.log('📱 Joining shared session - fetching from Firebase:', urlSessionId);
        fetchSession(urlSessionId, (remoteSession) => {
          if (remoteSession) {
            console.log('✅ Loaded shared session:', remoteSession.label, '-', remoteSession.guests?.length, 'guests');
            setSessions(prev => {
              if (prev.some(s => s.id === urlSessionId)) return prev;
              return [...prev, remoteSession];
            });
            setActiveSessionId(urlSessionId);
          } else {
            console.log('📭 Shared session not found in Firebase, creating placeholder');
            setSessions(prev => {
              if (prev.some(s => s.id === urlSessionId)) return prev;
              return [...prev, {
                id: urlSessionId,
                label: 'Loading shared session...',
                dateObj: new Date().toISOString(),
                guests: [],
                lastModified: Date.now()
              }];
            });
          }
        });
      }
    }

    // === CONNECTION STATE MONITOR ===
    // Firebase's .info/connected is the authoritative source.
    // On reconnect, step 4's existing onValue listener auto-resyncs data.
    // We only manage the UI status indicator here.
    connectionCleanupRef.current = subscribeToConnectionState((connected) => {
      if (connected) {
        setConnectionStatus('connected');
        console.log('🔄 Firebase connected');
      } else {
        setConnectionStatus('connecting');
        console.log('⚠️ Firebase disconnected — will auto-reconnect...');
      }
    });

    // Shared reconnect + resubscribe logic. Debounced to avoid duplicate
    // triggers when multiple lifecycle events fire together (e.g., both
    // visibilitychange and focus fire on iOS unlock).
    let lastReconnectTs = 0;
    const reconnectAndResubscribe = (bypassDebounce = false) => {
      if (isReconnecting()) {
        console.log('🔄 Reconnect skipped — nuclear reconnect in progress');
        return;
      }
      const now = Date.now();
      if (!bypassDebounce && now - lastReconnectTs < 5000) {
        console.log('🔄 Reconnect skipped (debounce, last was', now - lastReconnectTs, 'ms ago)');
        return; // Already reconnected recently
      }
      lastReconnectTs = now;
      lastReconnectTsRef.current = now;

      console.log('📱 Reconnecting Firebase + resubscribing...');
      forceReconnect();

      // ALWAYS tear down and re-subscribe. Mobile browsers kill WebSockets
      // on screen lock/tab switch, leaving the onValue listener permanently dead.
      setTimeout(() => {
        console.log('🔄 Re-subscribing to Firebase after background return...');
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        unsubscribeRef.current = subscribeToAllSessions((remoteSessions) => {
          lastRemoteDataTs.current = Date.now();
          remoteUpdateGen.current += 1;
          setSessions(prev => mergeRemoteSessions(prev, remoteSessions, pendingLocalUpdates.current));
          setActiveSessionId(prev => {
            if (remoteSessions.length === 0) return '';
            if (prev && remoteSessions.some(s => s.id === prev)) return prev;
            return remoteSessions[0].id;
          });
        });
      }, 500); // Wait for goOffline→goOnline cycle (100ms + generous margin)
    };

    // === EVENT HANDLERS ===
    // Multiple events for maximum mobile coverage:
    // - visibilitychange: Standard API, fires on most tab switches
    // - pageshow: Fires when iOS restores page from bfcache (back-forward cache)
    // - focus: Fires on window focus, catches some cases visibilitychange misses
    // - online: Fires when network comes back

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 visibilitychange → visible');
        reconnectAndResubscribe();
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      // persisted = true means page was restored from bfcache (common on iOS Safari)
      if (e.persisted) {
        console.log('📱 pageshow → restored from bfcache');
        reconnectAndResubscribe();
      }
    };

    const handleFocus = () => {
      console.log('📱 window focus');
      reconnectAndResubscribe();
    };

    const handleOnline = () => {
      console.log('🌐 Browser came back online — forcing Firebase reconnect');
      reconnectAndResubscribe();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // === STALE SUBSCRIPTION WATCHDOG ===
    // If no remote data received for 60s while we think we're connected,
    // force a reconnect. Catches cases where the WebSocket silently dies.
    staleWatchdogRef.current = setInterval(() => {
      const lastData = lastRemoteDataTs.current;
      if (lastData > 0 && Date.now() - lastData > 60000) {
        console.warn('🐕 Stale subscription watchdog: no data for 60s — forcing reconnect');
        reconnectAndResubscribe(true); // bypass debounce
      }
    }, 30000); // Check every 30s

    return () => {
      if (connectionCleanupRef.current) {
        connectionCleanupRef.current();
      }
      if (staleWatchdogRef.current) {
        clearInterval(staleWatchdogRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // 4. Subscribe to ALL session updates from Firebase (multi-day sync)
  useEffect(() => {
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!firebaseEnabled) return;

    // Subscribe to ALL sessions — every day uploaded by any device
    unsubscribeRef.current = subscribeToAllSessions((remoteSessions) => {
      // Track when we last received remote data (for stale subscription detection)
      lastRemoteDataTs.current = Date.now();
      // Bump generation counter — the persistence effect uses this to skip
      // localStorage writes triggered by remote Firebase updates
      remoteUpdateGen.current += 1;

      // Smart merge: remote data is source of truth, but protect guests with
      // pending local writes (their atomic update hasn't round-tripped yet)
      setSessions(prev => mergeRemoteSessions(prev, remoteSessions, pendingLocalUpdates.current));

      // Auto-set active session, or clear if all deleted
      setActiveSessionId(prev => {
        if (remoteSessions.length === 0) return '';
        if (prev && remoteSessions.some(s => s.id === prev)) return prev;
        return remoteSessions[0].id;
      });
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [firebaseEnabled]);

  // 4b. Track presence + keepalive in active session
  useEffect(() => {
    // Clean up previous presence & keepalive
    if (presenceCleanupRef.current) {
      presenceCleanupRef.current();
      presenceCleanupRef.current = null;
    }
    if (keepaliveCleanupRef.current) {
      keepaliveCleanupRef.current();
      keepaliveCleanupRef.current = null;
    }

    if (!firebaseEnabled || !activeSessionId) return;

    // Generate a unique device ID
    let deviceId = localStorage.getItem('gilpin_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('gilpin_device_id', deviceId);
    }

    presenceCleanupRef.current = trackPresence(activeSessionId, deviceId, userName);
    keepaliveCleanupRef.current = keepAlive(activeSessionId, deviceId);

    return () => {
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
      }
      if (keepaliveCleanupRef.current) {
        keepaliveCleanupRef.current();
      }
    };
  }, [firebaseEnabled, activeSessionId, userName]);

  // 5. Sync initial uploads to Firebase (full session push)
  // This is used for PDF uploads, PMS imports, new session creation, and AI Audit.
  // For field-level changes (status updates, notes, etc.), use atomicUpdateGuest().
  // @param forceWrite — bypass the last-write-wins guard (for truly new data like PDF/PMS imports)
  const syncInitialUpload = useCallback((session: ArrivalSession, forceWrite = false) => {
    if (!firebaseEnabled) return;

    // Debounce to coalesce rapid initial setup writes
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await syncSession(session, forceWrite);
        console.log('✅ Initial sync to Firebase:', session.label, forceWrite ? '(forced)' : '(guarded)');
      } catch (error) {
        console.error('❌ Firebase initial sync failed:', error);
      }
    }, 150);
  }, [firebaseEnabled]);

  // 6. Persistence (localStorage only — Firebase sync happens via atomic writes)
  // GUARDED: Skip localStorage writes when the state change was triggered by
  // a remote Firebase update (remoteUpdateGen > lastPersistedGen).  This avoids
  // expensive JSON.stringify + I/O on every remote tick and prevents echo loops.
  useEffect(() => {
    // Always update URL (cheap)
    if (activeSessionId) {
      updateURLWithSession(activeSessionId);
    }

    // Skip localStorage write if this render was caused by a remote update
    if (remoteUpdateGen.current > lastPersistedGen.current) {
      lastPersistedGen.current = remoteUpdateGen.current;
      console.log('[Sync] Skipping localStorage write — remote update');
      return;
    }

    if (sessions.length > 0) {
      localStorage.setItem('gilpin_sessions_v5', JSON.stringify(sessions));
      localStorage.setItem('gilpin_active_id_v5', activeSessionId);
    } else {
      localStorage.removeItem('gilpin_sessions_v5');
      localStorage.removeItem('gilpin_active_id_v5');
    }
  }, [sessions, activeSessionId, activeSession]);

  // 7. Actions

  // Robust Synchronous Delete — removes from local state AND Firebase
  const deleteSession = (idToDelete: string) => {
    let nextSessions = sessions.filter(s => s.id !== idToDelete);
    let nextActiveId = activeSessionId;

    if (nextSessions.length === 0) {
      // ALLOW EMPTY STATE: If all sessions are deleted, we return to 0 tabs
      nextActiveId = "";
      // Clean URL when no sessions remain
      window.history.replaceState({}, '', window.location.pathname);
    } else if (idToDelete === activeSessionId) {
      // If we deleted the active one, find neighbor
      const deletedIndex = sessions.findIndex(s => s.id === idToDelete);
      const newIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
      nextActiveId = nextSessions[newIndex].id;
    }

    setSessions(nextSessions);
    setActiveSessionId(nextActiveId);

    // Also delete from Firebase so other devices see the removal
    if (firebaseEnabled) {
      deleteSessionFromFirebase(idToDelete).catch(err => {
        console.error('Firebase delete failed (local already removed):', err);
      });
    }
  };

  const createNewSession = () => {
    const id = `MAN-${Date.now()}`;
    const newSession: ArrivalSession = {
      id,
      label: `New List ${new Date().toLocaleDateString('en-GB')}`,
      dateObj: new Date().toISOString(),
      guests: [],
      lastModified: Date.now()
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(id);
    syncInitialUpload(newSession, true); // New session — always force write
  };

  // Load arrivals from PMS API
  const loadFromPMS = async (date?: Date) => {
    const targetDate = date || new Date();
    setIsProcessing(true);
    setProgressMsg('Fetching arrivals from PMS...');

    try {
      const pmsGuests = await getPMSArrivals(targetDate, !isPMSConfigured());

      if (pmsGuests.length > 0) {
        const id = `PMS-${targetDate.toISOString().split('T')[0]}`;
        const label = targetDate.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        // Check if session already exists for this date
        const existingSession = sessions.find(s => s.id === id);

        const pmsSession: ArrivalSession = {
          id,
          label,
          dateObj: targetDate.toISOString(),
          guests: pmsGuests,
          lastModified: Date.now()
        };

        if (existingSession) {
          setSessions(prev => prev.map(s => s.id === id ? pmsSession : s));
        } else {
          setSessions(prev => [...prev, pmsSession]);
        }

        setActiveSessionId(id);
        syncInitialUpload(pmsSession, true); // PMS import — always force write
        setProgressMsg(`Loaded ${pmsGuests.length} arrivals from PMS`);
      } else {
        setProgressMsg('No arrivals found for this date');
      }
    } catch (error) {
      console.error('PMS load error:', error);
      setProgressMsg('Failed to load from PMS. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle data source
  const toggleDataSource = (source: DataSource) => {
    setDataSource(source);
    localStorage.setItem('gilpin_data_source', source);
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setProgressMsg("ANALYSING FILE...");
    try {
      const result = await PDFService.parse(file, initialFlags);
      const sessionId = result.arrivalDateStr.trim();

      setSessions(prev => {
        const existingIdx = prev.findIndex(s => s.id === sessionId);

        const newSessionData: ArrivalSession = {
          id: sessionId,
          label: result.arrivalDateStr,
          dateObj: result.arrivalDateObj ? result.arrivalDateObj.toISOString() : new Date().toISOString(),
          guests: result.guests,
          lastModified: Date.now()
        };

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = newSessionData;
          return updated;
        }

        if (prev.length === 1 && prev[0].guests.length === 0 && prev[0].id.startsWith("MAN-")) {
          return [newSessionData];
        }

        const newList = [...prev, newSessionData];
        return newList.sort((a, b) => new Date(a.dateObj).getTime() - new Date(b.dateObj).getTime());
      });

      setActiveSessionId(sessionId);

      // Push entire session to Firebase (this is an initial upload, not a field-level change)
      const newSessionData: ArrivalSession = {
        id: sessionId,
        label: result.arrivalDateStr,
        dateObj: result.arrivalDateObj ? result.arrivalDateObj.toISOString() : new Date().toISOString(),
        guests: result.guests,
        lastModified: Date.now()
      };
      syncInitialUpload(newSessionData, true); // PDF upload — always force write
    } catch (err) {
      console.error(err);
      alert("Error parsing PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateActiveSessionGuests = (newGuests: Guest[]) => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, guests: newGuests, lastModified: Date.now() } : s));
  };

  const updateGuest = (id: string, updates: Partial<Guest>) => {
    // Build the final update (including room move tracking)
    let finalUpdates = { ...updates };
    const existingGuest = guests.find(g => g.id === id);

    if (existingGuest && updates.room && updates.room !== existingGuest.room && existingGuest.room.trim() !== '') {
      const roomMove: RoomMove = {
        id: `move_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: Date.now(),
        fromRoom: existingGuest.room,
        toRoom: updates.room,
        movedBy: updates.lastStatusUpdatedBy || 'User',
      };
      const existingMoves = existingGuest.roomMoves || [];
      finalUpdates = {
        ...updates,
        previousRoom: existingGuest.room,
        roomMoves: [...existingMoves, roomMove],
      };
    }

    // 1. Optimistic local update (instant UI)
    updateActiveSessionGuests(guests.map(g =>
      g.id === id ? { ...g, ...finalUpdates } : g
    ));

    // 2. Atomic Firebase update (cross-device sync without full-session overwrite)
    if (firebaseEnabled && activeSessionId) {
      pendingLocalUpdates.current.add(id);
      updateGuestFields(activeSessionId, id, finalUpdates)
        .catch(err => console.error('Atomic sync failed for guest', id, err))
        .finally(() => {
          // Clear pending flag after write confirms (or fails)
          pendingLocalUpdates.current.delete(id);
        });
    }
  };

  const deleteGuest = (id: string) => {
    const newGuests = guests.filter(g => g.id !== id);
    updateActiveSessionGuests(newGuests);
    // Structural change (removal) — sync full active session
    if (firebaseEnabled && activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        syncInitialUpload({ ...session, guests: newGuests, lastModified: Date.now() });
      }
    }
  };

  const addManual = () => {
    const id = "MAN-" + Date.now();
    const g: Guest = {
      id,
      room: "TBD",
      name: "New Guest",
      car: "",
      ll: "No",
      eta: "14:00",
      duration: "1",
      facilities: "",
      prefillNotes: "",
      inRoomItems: "",
      preferences: "",
      rawHtml: "Manual Entry",
      isManual: true
    };

    if (sessions.length === 0 || !activeSessionId) {
      const newId = `MAN-${Date.now()}`;
      const newSession: ArrivalSession = {
        id: newId,
        label: "New List",
        dateObj: new Date().toISOString(),
        guests: [g],
        lastModified: Date.now()
      };
      setSessions([newSession]);
      setActiveSessionId(newId);
      syncInitialUpload(newSession, true); // New session from addManual — always force write
    } else {
      const newGuests = [g, ...guests];
      updateActiveSessionGuests(newGuests);
      // Structural change (addition) — sync full active session
      if (firebaseEnabled && activeSessionId) {
        const session = sessions.find(s => s.id === activeSessionId);
        if (session) {
          syncInitialUpload({ ...session, guests: newGuests, lastModified: Date.now() });
        }
      }
    }
  };

  const duplicateGuest = (guestId: string) => {
    const original = guests.find(g => g.id === guestId);
    if (!original) return;
    const newGuest: Guest = {
      ...original,
      id: `DUP-${Date.now()}`,
      room: 'TBD',
      isManual: true
    };
    const newGuests = [newGuest, ...guests];
    updateActiveSessionGuests(newGuests);
    // Structural change (addition) — sync full active session
    if (firebaseEnabled && activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        syncInitialUpload({ ...session, guests: newGuests, lastModified: Date.now() });
      }
    }
  };

  const handleAIRefine = async () => {
    if (guests.length === 0) return;
    setIsProcessing(true);
    setAuditPhase('parsing');
    setProgressMsg("PREPARING DATA...");
    setAuditGuestNames(guests.map(g => g.name));
    setCurrentBatch(0);
    const batch = guests;
    const chunks = [];
    for (let i = 0; i < batch.length; i += BATCH_SIZE) chunks.push(batch.slice(i, i + BATCH_SIZE));
    setTotalBatches(chunks.length);

    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentBatchGuests = chunks[i];
        setCurrentBatch(i + 1);
        setAuditPhase('auditing');
        setProgressMsg(`AUDITING: ${i + 1}/${chunks.length}...`);
        setAuditGuestNames(currentBatchGuests.map(g => g.name));

        let refinements = await GeminiService.refineGuestBatch(currentBatchGuests, ['notes', 'facilities', 'car']);
        // Enhanced retry: 3 attempts with exponential backoff
        let retries = 0;
        while (!refinements && retries < 3) {
          retries++;
          const delay = 2000 * Math.pow(2, retries - 1); // 2s, 4s, 8s
          console.warn(`[AI Audit] Retry ${retries}/3 in ${delay / 1000}s...`);
          setProgressMsg(`RETRY ${retries}/3...`);
          await new Promise(r => setTimeout(r, delay));
          refinements = await GeminiService.refineGuestBatch(currentBatchGuests, ['notes', 'facilities', 'car']);
        }

        if (refinements) {
          setAuditPhase('applying');
          setProgressMsg('APPLYING RESULTS...');
          console.log('[AI Audit] Got refinements:', refinements.length, 'results');
          console.log('[AI Audit] Sample refinement:', JSON.stringify(refinements[0], null, 2));

          // Track the updated session so we can sync to Firebase after setState
          let updatedSessionForSync: ArrivalSession | null = null;

          setSessions(prev => prev.map(s => {
            if (s.id !== activeSessionId) return s;
            const updatedGuests = [...s.guests];
            currentBatchGuests.forEach((original, idx) => {
              const ref = refinements[idx];
              if (ref) {
                const gIndex = updatedGuests.findIndex(g => g.id === original.id);
                console.log('[AI Audit] Applying to guest', original.name, '- notes:', ref.notes?.substring(0, 50));
                if (gIndex !== -1) {
                  // Validate/correct package name based on rate code
                  const rateCode = original.rateCode?.toUpperCase() || '';
                  let correctedPackage = ref.packages;

                  // Code-level package mapping for reliability
                  if (rateCode.includes('WIN')) {
                    correctedPackage = '❄️ Winter Offer';
                  } else if (rateCode.match(/^BB_?\d?$/i) || rateCode.match(/^BB[123]$/i)) {
                    correctedPackage = 'Bed & Breakfast';
                  } else if (rateCode.match(/^LHBB/i)) {
                    correctedPackage = 'Bed & Breakfast (Lake House)';
                  } else if (rateCode.match(/^RO/i)) {
                    correctedPackage = 'Room Only';
                  } else if (rateCode.match(/^DBB/i)) {
                    correctedPackage = 'Dinner, Bed & Breakfast';
                  } else if (rateCode.match(/^MINI|MINIMOON/i)) {
                    correctedPackage = '🌙 Mini Moon';
                  } else if (rateCode.match(/^MAGESC|MAG_ESC/i)) {
                    correctedPackage = '✨ Magical Escape';
                  } else if (rateCode.match(/^CEL/i)) {
                    correctedPackage = '🎉 Celebration';
                  } else if (rateCode.match(/^POB|STAFF/i)) {
                    correctedPackage = 'Pride of Britain Staff';
                  } else if (rateCode.match(/^APR|ADV|LHAPR/i)) {
                    correctedPackage = '💳 Advanced Purchase';
                  }

                  if (correctedPackage !== ref.packages) {
                    console.log('[AI Audit] Corrected package from', ref.packages, 'to', correctedPackage, 'based on rate code', rateCode);
                  }

                  updatedGuests[gIndex] = {
                    ...updatedGuests[gIndex],
                    prefillNotes: ref.notes || updatedGuests[gIndex].prefillNotes,
                    facilities: ref.facilities || updatedGuests[gIndex].facilities,
                    inRoomItems: ref.inRoomItems || updatedGuests[gIndex].inRoomItems,
                    preferences: ref.preferences || updatedGuests[gIndex].preferences,
                    packageName: correctedPackage || updatedGuests[gIndex].packageName,
                    ll: ref.history || updatedGuests[gIndex].ll,
                    // AI car only fills in if regex parser didn't find one
                    car: updatedGuests[gIndex].car || ref.car || updatedGuests[gIndex].car,
                    // Housekeeping intelligence (allergies, dietary, room prep)
                    hkNotes: ref.hkNotes || updatedGuests[gIndex].hkNotes || '',
                  };
                }
              } else {
                console.warn('[AI Audit] No refinement for guest', original.name, 'at index', idx);
              }
            });
            const updated = { ...s, guests: updatedGuests, lastModified: Date.now(), aiAuditedAt: Date.now() };
            // Capture the UPDATED session for Firebase sync (avoids stale closure)
            updatedSessionForSync = updated;
            return updated;
          }));

          // Sync the updated session to Firebase (uses the data captured inside
          // setSessions, NOT the stale `sessions` closure)
          if (firebaseEnabled && activeSessionId && updatedSessionForSync) {
            syncInitialUpload(updatedSessionForSync);
          }
        } else {
          console.error('[AI Audit] No refinements returned from AI service');
        }

        console.log("Batch complete, cooling down...");
        // INCREASED DELAY: 2000ms to prevent Rate Limiting
        await new Promise(r => setTimeout(r, 2000));
      }
    } finally {
      setAuditPhase('complete');
      setProgressMsg('COMPLETE');
      // Brief flash of complete phase before hiding
      await new Promise(r => setTimeout(r, 600));
      setIsProcessing(false);
      setCurrentBatch(0);
      setTotalBatches(0);
      setAuditPhase(undefined);
      setAuditGuestNames([]);
    }
  };

  const filteredGuests = useMemo(() => guests.filter(g => {
    if (activeFilter === 'all') return true;
    const rNum = parseInt(g.room.split(' ')[0]);
    if (activeFilter === 'main') return rNum > 0 && rNum <= 31;
    if (activeFilter === 'lake') return rNum >= 51 && rNum <= 58;
    if (activeFilter === 'vip') return g.prefillNotes.includes('⭐') || g.prefillNotes.includes('VIP') || g.packageName === 'POB_STAFF';
    if (activeFilter === 'allergy') return ['⚠️', '🥛', '🥜', '🍞', '🧀'].some(e => g.prefillNotes.includes(e));
    if (activeFilter === 'return') return g.ll.toLowerCase().includes('yes');
    return true;
  }), [guests, activeFilter]);

  // Share session - copies URL with session ID to clipboard
  const shareSession = useCallback(async (): Promise<string> => {
    if (!activeSessionId) {
      console.warn('No active session to share');
      return '';
    }

    const url = new URL(window.location.href);
    url.searchParams.set('session', activeSessionId);
    const shareUrl = url.toString();

    try {
      await navigator.clipboard.writeText(shareUrl);
      console.log('📋 Session URL copied:', shareUrl);
    } catch (e) {
      console.log('📋 Share URL:', shareUrl);
    }

    return shareUrl;
  }, [activeSessionId]);

  // Get current share URL (for QR code, etc.)
  const getShareUrl = useCallback((): string => {
    if (!activeSessionId) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('session', activeSessionId);
    return url.toString();
  }, [activeSessionId]);

  // Join an existing session from Firebase (used by SessionBrowser)
  const joinSession = useCallback((session: ArrivalSession) => {
    console.log('📱 Joining session:', session.id, session.label);
    setSessions(prev => {
      // Don't duplicate if already exists
      if (prev.some(s => s.id === session.id)) {
        return prev.map(s => s.id === session.id ? session : s);
      }
      return [...prev, session];
    });
    setActiveSessionId(session.id);
    updateURLWithSession(session.id);
  }, []);

  // ── Session lock/unlock ─────────────────────────────────────────────────
  const isSessionLocked = useMemo(() => {
    return !!(activeSession?.lockedAt);
  }, [activeSession]);

  const lockSession = useCallback(() => {
    if (!activeSessionId) return;
    const now = Date.now();
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      return { ...s, lockedAt: now, lockedBy: 'User', lastModified: now };
    }));
    // Sync lock state to Firebase
    if (firebaseEnabled) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        syncInitialUpload({ ...session, lockedAt: now, lockedBy: 'User', lastModified: now }, true);
      }
    }
    console.log('🔒 Session locked:', activeSessionId);
  }, [activeSessionId, firebaseEnabled, sessions, syncInitialUpload]);

  const unlockSession = useCallback(() => {
    if (!activeSessionId) return;
    const now = Date.now();
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const { lockedAt, lockedBy, ...rest } = s;
      return { ...rest, lockedAt: undefined, lockedBy: undefined, lastModified: now };
    }));
    // Sync unlock state to Firebase
    if (firebaseEnabled) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        const { lockedAt, lockedBy, ...rest } = session;
        syncInitialUpload({ ...rest, lockedAt: undefined, lockedBy: undefined, lastModified: now }, true);
      }
    }
    console.log('🔓 Session unlocked:', activeSessionId);
  }, [activeSessionId, firebaseEnabled, sessions, syncInitialUpload]);

  // ── Manual reconnect (nuclear — full SDK teardown) ──────────────────────
  const manualReconnect = useCallback(async () => {
    console.log('🔄 Manual reconnect triggered by user — going nuclear');
    setConnectionStatus('connecting');

    // 1. Tear down ALL listeners, intervals, and cleanups BEFORE nuclear
    //    This prevents them from accessing null db during teardown.
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (connectionCleanupRef.current) {
      connectionCleanupRef.current();
      connectionCleanupRef.current = null;
    }
    if (keepaliveCleanupRef.current) {
      keepaliveCleanupRef.current();
      keepaliveCleanupRef.current = null;
    }
    if (presenceCleanupRef.current) {
      presenceCleanupRef.current();
      presenceCleanupRef.current = null;
    }
    if (staleWatchdogRef.current) {
      clearInterval(staleWatchdogRef.current);
      staleWatchdogRef.current = null;
    }

    // 2. Nuclear: destroy Firebase App and re-create from scratch
    const success = await nuclearReconnect();
    if (!success) {
      setConnectionStatus('offline');
      console.error('❌ Nuclear reconnect failed — try refreshing the page');
      return;
    }

    // 3. Re-subscribe to connection state with fresh db reference
    connectionCleanupRef.current = subscribeToConnectionState((connected) => {
      setConnectionStatus(connected ? 'connected' : 'offline');
    });

    // 4. Re-subscribe to session data with fresh db reference
    unsubscribeRef.current = subscribeToAllSessions((remoteSessions) => {
      lastRemoteDataTs.current = Date.now();
      remoteUpdateGen.current += 1;
      setSessions(prev => mergeRemoteSessions(prev, remoteSessions, pendingLocalUpdates.current));
      setActiveSessionId(prev => {
        if (remoteSessions.length === 0) return '';
        if (prev && remoteSessions.some(s => s.id === prev)) return prev;
        return remoteSessions[0].id;
      });
    });

    // 5. Re-establish keepAlive and presence
    const deviceId = localStorage.getItem('gilpin_device_id') || 'unknown';
    const sid = activeSessionIdRef.current;
    if (sid) {
      keepaliveCleanupRef.current = keepAlive(sid, deviceId);
      presenceCleanupRef.current = trackPresence(sid, deviceId, userName);
    }

    // 6. Re-establish stale watchdog
    lastRemoteDataTs.current = Date.now();
    staleWatchdogRef.current = setInterval(() => {
      const lastData = lastRemoteDataTs.current;
      if (lastData > 0 && Date.now() - lastData > 60000) {
        console.warn('🐕 Stale subscription watchdog: no data for', Math.round((Date.now() - lastData) / 1000), 's — forcing reconnect');
        forceReconnect();
      }
    }, 30000);

    // Reset debounce so auto-handlers can fire again
    lastReconnectTsRef.current = Date.now();
    console.log('✅ Nuclear reconnect complete — all subscriptions re-established');
  }, [userName]);

  return {
    sessions, activeSessionId, switchSession: setActiveSessionId, deleteSession, createNewSession,
    joinSession,
    guests, filteredGuests, arrivalDateStr, isOldFile, activeFilter, setActiveFilter,
    isProcessing, progressMsg, currentBatch, totalBatches, auditPhase, auditGuestNames,
    handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, duplicateGuest,
    validateETA,
    onExcelExport: () => ExcelService.export(guests),
    // Firebase status
    firebaseEnabled,
    connectionStatus,
    // Session sharing
    shareSession,
    getShareUrl,
    // Session lock
    isSessionLocked,
    lockSession,
    unlockSession,
    // Manual reconnect
    manualReconnect,
    // PMS integration
    dataSource,
    toggleDataSource,
    loadFromPMS,
    isPMSConfigured: isPMSConfigured()
  };
};