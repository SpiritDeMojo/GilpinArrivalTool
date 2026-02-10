import React, { createContext, useContext, useMemo } from 'react';
import {
    Guest, FilterType, ArrivalSession, PropertyFilter,
    HKStatus, MaintenanceStatus, GuestStatus,
    RoomNote, CourtesyCallNote
} from '../types';
import type { DashboardView } from '../types';

// ── Guest Data Context ─────────────────────────────────────────────────────
// The core data context: guests, sessions, CRUD operations, status handlers,
// note handlers, filters, processing state, lock state, and notifications.
//
// Separated from UI state (modals, expanded rows) and connection state
// (Firebase online/offline) so components only re-render when the data
// they actually consume changes.

export interface GuestDataContextValue {
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
    showSessionBrowser: boolean;

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

    // Notifications
    isMuted: boolean;
    toggleMute: () => void;
    notifications: any[];
    badges: { housekeeping: number; maintenance: number; reception: number };
    pushNotification: (notif: any) => void;
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
}

const GuestDataContext = createContext<GuestDataContextValue | null>(null);

export const useGuestData = (): GuestDataContextValue => {
    const ctx = useContext(GuestDataContext);
    if (!ctx) throw new Error('useGuestData must be used within a GuestDataProvider');
    return ctx;
};

interface GuestDataProviderProps {
    children: React.ReactNode;
    value: GuestDataContextValue;
}

export const GuestDataProvider: React.FC<GuestDataProviderProps> = ({ children, value }) => {
    return (
        <GuestDataContext.Provider value={value}>
            {children}
        </GuestDataContext.Provider>
    );
};
