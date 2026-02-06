import React, { useState, useEffect, useMemo } from 'react';
import { FilterType, PrintMode, PropertyFilter } from './types';
import { DEFAULT_FLAGS, NAV_HEIGHT, ALERT_HEIGHT } from './constants';

import { useGuestManager } from './hooks/useGuestManager';
import { useLiveAssistant } from './hooks/useLiveAssistant';

import Navbar from './components/Navbar';
import SessionBar from './components/SessionBar';
import Dashboard from './components/Dashboard';
import GuestRow from './components/GuestRow';
import SOPModal from './components/SOPModal';
import LiveChatWidget from './components/LiveChatWidget';
import LoadingHub from './components/LoadingHub';
import { PrintLayout } from './components/PrintLayout';
import AnalyticsView from './components/AnalyticsView';

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isSticky, setIsSticky] = useState(false);
  const [isSopOpen, setIsSopOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState<PrintMode>('master');
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('total');

  const {
    guests, filteredGuests, arrivalDateStr, isOldFile, activeFilter, setActiveFilter,
    isProcessing, progressMsg, handleFileUpload, handleAIRefine, updateGuest, deleteGuest, addManual, onExcelExport,
    sessions, activeSessionId, switchSession, deleteSession, createNewSession
  } = useGuestManager(DEFAULT_FLAGS);

  // Apply property filter to the already filtered guest list for the UI
  const propertyFilteredGuests = useMemo(() => {
    if (propertyFilter === 'total') return filteredGuests;
    return filteredGuests.filter(g => {
      const rNum = parseInt(g.room.split(' ')[0]);
      if (propertyFilter === 'main') return rNum > 0 && rNum <= 31;
      if (propertyFilter === 'lake') return rNum >= 51 && rNum <= 60;
      return true;
    });
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

  const mainPaddingTop = isOldFile && guests.length > 0 ? NAV_HEIGHT + ALERT_HEIGHT : NAV_HEIGHT;

  const triggerPrint = (mode: PrintMode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

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
        <div className="no-print pulsate-alert text-white text-center font-black py-1 tracking-widest text-[10px] fixed w-full z-[1009]" style={{ top: NAV_HEIGHT + 'px' }}>
          ⚠️ HISTORICAL FILE DETECTED • {arrivalDateStr}
        </div>
      )}

      {guests.length > 0 && (
        <div className="no-print relative my-6">
          <div 
            className={`dashboard-container no-print py-6 transition-all ${stickyStyle}`}
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

      <main className="max-w-[1800px] mx-auto px-10 pb-32 no-print">
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
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="p-24 border-2 border-dashed border-[#c5a065]/40 rounded-[3rem] bg-white/50 dark:bg-white/5 backdrop-blur flex flex-col items-center gap-8 cursor-pointer hover:border-[#c5a065] transition-all" onClick={() => document.getElementById('file-upload-nav')?.click()}>
              <span className="text-6xl animate-bounce">📁</span>
              <div className="text-center">
                <h2 className="heading-font text-5xl font-black uppercase tracking-tighter mb-2">Arrivals Hub</h2>
                <p className="text-[#c5a065] font-black uppercase tracking-[0.4em] text-sm">Deploy Arrivals Stream</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[2000px]">
                <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest">
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
                      isExpanded={expandedRows.has(g.id)} 
                      onToggleExpand={() => toggleExpand(g.id)} 
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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

      <LoadingHub isVisible={isProcessing} message={progressMsg} />

      <SOPModal isOpen={isSopOpen} onClose={() => setIsSopOpen(false)} />
    </div>
  );
};

export default App;