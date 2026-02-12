import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from './UserProvider';
import { useView } from './ViewProvider';
import { useHotkeys } from './HotkeysProvider';
import {
    Guest, Flag, FilterType, ArrivalSession, PropertyFilter,
    HKStatus, MaintenanceStatus, GuestStatus, TurndownStatus,
    RoomNote, CourtesyCallNote
} from '../types';
import { useGuestManager } from '../hooks/useGuestManager';
import { DEFAULT_FLAGS } from '../constants';
import { useLiveAssistant } from '../hooks/useLiveAssistant';
import { useNotifications } from '../hooks/useNotifications';
import { useAuditLog } from '../hooks/useAuditLog';

// ── Sub-context providers ──────────────────────────────────────────────────
import { GuestDataProvider, GuestDataContextValue, useGuestData } from './GuestDataProvider';
import { UIProvider, useUI } from './UIProvider';
import { SessionProvider, useSession, ConnectionStatus } from './SessionProvider';

// ── Legacy combined context (backward-compatible facade) ───────────────────
// useGuestContext() merges all 3 sub-contexts into one value.
// Existing consumers (App.tsx, ViewManager.tsx) continue to work unchanged.
// New components should prefer the granular hooks:
//   useGuestData()  — guests, sessions, CRUD, filters, status handlers
//   useUI()         — modals, expanded rows, sticky, padding
//   useSession()    — Firebase connection, reconnect, share URLs
export interface GuestContextValue extends GuestDataContextValue {
    // UI helpers (from UIProvider)
    isSticky: boolean;
    isSopOpen: boolean;
    setIsSopOpen: (open: boolean) => void;
    expandedRows: Set<string>;
    toggleExpand: (id: string) => void;
    auditLogGuest: Guest | null;
    setAuditLogGuest: (g: Guest | null) => void;
    mainPaddingTop: string;

    // Session/connection (from SessionProvider)
    firebaseEnabled: boolean;
    connectionStatus: ConnectionStatus;
    manualReconnect: () => void;
    shareSession: () => Promise<string>;
    getShareUrl: () => string;
}

const GuestContext = createContext<GuestContextValue | null>(null);

export const useGuestContext = (): GuestContextValue => {
    const ctx = useContext(GuestContext);
    if (!ctx) throw new Error('useGuestContext must be used within a GuestProvider');
    return ctx;
};

// ── Inner component that merges sub-contexts into the legacy facade ────────
// This runs inside all 3 sub-providers so it can call their hooks.
const GuestContextBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const guestData = useGuestData();
    const ui = useUI();
    const session = useSession();

    const value = useMemo<GuestContextValue>(() => ({
        ...guestData,
        ...ui,
        ...session,
    }), [guestData, ui, session]);

    return (
        <GuestContext.Provider value={value}>
            {children}
        </GuestContext.Provider>
    );
};

// ── Provider (composition root) ────────────────────────────────────────────
// This is the main provider that orchestrates hooks and distributes values
// into the 3 sub-contexts. It remains in index.tsx as <GuestProvider>.
export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userName, department, location } = useUser();
    const { dashboardView, setDashboardView } = useView();
    const { registerActions } = useHotkeys();
    const isRec = department === 'REC';

    // ── Core data hook ──────────────────────────────────────────────────────
    const {
        guests, filteredGuests, arrivalDateStr, isOldFile, activeFilter, setActiveFilter,
        isProcessing, progressMsg, currentBatch, totalBatches, auditPhase, auditGuestNames,
        handleFileUpload, handleAIRefine, updateGuest, updateGuestInSession, deleteGuest, addManual, duplicateGuest, onExcelExport,
        sessions, activeSessionId, switchSession, deleteSession, createNewSession,
        joinSession,
        firebaseEnabled, connectionStatus,
        shareSession, getShareUrl,
        isSessionLocked, lockSession, unlockSession, verifyTurndown,
        manualReconnect
    } = useGuestManager(DEFAULT_FLAGS);

    // ── Local UI state ──────────────────────────────────────────────────────
    // Property filter always defaults to 'total' so staff can see cross-property data.
    // The activeFilter stat cards (Main Hotel / Lake House) handle per-property focus.
    const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('total');

    // Default the stat card highlight to the user's location (if set)
    useEffect(() => {
        if (location === 'main') setActiveFilter('main');
        else if (location === 'lake') setActiveFilter('lake');
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps

    // Show session browser when no active session
    const showSessionBrowser = sessions.length === 0 && !isProcessing;

    // ── Property filter ─────────────────────────────────────────────────────
    const propertyFilteredGuests = useMemo(() => {
        let result = filteredGuests;
        if (propertyFilter !== 'total') {
            result = result.filter(g => {
                const rNum = parseInt(g.room.split(' ')[0]);
                if (propertyFilter === 'main') return rNum > 0 && rNum <= 31;
                if (propertyFilter === 'lake') return rNum >= 51 && rNum <= 58;
                return true;
            });
        }
        return result;
    }, [filteredGuests, propertyFilter]);

    // ── Auto-set dashboard view based on department ─────────────────────────
    useEffect(() => {
        if (!department) return;
        const allowed: Record<string, string[]> = {
            HK: ['housekeeping'],
            MAIN: ['maintenance'],
            REC: ['arrivals', 'housekeeping', 'maintenance', 'frontofhouse', 'nightmanager', 'packages'],
        };
        if (!allowed[department]?.includes(dashboardView)) {
            setDashboardView(allowed[department][0] as any);
        }
    }, [department, dashboardView, setDashboardView]);

    // ── Audit log ───────────────────────────────────────────────────────────
    const { auditedUpdate } = useAuditLog(guests, updateGuest);

    // ── Register hotkey actions ─────────────────────────────────────────────
    useEffect(() => {
        registerActions({ hasGuests: guests.length > 0, onExcelExport });
    }, [guests.length, onExcelExport, registerActions]);

    const toggleExpand = useCallback((id: string) => {
        // Managed by UIProvider now — this is just for the facade
    }, []);

    // ── Guarded update — prompts on locked sessions ────────────────────────
    const guardedUpdate = useCallback((guestId: string, updates: Partial<Guest>, updatedBy: string) => {
        if (isSessionLocked) {
            if (!window.confirm('This session is saved & locked. Save this change?')) {
                return; // User cancelled — discard the edit
            }
            // Re-lock with new timestamp after confirming
            lockSession();
        }
        auditedUpdate(guestId, updates, updatedBy);
    }, [isSessionLocked, auditedUpdate, lockSession]);

    // ── Status handlers ─────────────────────────────────────────────────────
    const handleUpdateHKStatus = useCallback((guestId: string, status: HKStatus) => {
        guardedUpdate(guestId, {
            hkStatus: status,
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: 'User'
        } as Partial<Guest>, 'User');
    }, [guardedUpdate]);

    const handleUpdateMaintenanceStatus = useCallback((guestId: string, status: MaintenanceStatus) => {
        guardedUpdate(guestId, {
            maintenanceStatus: status,
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: 'User'
        } as Partial<Guest>, 'User');
    }, [guardedUpdate]);

    const handleUpdateGuestStatus = useCallback((guestId: string, status: GuestStatus) => {
        guardedUpdate(guestId, {
            guestStatus: status,
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: 'User'
        } as Partial<Guest>, 'User');
    }, [guardedUpdate]);

    const handleUpdateInRoomDelivery = useCallback((guestId: string, delivered: boolean) => {
        guardedUpdate(guestId, {
            inRoomDelivered: delivered,
            inRoomDeliveredAt: delivered ? Date.now() : undefined,
            inRoomDeliveredBy: delivered ? userName || 'Unknown' : undefined
        } as Partial<Guest>, userName || 'Unknown');
    }, [guardedUpdate, userName]);

    // ── Note handlers ───────────────────────────────────────────────────────
    const handleAddRoomNote = useCallback((guestId: string, note: Omit<RoomNote, 'id' | 'timestamp'>) => {
        const guest = guests.find(g => g.id === guestId);
        if (!guest) return;

        const newNote: RoomNote = {
            id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...note
        };

        const existingNotes = guest.roomNotes || [];
        updateGuest(guestId, {
            roomNotes: [...existingNotes, newNote],
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: note.author
        } as Partial<Guest>);
    }, [guests, updateGuest]);

    const handleResolveNote = useCallback((guestId: string, noteId: string, resolvedBy: string) => {
        const guest = guests.find(g => g.id === guestId);
        if (!guest) return;

        const updatedNotes = (guest.roomNotes || []).map(note =>
            note.id === noteId
                ? { ...note, resolved: true, resolvedBy, resolvedAt: Date.now() }
                : note
        );

        updateGuest(guestId, {
            roomNotes: updatedNotes,
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: resolvedBy
        } as Partial<Guest>);
    }, [guests, updateGuest]);

    const handleAddCourtesyNote = useCallback((guestId: string, note: Omit<CourtesyCallNote, 'id' | 'timestamp'>) => {
        const guest = guests.find(g => g.id === guestId);
        if (!guest) return;

        const newNote: CourtesyCallNote = {
            id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            ...note
        };

        const existingNotes = guest.courtesyCallNotes || [];
        updateGuest(guestId, {
            courtesyCallNotes: [...existingNotes, newNote],
            guestStatus: 'call_complete' as GuestStatus,
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: note.author
        } as Partial<Guest>);
    }, [guests, updateGuest]);
    // ── Turndown handlers (cross-session) ────────────────────────────────────
    const handleUpdateTurndownStatus = useCallback((guestId: string, status: TurndownStatus, originSessionId: string) => {
        updateGuestInSession(originSessionId, guestId, {
            turndownStatus: status,
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: userName || 'User'
        } as Partial<Guest>);
    }, [updateGuestInSession, userName]);

    const handleUpdateDinnerTime = useCallback((guestId: string, dinnerTime: string, originSessionId: string) => {
        updateGuestInSession(originSessionId, guestId, {
            dinnerTime,
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: userName || 'User'
        } as Partial<Guest>);
    }, [updateGuestInSession, userName]);

    const handleUpdateDinnerVenue = useCallback((guestId: string, venue: string, originSessionId: string) => {
        updateGuestInSession(originSessionId, guestId, {
            dinnerVenue: venue,
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: userName || 'User'
        } as Partial<Guest>);
    }, [updateGuestInSession, userName]);

    // ── AI guest update handler ─────────────────────────────────────────────
    const handleAIUpdateGuest = useCallback((guestId: string, updates: Partial<Guest>) => {
        auditedUpdate(guestId, {
            ...updates,
            lastStatusUpdate: Date.now(),
            lastStatusUpdatedBy: 'AI Assistant'
        } as Partial<Guest>, 'AI Assistant');
    }, [auditedUpdate]);

    // ── Live Assistant ──────────────────────────────────────────────────────
    const {
        isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput, errorMessage, hasMic,
        startLiveAssistant, toggleMic, sendTextMessage, disconnect, clearHistory
    } = useLiveAssistant({ guests, onAddRoomNote: handleAddRoomNote, onUpdateGuest: handleAIUpdateGuest });

    // ── Notifications ───────────────────────────────────────────────────────
    const { isMuted, toggleMute, notifications, badges, pushNotification, dismissNotification, clearAllNotifications, clearBadge } = useNotifications(guests);

    // ── Compute mainPaddingTop ──────────────────────────────────────────────
    const mainPaddingTop = isOldFile && guests.length > 0
        ? 'calc(var(--nav-height) + var(--alert-height))'
        : 'var(--nav-height)';

    // ── Build sub-context values ────────────────────────────────────────────
    const guestDataValue = useMemo<GuestDataContextValue>(() => ({
        guests, filteredGuests, propertyFilteredGuests, arrivalDateStr, isOldFile,
        activeFilter, setActiveFilter, propertyFilter, setPropertyFilter,
        isProcessing, progressMsg, currentBatch, totalBatches, auditPhase, auditGuestNames,
        handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, duplicateGuest, onExcelExport,
        sessions, activeSessionId, switchSession, deleteSession, createNewSession, joinSession,
        showSessionBrowser,
        isSessionLocked, lockSession, unlockSession, verifyTurndown,
        handleUpdateHKStatus, handleUpdateMaintenanceStatus, handleUpdateGuestStatus, handleUpdateInRoomDelivery,
        handleAddRoomNote, handleResolveNote, handleAddCourtesyNote,
        handleUpdateTurndownStatus, handleUpdateDinnerTime, handleUpdateDinnerVenue,
        isMuted, toggleMute, notifications, badges, pushNotification, dismissNotification, clearAllNotifications, clearBadge,
        isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput, errorMessage, hasMic,
        startLiveAssistant, toggleMic, sendTextMessage, disconnect, clearHistory,
        // Connection fields also go here for the data context (duplicated in SessionProvider for granularity)
        firebaseEnabled, connectionStatus, manualReconnect, shareSession, getShareUrl,
    }), [
        guests, filteredGuests, propertyFilteredGuests, arrivalDateStr, isOldFile,
        activeFilter, setActiveFilter, propertyFilter, setPropertyFilter,
        isProcessing, progressMsg, currentBatch, totalBatches, auditPhase, auditGuestNames,
        handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, duplicateGuest, onExcelExport,
        sessions, activeSessionId, switchSession, deleteSession, createNewSession, joinSession,
        showSessionBrowser,
        isSessionLocked, lockSession, unlockSession, verifyTurndown,
        handleUpdateHKStatus, handleUpdateMaintenanceStatus, handleUpdateGuestStatus, handleUpdateInRoomDelivery,
        handleAddRoomNote, handleResolveNote, handleAddCourtesyNote,
        handleUpdateTurndownStatus, handleUpdateDinnerTime, handleUpdateDinnerVenue,
        isMuted, toggleMute, notifications, badges, pushNotification, dismissNotification, clearAllNotifications, clearBadge,
        isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput, errorMessage, hasMic,
        startLiveAssistant, toggleMic, sendTextMessage, disconnect, clearHistory,
        firebaseEnabled, connectionStatus, manualReconnect, shareSession, getShareUrl,
    ]);

    return (
        <UIProvider>
            <SessionProvider
                firebaseEnabled={firebaseEnabled}
                connectionStatus={connectionStatus as ConnectionStatus}
                manualReconnect={manualReconnect}
                shareSession={shareSession}
                getShareUrl={getShareUrl}
            >
                <GuestDataProvider value={guestDataValue}>
                    <GuestContextBridge>
                        {children}
                    </GuestContextBridge>
                </GuestDataProvider>
            </SessionProvider>
        </UIProvider>
    );
};
