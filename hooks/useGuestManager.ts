import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Guest, Flag, FilterType, ArrivalSession } from '../types';
import { PDFService } from '../services/pdfService';
import { GeminiService } from '../services/geminiService';
import { ExcelService } from '../services/excelService';
import { BATCH_SIZE } from '../constants';
import {
  initializeFirebase,
  isFirebaseEnabled,
  subscribeToSession,
  syncSession
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

export const useGuestManager = (initialFlags: Flag[]) => {
  // 1. Initialize from LocalStorage
  const [sessions, setSessions] = useState<ArrivalSession[]>(() => {
    try {
      const saved = localStorage.getItem('gilpin_sessions_v5');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('gilpin_active_id_v5') || "";
  });

  // Firebase state
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline');
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

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

  // 3. Initialize Firebase on mount
  useEffect(() => {
    setConnectionStatus('connecting');
    const enabled = initializeFirebase();
    setFirebaseEnabled(enabled);
    setConnectionStatus(enabled ? 'connected' : 'offline');

    if (enabled) {
      console.log('🔥 Firebase real-time sync enabled');
    } else {
      console.log('📱 Running in offline mode (localStorage only)');
    }
  }, []);

  // 4. Subscribe to active session updates from Firebase
  useEffect(() => {
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!firebaseEnabled || !activeSessionId) return;

    // Subscribe to session updates
    unsubscribeRef.current = subscribeToSession(activeSessionId, (remoteGuests) => {
      // Prevent infinite loops - only update if this is a remote change
      if (isRemoteUpdate.current) return;

      isRemoteUpdate.current = true;
      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, guests: remoteGuests, lastModified: Date.now() }
          : s
      ));

      // Reset flag after state update
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 100);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [firebaseEnabled, activeSessionId]);

  // 5. Sync to Firebase when session changes (debounced)
  const syncToFirebase = useCallback((session: ArrivalSession) => {
    if (!firebaseEnabled) return;

    // Debounce sync to avoid rapid updates
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      if (isRemoteUpdate.current) return; // Don't sync remote updates back

      try {
        await syncSession(session);
        console.log('✅ Synced to Firebase:', session.id);
      } catch (error) {
        console.error('❌ Firebase sync failed:', error);
        setConnectionStatus('offline');
      }
    }, 500); // 500ms debounce
  }, [firebaseEnabled]);

  // 6. Persistence (localStorage + Firebase)
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('gilpin_sessions_v5', JSON.stringify(sessions));
      localStorage.setItem('gilpin_active_id_v5', activeSessionId);

      // Sync active session to Firebase
      if (activeSession && !isRemoteUpdate.current) {
        syncToFirebase(activeSession);
      }
    } else {
      localStorage.removeItem('gilpin_sessions_v5');
      localStorage.removeItem('gilpin_active_id_v5');
    }
  }, [sessions, activeSessionId, activeSession, syncToFirebase]);

  // 7. Actions

  // Robust Synchronous Delete
  const deleteSession = (idToDelete: string) => {
    let nextSessions = sessions.filter(s => s.id !== idToDelete);
    let nextActiveId = activeSessionId;

    if (nextSessions.length === 0) {
      // ALLOW EMPTY STATE: If all sessions are deleted, we return to 0 tabs
      nextActiveId = "";
    } else if (idToDelete === activeSessionId) {
      // If we deleted the active one, find neighbor
      const deletedIndex = sessions.findIndex(s => s.id === idToDelete);
      const newIndex = deletedIndex > 0 ? deletedIndex - 1 : 0;
      nextActiveId = nextSessions[newIndex].id;
    }

    setSessions(nextSessions);
    setActiveSessionId(nextActiveId);
  };

  const createNewSession = () => {
    const id = `MAN-${Date.now()}`;
    setSessions(prev => [...prev, {
      id,
      label: `New List ${new Date().toLocaleDateString('en-GB')}`,
      dateObj: new Date().toISOString(),
      guests: [],
      lastModified: Date.now()
    }]);
    setActiveSessionId(id);
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

        if (existingSession) {
          // Update existing session
          setSessions(prev => prev.map(s =>
            s.id === id
              ? { ...s, guests: pmsGuests, lastModified: Date.now() }
              : s
          ));
        } else {
          // Create new session
          setSessions(prev => [...prev, {
            id,
            label,
            dateObj: targetDate.toISOString(),
            guests: pmsGuests,
            lastModified: Date.now()
          }]);
        }

        setActiveSessionId(id);
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
    updateActiveSessionGuests(guests.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const deleteGuest = (id: string) => {
    updateActiveSessionGuests(guests.filter(g => g.id !== id));
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
    } else {
      updateActiveSessionGuests([g, ...guests]);
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
    updateActiveSessionGuests([newGuest, ...guests]);
  };

  const handleAIRefine = async () => {
    if (guests.length === 0) return;
    setIsProcessing(true);
    setProgressMsg("REFINING DATA...");
    setCurrentBatch(0);
    const batch = guests;
    const chunks = [];
    for (let i = 0; i < batch.length; i += BATCH_SIZE) chunks.push(batch.slice(i, i + BATCH_SIZE));
    setTotalBatches(chunks.length);

    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentBatchGuests = chunks[i];
        setCurrentBatch(i + 1);
        setProgressMsg(`AUDITING: ${i + 1}/${chunks.length}...`);

        let refinements = await GeminiService.refineGuestBatch(currentBatchGuests, ['notes', 'facilities']);
        if (!refinements) {
          console.warn("Batch failed, retrying...");
          await new Promise(r => setTimeout(r, 3000));
          refinements = await GeminiService.refineGuestBatch(currentBatchGuests, ['notes', 'facilities']);
        }

        if (refinements) {
          console.log('[AI Audit] Got refinements:', refinements.length, 'results');
          console.log('[AI Audit] Sample refinement:', JSON.stringify(refinements[0], null, 2));

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
                    ll: ref.history || updatedGuests[gIndex].ll
                  };
                }
              } else {
                console.warn('[AI Audit] No refinement for guest', original.name, 'at index', idx);
              }
            });
            return { ...s, guests: updatedGuests, lastModified: Date.now() };
          }));
        } else {
          console.error('[AI Audit] No refinements returned from AI service');
        }

        console.log("Batch complete, cooling down...");
        // INCREASED DELAY: 2000ms to prevent Rate Limiting
        await new Promise(r => setTimeout(r, 2000));
      }
    } finally {
      setIsProcessing(false);
      setCurrentBatch(0);
      setTotalBatches(0);
    }
  };

  const filteredGuests = useMemo(() => guests.filter(g => {
    if (activeFilter === 'all') return true;
    const rNum = parseInt(g.room.split(' ')[0]);
    if (activeFilter === 'main') return rNum > 0 && rNum <= 31;
    if (activeFilter === 'lake') return rNum >= 51 && rNum <= 60;
    if (activeFilter === 'vip') return g.prefillNotes.includes('⭐') || g.prefillNotes.includes('VIP') || g.packageName === 'POB_STAFF';
    if (activeFilter === 'allergy') return ['⚠️', '🥛', '🥜', '🍞', '🧀'].some(e => g.prefillNotes.includes(e));
    if (activeFilter === 'return') return g.ll.toLowerCase().includes('yes');
    return true;
  }), [guests, activeFilter]);

  return {
    sessions, activeSessionId, switchSession: setActiveSessionId, deleteSession, createNewSession,
    guests, filteredGuests, arrivalDateStr, isOldFile, activeFilter, setActiveFilter,
    isProcessing, progressMsg, currentBatch, totalBatches,
    handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, duplicateGuest,
    validateETA,
    onExcelExport: () => ExcelService.export(guests),
    // Firebase status
    firebaseEnabled,
    connectionStatus,
    // PMS integration
    dataSource,
    toggleDataSource,
    loadFromPMS,
    isPMSConfigured: isPMSConfigured()
  };
};