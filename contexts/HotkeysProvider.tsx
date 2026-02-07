import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PrintMode } from '../types';

interface HotkeysContextValue {
    printMode: PrintMode;
    triggerPrint: (mode: PrintMode) => void;
    registerActions: (actions: HotkeyActions) => void;
}

interface HotkeyActions {
    hasGuests: boolean;
    onExcelExport: () => void;
}

const HotkeysContext = createContext<HotkeysContextValue | null>(null);

export const useHotkeys = (): HotkeysContextValue => {
    const ctx = useContext(HotkeysContext);
    if (!ctx) throw new Error('useHotkeys must be used within a HotkeysProvider');
    return ctx;
};

export const HotkeysProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [printMode, setPrintMode] = useState<PrintMode>('master');
    const actionsRef = useRef<HotkeyActions>({ hasGuests: false, onExcelExport: () => { } });

    const triggerPrint = useCallback((mode: PrintMode) => {
        setPrintMode(mode);
        setTimeout(() => { window.print(); }, 300);
    }, []);

    const registerActions = useCallback((actions: HotkeyActions) => {
        actionsRef.current = actions;
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const { hasGuests, onExcelExport } = actionsRef.current;
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                if (hasGuests) triggerPrint('master');
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                if (hasGuests) onExcelExport();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [triggerPrint]);

    return (
        <HotkeysContext.Provider value={{ printMode, triggerPrint, registerActions }}>
            {children}
        </HotkeysContext.Provider>
    );
};
