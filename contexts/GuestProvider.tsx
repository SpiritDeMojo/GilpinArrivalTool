import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from './UserProvider';
import { useView } from './ViewProvider';
import { useHotkeys } from './HotkeysProvider';
import {
    FilterType,
    PrintMode,
    PropertyFilter,
    HKStatus,
    MaintenanceStatus,
    GuestStatus,
    CourtesyCallNote,
    RoomNote,
    Guest,
    ArrivalSession,
    DashboardView
} from '../types';
import { DEFAULT_FLAGS } from '../constants';

import { useGuestManager, ConnectionStatus } from '../hooks/useGuestManager';
import { forceReconnect } from '../services/firebaseService';
import { useLiveAssistant } from '../hooks/useLiveAssistant';
import { useNotifications } from '../hooks/useNotifications';
import { useAuditLog } from '../hooks/useAuditLog';

// ── Context value type ─────────────────────────────────────────────────────
export interface GuestContextValue {
    // Guest data
    guests: Guest[];
    filteredGuests: Guest[];
    propertyFilteredGuests: Guest[];
    arrivalDateStr: string;
    isOldFile: boolean;

    // Filters
    activeFilter: FilterType;
    setActiveFilter: (f: FilterType) => void;
    propertyFilter: PropertyFilter;
    setPropertyFilter: (f: PropertyFilter) => void;

    // Processing
    isProcessing: boolean;
    progressMsg: string;
    currentBatch: number;
    totalBatches: number;
    auditPhase?: 'parsing' | 'auditing' | 'applying' | 'complete';
    auditGuestNames: string[];

    // Guest actions
    handleFileUpload: (file: File) => void;
    handleAIRefine: () => void;
    updateGuest: (id: string, updates: Partial<Guest>) => void;
    deleteGuest: (id: string) => void;
    addManual: () => void;
    duplicateGuest: (id: string) => void;
    onExcelExport: () => void;

    // Sessions
    sessions: ArrivalSession[];
    activeSessionId: string;
    switchSession: (id: string) => void;
    deleteSession: (id: string) => void;
    createNewSession: () => void;
    joinSession: (session: ArrivalSession) => void;

    // Firebase
    firebaseEnabled: boolean;
    connectionStatus: ConnectionStatus;
    shareSession: () => Promise<string>;
    getShareUrl: () => string;
    manualReconnect: () => void;

    // Session lock
    isSessionLocked: boolean;
    lockSession: () => void;
    unlockSession: () => void;

    // Department status handlers
    handleUpdateHKStatus: (guestId: string, status: HKStatus) => void;
    handleUpdateMaintenanceStatus: (guestId: string, status: MaintenanceStatus) => void;
    handleUpdateGuestStatus: (guestId: string, status: GuestStatus) => void;
    handleUpdateInRoomDelivery: (guestId: string, delivered: boolean) => void;

    // Note handlers
    handleAddRoomNote: (guestId: string, note: Omit<RoomNote, 'id' | 'timestamp'>) => void;
    handleResolveNote: (guestId: string, noteId: string, resolvedBy: string) => void;
    handleAddCourtesyNote: (guestId: string, note: Omit<CourtesyCallNote, 'id' | 'timestamp'>) => void;

    // Audit log
    auditLogGuest: Guest | null;
    setAuditLogGuest: (g: Guest | null) => void;

    // Notifications
    isMuted: boolean;
    toggleMute: () => void;
    notifications: any[];
    badges: { housekeeping: number; maintenance: number; reception: number };
    dismissNotification: (id: string) => void;
    clearAllNotifications: () => void;
    clearBadge: (view: DashboardView) => void;

    // Live Assistant
    isLiveActive: boolean;
    isMicEnabled: boolean;
    transcriptions: any[];
    interimInput: string;
    interimOutput: string;
    errorMessage: string;
    hasMic: boolean;
    startLiveAssistant: () => void;
    toggleMic: () => void;
    sendTextMessage: (msg: string) => void;
    disconnect: () => void;
    clearHistory: () => void;

    // UI helpers
    showSessionBrowser: boolean;
    isSticky: boolean;
    isSopOpen: boolean;
    setIsSopOpen: (open: boolean) => void;
    expandedRows: Set<string>;
    toggleExpand: (id: string) => void;
    mainPaddingTop: string;
}

const GuestContext = createContext<GuestContextValue | null>(null);

export const useGuestContext = (): GuestContextValue => {
    const ctx = useContext(GuestContext);
    if (!ctx) throw new Error('useGuestContext must be used within a GuestProvider');
    return ctx;
};

// ── Provider ───────────────────────────────────────────────────────────────
export const GuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userName, department } = useUser();
    const { dashboardView, setDashboardView } = useView();
    const { registerActions } = useHotkeys();
    const isRec = department === 'REC';

    // ── Core data hook ──────────────────────────────────────────────────────
    const {
        guests, filteredGuests, arrivalDateStr, isOldFile, activeFilter, setActiveFilter,
        isProcessing, progressMsg, currentBatch, totalBatches, auditPhase, auditGuestNames,
        handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, duplicateGuest, onExcelExport,
        sessions, activeSessionId, switchSession, deleteSession, createNewSession,
        joinSession,
        firebaseEnabled, connectionStatus,
        shareSession, getShareUrl,
        isSessionLocked, lockSession, unlockSession,
        manualReconnect
    } = useGuestManager(DEFAULT_FLAGS);

    // ── Local UI state ──────────────────────────────────────────────────────
    const [isSticky, setIsSticky] = useState(false);
    const [isSopOpen, setIsSopOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('total');
    const [auditLogGuest, setAuditLogGuest] = useState<Guest | null>(null);

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

    // ── Scroll listener ─────────────────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => { if (guests.length > 0) setIsSticky(window.scrollY > 40); };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [guests.length]);

    // ── Auto-set dashboard view based on department ─────────────────────────
    useEffect(() => {
        if (!department) return;
        const allowed: Record<string, string[]> = {
            HK: ['housekeeping'],
            MAIN: ['maintenance'],
            REC: ['arrivals', 'housekeeping', 'maintenance', 'reception'],
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

    const mainPaddingTop = isOldFile && guests.length > 0
        ? 'calc(var(--nav-height) + var(--alert-height))'
        : 'var(--nav-height)';

    const toggleExpand = useCallback((id: string) => {
        setExpandedRows(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
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
    const { isMuted, toggleMute, notifications, badges, dismissNotification, clearAllNotifications, clearBadge } = useNotifications(guests);

    // ── Context value (stable via useMemo) ──────────────────────────────────
    const value = useMemo<GuestContextValue>(() => ({
        guests, filteredGuests, propertyFilteredGuests, arrivalDateStr, isOldFile,
        activeFilter, setActiveFilter, propertyFilter, setPropertyFilter,
        isProcessing, progressMsg, currentBatch, totalBatches, auditPhase, auditGuestNames,
        handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, duplicateGuest, onExcelExport,
        sessions, activeSessionId, switchSession, deleteSession, createNewSession, joinSession,
        firebaseEnabled, connectionStatus, shareSession, getShareUrl,
        isSessionLocked, lockSession, unlockSession, manualReconnect,
        handleUpdateHKStatus, handleUpdateMaintenanceStatus, handleUpdateGuestStatus, handleUpdateInRoomDelivery,
        handleAddRoomNote, handleResolveNote, handleAddCourtesyNote,
        auditLogGuest, setAuditLogGuest,
        isMuted, toggleMute, notifications, badges, dismissNotification, clearAllNotifications, clearBadge,
        isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput, errorMessage, hasMic,
        startLiveAssistant, toggleMic, sendTextMessage, disconnect, clearHistory,
        showSessionBrowser, isSticky, isSopOpen, setIsSopOpen, expandedRows, toggleExpand, mainPaddingTop,
    }), [
        guests, filteredGuests, propertyFilteredGuests, arrivalDateStr, isOldFile,
        activeFilter, setActiveFilter, propertyFilter, setPropertyFilter,
        isProcessing, progressMsg, currentBatch, totalBatches, auditPhase, auditGuestNames,
        handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, duplicateGuest, onExcelExport,
        sessions, activeSessionId, switchSession, deleteSession, createNewSession, joinSession,
        firebaseEnabled, connectionStatus, shareSession, getShareUrl,
        isSessionLocked, lockSession, unlockSession, manualReconnect,
        handleUpdateHKStatus, handleUpdateMaintenanceStatus, handleUpdateGuestStatus, handleUpdateInRoomDelivery,
        handleAddRoomNote, handleResolveNote, handleAddCourtesyNote,
        auditLogGuest,
        isMuted, toggleMute, notifications, badges, dismissNotification, clearAllNotifications, clearBadge,
        isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput, errorMessage, hasMic,
        startLiveAssistant, toggleMic, sendTextMessage, disconnect, clearHistory,
        showSessionBrowser, isSticky, isSopOpen, expandedRows, toggleExpand, mainPaddingTop,
    ]);

    return (
        <GuestContext.Provider value={value}>
            {children}
        </GuestContext.Provider>
    );
};
