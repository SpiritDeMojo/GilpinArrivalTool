import { initializeApp, FirebaseApp } from 'firebase/app';
import {
    getDatabase,
    ref,
    set,
    onValue,
    update,
    Database,
    off,
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
 * Sync entire session to Firebase
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
