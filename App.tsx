import React, { useState, useEffect, useCallback } from 'react';
import { Guest, FilterType, Flag, PrintMode, RefinementField } from './types';
import { PDFService } from './services/pdfService';
import { GeminiService } from './services/geminiService';
import { ExcelService } from './services/excelService';
import { DEFAULT_FLAGS } from './constants';
import Dashboard from './components/Dashboard';
import GuestRow from './components/GuestRow';
import SOPModal from './components/SOPModal';

const BATCH_SIZE = 6; // Reduced batch size to stay within quota
const GILPIN_LOGO_URL = "https://i.ibb.co/nsfDhDSs/Gilpin-logo.png";

const App: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [arrivalDateStr, setArrivalDateStr] = useState<string>("Loading...");
  const [isOldFile, setIsOldFile] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState<PrintMode>('main');
  
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  
  const [isSticky, setIsSticky] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSopOpen, setIsSopOpen] = useState(false);

  const refinementFields: RefinementField[] = ['notes', 'facilities', 'inRoomItems', 'preferences', 'packages', 'history'];

  const [flags, setFlags] = useState<Flag[]>(() => {
    const saved = localStorage.getItem('custom_flags');
    return saved ? JSON.parse(saved) : DEFAULT_FLAGS;
  });

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    setArrivalDateStr(todayStr);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (guests.length > 0) {
        setIsSticky(window.scrollY > 15);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [guests.length]);

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('custom_flags', JSON.stringify(flags));
  }, [flags]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleUpdateApiKey = useCallback(async () => {
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.openSelectKey === 'function') {
        await aistudio.openSelectKey();
      }
    } catch (err) {
      console.error("Failed to open key selection dialog:", err);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setProgressMsg("Scanning File Stream...");
    try {
      await new Promise(r => setTimeout(r, 600));
      const result = await PDFService.parse(file, flags);
      setGuests(result.guests);
      setArrivalDateStr(result.arrivalDateStr);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (result.arrivalDateObj) {
        const fileDate = new Date(result.arrivalDateObj);
        fileDate.setHours(0,0,0,0);
        setIsOldFile(fileDate < today);
      } else {
        setIsOldFile(false);
      }
    } catch (err) {
      console.error(err);
      alert("Extraction Failure.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIRefine = async () => {
    if (guests.length === 0) return;
    setIsProcessing(true);
    const validGuests = guests.filter(g => g.id && !g.id.toString().startsWith('MAN-'));
    
    const chunks: Guest[][] = [];
    for (let i = 0; i < validGuests.length; i += BATCH_SIZE) {
      chunks.push(validGuests.slice(i, i + BATCH_SIZE));
    }

    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentBatch = chunks[i];
        setProgressMsg(`Gemini auditing ${i + 1}/${chunks.length}...`);
        
        try {
          const refinements = await GeminiService.refineGuestBatch(currentBatch, refinementFields);
          if (refinements && Array.isArray(refinements)) {
            setGuests(prev => {
              const next = [...prev];
              currentBatch.forEach((guest, index) => {
                const refinement = refinements[index];
                if (refinement) {
                  const targetIndex = next.findIndex(g => g.id === guest.id);
                  if (targetIndex !== -1) {
                    const original = next[targetIndex];
                    next[targetIndex] = { 
                      ...original, 
                      prefillNotes: refinement.notes || original.prefillNotes,
                      facilities: refinement.facilities || original.facilities,
                      inRoomItems: refinement.inRoomItems || original.inRoomItems,
                      preferences: refinement.preferences || original.preferences,
                      packageName: refinement.packages || original.packageName,
                      ll: refinement.history || original.ll
                    };
                  }
                }
              });
              return next;
            });
          }
        } catch (innerError: any) {
          if (innerError.message === "API_KEY_INVALID") {
            alert("Security Sync Required: Please select a valid Gemini API Key.");
            await handleUpdateApiKey();
            break; 
          }
          if (innerError.message === "QUOTA_EXHAUSTED") {
            alert("Rate Limit Alert: The AI is busy. Please wait 60 seconds and try again, or switch to a Paid API Key for faster processing.");
            break;
          }
          throw innerError;
        }

        if (i < chunks.length - 1) {
          setProgressMsg(`Cooling down...`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (error: any) {
      console.error("AI Cycle Error:", error);
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
    }
  };

  const updateGuest = useCallback((id: string, updates: Partial<Guest>) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, []);

  const deleteGuest = useCallback((id: string) => {
    setGuests(prev => prev.filter(g => g.id !== id));
  }, []);

  const addManual = () => {
    const newGuest: Guest = {
      id: "MAN-" + Date.now(),
      room: "TBD",
      name: "New Guest",
      car: "",
      ll: "No",
      eta: "14:00",
      duration: "1",
      facilities: "",
      prefillNotes: "",
      inRoomItems: "",
      preferences: "",
      rawHtml: "Manual Entry",
      isManual: true
    };
    setGuests(prev => [newGuest, ...prev]);
  };

  const stats = (() => {
    const total = guests.length;
    const mainHotel = guests.filter(g => {
      const parts = g.room.split(' ');
      const rNum = parseInt(parts[0]);
      return (rNum > 0 && rNum <= 31) || isNaN(rNum);
    }).length;
    const lakeHouse = guests.filter(g => {
      const parts = g.room.split(' ');
      const rNum = parseInt(parts[0]);
      return rNum >= 51 && rNum <= 60;
    }).length;
    const vips = guests.filter(g => g.prefillNotes.includes('⭐') || g.prefillNotes.includes('VIP')).length;
    const allergies = guests.filter(g => g.prefillNotes.includes('⚠️') || g.prefillNotes.includes('🥛') || g.prefillNotes.includes('🥜') || g.prefillNotes.includes('🍞') || g.prefillNotes.includes('🧀')).length;
    const returns = guests.filter(g => g.ll.toLowerCase().includes('yes')).length;
    return { total, mainHotel, lakeHouse, vips, allergies, returns };
  })();

  const filteredGuests = guests.filter(g => {
    if (activeFilter === 'all') return true;
    const parts = g.room.split(' ');
    const rNum = parseInt(parts[0]);
    if (activeFilter === 'main') return rNum <= 31 || isNaN(rNum);
    if (activeFilter === 'lake') return rNum >= 51 && rNum <= 60;
    if (activeFilter === 'vip') return g.prefillNotes.includes('⭐') || g.prefillNotes.includes('VIP');
    if (activeFilter === 'allergy') return ['⚠️', '🥛', '🥜', '🍞', '🧀'].some(e => g.prefillNotes.includes(e));
    if (activeFilter === 'return') return g.ll.toLowerCase().includes('yes');
    return true;
  });

  const triggerPrint = (mode: PrintMode) => {
    setPrintMode(mode);
    setTimeout(() => window.print(), 200);
  };

  // Stack calculation
  const NAV_HEIGHT = 64;
  const ALERT_HEIGHT = 32;
  const dashboardTop = isOldFile ? NAV_HEIGHT + ALERT_HEIGHT : NAV_HEIGHT;

  return (
    <div className="min-h-screen transition-all duration-500 font-sans selection:bg-[#c5a065]/30">
      <nav className="navbar no-print">
        <div className="nav-left flex items-center h-full">
          <div className="nav-logo-bubble" onClick={() => window.location.reload()}>
            <img src={GILPIN_LOGO_URL} alt="Gilpin" className="nav-logo-img" />
          </div>
          <div className="nav-text-container ml-4">
            <div className="nav-title font-black text-2xl tracking-tight uppercase heading-font leading-none mb-1 text-slate-950 dark:text-white">Gilpin Hotel</div>
            <div className="nav-date font-bold text-slate-400 text-[8px] tracking-[0.4em] uppercase leading-none">{arrivalDateStr}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setIsSopOpen(true)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 shadow-sm text-sm hover:scale-110 active:scale-95 transition-all flex items-center justify-center font-bold text-[#c5a065]">?</button>
          
          <label className="switch">
            <input type="checkbox" id="theme-switch" checked={isDark} onChange={(e) => setIsDark(e.target.checked)} />
            <span className="slider"></span>
          </label>
          <button onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 shadow-sm text-sm hover:scale-110 active:scale-95 transition-all flex items-center justify-center">⚙️</button>
          
          {guests.length > 0 && (
            <div className="flex gap-2 ml-4">
              <button 
                onClick={handleAIRefine}
                className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:scale-105 active:scale-95 hover:shadow-indigo-500/20"
              >
                <span className="text-sm">✨</span> GEMINI AI REFINE
              </button>
              <button onClick={() => triggerPrint('inroom')} className="bg-sky-600/90 backdrop-blur-md text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-sky-500 transition-all">🎁 Delivery</button>
              <button onClick={() => triggerPrint('greeter')} className="bg-amber-500 text-slate-950 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-amber-400 transition-all">👋 Greeter</button>
              <button onClick={() => triggerPrint('main')} className="bg-slate-950 dark:bg-stone-800 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-800 transition-all">🖨️ Arrivals</button>
              <button onClick={() => ExcelService.export(guests)} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm transition-all hover:bg-emerald-500">⬇️ Excel</button>
              <button onClick={addManual} className="bg-white/50 dark:bg-stone-800/50 backdrop-blur-sm text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-stone-700 shadow-sm hover:bg-white dark:hover:bg-stone-700 transition-all">➕ Add</button>
            </div>
          )}
        </div>
      </nav>

      {isOldFile && guests.length > 0 && (
        <div className="security-alert no-print animate-pulse">
          ⚠️ SECURITY WARNING: HISTORICAL ARRIVALS FILE ({arrivalDateStr.toUpperCase()})
        </div>
      )}

      {guests.length > 0 && (
        <div 
          className="dashboard-outer-wrapper no-print relative transition-all duration-500" 
          style={{ height: '72px', marginTop: isOldFile ? ALERT_HEIGHT + 'px' : '0' }}
        >
          <div 
            className={`dashboard-container no-print ${isSticky ? 'sticky' : ''}`}
            style={isSticky ? { top: dashboardTop + 'px' } : {}}
          >
            <Dashboard guests={guests} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          </div>
        </div>
      )}

      <main className="max-w-[1920px] mx-auto p-4">
        {guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 text-center">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_40%,rgba(197,160,101,0.12),transparent_60%)]"></div>
            <div 
              id="drop-zone" 
              className="group relative p-32 border-2 border-dashed border-slate-200 dark:border-stone-800 rounded-[4rem] bg-white/20 dark:bg-stone-900/20 backdrop-blur-3xl flex flex-col items-center gap-12 cursor-pointer hover:border-[#c5a065] transition-all duration-700 shadow-2xl w-full max-w-4xl overflow-hidden"
              onClick={() => (document.getElementById('file-upload') as HTMLInputElement).click()}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-1000 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 blur-[120px]"></div>
              </div>
              <div className="w-24 h-24 rounded-full bg-white dark:bg-stone-800 flex items-center justify-center shadow-2xl mb-2 transition-all duration-500 group-hover:scale-110 group-hover:shadow-[#c5a065]/20">
                <span className="text-6xl drop-shadow-sm">📄</span>
              </div>
              <div className="space-y-4">
                <h2 className="heading-font text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Gilpin Arrivals Tool</h2>
                <p className="text-slate-500 dark:text-slate-400 text-[12px] font-black uppercase tracking-[0.6em]">Add arrivals pdf file</p>
              </div>
              <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </div>
            
            <button 
              onClick={() => setIsSopOpen(true)}
              className="mt-12 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-[#c5a065] transition-colors"
            >
              View System SOP / Guidelines
            </button>
          </div>
        ) : (
          <div className="bg-white/30 dark:bg-stone-900/30 backdrop-blur-3xl rounded-[2rem] shadow-2xl border border-white/50 dark:border-stone-800/50 overflow-hidden print:hidden mt-4 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[2000px]">
                <thead>
                  <tr className="bg-slate-950 text-slate-500 uppercase text-[9px] font-black tracking-[0.3em] border-b border-slate-800/50">
                    <th className="w-[50px] p-4 text-center"></th>
                    <th className="w-[120px] p-4">Room</th>
                    <th className="w-[260px] p-4">Guest Identity</th>
                    <th className="w-[80px] p-4 text-center">Stay</th>
                    <th className="w-[130px] p-4">Car Registration</th>
                    <th className="w-[80px] p-4 text-center">L&L</th>
                    <th className="w-[300px] p-4">Facilities</th>
                    <th className="w-[90px] p-4 text-center">ETA</th>
                    <th className="p-4">Intelligence Notes</th>
                    <th className="w-[280px] p-4 text-indigo-400">Gemini Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                  {filteredGuests.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      isEditMode={true}
                      onUpdate={(updates) => updateGuest(guest.id, updates)}
                      onDelete={() => deleteGuest(guest.id)}
                      isExpanded={expandedRows.has(guest.id)}
                      onToggleExpand={() => toggleExpand(guest.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRINT ENGINE */}
        <div className="hidden print:block w-full font-sans leading-tight">
            <div className="flex justify-between items-end border-b-4 border-[#c5a065] pb-2 mb-4">
                <div className="flex items-center gap-4">
                    <img src={GILPIN_LOGO_URL} alt="Gilpin" className="h-12" />
                    <div>
                        <h1 className="text-3xl font-black heading-font uppercase tracking-tighter text-slate-950 leading-none mb-1">
                          {printMode === 'main' ? 'ARRIVALS LIST' : printMode === 'greeter' ? 'GUEST GREETER' : 'RECEPTION & BAR DELIVERY'}
                        </h1>
                        <div className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a065]">{arrivalDateStr.toUpperCase()}</div>
                    </div>
                </div>
                <div className="flex gap-3 items-center mb-1">
                   <div className="border-2 border-slate-950 rounded-xl px-4 py-1 flex flex-col items-center min-w-[45pt]"><span className="text-[7pt] font-black uppercase text-slate-400 leading-none">Total</span><span className="text-[12pt] font-black leading-none mt-1">{stats.total}</span></div>
                   <div className="border-2 border-slate-950 rounded-xl px-4 py-1 flex flex-col items-center min-w-[45pt]"><span className="text-[7pt] font-black uppercase text-slate-400 leading-none">Main</span><span className="text-[12pt] font-black leading-none mt-1">{stats.mainHotel}</span></div>
                   <div className="border-2 border-slate-950 rounded-xl px-4 py-1 flex flex-col items-center min-w-[45pt]"><span className="text-[7pt] font-black uppercase text-slate-400 leading-none">Lake</span><span className="text-[12pt] font-black leading-none mt-1">{stats.lakeHouse}</span></div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full text-center text-[7pt] font-black uppercase text-slate-400 py-6 tracking-[0.6em]">
                GILPIN HOTEL • GEMINI AI • {new Date().toLocaleString()}
            </div>
        </div>
      </main>

      {/* GEMINI REFINEMENT SCREEN */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/99 backdrop-blur-3xl z-[5000] flex flex-col items-center justify-center text-white text-center p-16 animate-in fade-in duration-1000 overflow-hidden">
          <div className="flex items-center justify-center relative mb-28">
            <div className="gemini-orb-v4"></div>
            <div className="gemini-core-v4">
                <img src={GILPIN_LOGO_URL} alt="Gilpin" className="w-14 h-14 grayscale brightness-150" />
            </div>
          </div>
          
          <div className="space-y-4 max-w-2xl">
            <h2 className="heading-font text-3xl font-black tracking-tighter uppercase leading-none text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-red-400 to-yellow-400 drop-shadow-xl">Reasoning</h2>
            <p className="text-[#c5a065] font-black uppercase tracking-[0.5em] text-[10px] animate-pulse h-10 flex items-center justify-center">
                {progressMsg}
            </p>
          </div>
        </div>
      )}

      <SOPModal isOpen={isSopOpen} onClose={() => setIsSopOpen(false)} />
    </div>
  );
};

export default App;