import React, { useRef, useMemo, useState } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { useView } from '../contexts/ViewProvider';
import { useUser } from '../contexts/UserProvider';
import { useGuestContext } from '../contexts/GuestProvider';

import Dashboard from './Dashboard';
import GuestRow from './GuestRow';
import GuestMobileCard from './GuestMobileCard';
import SessionBar from './SessionBar';
import AnalyticsView from './AnalyticsView';
import ETATimeline from './ETATimeline';
import ConflictDetector from './ConflictDetector';
import ErrorBoundary from './ErrorBoundary';
import HousekeepingDashboard from './HousekeepingDashboard';
import MaintenanceDashboard from './MaintenanceDashboard';
import ReceptionDashboard from './ReceptionDashboard';
import TurndownDashboard from './TurndownDashboard';
import InHouseDashboard from './NightManagerDashboard';
const PackageGenerator = React.lazy(() => import('./PackageGenerator'));
import { Guest, DashboardView } from '../types';

/* ── Tab order for directional transitions ── */
const TAB_ORDER: DashboardView[] = ['arrivals', 'housekeeping', 'maintenance', 'frontofhouse', 'inhouse', 'packages'];

/* ── Directional page-transition variants ── */
const getPageVariants = (direction: number) => ({
    initial: { opacity: 0, x: direction * 60, scale: 0.96, filter: 'blur(6px)' },
    animate: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, x: direction * -40, scale: 0.97, filter: 'blur(4px)' },
});

const pageTransition = { type: 'spring' as const, stiffness: 400, damping: 35, mass: 0.8 };

/* ── Tab button config ── */
interface TabConfig {
    key: DashboardView;
    emoji: string;
    labelFull: string;
    labelShort: string;
    badgeColor: string;
    departments: string[];
}

const TABS: TabConfig[] = [
    { key: 'arrivals', emoji: '📋', labelFull: 'Arrivals', labelShort: 'Arr', badgeColor: '', departments: ['REC'] },
    { key: 'housekeeping', emoji: '🧹', labelFull: 'Housekeeping', labelShort: 'HK', badgeColor: 'bg-green-500', departments: ['HK', 'REC'] },
    { key: 'maintenance', emoji: '🔧', labelFull: 'Maintenance', labelShort: 'Maint', badgeColor: 'bg-amber-500', departments: ['MAIN', 'REC'] },
    { key: 'frontofhouse', emoji: '🛎️', labelFull: 'Front of House', labelShort: 'FoH', badgeColor: 'bg-blue-500', departments: ['REC'] },
    { key: 'inhouse', emoji: '🏠', labelFull: 'In House', labelShort: 'IH', badgeColor: 'bg-indigo-600', departments: ['REC'] },
];

const ViewManager: React.FC = () => {
    const { dashboardView, setDashboardView, showAnalytics, showTimeline } = useView();
    const { department } = useUser();
    const isRec = department === 'REC';
    const prevViewRef = useRef<DashboardView>(dashboardView);

    const {
        guests, filteredGuests, propertyFilteredGuests,
        activeFilter, setActiveFilter, propertyFilter, setPropertyFilter,
        sessions, activeSessionId, switchSession, deleteSession, createNewSession,
        updateGuest, deleteGuest, duplicateGuest,
        handleUpdateHKStatus, handleUpdateMaintenanceStatus, handleUpdateGuestStatus,
        handleUpdateInRoomDelivery, handleAddRoomNote, handleResolveNote, handleAddCourtesyNote,
        badges, clearBadge,
        expandedRows, toggleExpand,
        isSticky, isOldFile,
        setAuditLogGuest,
        handleFileUpload,
        handleUpdateTurndownStatus,
        handleUpdateDinnerTime,
        handleUpdateDinnerVenue,
        verifyTurndown,
    } = useGuestContext();

    /* HK sub-tab: arrivals cleaning vs turndown */
    const [hkSubTab, setHkSubTab] = useState<'arrivals' | 'turndown'>('arrivals');

    const { userName } = useUser();
    const activeSession = sessions?.find(s => s.id === activeSessionId) || null;

    /* Compute transition direction based on tab order */
    const direction = useMemo(() => {
        const prevIdx = TAB_ORDER.indexOf(prevViewRef.current);
        const currIdx = TAB_ORDER.indexOf(dashboardView);
        const dir = currIdx > prevIdx ? 1 : -1;
        prevViewRef.current = dashboardView;
        return dir;
    }, [dashboardView]);

    const pageVariants = useMemo(() => getPageVariants(direction), [direction]);

    /* Visible tabs based on department */
    const visibleTabs = useMemo(() =>
        TABS.filter(t => t.departments.includes(department)),
        [department]
    );

    /* Compute top offset: nav-height + optional alert banner */
    const stickyTop = (isOldFile && guests.length > 0)
        ? 'calc(var(--nav-height) + var(--alert-height))'
        : 'var(--nav-height)';

    const handleTabClick = (tab: DashboardView) => {
        setDashboardView(tab);
        if (tab !== 'arrivals') clearBadge(tab as any);
        document.dispatchEvent(new CustomEvent('gilpin:viewchange'));
    };

    return (
        <>
            {/* ─── Docking Tabs with Sliding Pill ─── */}
            {guests.length > 0 && dashboardView !== 'packages' && (
                <div
                    className={`no-print dashboard-view-tabs transition-all duration-300 ${isSticky
                        ? 'fixed left-0 right-0 z-[1005] shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md dock-attached'
                        : ''
                        }`}
                    style={isSticky ? { top: stickyTop } : {}}
                >
                    <LayoutGroup>
                        <div className="view-tabs-container">
                            {visibleTabs.map((tab, i) => (
                                <motion.button
                                    key={tab.key}
                                    initial={{ opacity: 0, y: 10, scale: 0.92 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 350, damping: 22 }}
                                    whileHover={{ scale: 1.05, y: -1 }}
                                    whileTap={{ scale: 0.93 }}
                                    className={`view-tab ${dashboardView === tab.key ? 'active' : ''}`}
                                    onClick={() => handleTabClick(tab.key)}
                                    style={{ position: 'relative' }}
                                >
                                    {/* Sliding pill — shared layout animation */}
                                    {dashboardView === tab.key && (
                                        <motion.div
                                            layoutId="activeTabPill"
                                            className="active-tab-pill"
                                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: 'inherit',
                                                background: 'var(--gilpin-gold)',
                                                zIndex: 0,
                                            }}
                                        />
                                    )}

                                    {/* Tab content — above the pill */}
                                    <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span className="tab-emoji">{tab.emoji} </span>
                                        {tab.key === 'arrivals' ? (
                                            <>{tab.labelFull} ({guests.length})</>
                                        ) : (
                                            <>
                                                <span className="tab-label-full">{tab.labelFull}</span>
                                                <span className="tab-label-short">{tab.labelShort}</span>
                                            </>
                                        )}
                                    </span>

                                    {/* Animated badge */}
                                    {tab.key !== 'arrivals' && (badges as any)[tab.key] > 0 && dashboardView !== tab.key && (
                                        <motion.span
                                            className={`tab-badge-dot ${tab.badgeColor}`}
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                            style={{ position: 'relative', zIndex: 1 }}
                                        >
                                            {(badges as any)[tab.key]}
                                        </motion.span>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </LayoutGroup>
                </div>
            )}

            {/* ─── Dashboard Stats (arrivals only) ─── */}
            {guests.length > 0 && dashboardView === 'arrivals' && (
                <motion.div
                    className="no-print relative my-2 md:my-6"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="dashboard-container no-print py-4 md:py-6">
                        <Dashboard
                            guests={guests}
                            activeFilter={activeFilter}
                            onFilterChange={setActiveFilter}
                            propertyFilter={propertyFilter}
                            onPropertyChange={setPropertyFilter}
                        />
                    </div>
                </motion.div>
            )}

            <main className="max-w-[1800px] mx-auto px-4 md:px-10 pb-32 no-print">
                {dashboardView !== 'packages' && (
                    <SessionBar
                        sessions={sessions}
                        activeId={activeSessionId}
                        onSwitch={switchSession}
                        onDelete={deleteSession}
                        onCreate={createNewSession}
                    />
                )}

                {isRec && showAnalytics && dashboardView !== 'packages' && (
                    <AnalyticsView
                        activeGuests={guests}
                        allSessions={sessions}
                        activeFilter={activeFilter}
                    />
                )}

                {/* Package Generator — full-page tool view */}
                {dashboardView === 'packages' ? (
                    <React.Suspense fallback={
                        <div className="flex items-center justify-center min-h-[60vh]">
                            <div className="text-center">
                                <span className="text-4xl animate-pulse">📦</span>
                                <p className="text-sm mt-4 opacity-50 font-semibold uppercase tracking-wider">Loading Package Generator…</p>
                            </div>
                        </div>
                    }>
                        <PackageGenerator />
                    </React.Suspense>
                ) : guests.length === 0 ? (
                    <motion.div
                        className="flex flex-col items-center justify-center min-h-[60vh] px-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <motion.div
                            className="w-full max-w-md p-10 md:p-24 border-2 border-dashed border-[#c5a065]/40 rounded-[2.5rem] md:rounded-[3rem] bg-white/50 dark:bg-white/5 backdrop-blur flex flex-col items-center gap-6 md:gap-8 cursor-pointer hover:border-[#c5a065] transition-all"
                            onClick={() => document.getElementById('file-upload-nav')?.click()}
                            whileHover={{ scale: 1.02, borderColor: '#c5a065' }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <motion.span
                                className="text-4xl md:text-6xl"
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                📁
                            </motion.span>
                            <div className="text-center">
                                <h2 className="heading-font text-3xl md:text-5xl font-black uppercase tracking-tighter mb-2">Arrivals Hub</h2>
                                <p className="text-[#c5a065] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-[10px] md:text-sm">Deploy Arrivals Stream</p>
                            </div>
                        </motion.div>
                    </motion.div>
                ) : (
                    <ErrorBoundary>
                        {/* ─── AnimatePresence: directional view switching ─── */}
                        <AnimatePresence mode="wait" custom={direction}>
                            {dashboardView === 'arrivals' && (
                                <motion.div
                                    key="arrivals"
                                    variants={pageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={pageTransition}
                                >
                                    <ConflictDetector guests={guests} />
                                    {showTimeline && <ETATimeline guests={propertyFilteredGuests} />}

                                    {/* Desktop Table */}
                                    <div className="hidden lg:block bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden">
                                        <div className="overflow-x-auto custom-scrollbar">
                                            <table className="w-full text-left border-collapse table-fixed min-w-[2000px]">
                                                <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest sticky top-0 z-10">
                                                    <tr>
                                                        <th className="w-[50px] p-5 text-center"></th>
                                                        <th className="w-[120px] p-5">Room</th>
                                                        <th className="w-[280px] p-5">Identity</th>
                                                        <th className="w-[90px] p-5 text-center">Nts</th>
                                                        <th className="w-[160px] p-5">Vehicle</th>
                                                        <th className="w-[90px] p-5 text-center">L&L</th>
                                                        <th className="w-[300px] p-5">Facilities</th>
                                                        <th className="w-[100px] p-5 text-center">ETA</th>
                                                        <th className="p-5">Intelligence</th>
                                                        <th className="w-[280px] p-5 text-indigo-400">Tactical Strategy</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 dark:divide-stone-800/40">
                                                    {propertyFilteredGuests.map((g, i) => (
                                                        <GuestRow
                                                            key={g.id} guest={g} isEditMode={true}
                                                            onUpdate={(u) => updateGuest(g.id, u)}
                                                            onDelete={() => deleteGuest(g.id)}
                                                            onDuplicate={() => duplicateGuest(g.id)}
                                                            isExpanded={expandedRows.has(g.id)}
                                                            onToggleExpand={() => toggleExpand(g.id)}
                                                            index={i}
                                                        />
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="lg:hidden space-y-4">
                                        {propertyFilteredGuests.map((g, i) => (
                                            <GuestMobileCard
                                                key={g.id}
                                                guest={g}
                                                onUpdate={(u) => updateGuest(g.id, u)}
                                                onDelete={() => deleteGuest(g.id)}
                                                index={i}
                                            />
                                        ))}
                                        {propertyFilteredGuests.length === 0 && (
                                            <div className="text-center p-20 opacity-40 italic text-sm">No arrivals found for this filter.</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {dashboardView === 'housekeeping' && (
                                <motion.div
                                    key={`housekeeping-${hkSubTab}`}
                                    variants={pageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={pageTransition}
                                >
                                    {/* HK Sub-tab Toggle */}
                                    <div className="hk-subtab-bar">
                                        <button
                                            className={`hk-subtab-btn ${hkSubTab === 'arrivals' ? 'active' : ''}`}
                                            onClick={() => setHkSubTab('arrivals')}
                                        >
                                            Arrivals
                                        </button>
                                        <button
                                            className={`hk-subtab-btn ${hkSubTab === 'turndown' ? 'active' : ''}`}
                                            onClick={() => setHkSubTab('turndown')}
                                        >
                                            Turndown
                                        </button>
                                    </div>

                                    {hkSubTab === 'arrivals' ? (
                                        <HousekeepingDashboard
                                            guests={guests}
                                            onUpdateHKStatus={handleUpdateHKStatus}
                                            onAddRoomNote={handleAddRoomNote}
                                            onResolveNote={handleResolveNote}
                                            onViewAuditLog={(g) => setAuditLogGuest(g)}
                                        />
                                    ) : (
                                        <TurndownDashboard
                                            sessions={sessions}
                                            activeSessionDate={sessions.find(s => s.id === activeSessionId)?.dateObj || null}
                                            onUpdateTurndownStatus={handleUpdateTurndownStatus}
                                            onUpdateDinnerTime={handleUpdateDinnerTime}
                                            onUpdateDinnerVenue={handleUpdateDinnerVenue}
                                            activeSession={activeSession}
                                            userName={userName}
                                            onVerifyTurndown={() => verifyTurndown(userName)}
                                        />
                                    )}
                                </motion.div>
                            )}



                            {dashboardView === 'maintenance' && (
                                <motion.div
                                    key="maintenance"
                                    variants={pageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={pageTransition}
                                >
                                    <MaintenanceDashboard
                                        guests={guests}
                                        onUpdateMaintenanceStatus={handleUpdateMaintenanceStatus}
                                        onAddRoomNote={handleAddRoomNote}
                                        onResolveNote={handleResolveNote}
                                        onViewAuditLog={(g: Guest) => setAuditLogGuest(g)}
                                    />
                                </motion.div>
                            )}

                            {dashboardView === 'frontofhouse' && (
                                <motion.div
                                    key="frontofhouse"
                                    variants={pageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={pageTransition}
                                >
                                    <ReceptionDashboard
                                        guests={guests}
                                        onUpdateGuestStatus={handleUpdateGuestStatus}
                                        onUpdateInRoomDelivery={handleUpdateInRoomDelivery}
                                        onAddCourtesyNote={handleAddCourtesyNote}
                                        onViewAuditLog={(g: Guest) => setAuditLogGuest(g)}
                                    />
                                </motion.div>
                            )}

                            {dashboardView === 'inhouse' && (
                                <motion.div
                                    key="inhouse"
                                    variants={pageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={pageTransition}
                                >
                                    <InHouseDashboard
                                        sessions={sessions}
                                        activeSessionDate={sessions.find(s => s.id === activeSessionId)?.dateObj || null}
                                        todayGuests={guests}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </ErrorBoundary>
                )}
            </main>

            <style>{`
        /* ViewManager tab overrides — main base styles live in index.html */
        .dashboard-view-tabs {
          transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        /* Desktop: full-width bar when NOT sticky */
        .dashboard-view-tabs:not(.fixed) {
          border-radius: 16px;
          margin: 8px 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
        }

        [data-theme="dark"] .dashboard-view-tabs:not(.fixed) {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        /* Desktop: tabs stretch to fill */
        @media (min-width: 1024px) {
          .view-tabs-container {
            flex: 1;
          }
          .view-tabs-container .view-tab {
            flex: 1;
            justify-content: center;
            text-align: center;
          }
        }

        /* Tablet/Mobile (< 1024px): horizontal scroll slider */
        @media (max-width: 1023px) {
          .view-tabs-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            scroll-snap-type: x mandatory;
            scroll-behavior: smooth;
            padding: 2px 4px;
            mask-image: linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent);
          }
          .view-tabs-container::-webkit-scrollbar {
            display: none;
          }
          .view-tabs-container .view-tab {
            flex-shrink: 0;
            scroll-snap-align: center;
          }
        }

        /* Sticky state — full width with shadow/blur + dock animation */
        .dashboard-view-tabs.fixed {
          backdrop-filter: blur(24px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
          border-bottom: 2px solid var(--gilpin-gold);
        }

        /* Snap-attach animation when tabs dock to navbar */
        .dashboard-view-tabs.dock-attached {
          animation: dockSnap 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) both;
        }

        /* Gold glow underline on docked tabs */
        .dashboard-view-tabs.dock-attached::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 10%;
          right: 10%;
          height: 2px;
          background: linear-gradient(90deg,
            transparent,
            rgba(197, 160, 101, 0.6),
            rgba(197, 160, 101, 1),
            rgba(197, 160, 101, 0.6),
            transparent
          );
          border-radius: 2px;
          animation: goldShimmerSweep 3s linear infinite;
          background-size: 200% 100%;
        }

        [data-theme="dark"] .dashboard-view-tabs.fixed {
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        /* Active tab — text color override (pill handles background) */
        .view-tab.active {
          background: transparent !important;
          color: white;
          border-color: transparent;
          box-shadow: none;
          font-weight: 800;
        }

        /* Pill has the shadow + gold bg */
        .active-tab-pill {
          box-shadow: 0 4px 16px rgba(197, 160, 101, 0.35);
        }

        /* Non-active tab should show border on hover */
        .view-tab:not(.active):hover {
          border-color: var(--gilpin-gold);
        }

        /* HK Sub-tab Bar (Arrivals / Turndown toggle) */
        .hk-subtab-bar {
          display: flex;
          gap: 4px;
          background: var(--bg-container, #f1f5f9);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 14px;
          padding: 4px;
          margin-bottom: 16px;
          max-width: 320px;
        }

        .hk-subtab-btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
          background: transparent;
          color: var(--text-sub, #64748b);
        }

        .hk-subtab-btn:hover:not(.active) {
          background: rgba(99, 102, 241, 0.08);
          color: var(--text-bold, #1e293b);
        }

        .hk-subtab-btn.active {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .hk-subtab-btn.active:first-child {
          background: var(--gilpin-gold, #c5a065);
          box-shadow: 0 4px 12px rgba(197, 160, 101, 0.3);
        }

        @media (max-width: 768px) {
          .hk-subtab-bar {
            max-width: none;
          }
        }

        /* Mobile: glassmorphism island */
        @media (max-width: 768px) {
          .dashboard-view-tabs:not(.fixed) {
            border-radius: 14px;
            margin: 6px 8px;
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(197, 160, 101, 0.2);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
          }

          [data-theme="dark"] .dashboard-view-tabs:not(.fixed) {
            background: rgba(30, 30, 40, 0.6);
            border-color: rgba(197, 160, 101, 0.15);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
          }

          /* When docked, go seamless */
          .dashboard-view-tabs.dock-attached {
            border-radius: 0 !important;
            margin: 0 !important;
            border: none;
            background: var(--nav-bg);
          }
        }
      `}</style>
        </>
    );
};

export default ViewManager;
