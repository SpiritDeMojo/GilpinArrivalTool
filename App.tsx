import React, { useState, useEffect, useCallback } from 'react';
import { Guest, FilterType, Flag, PrintMode, RefinementField } from './types';
import { PDFService } from './services/pdfService';
import { GeminiService } from './services/geminiService';
import { ExcelService } from './services/excelService';
import { DEFAULT_FLAGS } from './constants';
import Dashboard from './components/Dashboard';
import GuestRow from './components/GuestRow';

const App: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [arrivalDateStr, setArrivalDateStr] = useState<string>("Loading...");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState<PrintMode>('main');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  
  const [refinementFields, setRefinementFields] = useState<RefinementField[]>(['notes', 'facilities', 'inRoomItems', 'preferences', 'packages', 'history']);
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
    setProgressMsg("Scanning Intelligence coordinates...");
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
    if (guests.length === 0 || refinementFields.length === 0) return;

    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await handleUpdateApiKey();
      }
    }

    setIsProcessing(true);
    const validGuests = guests.filter(g => g.id && !g.id.startsWith('MAN-'));
    
    try {
      for (let i = 0; i < validGuests.length; i++) {
        const guest = validGuests[i];
        setProgressMsg(`Refining Data ${i + 1}/${validGuests.length}: ${guest.name}`);
        
        const refinement = await GeminiService.refineGuestData(guest, refinementFields);
        if (refinement) {
          setGuests(prev => prev.map(g => g.id === guest.id ? { 
            ...g, 
            ...refinement
          } : g));
        }

        if (i < validGuests.length - 1) {
          await new Promise(r => setTimeout(r, 1200));
        }
      }
    } catch (error: any) {
      console.error("Refinement error:", error);
      const errorStr = error?.message || JSON.stringify(error);
      if (errorStr.includes("Requested entity was not found")) {
        alert("API Key configuration error. Please select a valid API key from a paid GCP project.");
        await handleUpdateApiKey();
      } else {
        alert(`AI Extraction Error. Ensure the API_KEY is correctly configured.`);
      }
    } finally {
      setIsProcessing(false);
      setProgressMsg("");
      setShowRefineOptions(false);
    }
  };

  const toggleRefinementField = (field: RefinementField) => {
    setRefinementFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
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
    <div className="min-h-screen transition-all duration-300">
      <nav className="navbar no-print">
        <div className="nav-left flex items-center h-full">
          <div className="nav-logo-bubble" onClick={() => window.location.reload()} title="Reset System">
            <img src="Gilpin-logo.png" alt="Gilpin" className="nav-logo-img" />
          </div>
          <div className="nav-text-container ml-2">
            <div className="nav-title">Gilpin Hotel</div>
            <div className="nav-date">{arrivalDateStr}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="switch-wrapper mr-4">
            <span className="text-stone-800 dark:text-stone-200">☀️</span>
            <label className="switch">
              <input type="checkbox" checked={isDark} onChange={(e) => setIsDark(e.target.checked)} />
              <span className="slider"></span>
            </label>
            <span className="text-stone-800 dark:text-stone-200">🌙</span>
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="p-2 bg-white dark:bg-stone-800 rounded-full hover:shadow-md transition-all text-xl border border-slate-200 dark:border-slate-700 shadow-sm" 
            title="App Settings"
          >
            ⚙️
          </button>
          
          {guests.length > 0 && (
            <div className="flex gap-2 ml-4">
              <div className="relative">
                <button 
                  onClick={() => setShowRefineOptions(!showRefineOptions)}
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                >
                  ✨ AI Refine
                </button>
                {showRefineOptions && (
                  <div className="absolute top-full right-0 mt-4 w-56 bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-slate-200 dark:border-stone-800 p-4 z-[1100] animate-in fade-in zoom-in-95">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 px-1 border-b border-slate-100 dark:border-slate-800 pb-1">Extraction Scope</p>
                    <div className="space-y-1 mt-2">
                      {[
                        { id: 'notes', label: 'Briefing Notes' },
                        { id: 'facilities', label: 'Activities & Times' },
                        { id: 'inRoomItems', label: 'Packages & Items' },
                        { id: 'preferences', label: 'Guest Habits' },
                        { id: 'history', label: 'Stay History' }
                      ].map(field => (
                        <label key={field.id} className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={refinementFields.includes(field.id as RefinementField)}
                            onChange={() => toggleRefinementField(field.id as RefinementField)}
                            className="accent-indigo-600"
                          />
                          <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100">{field.label}</span>
                        </label>
                      ))}
                    </div>
                    <button onClick={handleAIRefine} className="w-full mt-4 bg-indigo-600 text-white text-[10px] font-black uppercase py-2.5 rounded-lg shadow-md transition-all hover:bg-indigo-700">Initialize Process</button>
                  </div>
                )}
              </div>
              <button onClick={() => triggerPrint('inroom')} className="bg-sky-500 text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">🎁 In Room</button>
              <button onClick={() => triggerPrint('greeter')} className="bg-amber-500 text-slate-900 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">👋 Greeter</button>
              <button onClick={() => triggerPrint('main')} className="bg-slate-900 dark:bg-stone-800 text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">🖨️ Arrivals</button>
              <button onClick={() => ExcelService.export(guests)} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md">⬇️ Excel</button>
              <button onClick={addManual} className="bg-slate-100 dark:bg-stone-700 text-slate-800 dark:text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ml-2">➕ Add</button>
            </div>
          )}
        </div>
      </nav>

      {guests.length > 0 && <Dashboard guests={guests} activeFilter={activeFilter} onFilterChange={setActiveFilter} />}

      <main className="max-w-[1920px] mx-auto p-6">
        {guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div id="drop-zone" onClick={() => (document.getElementById('file-upload') as HTMLInputElement).click()}>
              <h2 className="heading-font text-4xl font-black mb-4 text-slate-900 dark:text-white">Arrivals.pdf</h2>
              <p className="text-slate-500 font-medium">drop off file here or press here</p>
              <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden print:hidden mt-8 transition-colors duration-300">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-[1800px]">
                <thead>
                  <tr className="bg-slate-950 text-slate-300 uppercase text-[9px] font-black tracking-[0.2em] border-b border-slate-800">
                    <th className="w-[60px] p-4"></th>
                    <th className="w-[120px] p-4">Room</th>
                    <th className="w-[240px] p-4">Guest Name</th>
                    <th className="w-[80px] p-4 text-center">Stay</th>
                    <th className="w-[120px] p-4">Car Reg</th>
                    <th className="w-[80px] p-4 text-center">L&L</th>
                    <th className="w-[280px] p-4">Facilities</th>
                    <th className="w-[280px] p-4">Inferred Preferences</th>
                    <th className="w-[80px] p-4 text-center">ETA</th>
                    <th className="p-4">Notes & Strategy</th>
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

        {/* --- PRINT CONTENT --- */}
        <div className="hidden print:block w-full">
            <div className="print-header">
                <div className="print-logo-grp">
                    <img src="Gilpin-logo.png" className="print-logo" />
                    <div>
                        <h1 className="print-h1">{printMode === 'main' ? 'Arrivals List' : printMode === 'greeter' ? 'Guest Greeter' : 'Requirements'}</h1>
                        <div className="print-sub">{arrivalDateStr}</div>
                    </div>
                </div>
            </div>

            {printMode === 'main' && (
              <div className="print-highlights">
                  <div className="ph-item"><span className="ph-label">Total:</span><span className="ph-val">{guests.length}</span></div>
                  <div className="ph-item"><span className="ph-label">Main:</span><span className="ph-val">{guests.filter(g => { const r = parseInt(g.room); return (r > 0 && r <= 31) || isNaN(r); }).length}</span></div>
                  <div className="ph-item"><span className="ph-label">Lake House:</span><span className="ph-val">{guests.filter(g => { const r = parseInt(g.room); return r >= 51 && r <= 60; }).length}</span></div>
                  <div className="ph-item"><span className="ph-label">Returns:</span><span className="ph-val">{guests.filter(g => g.ll.toLowerCase().includes('yes')).length}</span></div>
                  <div className="ph-item"><span className="ph-label">VIPs:</span><span className="ph-val">{guests.filter(g => g.prefillNotes.includes('⭐')).length}</span></div>
              </div>
            )}
            
            <table className="w-full">
                <thead>
                  {printMode === 'main' && (
                    <tr>
                      <th style={{ width: '60px' }}>Room</th>
                      <th style={{ width: '150px' }}>Guest Name</th>
                      <th style={{ width: '40px' }}>Stay</th>
                      <th style={{ width: '80px' }}>Car Reg</th>
                      <th style={{ width: '50px' }}>L&L</th>
                      <th style={{ width: '220px' }}>Facilities</th>
                      <th style={{ width: '180px' }}>Preferences</th>
                      <th style={{ width: '55px' }}>ETA</th>
                      <th style={{ width: 'auto' }}>Notes</th>
                    </tr>
                  )}
                  {printMode === 'greeter' && (
                    <tr>
                      <th style={{ width: '10%' }}>Time</th>
                      <th style={{ width: '12%' }}>Room</th>
                      <th style={{ width: '30%' }}>Guest Name</th>
                      <th style={{ width: '15%' }}>Car Reg</th>
                      <th style={{ width: 'auto' }}>Notes / Occasion</th>
                    </tr>
                  )}
                  {printMode === 'inroom' && (
                    <tr>
                      <th style={{ width: '15%' }}>Room</th>
                      <th style={{ width: '35%' }}>Guest Name</th>
                      <th style={{ width: '50%' }}>In Room Requirements</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filteredGuests.map(g => (
                    <tr key={g.id}>
                      {printMode === 'main' && (
                        <>
                          <td className="font-bold">{g.room}</td>
                          <td className="font-bold">{g.name}</td>
                          <td className="text-center">{g.duration}</td>
                          <td className="font-mono">{g.car}</td>
                          <td className="text-center">{g.ll}</td>
                          <td className="text-[8pt]">{g.facilities.replace(/\n/g, ' • ')}</td>
                          <td className="text-[8pt] italic text-indigo-900">{g.preferences}</td>
                          <td className="text-center font-bold">{g.eta}</td>
                          <td className="italic text-[8pt]">{g.prefillNotes.replace(/\n/g, ' • ')}</td>
                        </>
                      )}
                      {printMode === 'greeter' && (
                        <>
                          <td className="font-bold text-[10pt]">{g.eta}</td>
                          <td className="font-bold text-[10pt]">{g.room}</td>
                          <td className="font-bold text-[10pt]">{g.name}</td>
                          <td className="font-mono">{g.car}</td>
                          <td className="italic text-[8pt]">{g.prefillNotes.replace(/\n/g, ' • ')}</td>
                        </>
                      )}
                      {printMode === 'inroom' && (
                        <>
                          <td className="font-bold text-xl">{g.room}</td>
                          <td className="font-bold text-xl">{g.name}</td>
                          <td className="text-[#c5a065] font-bold italic text-[12pt]">{g.prefillNotes.replace(/\n/g, ' • ')}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="print-footer">Gilpin Hotel & Lake House • Concierge Diamond Intel V3.00 Stable Core • {new Date().toLocaleString()}</div>
        </div>
      </main>

      {/* Unified Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-950/80 dark:bg-black/90 backdrop-blur-xl z-[4000] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-stone-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border-2 border-[#c5a065]/20 p-8 transform transition-all animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <span className="text-4xl">⚙️</span>
                <div>
                  <h2 className="heading-font text-2xl font-black text-slate-900 dark:text-white">App Settings</h2>
                  <p className="text-[10px] font-bold text-[#c5a065] uppercase tracking-[0.2em] mt-1">System Architecture</p>
                </div>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 w-10 h-10 rounded-full flex items-center justify-center font-bold text-2xl transition-all shadow-md hover:rotate-90">×</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <section>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#c5a065] mb-3">AI Connection</h3>
                  <div className="bg-slate-50 dark:bg-stone-800/60 p-6 rounded-[1.5rem] border border-slate-100 dark:border-stone-800 shadow-inner">
                    <button 
                      onClick={handleUpdateApiKey}
                      className="w-full bg-slate-950 dark:bg-stone-700 text-white text-[9px] font-black uppercase py-3 rounded-lg shadow-md hover:brightness-125 transition-all"
                    >
                      🔑 Link AI Studio Key
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 px-1">Ensure your key is from a project with billing enabled.</p>
                </section>

                <section>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#c5a065] mb-3">Environment</h3>
                  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-stone-800/60 rounded-[1.5rem] border border-slate-100 dark:border-stone-800 shadow-inner">
                    <div>
                      <p className="text-[13px] font-black text-slate-800 dark:text-slate-100">Midnight Mode</p>
                    </div>
                    <button 
                      onClick={() => setIsDark(!isDark)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDark ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-[#c5a065] mb-2">Detection Rules</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {flags.map(flag => (
                    <div key={flag.id} className="flex items-center justify-between p-3 bg-white dark:bg-stone-800/40 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all group">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{flag.emoji}</span>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white text-[12px]">{flag.name}</p>
                        </div>
                      </div>
                      <button onClick={() => removeFlag(flag.id)} className="text-rose-400 hover:text-rose-600 font-bold p-2 text-xl">×</button>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-100 dark:bg-stone-800/50 p-5 rounded-3xl border border-[#c5a065]/30">
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <input type="text" placeholder="✨" className="p-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-xl text-center text-slate-900 dark:text-white" value={newFlag.emoji} onChange={e => setNewFlag({...newFlag, emoji: e.target.value})} />
                    <input type="text" placeholder="Rule" className="col-span-3 p-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-xl text-[10px] font-black text-slate-900 dark:text-white" value={newFlag.name} onChange={e => setNewFlag({...newFlag, name: e.target.value})} />
                  </div>
                  <textarea placeholder="Keywords..." className="w-full p-3 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-xl mb-3 text-[10px] font-bold text-slate-900 dark:text-white" rows={2} value={newFlag.keys} onChange={e => setNewFlag({...newFlag, keys: e.target.value})} />
                  <button onClick={addFlag} className="w-full bg-[#c5a065] text-slate-950 font-black uppercase tracking-[0.2em] text-[9px] py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all">💾 Update Logic Cluster</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-stone-950/98 backdrop-blur-3xl z-[5000] flex flex-col items-center justify-center text-white text-center p-12 animate-in fade-in duration-500">
          <div className="relative mb-12">
            <div className="w-32 h-32 bg-gradient-to-br from-[#c5a065] to-yellow-100 rounded-full animate-pulse flex items-center justify-center text-[5.5rem] shadow-[0_0_100px_rgba(197,160,101,0.6)]">🤖</div>
            <div className="absolute inset-0 border-[6px] border-[#c5a065]/20 rounded-full animate-ping duration-[4s]"></div>
          </div>
          <h2 className="heading-font text-4xl font-black mb-4 tracking-tighter">Diamond Core 3.0</h2>
          <p className="text-[#c5a065] font-black uppercase tracking-[0.6em] text-sm mb-10 animate-pulse">{progressMsg}</p>
          <div className="w-[300px] h-1.5 bg-slate-900/50 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-gradient-to-r from-transparent via-[#c5a065] to-transparent animate-[shimmer_3s_infinite] w-full" style={{ backgroundSize: '200% 100%' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;