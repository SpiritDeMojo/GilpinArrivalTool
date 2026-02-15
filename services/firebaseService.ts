import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import {
    getDatabase,
    ref,
    set,
    get,
    onValue,
    update,
    remove,
    onDisconnect,
    Database,
    goOnline,
    goOffline,
    serverTimestamp,
    push
} from 'firebase/database';
import { Guest, RoomStatus, GuestStatus, CourtesyCallNote, ArrivalSession } from '../types';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app: FirebaseApp | null = null;
let db: Database | null = null;
let _reconnecting = false;
let _appSeq = 0;
let _nuclearAttempts = 0;

/**
 * Check if a nuclear reconnect is currently in progress.
 * Other code should skip Firebase operations when this returns true.
 */
export function isReconnecting(): boolean {
    return _reconnecting;
}

/**
 * Initialize Firebase app and database
 * Returns true if Firebase is configured, false otherwise
 */
export function initializeFirebase(): boolean {
    // Check if Firebase is configured
    if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
        console.warn('Firebase not configured. Real-time sync disabled.');
        console.log('Firebase config check:', {
            hasApiKey: !!firebaseConfig.apiKey,
            hasDatabaseURL: !!firebaseConfig.databaseURL,
            hasProjectId: !!firebaseConfig.projectId
        });
        return false;
    }

    try {
        console.log('🔥 Initializing Firebase with config:', {
            projectId: firebaseConfig.projectId,
            databaseURL: firebaseConfig.databaseURL?.substring(0, 50) + '...',
            authDomain: firebaseConfig.authDomain
        });

        app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        // Always start with a fresh connection intent
        goOnline(db);
        console.log('✅ Firebase initialized successfully - Real-time sync ACTIVE');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        return false;
    }
}

/**
 * Check if Firebase is available
 */
export function isFirebaseEnabled(): boolean {
    return db !== null && !_reconnecting;
}

/**
 * Subscribe to Firebase connection state (.info/connected)
 * This is the authoritative source for whether we have an active WebSocket.
 * @returns Unsubscribe function
 */
export function subscribeToConnectionState(
    onStatus: (connected: boolean) => void
): () => void {
    if (!db) {
        onStatus(false);
        return () => { };
    }

    const connRef = ref(db, '.info/connected');
    const unsubscribe = onValue(connRef, (snap) => {
        const connected = snap.val() === true;
        console.log(`🔥 Firebase connection state: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
        onStatus(connected);
    });

    return unsubscribe;
}

/**
 * Force Firebase to re-establish its WebSocket connection.
 * Call this when the browser tab returns from background (visibilitychange)
 * or when the device comes back online. Without this, mobile browsers
 * may leave the WebSocket dead after suspending it.
 */
export function forceReconnect(): void {
    if (!db || _reconnecting) return;
    console.log('🔄 Forcing Firebase reconnect (offline→online cycle)...');
    // Cycle offline→online to force a FRESH WebSocket.
    // goOnline() alone is a no-op if Firebase thinks it's still connected.
    try { goOffline(db); } catch (e) { /* ignore */ }
    // 500ms delay — mobile carriers need more time to tear down
    setTimeout(() => {
        if (_reconnecting) return;
        try { goOnline(db); } catch (e) { /* ignore */ }
    }, 500);
}

/**
 * Hard reconnect — aggressive 2-second cycle for manual reconnect button.
 * Gives mobile carriers plenty of time to fully tear down the old WebSocket
 * before establishing a fresh one. Use this when the user explicitly taps
 * the reconnect button.
 */
export function hardReconnect(): void {
    if (!db || _reconnecting) return;
    console.log('🔄 Hard reconnect (2s cycle) triggered by user...');
    try { goOffline(db); } catch (e) { /* ignore */ }
    setTimeout(() => {
        if (_reconnecting) return; // Check again in case nuclear reconnect started during delay
        try { goOnline(db); } catch (e) { /* ignore */ }
        console.log('🔄 Hard reconnect: goOnline called');
    }, 2000);
}

/**
 * Nuclear reconnect — completely destroys and re-creates the Firebase App.
 * Use this as a last resort when the SDK's internal WebSocket manager is
 * permanently broken (common on mobile after OS suspends the page).
 *
 * IMPORTANT: Callers MUST tear down all listeners, intervals, and cleanups
 * BEFORE calling this. The guard flag prevents other code from accessing db.
 *
 * @returns Promise<boolean> — true if reconnect succeeded
 */
export async function nuclearReconnect(): Promise<boolean> {
    if (_reconnecting) {
        console.warn('☢️ Nuclear reconnect already in progress — skipping');
        return false;
    }
    _reconnecting = true;
    console.warn('☢️ NUCLEAR RECONNECT — destroying and re-creating Firebase App...');

    // 1. Tear down existing connection
    if (db) {
        try { goOffline(db); } catch (e) { /* ignore */ }
    }

    // 2. Null out immediately so guard checks work
    const oldApp = app;
    app = null;
    db = null;

    // 3. Destroy the Firebase App entirely
    if (oldApp) {
        try {
            await deleteApp(oldApp);
            console.log('☢️ Firebase App destroyed');
        } catch (e) {
            console.warn('☢️ deleteApp error (non-fatal):', e);
        }
    }

    // 4. Clear Firebase SDK localStorage flags that block WebSocket reconnection
    //    The SDK stores 'firebase:previous_websocket_failure' which prevents
    //    future WebSocket attempts on mobile after a failure.
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('firebase:') || key.startsWith('firebaseLocalStorage'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        if (keysToRemove.length > 0) {
            console.log(`☢️ Cleared ${keysToRemove.length} firebase localStorage keys`);
        }
    } catch (e) {
        console.warn('☢️ Could not clear localStorage (non-fatal):', e);
    }

    // 5. Re-initialize with unique app name to avoid [DEFAULT] registry conflict
    try {
        _appSeq++;
        const appName = `gilpin-${_appSeq}`;
        app = initializeApp(firebaseConfig, appName);
        db = getDatabase(app);
        goOnline(db);
        _reconnecting = false;
        console.log(`☢️ Firebase App re-initialized as "${appName}" — fresh WebSocket`);
        return true;
    } catch (error) {
        console.error('☢️ Nuclear reconnect FAILED:', error);
        _reconnecting = false;
        return false;
    }
}

/**
 * Wait for Firebase to establish a connection, with timeout.
 * Subscribes to .info/connected and resolves when it becomes true.
 * @returns Promise<boolean> — true if connected, false if timed out
 */
export function waitForConnection(timeoutMs: number = 12000): Promise<boolean> {
    return new Promise((resolve) => {
        if (!db) {
            resolve(false);
            return;
        }

        let resolved = false;
        const connRef = ref(db, '.info/connected');

        const unsubscribe = onValue(connRef, (snap) => {
            if (snap.val() === true && !resolved) {
                resolved = true;
                unsubscribe();
                resolve(true);
            }
        });

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                unsubscribe();
                console.warn(`⏱️ waitForConnection timed out after ${timeoutMs}ms`);
                resolve(false);
            }
        }, timeoutMs);
    });
}

/**
 * Get and reset the nuclear attempt counter.
 * Used by useGuestManager to track consecutive failures.
 */
export function getNuclearAttempts(): number {
    return _nuclearAttempts;
}

export function incrementNuclearAttempts(): void {
    _nuclearAttempts++;
}

export function resetNuclearAttempts(): void {
    _nuclearAttempts = 0;
}

/**
 * Keep-alive ping — writes a timestamp to a heartbeat node every interval.
 * This prevents idle WebSocket connections from being dropped by intermediate proxies.
 * @param sessionId - The current session ID
 * @param deviceId - This device's unique ID
 * @param intervalMs - Ping interval in ms (default 15s — aggressive for mobile carrier keep-alive)
 * @returns Cleanup function
 */
export function keepAlive(
    sessionId: string,
    deviceId: string,
    intervalMs: number = 15000
): () => void {
    if (!db) return () => { };

    const heartbeatRef = ref(db, `heartbeat/${sessionId}/${deviceId}`);

    const interval = setInterval(() => {
        set(heartbeatRef, Date.now()).catch(() => {
            // Silent failure — connection monitor will handle reconnect
        });
    }, intervalMs);

    // Write immediately
    set(heartbeatRef, Date.now()).catch(() => { });

    // Auto-clean on disconnect
    onDisconnect(heartbeatRef).remove();

    return () => {
        clearInterval(interval);
        remove(heartbeatRef).catch(() => { });
    };
}

/**
 * Fetch a full session from Firebase (one-time read using get()).
 * Uses get() instead of onValue+off() to avoid killing concurrent listeners.
 * Used when a device joins via URL and needs to load existing data.
 */
export async function fetchSession(
    sessionId: string,
    onResult: (session: ArrivalSession | null) => void
): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        onResult(null);
        return;
    }

    try {
        const sessionRef = ref(db, `sessions/${sessionId}`);
        const snapshot = await get(sessionRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Ensure guests is an array
            if (data.guests && !Array.isArray(data.guests)) {
                data.guests = Object.values(data.guests);
            }
            console.log('📥 Fetched session from Firebase:', sessionId, '- Guests:', data.guests?.length || 0);
            onResult(data as ArrivalSession);
        } else {
            console.log('📭 No session found in Firebase for:', sessionId);
            onResult(null);
        }
    } catch (error) {
        console.error('Failed to fetch session:', error);
        onResult(null);
    }
}

/**
 * Subscribe to ALL sessions in Firebase (multi-day sync).
 * Returns the full ArrivalSession[] whenever any session is added, updated, or removed.
 * Used so all connected devices see every day uploaded by the reception PC.
 */
export function subscribeToAllSessions(
    onUpdate: (sessions: ArrivalSession[]) => void
): () => void {
    if (!db) {
        console.warn('Firebase not initialized');
        onUpdate([]);
        return () => { };
    }

    const sessionsRef = ref(db, 'sessions');

    const unsubscribe = onValue(sessionsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const allSessions: ArrivalSession[] = Object.entries(data).map(([id, session]: [string, any]) => {
                // Ensure guests is always an array
                let guests = session.guests || [];
                if (!Array.isArray(guests)) {
                    guests = Object.values(guests);
                }
                return {
                    id,
                    label: session.label || id,
                    dateObj: session.dateObj || new Date().toISOString(),
                    guests,
                    lastModified: session.lastModified || 0
                };
            });

            // Sort by date (earliest first)
            allSessions.sort((a, b) => new Date(a.dateObj).getTime() - new Date(b.dateObj).getTime());

            console.log('📋 All sessions updated:', allSessions.length, 'sessions');
            onUpdate(allSessions);
        } else {
            onUpdate([]);
        }
    }, (error) => {
        console.error('Firebase all-sessions subscription error:', error);
    });

    return unsubscribe;
}

/**
 * Sync entire session to Firebase — used for initial upload (PDF/PMS import)
 * and AI Audit result writes.
 * 
 * GUARD: Checks remote `lastModified` before writing. If the remote data is
 * newer, the write is skipped to prevent stale devices from overwriting
 * AI Audit results or other recent changes from another device.
 * 
 * For subsequent field-level changes, use updateGuestFields() instead.
 * @param session - The session to sync
 * @param forceWrite - If true, skip the staleness check (for initial PDF/PMS uploads)
 */
export async function syncSession(session: ArrivalSession, forceWrite = false): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }

    try {
        const sessionRef = ref(db, `sessions/${session.id}`);
        const now = Date.now();

        // LAST-WRITE-WINS GUARD: Don't overwrite if remote data is newer
        if (!forceWrite) {
            const snapshot = await get(sessionRef);
            if (snapshot.exists()) {
                const remote = snapshot.val();
                const remoteTs = remote.lastModified || 0;
                const localTs = session.lastModified || 0;
                if (remoteTs > localTs) {
                    console.log(`[Sync] ⛔ Skipping write — remote is newer (remote: ${remoteTs}, local: ${localTs})`);
                    return; // Don't overwrite newer data
                }
            }
        }

        // sanitizeForFirebase converts undefined → null (Firebase rejects undefined)
        await set(sessionRef, sanitizeForFirebase({
            ...session,
            lastModified: now
        }));
    } catch (error) {
        console.error('Failed to sync session:', error);
        throw error;
    }
}

/**
 * Atomically update specific fields on a single guest without overwriting the
 * entire session.  This prevents the "last-write-wins" race that occurs when
 * two devices push full sessions at the same time.
 *
 * Works by reading the current guest list once to find the array index, then
 * issuing a Firebase multi-path `update()` that touches only the changed fields.
 *
 * @param sessionId  - The session containing the guest
 * @param guestId    - The guest's unique ID
 * @param fields     - A partial Guest object with only the changed fields
 * @returns Promise that resolves when Firebase confirms the write
 */
export async function updateGuestFields(
    sessionId: string,
    guestId: string,
    fields: Record<string, any>
): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized — skipping atomic update');
        return;
    }

    try {
        // Use get() for a clean one-time read — no listener management needed.
        // The old onValue + off() pattern was killing concurrent listeners.
        const guestsRef = ref(db, `sessions/${sessionId}/guests`);
        const snapshot = await get(guestsRef);

        if (!snapshot.exists()) {
            throw new Error(`Session ${sessionId} has no guests`);
        }

        const guests: Guest[] = Array.isArray(snapshot.val())
            ? snapshot.val()
            : Object.values(snapshot.val());
        const index = guests.findIndex(g => g.id === guestId);

        if (index === -1) {
            throw new Error(`Guest ${guestId} not found in session ${sessionId}`);
        }

        // Build multi-path update — only touches the specific fields
        // sanitizeForFirebase converts undefined → null (Firebase rejects undefined)
        const updates: Record<string, any> = {};
        for (const [key, value] of Object.entries(fields)) {
            updates[`sessions/${sessionId}/guests/${index}/${key}`] = sanitizeForFirebase(value);
        }
        // Always bump the session-level lastModified so other listeners fire
        updates[`sessions/${sessionId}/lastModified`] = Date.now();

        await update(ref(db), updates);
    } catch (error) {
        console.error('updateGuestFields error:', error);
        throw error;
    }
}

/**
 * Deep-sanitize a value for Firebase RTDB: converts all `undefined` to `null`.
 * Firebase Realtime Database does NOT accept `undefined` and will throw
 * "First argument contains undefined" if any nested value is undefined.
 */
function sanitizeForFirebase(value: any): any {
    if (value === undefined) return null;
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(sanitizeForFirebase);
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
        clean[k] = sanitizeForFirebase(v);
    }
    return clean;
}

/**
 * Update room status for a guest
 * @param sessionId - The session ID
 * @param guestId - The guest ID
 * @param status - New room status
 * @param updatedBy - Who made the update
 */
export async function updateRoomStatus(
    sessionId: string,
    guestId: string,
    status: RoomStatus,
    updatedBy: string = 'System'
): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }

    try {
        // Use get() for a clean one-time read — no listener creation/destruction
        const guestsRef = ref(db, `sessions/${sessionId}/guests`);
        const snapshot = await get(guestsRef);

        if (!snapshot.exists()) {
            throw new Error(`Session ${sessionId} has no guests`);
        }

        const guests: Guest[] = Array.isArray(snapshot.val())
            ? snapshot.val()
            : Object.values(snapshot.val());
        const index = guests.findIndex(g => g.id === guestId);

        if (index === -1) {
            throw new Error(`Guest ${guestId} not found`);
        }

        const updates: Record<string, any> = {};
        updates[`sessions/${sessionId}/guests/${index}/roomStatus`] = status;
        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdate`] = Date.now();
        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdatedBy`] = updatedBy;

        await update(ref(db), updates);
    } catch (error) {
        console.error('Failed to update room status:', error);
        throw error;
    }
}

/**
 * Update guest status for reception workflow
 * @param sessionId - The session ID
 * @param guestId - The guest ID
 * @param status - New guest status
 * @param updatedBy - Who made the update
 */
export async function updateGuestStatus(
    sessionId: string,
    guestId: string,
    status: GuestStatus,
    updatedBy: string = 'System'
): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }

    try {
        // Use get() for a clean one-time read — no listener creation/destruction
        const guestsRef = ref(db, `sessions/${sessionId}/guests`);
        const snapshot = await get(guestsRef);

        if (!snapshot.exists()) {
            throw new Error(`Session ${sessionId} has no guests`);
        }

        const guests: Guest[] = Array.isArray(snapshot.val())
            ? snapshot.val()
            : Object.values(snapshot.val());
        const index = guests.findIndex(g => g.id === guestId);

        if (index === -1) {
            throw new Error(`Guest ${guestId} not found`);
        }

        const updates: Record<string, any> = {};
        updates[`sessions/${sessionId}/guests/${index}/guestStatus`] = status;
        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdate`] = Date.now();
        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdatedBy`] = updatedBy;

        await update(ref(db), updates);
    } catch (error) {
        console.error('Failed to update guest status:', error);
        throw error;
    }
}

/**
 * Mark in-room items as delivered
 * @param sessionId - The session ID
 * @param guestId - The guest ID
 * @param delivered - Whether items are delivered
 * @param deliveredBy - Who delivered (optional)
 */
export async function updateInRoomDelivery(
    sessionId: string,
    guestId: string,
    delivered: boolean,
    deliveredBy?: string
): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }

    try {
        // Use get() for a clean one-time read — no listener creation/destruction
        const guestsRef = ref(db, `sessions/${sessionId}/guests`);
        const snapshot = await get(guestsRef);

        if (!snapshot.exists()) {
            throw new Error(`Session ${sessionId} has no guests`);
        }

        const guests: Guest[] = Array.isArray(snapshot.val())
            ? snapshot.val()
            : Object.values(snapshot.val());
        const index = guests.findIndex(g => g.id === guestId);

        if (index === -1) {
            throw new Error(`Guest ${guestId} not found`);
        }

        const updates: Record<string, any> = {};
        updates[`sessions/${sessionId}/guests/${index}/inRoomDelivered`] = delivered;
        if (delivered && deliveredBy) {
            updates[`sessions/${sessionId}/guests/${index}/inRoomDeliveredBy`] = deliveredBy;
            updates[`sessions/${sessionId}/guests/${index}/inRoomDeliveredAt`] = Date.now();
        }

        await update(ref(db), updates);
    } catch (error) {
        console.error('Failed to update in-room delivery:', error);
        throw error;
    }
}

/**
 * Add a courtesy call note
 * @param sessionId - The session ID
 * @param guestId - The guest ID
 * @param note - The courtesy call note
 */
export async function addCourtesyCallNote(
    sessionId: string,
    guestId: string,
    note: Omit<CourtesyCallNote, 'id' | 'timestamp'>
): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }

    try {
        // Use get() for a clean one-time read — no listener creation/destruction
        const guestsRef = ref(db, `sessions/${sessionId}/guests`);
        const snapshot = await get(guestsRef);

        if (!snapshot.exists()) {
            throw new Error(`Session ${sessionId} has no guests`);
        }

        const guests: Guest[] = Array.isArray(snapshot.val())
            ? snapshot.val()
            : Object.values(snapshot.val());
        const index = guests.findIndex(g => g.id === guestId);

        if (index === -1) {
            throw new Error(`Guest ${guestId} not found`);
        }

        const currentNotes = guests[index].courtesyCallNotes || [];
        const newNote: CourtesyCallNote = {
            id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...note
        };

        const updates: Record<string, any> = {};
        updates[`sessions/${sessionId}/guests/${index}/courtesyCallNotes`] = [...currentNotes, newNote];
        updates[`sessions/${sessionId}/guests/${index}/guestStatus`] = 'call_complete';
        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdate`] = Date.now();
        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdatedBy`] = note.author;

        await update(ref(db), updates);
    } catch (error) {
        console.error('Failed to add courtesy call note:', error);
        throw error;
    }
}

/**
 * Get default room status for new guests
 */
export function getDefaultRoomStatus(): RoomStatus {
    return 'dirty';
}

/**
 * Get default guest status for new guests
 */
export function getDefaultGuestStatus(): GuestStatus {
    return 'pre_arrival';
}

/**
 * Session summary for the session browser
 */
export interface SessionSummary {
    id: string;
    label: string;
    dateObj?: string;
    guestCount: number;
    lastModified: number;
}

/**
 * Subscribe to the list of all sessions in Firebase
 * Returns summary info (not full guest data) for the session browser
 */
export function subscribeToSessionList(
    onUpdate: (sessions: SessionSummary[]) => void
): () => void {
    if (!db) {
        console.warn('Firebase not initialized');
        onUpdate([]);
        return () => { };
    }

    const sessionsRef = ref(db, 'sessions');

    const unsubscribe = onValue(sessionsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const summaries: SessionSummary[] = Object.entries(data).map(([id, session]: [string, any]) => ({
                id,
                label: session.label || id,
                dateObj: session.dateObj,
                guestCount: session.guests ? (Array.isArray(session.guests) ? session.guests.length : Object.keys(session.guests).length) : 0,
                lastModified: session.lastModified || 0
            }));

            // Sort by lastModified, most recent first
            summaries.sort((a, b) => b.lastModified - a.lastModified);

            console.log('📋 Session list updated:', summaries.length, 'sessions');
            onUpdate(summaries);
        } else {
            onUpdate([]);
        }
    }, (error) => {
        console.error('Firebase session list subscription error:', error);
    });

    return unsubscribe;
}

/**
 * Delete a session from Firebase — cleans up all related data nodes
 */
export async function deleteSessionFromFirebase(sessionId: string): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }

    if (!sessionId || typeof sessionId !== 'string') {
        console.error('Invalid session ID for deletion');
        return;
    }

    try {
        // Remove all data associated with this session
        const sessionRef = ref(db, `sessions/${sessionId}`);
        const presenceRef = ref(db, `presence/${sessionId}`);
        const chatRef = ref(db, `chat/${sessionId}`);

        await Promise.all([
            remove(sessionRef),
            remove(presenceRef),
            remove(chatRef),
        ]);

        console.log('🗑️ Deleted session and all related data from Firebase:', sessionId);
    } catch (error) {
        console.error('Failed to delete session from Firebase:', error);
        throw error;
    }
}

/**
 * Track user presence in a session
 * Registers this device as active in the session and auto-removes on disconnect
 */
export function trackPresence(sessionId: string, deviceId: string, userName?: string): () => void {
    if (!db) return () => { };

    const presenceRef = ref(db, `presence/${sessionId}/${deviceId}`);

    // Set presence
    set(presenceRef, {
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        userAgent: navigator.userAgent.includes('Mobile') ? '📱' : '💻',
        userName: userName || 'Unknown'
    }).catch(() => { /* silent — connection monitor handles recovery */ });

    // Auto-remove on disconnect
    onDisconnect(presenceRef).remove();

    // Heartbeat - update lastSeen every 30s (error-resilient)
    const interval = setInterval(() => {
        update(presenceRef, { lastSeen: Date.now() }).catch(() => {
            // Silent failure — if disconnected the connection monitor will
            // re-establish presence when we reconnect
        });
    }, 30000);

    return () => {
        clearInterval(interval);
        remove(presenceRef).catch(() => { });
    };
}

/**
 * Subscribe to presence data for all sessions
 * Returns a map of sessionId -> number of active viewers
 */
export function subscribeToPresence(
    onUpdate: (presenceMap: Record<string, number>) => void
): () => void {
    if (!db) {
        onUpdate({});
        return () => { };
    }

    const presenceRef = ref(db, 'presence');

    const unsubscribe = onValue(presenceRef, (snapshot) => {
        const result: Record<string, number> = {};
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (const [sessionId, viewers] of Object.entries(data)) {
                if (viewers && typeof viewers === 'object') {
                    // Filter out stale entries (older than 2 minutes)
                    const now = Date.now();
                    const activeViewers = Object.values(viewers as Record<string, any>).filter(
                        (v: any) => now - (v.lastSeen || 0) < 120000
                    );
                    result[sessionId] = activeViewers.length;
                }
            }
        }
        onUpdate(result);
    });

    return unsubscribe;
}

// === Chat System ===

export interface ChatMessage {
    id: string;
    author: string;
    department: string;
    text: string;
    timestamp: number;
    reactions?: Record<string, string>; // userId -> emoji
}

/**
 * Send a chat message to a session
 */
export async function sendChatMessage(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }

    try {
        const chatRef = ref(db, `chat/${sessionId}`);
        const newMsgRef = push(chatRef);
        await set(newMsgRef, {
            ...message,
            id: newMsgRef.key,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Failed to send chat message:', error);
    }
}

/**
 * Subscribe to chat messages for a session
 */
export function subscribeToChatMessages(
    sessionId: string,
    onUpdate: (messages: ChatMessage[]) => void
): () => void {
    if (!db) {
        onUpdate([]);
        return () => { };
    }

    const chatRef = ref(db, `chat/${sessionId}`);

    const unsubscribe = onValue(chatRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const messages: ChatMessage[] = Object.values(data);
            messages.sort((a, b) => a.timestamp - b.timestamp);
            onUpdate(messages);
        } else {
            onUpdate([]);
        }
    });

    return unsubscribe;
}

/**
 * Clear all chat messages for a session
 */
export async function clearChatMessages(sessionId: string): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }
    try {
        const chatRef = ref(db, `chat/${sessionId}`);
        await remove(chatRef);
        console.log('🗑️ Cleared chat for session:', sessionId);
    } catch (error) {
        console.error('Failed to clear chat:', error);
    }
}

/* ──────────────────────────────────────────────
   Typing Indicators — ephemeral presence data
   ────────────────────────────────────────────── */

export function setTypingIndicator(
    sessionId: string,
    userName: string,
    isTyping: boolean
): void {
    if (!db) return;
    const typingRef = ref(db, `typing/${sessionId}/${userName.replace(/[.#$/[\]]/g, '_')}`);
    if (isTyping) {
        set(typingRef, { name: userName, ts: Date.now() }).catch(() => {
            // Silent — Firebase rules may not permit typing writes
        });
        // Auto-clear after disconnect (stale protection)
        onDisconnect(typingRef).remove().catch(() => { });
    } else {
        remove(typingRef).catch(() => { });
    }
}

export function subscribeToTyping(
    sessionId: string,
    currentUser: string,
    onUpdate: (typingUsers: string[]) => void
): () => void {
    if (!db) { onUpdate([]); return () => { }; }
    const typingRef = ref(db, `typing/${sessionId}`);
    const unsub = onValue(typingRef, (snap) => {
        if (!snap.exists()) { onUpdate([]); return; }
        const data = snap.val() as Record<string, { name: string; ts: number }>;
        const now = Date.now();
        const users = Object.values(data)
            .filter(v => v.name !== currentUser && (now - v.ts) < 8000)
            .map(v => v.name);
        onUpdate(users);
    });
    return unsub;
}

/* ──────────────────────────────────────────────
   Emoji Reactions — per-message user reactions
   ────────────────────────────────────────────── */

export async function addReaction(
    sessionId: string,
    messageId: string,
    userName: string,
    emoji: string | null
): Promise<void> {
    if (!db) return;
    const key = userName.replace(/[.#$/[\]]/g, '_');
    const reactRef = ref(db, `chat/${sessionId}/${messageId}/reactions/${key}`);
    if (emoji) {
        await set(reactRef, emoji);
    } else {
        await remove(reactRef);
    }
}

// ═══════════════════════════════════════════════════════════════
// DEPARTMENT HANDOVER SYSTEM
// ═══════════════════════════════════════════════════════════════

import type { HandoverDepartment, HandoverReport, DepartmentHandover } from '../types';

/**
 * Save (upsert) a handover report for a department on a given date.
 * Path: handovers/{date}/{department}
 */
export async function saveHandoverReport(report: HandoverReport): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }
    try {
        const handoverRef = ref(db, `handovers/${report.date}/${report.department}`);
        await set(handoverRef, sanitizeForFirebase({
            ...report,
            lastUpdated: Date.now()
        }));
        console.log(`📝 Saved handover: ${report.department} for ${report.date}`);
    } catch (error) {
        console.error('Failed to save handover report:', error);
        throw error;
    }
}

/**
 * Fetch a single handover report for a department on a given date.
 */
export async function getHandoverReport(
    date: string,
    department: HandoverDepartment
): Promise<HandoverReport | null> {
    if (!db) {
        console.warn('Firebase not initialized');
        return null;
    }
    try {
        const handoverRef = ref(db, `handovers/${date}/${department}`);
        const snapshot = await get(handoverRef);
        if (snapshot.exists()) {
            return snapshot.val() as HandoverReport;
        }
        return null;
    } catch (error) {
        console.error('Failed to fetch handover report:', error);
        return null;
    }
}

/**
 * Fetch all department handovers for a given date.
 */
export async function getAllHandoversForDate(
    date: string
): Promise<HandoverReport[]> {
    if (!db) {
        console.warn('Firebase not initialized');
        return [];
    }
    try {
        const dateRef = ref(db, `handovers/${date}`);
        const snapshot = await get(dateRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.values(data) as HandoverReport[];
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch all handovers:', error);
        return [];
    }
}

/**
 * Lock the AM shift for a department's handover.
 * Prevents further edits to amData; PM section becomes available.
 */
export async function lockHandoverAM(
    date: string,
    department: HandoverDepartment,
    lockedBy: string
): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }
    try {
        const handoverRef = ref(db, `handovers/${date}/${department}`);
        await update(handoverRef, {
            amLockedAt: Date.now(),
            amLockedBy: lockedBy,
            lastUpdated: Date.now(),
            lastUpdatedBy: lockedBy
        });
        console.log(`🔒 Locked AM handover: ${department} for ${date}`);
    } catch (error) {
        console.error('Failed to lock AM handover:', error);
        throw error;
    }
}

/**
 * Subscribe to all handovers for a date (real-time).
 */
export function subscribeToHandovers(
    date: string,
    onUpdate: (reports: HandoverReport[]) => void
): () => void {
    if (!db) {
        onUpdate([]);
        return () => { };
    }
    const dateRef = ref(db, `handovers/${date}`);
    const unsubscribe = onValue(dateRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            onUpdate(Object.values(data) as HandoverReport[]);
        } else {
            onUpdate([]);
        }
    });
    return unsubscribe;
}
