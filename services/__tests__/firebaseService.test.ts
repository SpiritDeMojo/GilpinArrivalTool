import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Firebase SDK Mock ───────────────────────────────────────────────────────
// We mock the entire firebase/database module so tests run without a real
// Firebase backend.  The critical assertion: update functions must use `get()`
// for one-time reads, NOT `onValue()` + `off()` — because `off()` kills ALL
// concurrent listeners on that ref, silently breaking real-time sync.

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockOnValue = vi.fn();
const mockOff = vi.fn();
const mockRef = vi.fn((db: any, path?: string) => ({ _path: path || '/', _db: db }));
const mockGoOnline = vi.fn();
const mockOnDisconnect = vi.fn(() => ({ set: vi.fn(), remove: vi.fn() }));
const mockPush = vi.fn(() => ({ key: 'mock_push_key' }));
const mockRemove = vi.fn();
const mockServerTimestamp = vi.fn(() => 'SERVER_TIMESTAMP');

vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({ name: 'test-app' })),
    FirebaseApp: vi.fn()
}));

vi.mock('firebase/database', () => ({
    getDatabase: vi.fn(() => ({ _mockDb: true })),
    ref: mockRef,
    set: mockSet,
    get: mockGet,
    onValue: mockOnValue,
    update: mockUpdate,
    remove: mockRemove,
    off: mockOff,
    onDisconnect: mockOnDisconnect,
    goOnline: mockGoOnline,
    serverTimestamp: mockServerTimestamp,
    push: mockPush
}));

// Environment variables for Firebase config
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key');
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://test.firebaseio.com');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test.appspot.com');
vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123');
vi.stubEnv('VITE_FIREBASE_APP_ID', 'test-app-id');

describe('firebaseService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('updateRoomStatus (Bug 1 fix verification)', () => {
        it('should use get() for one-time read, NOT onValue()', async () => {
            const { initializeFirebase, updateRoomStatus } = await import('../firebaseService');
            initializeFirebase();

            // Mock get() to return a guest array
            mockGet.mockResolvedValueOnce({
                exists: () => true,
                val: () => ([
                    { id: 'guest-1', name: 'Alice', roomStatus: 'not_ready' },
                    { id: 'guest-2', name: 'Bob', roomStatus: 'not_ready' }
                ])
            });
            mockUpdate.mockResolvedValueOnce(undefined);

            await updateRoomStatus('session-123', 'guest-1', 'ready' as any, 'Housekeeper');

            // ✅ CRITICAL: get() MUST be called (not onValue)
            expect(mockGet).toHaveBeenCalledTimes(1);
            // ✅ onValue MUST NOT be called for a one-time read
            // (it would create a persistent listener that off() kills globally)
            expect(mockOnValue).not.toHaveBeenCalled();
            // ✅ off() MUST NOT be called (no listeners to clean up)
            expect(mockOff).not.toHaveBeenCalled();

            // ✅ update() should write the status change
            expect(mockUpdate).toHaveBeenCalledTimes(1);
            const updateCall = mockUpdate.mock.calls[0];
            const updates = updateCall[1];
            expect(updates['sessions/session-123/guests/0/roomStatus']).toBe('ready');
            expect(updates['sessions/session-123/guests/0/lastStatusUpdatedBy']).toBe('Housekeeper');
        });

        it('should throw if guest not found', async () => {
            const { initializeFirebase, updateRoomStatus } = await import('../firebaseService');
            initializeFirebase();

            mockGet.mockResolvedValueOnce({
                exists: () => true,
                val: () => ([{ id: 'other-guest', name: 'Eve' }])
            });

            await expect(
                updateRoomStatus('session-123', 'nonexistent', 'ready' as any)
            ).rejects.toThrow('Guest nonexistent not found');
        });
    });

    describe('updateGuestStatus (Bug 1 fix verification)', () => {
        it('should use get() for one-time read, NOT onValue()', async () => {
            const { initializeFirebase, updateGuestStatus } = await import('../firebaseService');
            initializeFirebase();

            mockGet.mockResolvedValueOnce({
                exists: () => true,
                val: () => ([
                    { id: 'guest-1', name: 'Alice', guestStatus: 'pending' }
                ])
            });
            mockUpdate.mockResolvedValueOnce(undefined);

            await updateGuestStatus('session-123', 'guest-1', 'arrived' as any, 'Receptionist');

            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockOnValue).not.toHaveBeenCalled();
            expect(mockOff).not.toHaveBeenCalled();

            const updates = mockUpdate.mock.calls[0][1];
            expect(updates['sessions/session-123/guests/0/guestStatus']).toBe('arrived');
        });
    });

    describe('updateInRoomDelivery (Bug 1 fix verification)', () => {
        it('should use get() and correctly set delivery fields', async () => {
            const { initializeFirebase, updateInRoomDelivery } = await import('../firebaseService');
            initializeFirebase();

            mockGet.mockResolvedValueOnce({
                exists: () => true,
                val: () => ([
                    { id: 'guest-1', name: 'Alice', inRoomDelivered: false }
                ])
            });
            mockUpdate.mockResolvedValueOnce(undefined);

            await updateInRoomDelivery('session-123', 'guest-1', true, 'Porter');

            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockOnValue).not.toHaveBeenCalled();
            expect(mockOff).not.toHaveBeenCalled();

            const updates = mockUpdate.mock.calls[0][1];
            expect(updates['sessions/session-123/guests/0/inRoomDelivered']).toBe(true);
            expect(updates['sessions/session-123/guests/0/inRoomDeliveredBy']).toBe('Porter');
        });
    });

    describe('addCourtesyCallNote (Bug 1 fix verification)', () => {
        it('should use get() and append the new note correctly', async () => {
            const { initializeFirebase, addCourtesyCallNote } = await import('../firebaseService');
            initializeFirebase();

            mockGet.mockResolvedValueOnce({
                exists: () => true,
                val: () => ([
                    { id: 'guest-1', name: 'Alice', courtesyCallNotes: [], guestStatus: 'pending' }
                ])
            });
            mockUpdate.mockResolvedValueOnce(undefined);

            await addCourtesyCallNote('session-123', 'guest-1', {
                response: 'Room is lovely',
                sentiment: 'positive',
                author: 'Reception'
            } as any);

            expect(mockGet).toHaveBeenCalledTimes(1);
            expect(mockOnValue).not.toHaveBeenCalled();
            expect(mockOff).not.toHaveBeenCalled();

            const updates = mockUpdate.mock.calls[0][1];
            const notes = updates['sessions/session-123/guests/0/courtesyCallNotes'];
            expect(notes).toHaveLength(1);
            expect(notes[0].response).toBe('Room is lovely');
            expect(notes[0].sentiment).toBe('positive');
            expect(updates['sessions/session-123/guests/0/guestStatus']).toBe('call_complete');
        });
    });

    describe('fetchSession (converted from onValue+off to get())', () => {
        it('should use get() for one-time read', async () => {
            const { initializeFirebase, fetchSession } = await import('../firebaseService');
            initializeFirebase();

            const mockSession = {
                id: 'sess-1',
                label: 'Test Session',
                guests: { 0: { id: 'g1', name: 'Alice' }, 1: { id: 'g2', name: 'Bob' } }
            };

            mockGet.mockResolvedValueOnce({
                exists: () => true,
                val: () => ({ ...mockSession })
            });

            const results: any[] = [];
            await fetchSession('sess-1', (session) => results.push(session));

            expect(mockGet).toHaveBeenCalledTimes(1);
            // onValue should NOT be called — fetchSession now uses get()
            expect(mockOnValue).not.toHaveBeenCalled();
            expect(mockOff).not.toHaveBeenCalled();

            // Session should be returned with guests as array
            expect(results).toHaveLength(1);
            expect(results[0]).not.toBeNull();
            expect(Array.isArray(results[0].guests)).toBe(true);
        });

        it('should return null for non-existent session', async () => {
            const { initializeFirebase, fetchSession } = await import('../firebaseService');
            initializeFirebase();

            mockGet.mockResolvedValueOnce({
                exists: () => false,
                val: () => null
            });

            const results: any[] = [];
            await fetchSession('nonexistent', (session) => results.push(session));

            expect(results).toEqual([null]);
        });
    });

    describe('subscribeToAllSessions', () => {
        it('should set up persistent onValue listener and return unsubscribe', async () => {
            const { initializeFirebase, subscribeToAllSessions } = await import('../firebaseService');
            initializeFirebase();

            // Mock onValue to capture the callback
            mockOnValue.mockImplementation((refObj, callback, errorHandler) => {
                // Simulate immediate data delivery
                callback({
                    exists: () => true,
                    val: () => ({
                        'sess-1': {
                            id: 'sess-1',
                            label: 'Day 1',
                            guests: [{ id: 'g1', name: 'Alice' }],
                            arrivalDate: '2026-02-08'
                        }
                    })
                });
                return vi.fn(); // return unsubscribe
            });

            const receivedSessions: any[] = [];
            const unsubscribe = subscribeToAllSessions((sessions) => {
                receivedSessions.push(...sessions);
            });

            // onValue SHOULD be used here — it's a persistent listener
            expect(mockOnValue).toHaveBeenCalled();
            expect(typeof unsubscribe).toBe('function');
            expect(receivedSessions.length).toBeGreaterThan(0);
        });
    });
});
