import React, { useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeProvider';
import { useView } from './contexts/ViewProvider';
import { useHotkeys } from './contexts/HotkeysProvider';
import { useUser } from './contexts/UserProvider';
import { useGuestContext } from './contexts/GuestProvider';
import { NavPrintMode, PrintMode, DashboardView } from './types';

import Navbar from './components/Navbar';
import UnifiedChatPanel from './components/UnifiedChatPanel';
import LoadingHub from './components/LoadingHub';
import { PrintLayout } from './components/PrintLayout';
const SOPModal = React.lazy(() => import('./components/SOPModal'));
import SessionBrowser from './components/SessionBrowser';
import NotificationToast from './components/NotificationToast';
import ActivityLogPanel from './components/ActivityLogPanel';
import LoginScreen from './components/LoginScreen';
import ViewManager from './components/ViewManager';
import MobileDebugOverlay from './components/MobileDebugOverlay';

const App: React.FC = () => {
  // Context hooks
  const { isDark, toggleTheme } = useTheme();
  const { dashboardView, setDashboardView, showAnalytics, toggleAnalytics } = useView();
  const { userName, department } = useUser();
  const { printMode, triggerPrint } = useHotkeys();

  // React Router
  const { sessionId: urlSessionId, tab: urlTab } = useParams<{ sessionId?: string; tab?: string }>();
  const navigate = useNavigate();

  const {
    guests, arrivalDateStr, isOldFile, isSticky, propertyFilteredGuests,
    isProcessing, progressMsg, currentBatch, totalBatches, auditPhase, auditGuestNames,
    handleFileUpload, handleAIRefine, addManual, onExcelExport,
    activeSessionId, joinSession, createNewSession,
    connectionStatus, manualReconnect,
    isSessionLocked, lockSession, unlockSession,
    isMuted, toggleMute, notifications, pushNotification, dismissNotification, clearAllNotifications, clearBadge,
    isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput, errorMessage, hasMic,
    startLiveAssistant, toggleMic, sendTextMessage, disconnect, clearHistory,
    showSessionBrowser,
    isSopOpen, setIsSopOpen,
    auditLogGuest, setAuditLogGuest,
    mainPaddingTop,
  } = useGuestContext();

  // ── Route sync: URL tab → dashboardView ───────────────────────────────
  const validTabs: DashboardView[] = ['arrivals', 'housekeeping', 'maintenance', 'reception'];
  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab as DashboardView) && urlTab !== dashboardView) {
      setDashboardView(urlTab as DashboardView);
    }
  }, [urlTab, dashboardView, setDashboardView]); // Sync URL tab → view state

  // ── Route sync: dashboardView → URL ───────────────────────────────────
  useEffect(() => {
    if (activeSessionId && dashboardView) {
      const expected = `/session/${activeSessionId}/${dashboardView}`;
      if (window.location.pathname !== expected) {
        navigate(expected, { replace: true });
      }
    }
  }, [dashboardView, activeSessionId, navigate]);

  // Early return: Show login screen when not authenticated
  if (!userName || !department) {
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
    <div className="min-h-screen transition-colors duration-500 print:!pt-0" style={{ paddingTop: mainPaddingTop }}>
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
        hasGuests={guests.length > 0}
        onAIRefine={handleAIRefine}
        onToggleAnalytics={toggleAnalytics}
        showAnalytics={showAnalytics}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        connectionStatus={connectionStatus}
        onReconnect={manualReconnect}
        onSaveSession={() => {
          if (isSessionLocked) {
            if (window.confirm('This session is currently saved & locked. Unlock it for editing?')) {
              unlockSession();
            }
          } else {
            lockSession();
          }
        }}
        isSessionLocked={isSessionLocked}
        isSticky={isSticky}
      />

      {/* Notification Toast Overlay */}
      <NotificationToast
        notifications={notifications}
        onDismiss={dismissNotification}
        onClearAll={clearAllNotifications}
        onNavigate={(view) => { setDashboardView(view); clearBadge(view); }}
      />

      {isOldFile && guests.length > 0 && (
        <div className="no-print pulsate-alert text-white text-center font-black tracking-widest text-[8px] md:text-[10px] sticky w-full z-[1009] flex items-center justify-center" style={{ top: 'var(--nav-height)', height: 'var(--alert-height)', marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          ⚠️ HISTORICAL FILE DETECTED • {arrivalDateStr}
        </div>
      )}

      {/* View Manager — dashboard tabs + conditional views */}
      <ViewManager />

      <PrintLayout printMode={printMode} dateStr={arrivalDateStr} guests={propertyFilteredGuests} />

      <LoadingHub
        isVisible={isProcessing}
        message={progressMsg}
        currentBatch={currentBatch}
        totalBatches={totalBatches}
        phase={auditPhase}
        guestNames={auditGuestNames}
      />

      <Suspense fallback={null}>
        <SOPModal isOpen={isSopOpen} onClose={() => setIsSopOpen(false)} />
      </Suspense>

      {/* Activity Log Panel */}
      {auditLogGuest && (
        <ActivityLogPanel
          guestName={auditLogGuest.name}
          activityLog={auditLogGuest.activityLog || []}
          roomMoves={auditLogGuest.roomMoves}
          onClose={() => setAuditLogGuest(null)}
        />
      )}

      {/* Unified Chat Panel – Team Chat + AI Assistant */}
      {guests.length > 0 && (
        <UnifiedChatPanel
          sessionId={activeSessionId}
          userName={userName || 'Unknown'}
          department={department === 'HK' ? 'housekeeping' : department === 'MAIN' ? 'maintenance' : 'reception'}
          isLiveActive={isLiveActive}
          isMicEnabled={isMicEnabled}
          transcriptions={transcriptions}
          interimInput={interimInput}
          interimOutput={interimOutput}
          onToggleMic={toggleMic}
          onSendAIMessage={sendTextMessage}
          onStartAssistant={startLiveAssistant}
          onDisconnect={disconnect}
          onClearHistory={clearHistory}
          errorMessage={errorMessage}
          hasMic={hasMic}
          onPushNotification={pushNotification}
        />
      )}

      {/* Mobile Debug Overlay — ?debug=1 or long-press connection dot */}
      <MobileDebugOverlay connectionStatus={connectionStatus} />
    </div>
  );
};

export default App;