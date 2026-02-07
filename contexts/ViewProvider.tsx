import React, { createContext, useContext, useState, useCallback } from 'react';
import { DashboardView } from '../types';

interface ViewContextValue {
    dashboardView: DashboardView;
    setDashboardView: (view: DashboardView) => void;
    showAnalytics: boolean;
    toggleAnalytics: () => void;
    showTimeline: boolean;
    setShowTimeline: (show: boolean) => void;
}

const ViewContext = createContext<ViewContextValue | null>(null);

export const useView = (): ViewContextValue => {
    const ctx = useContext(ViewContext);
    if (!ctx) throw new Error('useView must be used within a ViewProvider');
    return ctx;
};

export const ViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [dashboardView, setDashboardView] = useState<DashboardView>('arrivals');
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showTimeline, setShowTimeline] = useState(true);

    const toggleAnalytics = useCallback(() => setShowAnalytics(prev => !prev), []);

    return (
        <ViewContext.Provider value={{
            dashboardView,
            setDashboardView,
            showAnalytics,
            toggleAnalytics,
            showTimeline,
            setShowTimeline,
        }}>
            {children}
        </ViewContext.Provider>
    );
};
