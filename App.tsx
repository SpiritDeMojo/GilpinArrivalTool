import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Guest, FilterType, Flag, PrintMode, RefinementField, RefinementMode } from './types';
import { PDFService } from './services/pdfService';
import { GeminiService } from './services/geminiService';
import { ExcelService } from './services/excelService';
import { DEFAULT_FLAGS } from './constants';
import Dashboard from './components/Dashboard';
import GuestRow from './components/GuestRow';

const BATCH_SIZE = 8;

// Official Gilpin Logo Source
const GILPIN_LOGO_URL = "https://i.ibb.co/nsfDhDSs/Gilpin-logo.png";

const App: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [arrivalDateStr, setArrivalDateStr] = useState<string>("Loading...");
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
  
  const [refinementFields, setRefinementFields] = useState<RefinementField[]>(['notes', 'facilities', 'inRoomItems', 'preferences', 'packages', 'history']);
  const [refinementMode, setRefinementMode] = useState<RefinementMode>('paid');
  const [showRefineOptions, setShowRefineOptions] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [flags, setFlags] = useState<Flag[]>(() => {
    const saved = localStorage.getItem('custom_flags');
    return saved ? JSON.parse(saved) : DEFAULT_FLAGS;
  });
  const [newFlag, setNewFlag] = useState({ emoji: '', name: '', keys: '' });

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    setArrivalDateStr(today);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (guests.length > 0) {
        setIsSticky(window.scrollY > 20);
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
    setProgressMsg("Scoping Intel Stream...");
    try {
      await new Promise(r => setTimeout(r, 100));
      const result = await PDFService.parse(file, flags);
      setGuests(result.guests);
      setArrivalDateStr(result.arrivalDateStr);
    } catch (err) {
      console.error(err);
      alert("Error parsing PDF. Please ensure it's a valid Gilpin Arrivals list.");
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
        const tierLabel = refinementMode === 'paid' ? '💎 DIAMOND' : '✨ STANDARD';
        setProgressMsg(`${tierLabel} BATCH ${i + 1}/${chunks.length}\nAnalyzing ${currentBatch.length} Records...`);
        
        try {
          const refinements = await GeminiService.refineGuestBatch(currentBatch, refinementFields, refinementMode);
          if (refinements && Array.isArray(refinements)) {
            setGuests(prev => {
              const next = [...prev];
              currentBatch.forEach((guest, index) => {
                const refinement = refinements[index];
                if (refinement) {
                  const targetIndex = next.findIndex(g => g.id === guest.id);
                  if (targetIndex !== -1) {
                    next[targetIndex] = { ...next[targetIndex], ...refinement };
                  }
                }
              });
              return next;
            });
          }
        } catch (innerError: any) {
          if (innerError.message === "API_KEY_INVALID") {
            alert("API Key issue detected. Please re-link your key.");
            await handleUpdateApiKey();
            break; 
          }
          throw innerError;
        }

        if (i < chunks.length - 1) {
          const delayMs = refinementMode === 'paid' ? 2000 : 15000;
          const seconds = Math.floor(delayMs / 1000);
          for (let s = seconds; s > 0; s--) {
            setProgressMsg(`Quota Cooling (${s}s)...\nUp Next: Batch ${i + 2}/${chunks.length}`);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
    } catch (error: any) {
      console.error("Batch refinement error:", error);
      alert("Intelligence cycle interrupted.");
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
      setShowRefineOptions(false);
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

  const addFlag = () => {
    if (!newFlag.emoji || !newFlag.name || !newFlag.keys) return;
    const flag: Flag = {
      id: Date.now(),
      emoji: newFlag.emoji,
      name: newFlag.name,
      keys: newFlag.keys.split(',').map(k => k.trim().toLowerCase())
    };
    setFlags(prev => [...prev, flag]);
    setNewFlag({ emoji: '', name: '', keys: '' });
  };

  const removeFlag = (id: number) => {
    setFlags(prev => prev.filter(f => f.id !== id));
  };

  const getStatsValues = () => {
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
  };

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

  const stats = getStatsValues();

  return (
    <div className="min-h-screen transition-all duration-300">
      <nav className="navbar no-print">
        <div className="nav-left flex items-center h-full">
          <div className="nav-logo-bubble" onClick={() => window.location.reload()} title="Reset System">
            <img src={GILPIN_LOGO_URL} alt="Gilpin" className="nav-logo-img" />
          </div>
          <div className="nav-text-container ml-2">
            <div className="nav-title font-black text-lg tracking-tighter uppercase heading-font leading-none mb-0.5">Gilpin Hotel</div>
            <div className="nav-date font-bold text-slate-400 text-[7px] tracking-widest uppercase leading-none">{arrivalDateStr}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="switch">
              <input type="checkbox" checked={isDark} onChange={(e) => setIsDark(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          <button onClick={() => setIsSettingsOpen(true)} className="p-1 bg-white/50 dark:bg-stone-800/50 rounded-full border border-slate-200 dark:border-stone-700 shadow-sm text-sm">⚙️</button>
          
          {guests.length > 0 && (
            <div className="flex gap-1 ml-1">
              <div className="relative">
                <button 
                  onClick={() => setShowRefineOptions(!showRefineOptions)}
                  className={`px-3 py-1 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1 ${refinementMode === 'paid' ? 'bg-indigo-700' : 'bg-indigo-600'} text-white`}
                >
                  {refinementMode === 'paid' ? '💎 DIAMOND' : '✨ AI REFINE'}
                </button>
                {showRefineOptions && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-slate-200 dark:border-stone-800 p-3 z-[1100] animate-in fade-in zoom-in-95">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1 border-b border-slate-100 dark:border-slate-800 pb-1">Refinement Tier</p>
                    <div className="grid grid-cols-2 gap-1 mb-2 bg-slate-50/50 dark:bg-stone-800/50 p-1 rounded-md">
                      <button onClick={() => setRefinementMode('free')} className={`py-1 text-[7px] font-black rounded ${refinementMode === 'free' ? 'bg-white dark:bg-stone-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}>Standard</button>
                      <button onClick={() => setRefinementMode('paid')} className={`py-1 text-[7px] font-black rounded ${refinementMode === 'paid' ? 'bg-indigo-600 shadow-sm text-white' : 'text-slate-500'}`}>Diamond</button>
                    </div>
                    <p className="text-[6px] text-slate-400 leading-tight mb-2 px-1">
                      {refinementMode === 'paid' ? 'Diamond uses the Premium Pro model for deep DNA inference.' : 'Standard uses the Flash model for rapid factual extraction.'}
                    </p>
                    <button onClick={handleAIRefine} className="w-full mt-1.5 bg-indigo-600 text-white text-[7.5px] font-black uppercase py-2 rounded shadow-md">Initiate Analysis</button>
                  </div>
                )}
              </div>
              <button onClick={() => triggerPrint('inroom')} className="bg-sky-600 text-white px-3 py-1 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm">🎁 In Room</button>
              <button onClick={() => triggerPrint('greeter')} className="bg-amber-500 text-slate-900 px-3 py-1 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm">👋 Greeter</button>
              <button onClick={() => triggerPrint('main')} className="bg-slate-950 dark:bg-stone-800 text-white px-3 py-1 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm">🖨️ Arrivals</button>
              <button onClick={() => ExcelService.export(guests)} className="bg-emerald-600 text-white px-3 py-1 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm">⬇️ Excel</button>
              <button onClick={addManual} className="bg-slate-100/80 dark:bg-stone-700/80 text-slate-800 dark:text-white px-3 py-1 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm">➕ Add</button>
            </div>
          )}
        </div>
      </nav>

      {guests.length > 0 && (
        <div className={`dashboard-container no-print ${isSticky ? 'sticky' : ''}`}>
          <Dashboard guests={guests} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        </div>
      )}

      <main className="max-w-[1920px] mx-auto p-2">
        {guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[85vh]">
            <div id="drop-zone" className="p-10 border-2 border-dashed border-slate-300 dark:border-stone-800 rounded-[2rem] bg-white/40 dark:bg-stone-900/40 backdrop-blur-xl flex flex-col items-center gap-4 cursor-pointer hover:border-[#c5a065] transition-all shadow-xl" onClick={() => (document.getElementById('file-upload') as HTMLInputElement).click()}>
                <h2 className="heading-font text-3xl font-black mb-1 dynamic-text uppercase text-slate-900 dark:text-white">Upload Arrivals PDF</h2>
                <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest">Secure Intelligence Protocol V3.72 Stable</p>
                <div className="w-12 h-0.5 bg-amber-400 rounded-full opacity-60"></div>
                <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </div>
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 dark:border-stone-800 overflow-hidden print:hidden mt-1">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[1850px]">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[7.5px] font-black tracking-widest border-b border-slate-800">
                    <th className="w-[30px] p-1.5"></th>
                    <th className="w-[100px] p-1.5">Room</th>
                    <th className="w-[220px] p-1.5">Guest Name</th>
                    <th className="w-[50px] p-1.5 text-center">Stay</th>
                    <th className="w-[100px] p-1.5">Car Reg</th>
                    <th className="w-[50px] p-1.5 text-center">L&L</th>
                    <th className="w-[240px] p-1.5">Facilities</th>
                    <th className="w-[60px] p-1.5 text-center">ETA</th>
                    <th className="p-1.5">Notes & Strategy</th>
                    <th className="w-[220px] p-1.5">Inferred DNA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
        <div className="hidden print:block w-full">
            <div className="flex justify-between items-end border-b-2 border-[#c5a065] pb-2 mb-4">
                <div className="flex items-center gap-3">
                    <img src={GILPIN_LOGO_URL} alt="Gilpin" className="h-12" />
                    <div>
                        <h1 className="text-xl font-black heading-font uppercase tracking-tighter text-slate-950">
                          {printMode === 'main' ? 'Arrivals List' : printMode === 'greeter' ? 'Guest Greeter' : 'In-Room Requirements'}
                        </h1>
                        <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500">{arrivalDateStr}</div>
                    </div>
                </div>
                <div className="flex gap-2 items-center mb-1">
                   <div className="border border-slate-300 rounded px-2 py-0.5 flex flex-col items-center"><span className="text-[5pt] font-black uppercase text-slate-400">Total</span><span className="text-[7pt] font-bold">{stats.total}</span></div>
                   <div className="border border-slate-300 rounded px-2 py-0.5 flex flex-col items-center"><span className="text-[5pt] font-black uppercase text-slate-400">Main</span><span className="text-[7pt] font-bold">{stats.mainHotel}</span></div>
                   <div className="border border-slate-300 rounded px-2 py-0.5 flex flex-col items-center"><span className="text-[5pt] font-black uppercase text-slate-400">Lake</span><span className="text-[7pt] font-bold">{stats.lakeHouse}</span></div>
                   <div className="border border-slate-300 rounded px-2 py-0.5 flex flex-col items-center"><span className="text-[5pt] font-black uppercase text-slate-400">Return</span><span className="text-[7pt] font-bold">{stats.returns}</span></div>
                   <div className="border border-slate-300 rounded px-2 py-0.5 flex flex-col items-center"><span className="text-[5pt] font-black uppercase text-slate-400">VIP</span><span className="text-[7pt] font-bold">{stats.vips}</span></div>
                </div>
            </div>

            <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 uppercase text-[6pt] font-black tracking-widest text-left">
                  {printMode === 'main' && (
                    <>
                      <th className="p-1 w-[40pt]">Room</th>
                      <th className="p-1 w-[120pt]">Guest Name</th>
                      <th className="p-1 w-[25pt] text-center">Stay</th>
                      <th className="p-1 w-[60pt]">Car Reg</th>
                      <th className="p-1 w-[30pt] text-center">L&L</th>
                      <th className="p-1 w-[150pt]">Facilities</th>
                      <th className="p-1 w-[40pt] text-center">ETA</th>
                      <th className="p-1">Notes</th>
                      <th className="p-1 w-[90pt]">DNA</th>
                    </>
                  )}
                  {printMode === 'greeter' && (
                    <>
                      <th className="p-3 w-[50pt] text-center">Time</th>
                      <th className="p-3 w-[50pt]">Room</th>
                      <th className="p-3 w-[150pt]">Guest Name</th>
                      <th className="p-3 w-[80pt]">Car Reg</th>
                      <th className="p-3">Notes</th>
                    </>
                  )}
                  {printMode === 'inroom' && (
                    <>
                      <th className="p-4 w-[80pt] border-b-2 border-slate-200">Room</th>
                      <th className="p-4 w-[180pt] border-b-2 border-slate-200">Guest Name</th>
                      <th className="p-4 border-b-2 border-slate-200">Requirements / Setup</th>
                    </>
                  )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredGuests
                    .filter(g => {
                      if (printMode !== 'inroom') return true;
                      const hasItems = (g.inRoomItems && g.inRoomItems.length > 2);
                      const hasNotes = g.prefillNotes.toLowerCase().includes('in room') || g.prefillNotes.toLowerCase().includes('setup');
                      return hasItems || hasNotes;
                    })
                    .map(g => (
                    <tr key={g.id} className="text-[7pt] border-b border-slate-100">
                      {printMode === 'main' && (
                        <>
                          <td className="p-1 font-bold">{g.room}</td>
                          <td className="p-1 font-bold">{g.name}</td>
                          <td className="p-1 text-center font-bold text-slate-500">{g.duration}</td>
                          <td className="p-1 font-mono">{g.car}</td>
                          <td className="p-1 text-center">{g.ll}</td>
                          <td className="p-1 text-[6pt] leading-tight">{g.facilities.replace(/\n/g, ' • ')}</td>
                          <td className="p-1 text-center font-black">{g.eta}</td>
                          <td className="p-1 text-[6pt] italic text-slate-800">{g.prefillNotes.replace(/\n/g, ' • ')}</td>
                          <td className="p-1 text-[6pt] font-bold text-purple-950">{g.preferences}</td>
                        </>
                      )}
                      {printMode === 'greeter' && (
                        <>
                          <td className="p-3 text-center font-black text-lg">{g.eta || '--:--'}</td>
                          <td className="p-3 font-black text-base">{g.room}</td>
                          <td className="p-3 font-black text-base">{g.name}</td>
                          <td className="p-3 font-mono font-bold text-base">{g.car}</td>
                          <td className="p-3 text-[9pt] italic font-bold leading-tight">{g.prefillNotes.replace(/\n/g, ' • ')}</td>
                        </>
                      )}
                      {printMode === 'inroom' && (
                        <>
                          <td className="p-5 font-black text-2xl border-r-2 border-[#c5a065] bg-slate-50/30">{g.room}</td>
                          <td className="p-5 font-black text-xl">{g.name}</td>
                          <td className="p-5 text-[#c5a065] font-black italic text-xl leading-relaxed">
                            {g.inRoomItems || g.prefillNotes.split('\n').filter(n => n.toLowerCase().includes('in room')).join(' • ') || 'CHECK GUEST NOTES'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="fixed bottom-0 left-0 w-full text-center text-[5pt] font-black uppercase text-slate-400 py-2">
                Gilpin Hotel & Lake House • Diamond Intel V3.72 • {new Date().toLocaleString()}
              </div>
        </div>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[4000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-xl shadow-2xl border border-[#c5a065]/40 p-8 transform transition-all animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <span className="text-3xl">⚙️</span>
                <h2 className="heading-font text-2xl font-black text-slate-900 dark:text-white uppercase">System Config</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="bg-slate-100 dark:bg-stone-800 text-slate-500 hover:text-rose-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-2xl transition-all">×</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a065] mb-4">Core Uplink</h3>
                <div className="bg-slate-50 dark:bg-stone-800/60 p-4 rounded-lg border border-slate-100 dark:border-stone-800 shadow-inner">
                  <button onClick={handleUpdateApiKey} className="w-full bg-slate-950 dark:bg-[#c5a065] text-white dark:text-slate-950 text-[9px] font-black uppercase py-3 rounded-md shadow mb-4">🔑 Sync Token</button>
                  <p className="text-[9px] text-slate-400 italic text-center px-2">Link Gemini Pro key for high-throughput extraction.</p>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c5a065] mb-4">Logic Patches</h3>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1.5">
                  {flags.map(flag => (
                    <div key={flag.id} className="flex items-center justify-between p-2 bg-white dark:bg-stone-800/40 rounded-md border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{flag.emoji}</span>
                        <p className="font-black text-slate-900 dark:text-white text-[10px] uppercase">{flag.name}</p>
                      </div>
                      <button onClick={() => removeFlag(flag.id)} className="text-rose-400 hover:text-rose-600 font-bold p-1 text-base">×</button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-slate-50 dark:bg-stone-800/60 p-4 rounded-lg">
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <input type="text" placeholder="✨" className="p-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded text-center text-slate-900 dark:text-white text-base font-black" value={newFlag.emoji} onChange={e => setNewFlag({...newFlag, emoji: e.target.value})} />
                    <input type="text" placeholder="Rule Name" className="col-span-3 p-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded text-[10px] font-black text-slate-900 dark:text-white uppercase" value={newFlag.name} onChange={e => setNewFlag({...newFlag, name: e.target.value})} />
                  </div>
                  <button onClick={addFlag} className="w-full bg-[#c5a065] text-slate-950 font-black uppercase text-[9px] py-3 rounded-md shadow">Add Logic</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[5000] flex flex-col items-center justify-center text-white text-center p-12 animate-in fade-in duration-500 overflow-hidden">
          <div className="relative mb-12">
            <div className={`w-32 h-32 bg-gradient-to-br ${refinementMode === 'paid' ? 'from-indigo-400 to-indigo-950' : 'from-[#c5a065] to-yellow-100'} rounded-full animate-pulse flex items-center justify-center text-[5rem] shadow-[0_0_80px_rgba(197,160,101,0.3)]`}>
              {refinementMode === 'paid' ? '💎' : '🤖'}
            </div>
          </div>
          <h2 className="heading-font text-4xl font-black mb-4 tracking-tighter uppercase leading-none">
            {refinementMode === 'paid' ? 'Diamond Intel' : 'Extraction Hub'}
          </h2>
          <p className="text-[#c5a065] font-black uppercase tracking-[0.4em] text-[10px] mb-10 animate-pulse whitespace-pre-wrap max-w-md">{progressMsg}</p>
          <div className="w-[300px] h-[2px] bg-slate-800/60 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-transparent via-[#c5a065] to-transparent animate-[shimmer_2s_infinite] w-full" style={{ backgroundSize: '200% 100%' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;