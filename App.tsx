import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeProvider';
import { useView } from './contexts/ViewProvider';
import { useHotkeys } from './contexts/HotkeysProvider';
import { useUser } from './contexts/UserProvider';
import { useGuestContext } from './contexts/GuestProvider';
import { NavPrintMode, PrintMode, DashboardView } from './types';
import { subscribeToChatMessages, ChatMessage } from './services/firebaseService';

import Navbar from './components/Navbar';
import UnifiedChatPanel from './components/UnifiedChatPanel';
import LoadingHub from './components/LoadingHub';
import { PrintLayout } from './components/PrintLayout';
import ItineraryQueue from './components/ItineraryQueue';
const SOPModal = React.lazy(() => import('./components/SOPModal'));
const HandoverHub = React.lazy(() => import('./components/HandoverHub'));
const DayReport = React.lazy(() => import('./components/DayReport'));
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
    sessions,
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

  // ── Persistent chat subscription (survives panel close) ────────────────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
  const chatLastCountRef = useRef(0);
  const chatInitializedRef = useRef(false);
  const deptMapped = department === 'HK' ? 'housekeeping' : department === 'MAIN' ? 'maintenance' : 'frontofhouse';

  // Itinerary queue state (triggered after save session or AI audit)
  const [showItineraryQueue, setShowItineraryQueue] = useState(false);
  const [packagePromptVisible, setPackagePromptVisible] = useState(false);
  const [packagePromptMinimised, setPackagePromptMinimised] = useState(false);
  const activeSession = sessions?.find(s => s.id === activeSessionId) || null;
  const prevAuditPhaseRef = useRef<string | undefined>(undefined);

  // Handover / DayReport overlay state
  const [showHandoverHub, setShowHandoverHub] = useState(false);
  const [showDayReport, setShowDayReport] = useState(false);

  // ── Post-audit package prompt: detect audit completion ──
  useEffect(() => {
    // Detect transition: auditPhase was 'complete' → now undefined (audit finished)
    if (prevAuditPhaseRef.current === 'complete' && !auditPhase) {
      const packageCodes = /^(MIN|MAG|LHMAG)/i;
      const packageGuests = guests.filter(g =>
        packageCodes.test(g.rateCode || '') ||
        /minimoon|magical\s*escape/i.test(g.packageName || '')
      );
      if (packageGuests.length > 0) {
        setPackagePromptVisible(true);
        setPackagePromptMinimised(false);
      }
    }
    prevAuditPhaseRef.current = auditPhase;
  }, [auditPhase, guests]);

  useEffect(() => {
    if (!activeSessionId) return;
    const unsub = subscribeToChatMessages(activeSessionId, (msgs) => {
      setChatMessages(msgs);
      // On first load, just record the count — don't fire notifications
      if (!chatInitializedRef.current) {
        chatLastCountRef.current = msgs.length;
        chatInitializedRef.current = true;
        return;
      }
      // Only notify if new messages arrived AND chat panel is closed
      if (msgs.length > chatLastCountRef.current && !isChatPanelOpen) {
        const latest = msgs[msgs.length - 1];
        if (latest && latest.author !== userName) {
          // Play chime
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
            const osc1 = ctx.createOscillator(); const g1 = ctx.createGain();
            osc1.type = 'sine'; osc1.frequency.setValueAtTime(660, ctx.currentTime);
            g1.gain.setValueAtTime(0.10, ctx.currentTime);
            g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            osc1.connect(g1).connect(ctx.destination); osc1.start(ctx.currentTime); osc1.stop(ctx.currentTime + 0.18);
            const osc2 = ctx.createOscillator(); const g2 = ctx.createGain();
            osc2.type = 'sine'; osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            g2.gain.setValueAtTime(0, ctx.currentTime); g2.gain.setValueAtTime(0.10, ctx.currentTime + 0.1);
            g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.30);
            osc2.connect(g2).connect(ctx.destination); osc2.start(ctx.currentTime + 0.1); osc2.stop(ctx.currentTime + 0.30);
            setTimeout(() => ctx.close(), 400);
          } catch { /* Audio API not available */ }
          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`💬 ${latest.author}`, {
                body: latest.text.length > 80 ? latest.text.substring(0, 80) + '…' : latest.text,
                icon: '/gilpin-logo.png', tag: 'team-chat', silent: true,
              });
            } catch { /* noop */ }
          }
          // In-app toast
          pushNotification({
            type: 'chat_message', department: 'frontofhouse', room: '',
            guestName: latest.author,
            message: latest.text.length > 60 ? latest.text.substring(0, 60) + '…' : latest.text,
            emoji: '💬', color: '#c5a065', badgeTabs: [],
          });
        }
      }
      chatLastCountRef.current = msgs.length;
    });
    return unsub;
  }, [activeSessionId, userName, isChatPanelOpen, pushNotification]);

  // Reset chat state when session changes
  useEffect(() => {
    chatInitializedRef.current = false;
    chatLastCountRef.current = 0;
  }, [activeSessionId]);

  const handleChatPanelToggle = useCallback((open: boolean) => {
    setIsChatPanelOpen(open);
  }, []);

  // ── Route sync: URL tab → dashboardView ───────────────────────────────
  // Only sync when URL actually changes (e.g. back/forward navigation).
  // dashboardView is NOT a dependency — prevents circular loop with Effect 2.
  const validTabs: DashboardView[] = ['arrivals', 'housekeeping', 'maintenance', 'frontofhouse', 'inhouse', 'packages'];
  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab as DashboardView)) {
      setDashboardView(urlTab as DashboardView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]); // ← Only URL changes trigger this, NOT state changes

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
            // After saving, check for package guests needing itineraries
            const packageCodes = /^(MIN|MAG|LHMAG)/i;
            const packageGuests = guests.filter(g => packageCodes.test(g.rateCode || ''));
            if (packageGuests.length > 0) {
              setShowItineraryQueue(true);
            }
          }
        }}
        isSessionLocked={isSessionLocked}
        isSticky={isSticky}
        onOpenPackages={() => {
          setDashboardView('packages');
          if (activeSessionId) navigate(`/session/${activeSessionId}/packages`, { replace: true });
        }}
        showPackages={dashboardView === 'packages'}
        onOpenHandover={() => setShowHandoverHub(true)}
      />

      {/* Notification Toast Overlay */}
      <NotificationToast
        notifications={notifications}
        onDismiss={dismissNotification}
        onClearAll={clearAllNotifications}
        onNavigate={(view) => { setDashboardView(view); clearBadge(view); }}
      />

      {isOldFile && guests.length > 0 && (
        <div className="no-print pulsate-alert text-white text-center font-black tracking-widest text-[7px] md:text-[10px] sticky w-full z-[1009] flex items-center justify-center" style={{ top: 'var(--nav-height)', height: 'var(--alert-height)', marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          ⚠️ HISTORICAL FILE • {arrivalDateStr}
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

      {/* Handover Hub Overlay */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {showHandoverHub && (
            <HandoverHub onClose={() => setShowHandoverHub(false)} onOpenDayReport={() => setShowDayReport(true)} />
          )}
        </AnimatePresence>
      </Suspense>

      {/* Day Report Overlay */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {showDayReport && (
            <DayReport onClose={() => setShowDayReport(false)} />
          )}
        </AnimatePresence>
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
          department={deptMapped}
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
          externalChatMessages={chatMessages}
          onPanelToggle={handleChatPanelToggle}
        />
      )}

      {/* Mobile Debug Overlay  ?debug=1 or long-press connection dot */}
      <MobileDebugOverlay connectionStatus={connectionStatus} />

      {/* Package Prompt — floating banner after AI audit detects package guests */}
      {packagePromptVisible && !packagePromptMinimised && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1100] animate-slide-up">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-amber-400/30 backdrop-blur-xl"
            style={{ background: 'linear-gradient(135deg, rgba(180,140,60,0.95), rgba(140,100,40,0.95))' }}>
            <span className="text-2xl">📦</span>
            <span className="text-white font-semibold text-sm">Minimoon / Magical Escape guests detected</span>
            <button
              onClick={() => {
                setPackagePromptVisible(false);
                setDashboardView('packages');
                if (activeSessionId) navigate(`/session/${activeSessionId}/packages`, { replace: true });
              }}
              className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-bold transition-all"
            >
              Open Generator
            </button>
            <button
              onClick={() => setPackagePromptMinimised(true)}
              className="px-2 py-1.5 text-white/70 hover:text-white text-xs transition-all"
              title="Minimise"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Minimised package pill badge */}
      {packagePromptVisible && packagePromptMinimised && (
        <button
          onClick={() => setPackagePromptMinimised(false)}
          className="fixed bottom-20 right-4 z-[1100] w-11 h-11 rounded-full bg-amber-600 hover:bg-amber-500 shadow-xl flex items-center justify-center text-xl transition-all hover:scale-110 animate-bounce-once"
          title="Package guests detected — click to open prompt"
        >
          📦
        </button>
      )}

      {/* Itinerary Queue Modal  triggered after save for package guests */}
      {showItineraryQueue && (
        <ItineraryQueue
          guests={guests}
          session={activeSession}
          onClose={() => setShowItineraryQueue(false)}
        />
      )}
    </div>
  );
};

export default App;