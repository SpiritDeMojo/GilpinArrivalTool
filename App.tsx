
import React, { useState, useEffect, useCallback } from 'react';
import { Guest, FilterType, Flag, PrintMode, RefinementField } from './types';
import { PDFService } from './services/pdfService';
import { GeminiService } from './services/geminiService';
import { ExcelService } from './services/excelService';
import { DEFAULT_FLAGS } from './constants';
import Dashboard from './components/Dashboard';
import GuestRow from './components/GuestRow';
import SOPModal from './components/SOPModal';

const BATCH_SIZE = 8;
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
  const [newFlag, setNewFlag] = useState({ emoji: '', name: '', keys: '' });

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    setArrivalDateStr(todayStr);
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
    setProgressMsg("Scanning Intelligence Stream...");
    try {
      await new Promise(r => setTimeout(r, 100));
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
      alert("Extraction Failure: Check PDF format.");
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
        setProgressMsg(`Refining Intel Segment ${i + 1}/${chunks.length}...`);
        
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
                    // Correctly map AI fields to the Guest interface
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
            alert("Security Sync Required.");
            await handleUpdateApiKey();
            break; 
          }
          throw innerError;
        }

        if (i < chunks.length - 1) {
          setProgressMsg(`Processing Intel (2s)...`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (error: any) {
      console.error("AI Cycle Error:", error);
      alert("Refinement cycle interrupted.");
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

  return (
    <div className="min-h-screen transition-all duration-300 font-sans selection:bg-[#c5a065]/30">
      <nav className="navbar no-print">
        <div className="nav-left flex items-center h-full">
          <div className="nav-logo-bubble" onClick={() => window.location.reload()}>
            <img src={GILPIN_LOGO_URL} alt="Gilpin" className="nav-logo-img" />
          </div>
          <div className="nav-text-container ml-2">
            <div className="nav-title font-black text-lg tracking-tighter uppercase heading-font leading-none mb-0.5">Gilpin Hotel</div>
            <div className="nav-date font-bold text-slate-400 text-[7px] tracking-widest uppercase leading-none">{arrivalDateStr}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsSopOpen(true)} className="p-1.5 bg-slate-100 dark:bg-stone-800 rounded-full border border-slate-200 dark:border-stone-700 shadow-sm text-sm hover:scale-110 active:scale-95 transition-transform font-bold text-[#c5a065]">?</button>
          
          <label className="switch">
            <input type="checkbox" id="theme-switch" checked={isDark} onChange={(e) => setIsDark(e.target.checked)} />
            <span className="slider"></span>
          </label>
          <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 bg-slate-100 dark:bg-stone-800 rounded-full border border-slate-200 dark:border-stone-700 shadow-sm text-sm hover:scale-110 active:scale-95 transition-transform">⚙️</button>
          
          {guests.length > 0 && (
            <div className="flex gap-1 ml-1">
              <button 
                onClick={handleAIRefine}
                className={`px-3 py-1.5 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1 bg-indigo-700 text-white hover:scale-105 active:scale-95`}
              >
                💎 DIAMOND AI REFINE
              </button>
              <button onClick={() => triggerPrint('inroom')} className="bg-sky-600 text-white px-3 py-1.5 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm hover:bg-sky-500">🎁 In Room</button>
              <button onClick={() => triggerPrint('greeter')} className="bg-amber-500 text-slate-900 px-3 py-1.5 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm hover:bg-amber-400">👋 Greeter</button>
              <button onClick={() => triggerPrint('main')} className="bg-slate-900 dark:bg-stone-700 text-white px-3 py-1.5 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm">🖨️ Arrivals</button>
              <button onClick={() => ExcelService.export(guests)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm">⬇️ Excel</button>
              <button onClick={addManual} className="bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md text-[7.5px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-200">➕ Add</button>
            </div>
          )}
        </div>
      </nav>

      {isOldFile && guests.length > 0 && (
        <div className="fixed top-[50px] left-0 w-full bg-rose-600 text-white text-center py-2 z-[950] font-black uppercase tracking-[0.4em] text-[10px] no-print animate-pulse shadow-2xl">
          ⚠️ SECURITY WARNING: HISTORICAL ARRIVALS FILE ({arrivalDateStr.toUpperCase()})
        </div>
      )}

      {guests.length > 0 && (
        <div className={`dashboard-container no-print ${isSticky ? 'sticky shadow-xl' : ''} ${isOldFile ? 'mt-8' : ''}`}>
          <Dashboard guests={guests} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
        </div>
      )}

      <main className="max-w-[1920px] mx-auto p-2">
        {guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 text-center">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(197,160,101,0.1),transparent_70%)] opacity-40"></div>
            <div 
              id="drop-zone" 
              className="group relative p-20 border-2 border-dashed border-slate-300 dark:border-stone-800 rounded-[3rem] bg-white/30 dark:bg-stone-900/30 backdrop-blur-3xl flex flex-col items-center gap-8 cursor-pointer hover:border-[#c5a065] transition-all duration-500 shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={() => (document.getElementById('file-upload') as HTMLInputElement).click()}
            >
              <div className="w-20 h-20 rounded-full bg-white dark:bg-stone-800 flex items-center justify-center shadow-lg mb-2 transition-transform group-hover:scale-110">
                <span className="text-4xl">📄</span>
              </div>
              <h2 className="heading-font text-4xl font-black mb-1 text-slate-900 dark:text-white uppercase tracking-tighter">Gilpin Arrivals Hub</h2>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-black uppercase tracking-[0.5em] max-w-sm">Secure Extraction Engine v3.99 Diamond Gold</p>
              <div className="px-8 py-3 bg-[#c5a065] text-slate-950 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl transform transition-all hover:scale-105 active:scale-95">Initiate Extraction</div>
              <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </div>
            
            <button 
              onClick={() => setIsSopOpen(true)}
              className="mt-6 text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-[#c5a065] transition-colors"
            >
              View System SOP / Guidelines
            </button>
          </div>
        ) : (
          <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 dark:border-stone-800 overflow-hidden print:hidden mt-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[1950px]">
                <thead>
                  <tr className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black tracking-[0.2em] border-b border-slate-800">
                    <th className="w-[40px] p-2.5 text-center"></th>
                    <th className="w-[110px] p-2.5">Room</th>
                    <th className="w-[240px] p-2.5">Guest Identity</th>
                    <th className="w-[70px] p-2.5 text-center">Stay</th>
                    <th className="w-[120px] p-2.5">Vehicle</th>
                    <th className="w-[70px] p-2.5 text-center">L&L</th>
                    <th className="w-[280px] p-2.5">Facilities</th>
                    <th className="w-[80px] p-2.5 text-center">ETA</th>
                    <th className="p-2.5">Notes & Refinement</th>
                    <th className="w-[260px] p-2.5 text-purple-400">Concierge Strategy (Diamond)</th>
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

        {/* GOLDEN PRINT ENGINE V3.99 - MAXIMUM DENSITY OPTIMIZATION */}
        <div className="hidden print:block w-full font-sans leading-tight">
            <div className="flex justify-between items-end border-b-2 border-[#c5a065] pb-1.5 mb-3">
                <div className="flex items-center gap-3">
                    <img src={GILPIN_LOGO_URL} alt="Gilpin" className="h-9" />
                    <div>
                        <h1 className="text-xl font-black heading-font uppercase tracking-tighter text-slate-950 leading-none mb-0.5">
                          {printMode === 'main' ? 'ARRIVALS LIST' : printMode === 'greeter' ? 'GUEST GREETER' : 'HOUSEKEEPING SETUP'}
                        </h1>
                        <div className="text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a065]">{arrivalDateStr.toUpperCase()}</div>
                    </div>
                </div>
                <div className="flex gap-1.5 items-center mb-0.5">
                   <div className="border border-slate-950 rounded px-2 py-0.5 flex flex-col items-center min-w-[32pt]"><span className="text-[5pt] font-black uppercase text-slate-400 leading-none">Total</span><span className="text-[8.5pt] font-black leading-none mt-0.5">{stats.total}</span></div>
                   <div className="border border-slate-950 rounded px-2 py-0.5 flex flex-col items-center min-w-[32pt]"><span className="text-[5pt] font-black uppercase text-slate-400 leading-none">Main</span><span className="text-[8.5pt] font-black leading-none mt-0.5">{stats.mainHotel}</span></div>
                   <div className="border border-slate-950 rounded px-2 py-0.5 flex flex-col items-center min-w-[32pt]"><span className="text-[5pt] font-black uppercase text-slate-400 leading-none">Lake</span><span className="text-[8.5pt] font-black leading-none mt-0.5">{stats.lakeHouse}</span></div>
                </div>
            </div>

            {printMode === 'main' && (
              <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-900 uppercase text-[7pt] font-black tracking-widest text-left border-b-2 border-slate-950">
                        <th className="p-1 w-[42pt]">Room</th>
                        <th className="p-1 w-[125pt]">Guest Name</th>
                        <th className="p-1 w-[28pt] text-center">Stay</th>
                        <th className="p-1 w-[78pt]">Car Reg</th>
                        <th className="p-1 w-[32pt] text-center">L&L</th>
                        <th className="p-1 w-[160pt]">Facilities</th>
                        <th className="p-1 w-[42pt] text-center">ETA</th>
                        <th className="p-1">Notes / Occasion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredGuests.map(g => (
                      <tr key={g.id} className="text-[7.5pt] border-b border-slate-200 break-inside-avoid">
                          <td className="p-1 font-black text-[#c5a065] uppercase leading-none">{g.room}</td>
                          <td className="p-1 font-black uppercase leading-tight">{g.name}</td>
                          <td className="p-1 text-center font-bold text-slate-500">{g.duration}</td>
                          <td className="p-1 font-mono font-black text-indigo-700 uppercase tracking-tight">{g.car}</td>
                          <td className="p-1 text-center font-black">{g.ll}</td>
                          <td className="p-1 text-[6.8pt] leading-tight font-medium whitespace-pre-line">{g.facilities}</td>
                          <td className="p-1 text-center font-black">{g.eta || 'N/A'}</td>
                          <td className="p-1 text-[7pt] italic text-slate-800 leading-[1.1] whitespace-pre-line">{g.prefillNotes}</td>
                      </tr>
                    ))}
                  </tbody>
              </table>
            )}

            {printMode === 'greeter' && (
              <div className="w-full border-t border-slate-950">
                <div className="grid grid-cols-[55pt_75pt_180pt_95pt_1fr] bg-slate-50 font-black uppercase text-[7.5pt] tracking-widest p-1.5 border-b-2 border-slate-950">
                  <div>Time</div>
                  <div>Room</div>
                  <div>Guest Name</div>
                  <div>Car Reg</div>
                  <div>Notes / Occasion</div>
                </div>
                {filteredGuests.map(g => (
                  <div key={g.id} className="grid grid-cols-[55pt_75pt_180pt_95pt_1fr] p-2.5 border-b border-slate-200 break-inside-avoid items-center text-[8.5pt]">
                    <div className="font-black text-slate-950 text-base">{g.eta || 'N/A'}</div>
                    <div className="font-black text-slate-950 text-base uppercase leading-none">
                        {g.room.split(' ')[0]}
                        <div className="text-[6pt] text-slate-400 tracking-wider font-bold mt-0.5">{g.room.split(' ').slice(1).join(' ')}</div>
                    </div>
                    <div className="font-black text-slate-950 text-[9.5pt] uppercase leading-tight pr-3">{g.name}</div>
                    <div className="font-mono font-black text-indigo-700 tracking-wider uppercase text-xs">{g.car}</div>
                    <div className="text-[8.5pt] font-medium leading-tight text-slate-800 whitespace-pre-line">{g.prefillNotes}</div>
                  </div>
                ))}
              </div>
            )}

            {printMode === 'inroom' && (
              <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-900 uppercase text-[8pt] font-black tracking-widest text-left border-b-2 border-slate-950">
                        <th className="p-3.5 w-[85pt] text-center bg-slate-100">Room</th>
                        <th className="p-3.5 w-[150pt]">Guest Name</th>
                        <th className="p-3.5 bg-white">Housekeeping Setup Specification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {filteredGuests
                      .filter(g => g.inRoomItems && g.inRoomItems.trim().length > 1)
                      .map(g => (
                      <tr key={g.id} className="border-b border-slate-200 break-inside-avoid">
                          <td className="p-5 font-black text-5xl text-center bg-slate-100 border-r-4 border-[#c5a065]">{g.room.split(' ')[0]}</td>
                          <td className="p-5 font-black text-xl uppercase leading-tight">{g.name}</td>
                          <td className="p-5 text-[#c5a065] font-black italic text-2xl leading-snug whitespace-pre-line bg-white">
                            {g.inRoomItems}
                          </td>
                      </tr>
                    ))}
                  </tbody>
              </table>
            )}

            <div className="fixed bottom-0 left-0 w-full text-center text-[5.5pt] font-black uppercase text-slate-400 py-3 tracking-[0.4em]">
                GILPIN HOTEL & LAKE HOUSE • V3.99 GOLDEN • {new Date().toLocaleString()} • {arrivalDateStr.toUpperCase()}
            </div>
        </div>
      </main>

      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/99 backdrop-blur-3xl z-[4000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-[#c5a065]/60 p-12 transform transition-all animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-6">
                <span className="text-4xl">⚙️</span>
                <h2 className="heading-font text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">System Logic</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="bg-slate-100 dark:bg-stone-800 text-slate-500 hover:text-rose-500 w-12 h-12 rounded-full flex items-center justify-center font-bold text-3xl transition-all shadow-xl">×</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <section>
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-[#c5a065] mb-6 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#c5a065] animate-pulse"></div>
                    AI Intel Sync
                </h3>
                <div className="bg-slate-50 dark:bg-stone-800/80 p-8 rounded-3xl border border-slate-100 dark:border-stone-800 shadow-inner">
                  <button onClick={handleUpdateApiKey} className="w-full bg-slate-950 dark:bg-[#c5a065] text-white dark:text-slate-950 text-[11px] font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-2xl hover:scale-105 active:scale-95 mb-6 transition-all">🔑 Sync AI Link</button>
                  <p className="text-[11px] text-slate-400 italic text-center px-4 leading-relaxed">Required for Diamond reasoning tiers.</p>
                </div>
              </section>

              <section>
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-[#c5a065] mb-6 flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#c5a065] animate-pulse"></div>
                    Custom Patch Rules
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-3">
                  {flags.map(flag => (
                    <div key={flag.id} className="flex items-center justify-between p-4 bg-white dark:bg-stone-800/60 rounded-2xl border border-slate-100 dark:border-stone-800 hover:border-[#c5a065] transition-all">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{flag.emoji}</span>
                        <p className="font-black text-slate-900 dark:text-white text-[12px] uppercase tracking-widest">{flag.name}</p>
                      </div>
                      <button onClick={() => removeFlag(flag.id)} className="text-rose-400 hover:text-rose-600 font-bold p-2 text-2xl transition-colors">×</button>
                    </div>
                  ))}
                </div>
                <div className="mt-8 bg-slate-50 dark:bg-stone-800/80 p-6 rounded-3xl border border-slate-100 dark:border-stone-800">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <input type="text" placeholder="✨" className="p-4 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-2xl text-center text-slate-900 dark:text-white text-2xl font-black shadow-inner" value={newFlag.emoji} onChange={e => setNewFlag({...newFlag, emoji: e.target.value})} />
                    <input type="text" placeholder="PATCH ID" className="col-span-3 p-4 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-2xl text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-widest shadow-inner" value={newFlag.name} onChange={e => setNewFlag({...newFlag, name: e.target.value})} />
                  </div>
                  <button onClick={addFlag} className="w-full bg-[#c5a065] hover:bg-amber-400 text-slate-950 font-black uppercase text-[11px] tracking-[0.3em] py-4 rounded-2xl shadow-2xl transition-all active:scale-95">Add logic rule</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/99 backdrop-blur-3xl z-[5000] flex flex-col items-center justify-center text-white text-center p-12 animate-in fade-in duration-1000 overflow-hidden">
          <div className="relative mb-20">
            <div className={`w-32 h-32 bg-gradient-to-br from-[#c5a065] to-amber-100 shadow-[0_0_120px_rgba(197,160,101,0.3)] rounded-full animate-pulse flex items-center justify-center text-[5rem]`}>
              💎
            </div>
            <div className="absolute inset-0 border-4 border-white/5 rounded-full animate-ping opacity-10"></div>
          </div>
          <h2 className="heading-font text-6xl font-black mb-8 tracking-tighter uppercase leading-none text-white">Diamond Refinement</h2>
          <p className="text-[#c5a065] font-black uppercase tracking-[0.6em] text-[15px] mb-12 animate-pulse whitespace-pre-wrap max-w-xl leading-relaxed">{progressMsg}</p>
          <div className="w-[450px] h-[3px] bg-slate-800/40 rounded-full overflow-hidden shadow-2xl">
            <div className="h-full bg-gradient-to-r from-transparent via-[#c5a065] to-transparent animate-[shimmer_2.5s_infinite] w-full" style={{ backgroundSize: '200% 100%' }}></div>
          </div>
        </div>
      )}

      <SOPModal isOpen={isSopOpen} onClose={() => setIsSopOpen(false)} />
    </div>
  );
};

export default App;
