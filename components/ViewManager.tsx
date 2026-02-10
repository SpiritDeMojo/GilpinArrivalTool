import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { Guest } from '../types';

/* ── Framer Motion page-transition variants ── */
const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.96, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -12, scale: 0.97, filter: 'blur(6px)' },
};
const pageTransition = { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

/* ── Tab button spring ── */
const tabSpring = { type: 'spring' as const, stiffness: 400, damping: 25 };

const ViewManager: React.FC = () => {
    const { dashboardView, setDashboardView, showAnalytics, showTimeline } = useView();
    const { department } = useUser();
    const isRec = department === 'REC';

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
    } = useGuestContext();

    /* Compute top offset: nav-height + optional alert banner */
    const stickyTop = (isOldFile && guests.length > 0)
        ? 'calc(var(--nav-height) + var(--alert-height))'
        : 'var(--nav-height)';

    return (
        <>
            {/* ─── Docking Tabs ─── */}
            {guests.length > 0 && (
                <div
                    className={`no-print dashboard-view-tabs transition-all duration-300 ${isSticky
                        ? 'fixed left-0 right-0 z-[1005] shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md dock-attached'
                        : ''
                        }`}
                    style={isSticky ? { top: stickyTop } : {}}
                >
                    <div className="view-tabs-container">
                        {isRec && (
                            <motion.button
                                initial={{ opacity: 0, y: 10, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 0 * 0.06, type: 'spring', stiffness: 350, damping: 22 }}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.93 }}
                                className={`view-tab ${dashboardView === 'arrivals' ? 'active' : ''}`}
                                onClick={() => { setDashboardView('arrivals'); document.dispatchEvent(new CustomEvent('gilpin:viewchange')); }}
                            >
                                <span className="tab-emoji">📋 </span>Arrivals ({guests.length})
                            </motion.button>
                        )}
                        {(department === 'HK' || isRec) && (
                            <motion.button
                                initial={{ opacity: 0, y: 10, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 1 * 0.06, type: 'spring', stiffness: 350, damping: 22 }}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.93 }}
                                className={`view-tab ${dashboardView === 'housekeeping' ? 'active' : ''}`}
                                onClick={() => { setDashboardView('housekeeping'); clearBadge('housekeeping'); document.dispatchEvent(new CustomEvent('gilpin:viewchange')); }}
                            >
                                <span className="tab-emoji">🧹 </span>
                                <span className="tab-label-full">Housekeeping</span>
                                <span className="tab-label-short">HK</span>
                                {badges.housekeeping > 0 && dashboardView !== 'housekeeping' && (
                                    <span className="tab-badge-dot bg-green-500">{badges.housekeeping}</span>
                                )}
                            </motion.button>
                        )}
                        {(department === 'MAIN' || isRec) && (
                            <motion.button
                                initial={{ opacity: 0, y: 10, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 2 * 0.06, type: 'spring', stiffness: 350, damping: 22 }}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.93 }}
                                className={`view-tab ${dashboardView === 'maintenance' ? 'active' : ''}`}
                                onClick={() => { setDashboardView('maintenance'); clearBadge('maintenance'); document.dispatchEvent(new CustomEvent('gilpin:viewchange')); }}
                            >
                                <span className="tab-emoji">🔧 </span>
                                <span className="tab-label-full">Maintenance</span>
                                <span className="tab-label-short">Maint</span>
                                {badges.maintenance > 0 && dashboardView !== 'maintenance' && (
                                    <span className="tab-badge-dot bg-amber-500">{badges.maintenance}</span>
                                )}
                            </motion.button>
                        )}
                        {isRec && (
                            <motion.button
                                initial={{ opacity: 0, y: 10, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: 3 * 0.06, type: 'spring', stiffness: 350, damping: 22 }}
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.93 }}
                                className={`view-tab ${dashboardView === 'reception' ? 'active' : ''}`}
                                onClick={() => { setDashboardView('reception'); clearBadge('reception'); document.dispatchEvent(new CustomEvent('gilpin:viewchange')); }}
                            >
                                <span className="tab-emoji">🛎️ </span>
                                <span className="tab-label-full">Reception</span>
                                <span className="tab-label-short">Recep</span>
                                {badges.reception > 0 && dashboardView !== 'reception' && (
                                    <span className="tab-badge-dot bg-blue-500">{badges.reception}</span>
                                )}
                            </motion.button>
                        )}
                    </div>
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
                <SessionBar
                    sessions={sessions}
                    activeId={activeSessionId}
                    onSwitch={switchSession}
                    onDelete={deleteSession}
                    onCreate={createNewSession}
                />

                {isRec && showAnalytics && (
                    <AnalyticsView
                        activeGuests={guests}
                        allSessions={sessions}
                        activeFilter={activeFilter}
                    />
                )}

                {guests.length === 0 ? (
                    <motion.div
                        className="flex flex-col items-center justify-center min-h-[60vh] px-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="w-full max-w-md p-10 md:p-24 border-2 border-dashed border-[#c5a065]/40 rounded-[2.5rem] md:rounded-[3rem] bg-white/50 dark:bg-white/5 backdrop-blur flex flex-col items-center gap-6 md:gap-8 cursor-pointer hover:border-[#c5a065] transition-all" onClick={() => document.getElementById('file-upload-nav')?.click()}>
                            <span className="text-4xl md:text-6xl animate-bounce">📁</span>
                            <div className="text-center">
                                <h2 className="heading-font text-3xl md:text-5xl font-black uppercase tracking-tighter mb-2">Arrivals Hub</h2>
                                <p className="text-[#c5a065] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-[10px] md:text-sm">Deploy Arrivals Stream</p>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <ErrorBoundary>
                        {/* ─── AnimatePresence: smooth view switching ─── */}
                        <AnimatePresence mode="wait">
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
                                    key="housekeeping"
                                    variants={pageVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={pageTransition}
                                >
                                    <HousekeepingDashboard
                                        guests={guests}
                                        onUpdateHKStatus={handleUpdateHKStatus}
                                        onAddRoomNote={handleAddRoomNote}
                                        onResolveNote={handleResolveNote}
                                        onViewAuditLog={(g) => setAuditLogGuest(g)}
                                    />
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

                            {dashboardView === 'reception' && (
                                <motion.div
                                    key="reception"
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
                        </AnimatePresence>
                    </ErrorBoundary>
                )}
            </main>

            <style>{`
        /* ViewManager tab overrides — main base styles live in index.html */
        .dashboard-view-tabs {
          transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        /* Floating island when NOT sticky */
        .dashboard-view-tabs:not(.fixed) {
          border-radius: 20px;
          margin: 8px auto;
          max-width: 700px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
        }

        [data-theme="dark"] .dashboard-view-tabs:not(.fixed) {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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

        /* Active tab shimmer */
        .view-tab.active {
          border-bottom: 2px solid var(--gilpin-gold);
          box-shadow: 0 4px 16px rgba(197, 160, 101, 0.35), inset 0 -2px 0 var(--gilpin-gold);
        }

        /* Mobile: island stays rounded, just smaller */
        @media (max-width: 768px) {
          .dashboard-view-tabs:not(.fixed) {
            border-radius: 16px;
            margin: 6px 8px;
            max-width: none;
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

          /* Stage 2: when docked, go seamless */
          .dashboard-view-tabs.dock-attached {
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            border: none;
            background: var(--nav-bg);
          }
        }
      `}</style>
        </>
    );
};

export default ViewManager;
