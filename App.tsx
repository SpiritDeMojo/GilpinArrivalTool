import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FilterType,
  PrintMode,
  PropertyFilter,
  DashboardView,
  HKStatus,
  MaintenanceStatus,
  GuestStatus,
  CourtesyCallNote,
  RoomNote,
  Guest
} from './types';
import { DEFAULT_FLAGS, NAV_HEIGHT, ALERT_HEIGHT } from './constants';

import { useGuestManager } from './hooks/useGuestManager';
import { useLiveAssistant } from './hooks/useLiveAssistant';

import Navbar from './components/Navbar';
import SessionBar from './components/SessionBar';
import Dashboard from './components/Dashboard';
import GuestRow from './components/GuestRow';
import GuestMobileCard from './components/GuestMobileCard';
import SOPModal from './components/SOPModal';
import LiveChatWidget from './components/LiveChatWidget';
import LoadingHub from './components/LoadingHub';
import { PrintLayout } from './components/PrintLayout';
import AnalyticsView from './components/AnalyticsView';
import ETATimeline from './components/ETATimeline';
import ConflictDetector from './components/ConflictDetector';
import ErrorBoundary from './components/ErrorBoundary';

// Housekeeping Dashboard Components
import HousekeepingDashboard from './components/HousekeepingDashboard';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import ReceptionDashboard from './components/ReceptionDashboard';

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isSticky, setIsSticky] = useState(false);
  const [isSopOpen, setIsSopOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState<PrintMode>('master');
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('total');

  // Dashboard View State
  const [dashboardView, setDashboardView] = useState<DashboardView>('arrivals');

  const {
    guests, filteredGuests, arrivalDateStr, isOldFile, activeFilter, setActiveFilter,
    isProcessing, progressMsg, currentBatch, totalBatches,
    handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, duplicateGuest, onExcelExport,
    sessions, activeSessionId, switchSession, deleteSession, createNewSession,
    firebaseEnabled, connectionStatus
  } = useGuestManager(DEFAULT_FLAGS);

  // Apply property filter
  const propertyFilteredGuests = useMemo(() => {
    let result = filteredGuests;

    if (propertyFilter !== 'total') {
      result = result.filter(g => {
        const rNum = parseInt(g.room.split(' ')[0]);
        if (propertyFilter === 'main') return rNum > 0 && rNum <= 31;
        if (propertyFilter === 'lake') return rNum >= 51 && rNum <= 60;
        return true;
      });
    }

    return result;
  }, [filteredGuests, propertyFilter]);

  const {
    isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput,
    startLiveAssistant, toggleMic, sendTextMessage, disconnect, clearHistory
  } = useLiveAssistant(guests);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const handleScroll = () => { if (guests.length > 0) setIsSticky(window.scrollY > 40); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [guests.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (guests.length > 0) triggerPrint('master');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (guests.length > 0) onExcelExport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [guests.length, onExcelExport]);

  const mainPaddingTop = isOldFile && guests.length > 0 ? NAV_HEIGHT + ALERT_HEIGHT : NAV_HEIGHT;

  const triggerPrint = (mode: PrintMode) => {
    setPrintMode(mode);
    setTimeout(() => { window.print(); }, 300);
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // === Housekeeping Status Handler ===
  const handleUpdateHKStatus = useCallback((guestId: string, status: HKStatus) => {
    updateGuest(guestId, {
      hkStatus: status,
      lastStatusUpdate: Date.now(),
      lastStatusUpdatedBy: 'User'
    } as Partial<Guest>);
  }, [updateGuest]);

  // === Maintenance Status Handler ===
  const handleUpdateMaintenanceStatus = useCallback((guestId: string, status: MaintenanceStatus) => {
    updateGuest(guestId, {
      maintenanceStatus: status,
      lastStatusUpdate: Date.now(),
      lastStatusUpdatedBy: 'User'
    } as Partial<Guest>);
  }, [updateGuest]);

  // === Guest Status Handler ===
  const handleUpdateGuestStatus = useCallback((guestId: string, status: GuestStatus) => {
    updateGuest(guestId, {
      guestStatus: status,
      lastStatusUpdate: Date.now(),
      lastStatusUpdatedBy: 'User'
    } as Partial<Guest>);
  }, [updateGuest]);

  // === In-Room Delivery Handler ===
  const handleUpdateInRoomDelivery = useCallback((guestId: string, delivered: boolean) => {
    updateGuest(guestId, {
      inRoomDelivered: delivered,
      inRoomDeliveredAt: delivered ? Date.now() : undefined,
      inRoomDeliveredBy: delivered ? 'User' : undefined
    } as Partial<Guest>);
  }, [updateGuest]);

  // === Room Note Handler (Cross-Department) ===
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

  // === Resolve Room Note Handler ===
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

  // === Courtesy Call Note Handler ===
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

  const stickyStyle = isSticky ? `fixed left-0 right-0 z-[1000] bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-[#c5a065]/20` : '';
  const stickyTop = isSticky ? { top: `${NAV_HEIGHT}px` } : {};

  return (
    <div className="min-h-screen transition-colors duration-500 print:!pt-0" style={{ paddingTop: mainPaddingTop + 'px' }}>
      <Navbar
        arrivalDateStr={arrivalDateStr}
        isDark={isDark}
        toggleTheme={() => setIsDark(!isDark)}
        onFileUpload={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        onPrint={(mode: any) => {
          const mapped: PrintMode = mode === 'main' ? 'master' : mode === 'inroom' ? 'delivery' : mode;
          triggerPrint(mapped);
        }}
        onExcel={onExcelExport}
        onAddManual={addManual}
        onOpenSOP={() => setIsSopOpen(true)}
        isLiveActive={isLiveActive}
        isMicEnabled={isMicEnabled}
        onToggleLive={startLiveAssistant}
        hasGuests={guests.length > 0}
        onAIRefine={handleAIRefine}
        onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
        showAnalytics={showAnalytics}
      />

      {isOldFile && guests.length > 0 && (
        <div className="no-print pulsate-alert text-white text-center font-black py-1 tracking-widest text-[8px] md:text-[10px] fixed w-full z-[1009]" style={{ top: NAV_HEIGHT + 'px' }}>
          ⚠️ HISTORICAL FILE DETECTED • {arrivalDateStr}
        </div>
      )}

      {/* Dashboard View Tabs */}
      {guests.length > 0 && (
        <div className="no-print dashboard-view-tabs">
          <div className="view-tabs-container">
            <button
              className={`view-tab ${dashboardView === 'arrivals' ? 'active' : ''}`}
              onClick={() => setDashboardView('arrivals')}
            >
              📋 Arrivals
            </button>
            <button
              className={`view-tab ${dashboardView === 'housekeeping' ? 'active' : ''}`}
              onClick={() => setDashboardView('housekeeping')}
            >
              🧹 Housekeeping
            </button>
            <button
              className={`view-tab ${dashboardView === 'maintenance' ? 'active' : ''}`}
              onClick={() => setDashboardView('maintenance')}
            >
              🔧 Maintenance
            </button>
            <button
              className={`view-tab ${dashboardView === 'reception' ? 'active' : ''}`}
              onClick={() => setDashboardView('reception')}
            >
              🛎️ Reception
            </button>
          </div>
          {/* Firebase Connection Status */}
          <div className="connection-status">
            {connectionStatus === 'connected' && (
              <span className="status-badge connected" title="Real-time sync active">
                🟢 Synced
              </span>
            )}
            {connectionStatus === 'connecting' && (
              <span className="status-badge connecting" title="Connecting to Firebase...">
                🟡 Connecting...
              </span>
            )}
            {connectionStatus === 'offline' && (
              <span className="status-badge offline" title="Offline mode - changes saved locally only">
                🔴 Offline
              </span>
            )}
          </div>
        </div>
      )}

      {guests.length > 0 && dashboardView === 'arrivals' && (
        <div className="no-print relative my-2 md:my-6">
          <div
            className={`dashboard-container no-print py-4 md:py-6 transition-all ${stickyStyle}`}
            style={stickyTop}
          >
            <Dashboard
              guests={guests}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              propertyFilter={propertyFilter}
              onPropertyChange={setPropertyFilter}
            />
          </div>
        </div>
      )}

      <main className="max-w-[1800px] mx-auto px-4 md:px-10 pb-32 no-print">
        <SessionBar
          sessions={sessions}
          activeId={activeSessionId}
          onSwitch={switchSession}
          onDelete={deleteSession}
          onCreate={createNewSession}
        />

        {showAnalytics && (
          <AnalyticsView
            activeGuests={guests}
            allSessions={sessions}
            activeFilter={activeFilter}
          />
        )}

        {guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="w-full max-w-md p-10 md:p-24 border-2 border-dashed border-[#c5a065]/40 rounded-[2.5rem] md:rounded-[3rem] bg-white/50 dark:bg-white/5 backdrop-blur flex flex-col items-center gap-6 md:gap-8 cursor-pointer hover:border-[#c5a065] transition-all" onClick={() => document.getElementById('file-upload-nav')?.click()}>
              <span className="text-4xl md:text-6xl animate-bounce">📁</span>
              <div className="text-center">
                <h2 className="heading-font text-3xl md:text-5xl font-black uppercase tracking-tighter mb-2">Arrivals Hub</h2>
                <p className="text-[#c5a065] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-[10px] md:text-sm">Deploy Arrivals Stream</p>
              </div>
            </div>
          </div>
        ) : (
          <ErrorBoundary>
            {/* Arrivals View */}
            {dashboardView === 'arrivals' && (
              <>
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
                        {propertyFilteredGuests.map(g => (
                          <GuestRow
                            key={g.id} guest={g} isEditMode={true}
                            onUpdate={(u) => updateGuest(g.id, u)}
                            onDelete={() => deleteGuest(g.id)}
                            onDuplicate={() => duplicateGuest(g.id)}
                            isExpanded={expandedRows.has(g.id)}
                            onToggleExpand={() => toggleExpand(g.id)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {propertyFilteredGuests.map(g => (
                    <GuestMobileCard
                      key={g.id}
                      guest={g}
                      onUpdate={(u) => updateGuest(g.id, u)}
                      onDelete={() => deleteGuest(g.id)}
                    />
                  ))}
                  {propertyFilteredGuests.length === 0 && (
                    <div className="text-center p-20 opacity-40 italic text-sm">No arrivals found for this filter.</div>
                  )}
                </div>
              </>
            )}

            {/* Housekeeping View */}
            {dashboardView === 'housekeeping' && (
              <HousekeepingDashboard
                guests={guests}
                onUpdateHKStatus={handleUpdateHKStatus}
                onAddRoomNote={handleAddRoomNote}
                onResolveNote={handleResolveNote}
              />
            )}

            {/* Maintenance View */}
            {dashboardView === 'maintenance' && (
              <MaintenanceDashboard
                guests={guests}
                onUpdateMaintenanceStatus={handleUpdateMaintenanceStatus}
                onAddRoomNote={handleAddRoomNote}
                onResolveNote={handleResolveNote}
              />
            )}

            {/* Reception View */}
            {dashboardView === 'reception' && (
              <ReceptionDashboard
                guests={guests}
                onUpdateGuestStatus={handleUpdateGuestStatus}
                onUpdateInRoomDelivery={handleUpdateInRoomDelivery}
                onAddCourtesyNote={handleAddCourtesyNote}
              />
            )}
          </ErrorBoundary>
        )}
      </main>

      <PrintLayout printMode={printMode} dateStr={arrivalDateStr} guests={propertyFilteredGuests} />

      <LiveChatWidget
        isLiveActive={isLiveActive}
        isMicEnabled={isMicEnabled}
        transcriptions={transcriptions}
        interimInput={interimInput}
        interimOutput={interimOutput}
        onToggleMic={toggleMic}
        onSendMessage={sendTextMessage}
        onClose={disconnect}
        onClearHistory={clearHistory}
      />

      <LoadingHub
        isVisible={isProcessing}
        message={progressMsg}
        currentBatch={currentBatch}
        totalBatches={totalBatches}
      />

      <SOPModal isOpen={isSopOpen} onClose={() => setIsSopOpen(false)} />

      <style>{`
        .dashboard-view-tabs {
          position: relative;
          z-index: 100;
          background: var(--bg-color);
          border-bottom: 3px solid var(--gilpin-gold);
          padding: 16px 20px;
          margin: 0 auto 16px;
          max-width: 1800px;
        }

        .view-tabs-container {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 700px;
          margin: 0 auto;
        }

        .view-tab {
          padding: 10px 20px;
          border: 2px solid var(--border-color);
          background: var(--bg-container);
          border-radius: 25px;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
          color: var(--text-main);
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .view-tab:hover {
          border-color: var(--gilpin-gold);
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(197, 160, 101, 0.15);
        }

        .view-tab.active {
          background: linear-gradient(135deg, #c5a065 0%, #a08050 100%);
          color: #0f172a;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(197, 160, 101, 0.3);
        }

        @media (max-width: 640px) {
          .view-tab {
            padding: 8px 14px;
            font-size: 10px;
          }
          
          .view-tabs-container {
            gap: 6px;
          }
          
          .dashboard-view-tabs {
            padding: 12px 10px 16px;
          }
        }

        /* Connection Status */
        .connection-status {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .status-badge.connected {
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .status-badge.connecting {
          background: rgba(251, 191, 36, 0.15);
          color: #d97706;
          border: 1px solid rgba(251, 191, 36, 0.3);
          animation: pulse 1.5s infinite;
        }

        .status-badge.offline {
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .dashboard-view-tabs {
          position: relative;
        }

        @media (max-width: 768px) {
          .connection-status {
            position: static;
            transform: none;
            text-align: center;
            margin-top: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;