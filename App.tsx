import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from './contexts/ThemeProvider';
import { useView } from './contexts/ViewProvider';
import { useHotkeys } from './contexts/HotkeysProvider';
import { useUser } from './contexts/UserProvider';
import {
  FilterType,
  PrintMode,
  NavPrintMode,
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
import { useNotifications } from './hooks/useNotifications';
import { useAuditLog } from './hooks/useAuditLog';

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
import SessionBrowser from './components/SessionBrowser';
import ChatBubble from './components/ChatBubble';
import ActivityLogPanel from './components/ActivityLogPanel';
import LoginScreen from './components/LoginScreen';

// Housekeeping Dashboard Components
import HousekeepingDashboard from './components/HousekeepingDashboard';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import ReceptionDashboard from './components/ReceptionDashboard';

const App: React.FC = () => {
  // Context hooks
  const { isDark, toggleTheme } = useTheme();
  const { dashboardView, setDashboardView, showAnalytics, toggleAnalytics, showTimeline } = useView();
  const { userName } = useUser();
  const { printMode, triggerPrint, registerActions } = useHotkeys();

  const [isSticky, setIsSticky] = useState(false);
  const [isSopOpen, setIsSopOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('total');

  const {
    guests, filteredGuests, arrivalDateStr, isOldFile, activeFilter, setActiveFilter,
    isProcessing, progressMsg, currentBatch, totalBatches,
    handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, duplicateGuest, onExcelExport,
    sessions, activeSessionId, switchSession, deleteSession, createNewSession,
    joinSession,
    firebaseEnabled, connectionStatus,
    shareSession, getShareUrl
  } = useGuestManager(DEFAULT_FLAGS);

  // Show session browser when no active session
  const showSessionBrowser = sessions.length === 0 && !isProcessing;

  // Apply property filter
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

  // useLiveAssistant is called after handler definitions below

  useEffect(() => {
    const handleScroll = () => { if (guests.length > 0) setIsSticky(window.scrollY > 40); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [guests.length]);

  const { auditedUpdate } = useAuditLog(guests, updateGuest);

  // State for Activity Log panel
  const [auditLogGuest, setAuditLogGuest] = useState<Guest | null>(null);

  // Register hotkey actions (ref-based, no re-render)
  useEffect(() => {
    registerActions({ hasGuests: guests.length > 0, onExcelExport });
  }, [guests.length, onExcelExport, registerActions]);

  const mainPaddingTop = isOldFile && guests.length > 0 ? NAV_HEIGHT + ALERT_HEIGHT : NAV_HEIGHT;

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // === Housekeeping Status Handler ===
  const handleUpdateHKStatus = useCallback((guestId: string, status: HKStatus) => {
    auditedUpdate(guestId, {
      hkStatus: status,
      lastStatusUpdate: Date.now(),
      lastStatusUpdatedBy: 'User'
    } as Partial<Guest>, 'User');
  }, [auditedUpdate]);

  // === Maintenance Status Handler ===
  const handleUpdateMaintenanceStatus = useCallback((guestId: string, status: MaintenanceStatus) => {
    auditedUpdate(guestId, {
      maintenanceStatus: status,
      lastStatusUpdate: Date.now(),
      lastStatusUpdatedBy: 'User'
    } as Partial<Guest>, 'User');
  }, [auditedUpdate]);

  // === Guest Status Handler ===
  const handleUpdateGuestStatus = useCallback((guestId: string, status: GuestStatus) => {
    auditedUpdate(guestId, {
      guestStatus: status,
      lastStatusUpdate: Date.now(),
      lastStatusUpdatedBy: 'User'
    } as Partial<Guest>, 'User');
  }, [auditedUpdate]);

  // === In-Room Delivery Handler ===
  const handleUpdateInRoomDelivery = useCallback((guestId: string, delivered: boolean) => {
    auditedUpdate(guestId, {
      inRoomDelivered: delivered,
      inRoomDeliveredAt: delivered ? Date.now() : undefined,
      inRoomDeliveredBy: delivered ? userName || 'Unknown' : undefined
    } as Partial<Guest>, userName || 'Unknown');
  }, [auditedUpdate, userName]);

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

  // === Live Assistant (must be after handleAddRoomNote) ===
  const {
    isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput,
    startLiveAssistant, toggleMic, sendTextMessage, disconnect, clearHistory
  } = useLiveAssistant({ guests, onAddRoomNote: handleAddRoomNote });

  const { isMuted, toggleMute } = useNotifications(guests);

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

  // Early return: Show login screen when not authenticated
  if (!userName) {
    return <LoginScreen />;
  }

  // Early return: Show Session Browser lobby when no sessions exist
  if (showSessionBrowser) {
    return (
      <div className="min-h-screen transition-colors duration-500">
        <SessionBrowser
          onJoinSession={joinSession}
          onCreateNew={createNewSession}
          onUploadPDF={(e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-500 print:!pt-0" style={{ paddingTop: mainPaddingTop + 'px' }}>
      <Navbar
        arrivalDateStr={arrivalDateStr}
        isDark={isDark}
        toggleTheme={toggleTheme}
        onFileUpload={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        onPrint={(mode: NavPrintMode) => {
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
        onToggleAnalytics={toggleAnalytics}
        showAnalytics={showAnalytics}
        isMuted={isMuted}
        onToggleMute={toggleMute}
      />

      {isOldFile && guests.length > 0 && (
        <div className="no-print pulsate-alert text-white text-center font-black py-1 tracking-widest text-[8px] md:text-[10px] fixed w-full z-[1009]" style={{ top: NAV_HEIGHT + 'px' }}>
          ⚠️ HISTORICAL FILE DETECTED • {arrivalDateStr}
        </div>
      )}

      {/* Dashboard View Tabs */}
      {guests.length > 0 && (() => {
        const urgentMaintCount = guests.filter(g =>
          (g.roomNotes || []).some(n => !n.resolved && (n.priority === 'urgent' || n.priority === 'high'))
        ).length;

        return (
          <div className="no-print dashboard-view-tabs">
            <div className="view-tabs-container">
              <button
                className={`view-tab ${dashboardView === 'arrivals' ? 'active' : ''}`}
                onClick={() => setDashboardView('arrivals')}
              >
                📋 Arrivals ({guests.length})
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
                style={{ position: 'relative' }}
              >
                🔧 Maintenance
                {urgentMaintCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid var(--bg-color, white)',
                    animation: 'pulse 2s infinite',
                  }}>{urgentMaintCount}</span>
                )}
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
        );
      })()}

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
                onViewAuditLog={(g) => setAuditLogGuest(g)}
              />
            )}

            {/* Maintenance View */}
            {dashboardView === 'maintenance' && (
              <MaintenanceDashboard
                guests={guests}
                onUpdateMaintenanceStatus={handleUpdateMaintenanceStatus}
                onAddRoomNote={handleAddRoomNote}
                onResolveNote={handleResolveNote}
                onViewAuditLog={(g: Guest) => setAuditLogGuest(g)}
              />
            )}

            {/* Reception View */}
            {dashboardView === 'reception' && (
              <ReceptionDashboard
                guests={guests}
                onUpdateGuestStatus={handleUpdateGuestStatus}
                onUpdateInRoomDelivery={handleUpdateInRoomDelivery}
                onAddCourtesyNote={handleAddCourtesyNote}
                onViewAuditLog={(g: Guest) => setAuditLogGuest(g)}
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

      {/* Activity Log Panel */}
      {auditLogGuest && (
        <ActivityLogPanel
          guestName={auditLogGuest.name}
          activityLog={auditLogGuest.activityLog || []}
          roomMoves={auditLogGuest.roomMoves}
          onClose={() => setAuditLogGuest(null)}
        />
      )}

      {/* Chat Bubble - scoped to session */}
      {firebaseEnabled && activeSessionId && guests.length > 0 && (
        <ChatBubble
          sessionId={activeSessionId}
          userName={userName || 'Unknown'}
          department={dashboardView === 'arrivals' || dashboardView === 'reception' ? 'reception' : dashboardView}
        />
      )}

      <style>{`
        .dashboard-view-tabs {
          position: sticky;
          top: 72px;
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

        @media (max-width: 768px) {
          .connection-status {
            position: static;
            transform: none;
            text-align: center;
            margin-top: 8px;
          }

          .dashboard-view-tabs {
            top: 56px;
            padding: 12px 10px 10px;
          }
        }

        @media (max-width: 480px) {
          .dashboard-view-tabs {
            top: 50px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;