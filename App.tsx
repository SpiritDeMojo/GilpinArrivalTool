import React, { useState, useEffect, useCallback } from 'react';
import { Guest, FilterType, Flag, PrintMode, RefinementField } from './types';
import { PDFService } from './services/pdfService';
import { GeminiService } from './services/geminiService';
import { ExcelService } from './services/excelService';
import { DEFAULT_FLAGS } from './constants';
import Dashboard from './components/Dashboard';
import GuestRow from './components/GuestRow';
import SOPModal from './components/SOPModal';

const BATCH_SIZE = 6;
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
  const [printTime, setPrintTime] = useState("");
  
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  
  const [isSticky, setIsSticky] = useState(false);
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

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
    setPrintTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setPrintMode(mode);
    setTimeout(() => window.print(), 200);
  };

  const NAV_HEIGHT = 64;
  const ALERT_HEIGHT = 32;
  const dashboardTop = isOldFile ? NAV_HEIGHT + ALERT_HEIGHT : NAV_HEIGHT;

  // Render the Universal Header for Print
  const renderPrintHeader = () => (
    <div className="print-header-grid">
      <div className="flex items-center gap-3">
        <img src={GILPIN_LOGO_URL} alt="Logo" className="h-10" />
        <div className="flex flex-col">
          <span className="font-black heading-font text-lg leading-none uppercase">Gilpin Hotel</span>
          <span className="text-[7pt] font-black tracking-widest text-[#c5a065]">ARRIVALS: {arrivalDateStr.toUpperCase()}</span>
        </div>
      </div>
      
      <div className="print-stat-pills">
        <div className="print-stat-pill"><span>ROOMS:</span><span>{stats.total}</span></div>
        <div className="print-stat-pill"><span>MAIN:</span><span>{stats.mainHotel}</span></div>
        <div className="print-stat-pill"><span>LAKE:</span><span>{stats.lakeHouse}</span></div>
        <div className="print-stat-pill"><span>RETURNS:</span><span>{stats.returns}</span></div>
        <div className="print-stat-pill"><span>VIPS:</span><span>{stats.vips}</span></div>
        <div className="print-stat-pill"><span>ALERTS:</span><span>{stats.allergies}</span></div>
      </div>

      <div className="text-right">
        <div className="text-[6pt] font-black uppercase text-slate-400">Printed At</div>
        <div className="text-[10pt] font-black">{printTime}</div>
      </div>
    </div>
  );

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
          {guests.length > 0 && (
            <div className="flex gap-2 ml-4">
              <button onClick={handleAIRefine} className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:scale-105 active:scale-95">✨ AI REFINE</button>
              <button onClick={() => triggerPrint('inroom')} className="bg-sky-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-sky-500 transition-all">🎁 Delivery</button>
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
        <div className="dashboard-outer-wrapper no-print relative transition-all duration-500" style={{ height: '72px', marginTop: isOldFile ? ALERT_HEIGHT + 'px' : '0' }}>
          <div className={`dashboard-container no-print ${isSticky ? 'sticky' : ''}`} style={isSticky ? { top: dashboardTop + 'px' } : {}}>
            <Dashboard guests={guests} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          </div>
        </div>
      )}

      <main className="max-w-[1920px] mx-auto p-4">
        {guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 text-center">
            <div id="drop-zone" className="group relative p-32 border-2 border-dashed border-slate-200 dark:border-stone-800 rounded-[4rem] bg-white/20 dark:bg-stone-900/20 backdrop-blur-3xl flex flex-col items-center gap-12 cursor-pointer hover:border-[#c5a065] transition-all duration-700 shadow-2xl w-full max-w-4xl overflow-hidden" onClick={() => (document.getElementById('file-upload') as HTMLInputElement).click()}>
              <div className="w-24 h-24 rounded-full bg-white dark:bg-stone-800 flex items-center justify-center shadow-2xl mb-2 transition-all duration-500 group-hover:scale-110">
                <span className="text-6xl drop-shadow-sm">📄</span>
              </div>
              <div className="space-y-4">
                <h2 className="heading-font text-5xl font-black text-slate-950 dark:text-white uppercase tracking-tighter leading-none">Gilpin Arrivals Tool</h2>
                <p className="text-slate-500 dark:text-slate-400 text-[12px] font-black uppercase tracking-[0.6em]">Add arrivals pdf file</p>
              </div>
              <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </div>
            <button onClick={() => setIsSopOpen(true)} className="mt-12 text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 hover:text-[#c5a065] transition-colors">View System SOP / Guidelines</button>
          </div>
        ) : (
          <div className="bg-white/30 dark:bg-stone-900/30 backdrop-blur-3xl rounded-[2rem] shadow-2xl border border-white/50 dark:border-stone-800/50 overflow-hidden print:hidden mt-4">
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
                    <GuestRow key={guest.id} guest={guest} isEditMode={true} onUpdate={(updates) => updateGuest(guest.id, updates)} onDelete={() => deleteGuest(guest.id)} isExpanded={expandedRows.has(guest.id)} onToggleExpand={() => toggleExpand(guest.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- RESTRUCTURED PRINT ENGINE --- */}
        <div className="hidden print:block w-full font-sans text-slate-900 leading-tight">
            {renderPrintHeader()}

            {printMode === 'main' && (
              <table className="w-full border-collapse text-[8.5pt]">
                  <thead>
                    <tr className="bg-slate-50 uppercase font-black tracking-wider text-left border-b-2 border-slate-900">
                        <th className="p-1.5 w-[40pt]">Room</th>
                        <th className="p-1.5 w-[140pt]">Guest Name</th>
                        <th className="p-1.5 w-[25pt] text-center">Stay</th>
                        <th className="p-1.5 w-[75pt]">Car Reg</th>
                        <th className="p-1.5 w-[30pt] text-center">L&L</th>
                        <th className="p-1.5 w-[160pt]">Facilities</th>
                        <th className="p-1.5 w-[40pt] text-center">ETA</th>
                        <th className="p-1.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGuests.map(g => (
                      <tr key={g.id} className="border-b border-slate-200 break-inside-avoid">
                          <td className="p-1.5 font-black text-[#c5a065] uppercase">{g.room}</td>
                          <td className="p-1.5 font-black uppercase">{g.name}</td>
                          <td className="p-1.5 text-center font-bold">{g.duration}</td>
                          <td className="p-1.5 font-mono font-black text-indigo-700 uppercase">{g.car}</td>
                          <td className="p-1.5 text-center font-black">{g.ll}</td>
                          <td className="p-1.5 text-[7.5pt] leading-tight font-medium whitespace-pre-line">{g.facilities}</td>
                          <td className="p-1.5 text-center font-black">{g.eta}</td>
                          <td className="p-1.5 text-[7.5pt] italic text-slate-700 leading-snug whitespace-pre-line">{g.prefillNotes}</td>
                      </tr>
                    ))}
                  </tbody>
              </table>
            )}

            {printMode === 'greeter' && (
              <div className="w-full">
                <div className="greeter-table-header">
                  <div>Room</div>
                  <div>Guest Identity</div>
                  <div>Stay</div>
                  <div>Car Registration</div>
                  <div>L&L</div>
                  <div>ETA</div>
                  <div>Gemini Strategy</div>
                </div>
                {filteredGuests.map(g => {
                  const roomParts = g.room.split(' ');
                  return (
                    <div key={g.id} className="greeter-table-row">
                      <div className="flex flex-col">
                        <span className="greeter-room">{roomParts[0]}</span>
                        <span className="greeter-room-name">{roomParts.slice(1).join(' ')}</span>
                      </div>
                      <div className="font-black text-[10pt] uppercase tracking-tight">{g.name}</div>
                      <div className="font-bold">{g.duration} Nts</div>
                      <div className="greeter-car uppercase">{g.car}</div>
                      <div className="font-black text-center">{g.ll}</div>
                      <div className="font-black text-[11pt]">{g.eta === 'N/A' ? '' : g.eta}</div>
                      <div className="greeter-strategy whitespace-pre-line leading-tight">
                        {g.preferences || g.prefillNotes.split('•')[0] || "No specific strategy."}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {printMode === 'inroom' && (
              <div className="w-full">
                <div className="grid grid-cols-[80pt_180pt_1fr] bg-slate-50 font-black uppercase text-[9pt] tracking-widest p-3 border-b-2 border-slate-900 mb-2">
                    <div className="text-center">Room</div>
                    <div>Guest</div>
                    <div>Housekeeping / Bar Setup List</div>
                </div>
                {filteredGuests.filter(g => g.inRoomItems && g.inRoomItems.trim().length > 1).map(g => (
                  <div key={g.id} className="grid grid-cols-[80pt_180pt_1fr] p-6 border-b border-slate-200 break-inside-avoid items-center min-h-[100pt]">
                      <div className="font-black text-6xl text-center text-[#c5a065] border-r-4 border-slate-100">{g.room.split(' ')[0]}</div>
                      <div className="px-6">
                        <div className="font-black text-xl uppercase leading-tight">{g.name}</div>
                        <div className="text-[8pt] text-slate-400 uppercase font-black mt-1">{g.room}</div>
                      </div>
                      <div className="px-6 text-2xl font-black italic leading-snug text-slate-800 whitespace-pre-line border-l-4 border-[#c5a065]">
                        {g.inRoomItems.split('•').map(item => `• ${item.trim()}`).join('\n')}
                      </div>
                  </div>
                ))}
              </div>
            )}

            <div className="fixed bottom-0 left-0 w-full text-center text-[5pt] font-black uppercase text-slate-300 py-2 tracking-[0.5em]">
                GILPIN HOTEL • INTELLIGENCE HUB • REPRODUCTION STRICTLY FOR HOTEL USE
            </div>
        </div>
      </main>

      {/* REFINED PROCESSING OVERLAY (LOGO PULSE) */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[5000] flex flex-col items-center justify-center text-white text-center p-16 animate-in fade-in duration-1000 overflow-hidden">
          <div className="loading-container mb-24">
            <div className="loading-g-circle">
                <img src={GILPIN_LOGO_URL} alt="Gilpin" className="loading-logo" />
            </div>
          </div>
          <div className="space-y-4 max-w-2xl relative z-10">
            <h2 className="heading-font text-3xl font-black tracking-tighter uppercase leading-none text-transparent bg-clip-text bg-gradient-to-r from-[#c5a065] via-white to-[#c5a065] drop-shadow-xl">Reasoning</h2>
            <p className="text-[#c5a065] font-black uppercase tracking-[0.5em] text-[10px] animate-pulse h-10 flex items-center justify-center">{progressMsg}</p>
          </div>
        </div>
      )}

      <SOPModal isOpen={isSopOpen} onClose={() => setIsSopOpen(false)} />
    </div>
  );
};

export default App;