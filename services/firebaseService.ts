import { initializeApp, FirebaseApp } from 'firebase/app';
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
    off,
    goOnline,
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
    return db !== null;
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

    return () => off(connRef);
}

/**
 * Force Firebase to re-establish its WebSocket connection.
 * Call this when the browser tab returns from background (visibilitychange)
 * or when the device comes back online. Without this, mobile browsers
 * may leave the WebSocket dead after suspending it.
 */
export function forceReconnect(): void {
    if (!db) return;
    console.log('🔄 Forcing Firebase reconnect...');
    goOnline(db);
}

/**
 * Keep-alive ping — writes a timestamp to a heartbeat node every interval.
 * This prevents idle WebSocket connections from being dropped by intermediate proxies.
 * @param sessionId - The current session ID
 * @param deviceId - This device's unique ID
 * @param intervalMs - Ping interval in ms (default 55s — under most 60s timeout limits)
 * @returns Cleanup function
 */
export function keepAlive(
    sessionId: string,
    deviceId: string,
    intervalMs: number = 55000
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
 * Subscribe to a session's guests for real-time updates
 * @param sessionId - The session ID to subscribe to
 * @param onUpdate - Callback when guests are updated
 * @returns Unsubscribe function
 */
export function subscribeToSession(
    sessionId: string,
    onUpdate: (guests: Guest[]) => void
): () => void {
    if (!db) {
        console.warn('Firebase not initialized');
        return () => { };
    }

    const sessionRef = ref(db, `sessions/${sessionId}/guests`);

    const unsubscribe = onValue(sessionRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert object to array if needed
            const guests: Guest[] = Array.isArray(data) ? data : Object.values(data);
            onUpdate(guests);
        }
    }, (error) => {
        console.error('Firebase subscription error:', error);
    });

    // Return unsubscribe function
    return () => off(sessionRef);
}

/**
 * Fetch a full session from Firebase (one-time read)
 * Used when a device joins via URL and needs to load existing data
 */
export function fetchSession(
    sessionId: string,
    onResult: (session: ArrivalSession | null) => void
): void {
    if (!db) {
        console.warn('Firebase not initialized');
        onResult(null);
        return;
    }

    const sessionRef = ref(db, `sessions/${sessionId}`);
    onValue(sessionRef, (snapshot) => {
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
        off(sessionRef);
    }, { onlyOnce: true });
}

/**
 * Subscribe to full session updates (not just guests)
 * Used for cross-device sync where the joining device needs the complete session
 */
export function subscribeToFullSession(
    sessionId: string,
    onUpdate: (session: ArrivalSession) => void
): () => void {
    if (!db) {
        console.warn('Firebase not initialized');
        return () => { };
    }

    const sessionRef = ref(db, `sessions/${sessionId}`);

    const unsubscribe = onValue(sessionRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Ensure guests is an array
            if (data.guests && !Array.isArray(data.guests)) {
                data.guests = Object.values(data.guests);
            }
            onUpdate(data as ArrivalSession);
        }
    }, (error) => {
        console.error('Firebase full session subscription error:', error);
    });

    return () => off(sessionRef);
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

    return () => off(sessionsRef);
}

/**
 * Sync entire session to Firebase — used ONLY for initial upload (PDF/PMS import).
 * For subsequent field-level changes, use updateGuestFields() instead.
 * @param session - The session to sync
 */
export async function syncSession(session: ArrivalSession): Promise<void> {
    if (!db) {
        console.warn('Firebase not initialized');
        return;
    }

    try {
        const sessionRef = ref(db, `sessions/${session.id}`);
        await set(sessionRef, {
            ...session,
            lastModified: Date.now()
        });
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
        const guestRef = ref(db, `sessions/${sessionId}/guests`);

        // First, find the guest index
        return new Promise((resolve, reject) => {
            onValue(guestRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const guests: Guest[] = Object.values(snapshot.val());
                    const index = guests.findIndex(g => g.id === guestId);

                    if (index !== -1) {
                        const updates: Record<string, any> = {};
                        updates[`sessions/${sessionId}/guests/${index}/roomStatus`] = status;
                        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdate`] = Date.now();
                        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdatedBy`] = updatedBy;

                        await update(ref(db!), updates);
                        resolve();
                    } else {
                        reject(new Error('Guest not found'));
                    }
                }
                off(guestRef);
            }, { onlyOnce: true });
        });
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
        const guestRef = ref(db, `sessions/${sessionId}/guests`);

        return new Promise((resolve, reject) => {
            onValue(guestRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const guests: Guest[] = Object.values(snapshot.val());
                    const index = guests.findIndex(g => g.id === guestId);

                    if (index !== -1) {
                        const updates: Record<string, any> = {};
                        updates[`sessions/${sessionId}/guests/${index}/guestStatus`] = status;
                        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdate`] = Date.now();
                        updates[`sessions/${sessionId}/guests/${index}/lastStatusUpdatedBy`] = updatedBy;

                        await update(ref(db!), updates);
                        resolve();
                    } else {
                        reject(new Error('Guest not found'));
                    }
                }
                off(guestRef);
            }, { onlyOnce: true });
        });
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
        const guestRef = ref(db, `sessions/${sessionId}/guests`);

        return new Promise((resolve, reject) => {
            onValue(guestRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const guests: Guest[] = Object.values(snapshot.val());
                    const index = guests.findIndex(g => g.id === guestId);

                    if (index !== -1) {
                        const updates: Record<string, any> = {};
                        updates[`sessions/${sessionId}/guests/${index}/inRoomDelivered`] = delivered;
                        if (delivered && deliveredBy) {
                            updates[`sessions/${sessionId}/guests/${index}/inRoomDeliveredBy`] = deliveredBy;
                            updates[`sessions/${sessionId}/guests/${index}/inRoomDeliveredAt`] = Date.now();
                        }

                        await update(ref(db!), updates);
                        resolve();
                    } else {
                        reject(new Error('Guest not found'));
                    }
                }
                off(guestRef);
            }, { onlyOnce: true });
        });
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
        const guestRef = ref(db, `sessions/${sessionId}/guests`);

        return new Promise((resolve, reject) => {
            onValue(guestRef, async (snapshot) => {
                if (snapshot.exists()) {
                    const guests: Guest[] = Object.values(snapshot.val());
                    const index = guests.findIndex(g => g.id === guestId);

                    if (index !== -1) {
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

                        await update(ref(db!), updates);
                        resolve();
                    } else {
                        reject(new Error('Guest not found'));
                    }
                }
                off(guestRef);
            }, { onlyOnce: true });
        });
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

    return () => off(sessionsRef);
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

    return () => off(presenceRef);
}

// === Chat System ===

export interface ChatMessage {
    id: string;
    author: string;
    department: string;
    text: string;
    timestamp: number;
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

    return () => off(chatRef);
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
