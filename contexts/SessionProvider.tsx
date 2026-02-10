import React, { createContext, useContext, useMemo } from 'react';

// ── Session / Connection Context ───────────────────────────────────────────
// Manages Firebase connection state, reconnect actions, and share URLs.
// Separated so that connection status changes (which pulse frequently)
// don't re-render data-heavy components.

export type ConnectionStatus = 'connected' | 'connecting' | 'offline';

export interface SessionContextValue {
    firebaseEnabled: boolean;
    connectionStatus: ConnectionStatus;
    manualReconnect: () => void;
    shareSession: () => Promise<string>;
    getShareUrl: () => string;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const useSession = (): SessionContextValue => {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession must be used within a SessionProvider');
    return ctx;
};

interface SessionProviderProps {
    children: React.ReactNode;
    firebaseEnabled: boolean;
    connectionStatus: ConnectionStatus;
    manualReconnect: () => void;
    shareSession: () => Promise<string>;
    getShareUrl: () => string;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({
    children,
    firebaseEnabled, connectionStatus, manualReconnect, shareSession, getShareUrl,
}) => {
    const value = useMemo<SessionContextValue>(() => ({
        firebaseEnabled, connectionStatus, manualReconnect, shareSession, getShareUrl,
    }), [firebaseEnabled, connectionStatus, manualReconnect, shareSession, getShareUrl]);

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
};
