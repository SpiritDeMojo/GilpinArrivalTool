import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Guest } from '../types';

// ── UI Context ─────────────────────────────────────────────────────────────
// Manages UI-only state: modals, expanded rows, padding, audit log guest.
// Separated from data/session contexts to prevent unnecessary re-renders
// when UI toggles don't affect data-consuming components.

export interface UIContextValue {
    isSticky: boolean;
    isSopOpen: boolean;
    setIsSopOpen: (open: boolean) => void;
    expandedRows: Set<string>;
    toggleExpand: (id: string) => void;
    auditLogGuest: Guest | null;
    setAuditLogGuest: (g: Guest | null) => void;
    mainPaddingTop: string;
    setMainPaddingTop: (pt: string) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export const useUI = (): UIContextValue => {
    const ctx = useContext(UIContext);
    if (!ctx) throw new Error('useUI must be used within a UIProvider');
    return ctx;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSticky, setIsSticky] = useState(false);
    const [isSopOpen, setIsSopOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [auditLogGuest, setAuditLogGuest] = useState<Guest | null>(null);
    const [mainPaddingTop, setMainPaddingTop] = useState('var(--nav-height)');

    // ── Scroll listener ─────────────────────────────────────────────────────
    useEffect(() => {
        const handleScroll = () => setIsSticky(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleExpand = useCallback((id: string) => {
        setExpandedRows(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    }, []);

    const value = useMemo<UIContextValue>(() => ({
        isSticky, isSopOpen, setIsSopOpen, expandedRows, toggleExpand,
        auditLogGuest, setAuditLogGuest, mainPaddingTop, setMainPaddingTop,
    }), [isSticky, isSopOpen, expandedRows, toggleExpand, auditLogGuest, mainPaddingTop]);

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};
