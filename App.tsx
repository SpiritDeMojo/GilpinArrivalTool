
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
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
const ALERT_HEIGHT = 26;
const NAV_HEIGHT = 72;

// --- v3.72+ PROTOCOLS ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface Transcription {
  text: string;
  role: 'user' | 'model';
}

const App: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [arrivalDateStr, setArrivalDateStr] = useState<string>("Loading...");
  const [isOldFile, setIsOldFile] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [printMode, setPrintMode] = useState<PrintMode>('main');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isSticky, setIsSticky] = useState(false);
  const [isSopOpen, setIsSopOpen] = useState(false);

  // Live Assistant States
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const stickyTopOffset = isOldFile ? NAV_HEIGHT + ALERT_HEIGHT : NAV_HEIGHT;
  const mainPaddingTop = isOldFile ? NAV_HEIGHT + ALERT_HEIGHT : NAV_HEIGHT;
  const refinementFields: RefinementField[] = ['notes', 'facilities', 'inRoomItems', 'preferences', 'packages', 'history'];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [transcriptions]);

  const [flags] = useState<Flag[]>(() => {
    const saved = localStorage.getItem('custom_flags');
    return saved ? JSON.parse(saved) : DEFAULT_FLAGS;
  });

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    setArrivalDateStr(todayStr);
  }, []);

  useEffect(() => {
    const handleScroll = () => { if (guests.length > 0) setIsSticky(window.scrollY > 40); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [guests.length]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setProgressMsg("DECRYPTING ARRIVALS STREAM...");
    try {
      await new Promise(r => setTimeout(r, 1200)); 
      const result = await PDFService.parse(file, flags);
      setGuests(result.guests);
      setArrivalDateStr(result.arrivalDateStr);
      const today = new Date(); today.setHours(0,0,0,0);
      if (result.arrivalDateObj) {
        const fileDate = new Date(result.arrivalDateObj); fileDate.setHours(0,0,0,0);
        setIsOldFile(fileDate < today);
      }
    } catch (err) {
      console.error(err);
      alert("Extraction Error: Invalid Gilpin PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIRefine = async () => {
    if (guests.length === 0) return;
    setIsProcessing(true);
    setProgressMsg("REFINING STRATEGIC INTELLIGENCE...");
    const validGuests = guests.filter(g => g.id && !g.id.toString().startsWith('MAN-'));
    const chunks: Guest[][] = [];
    for (let i = 0; i < validGuests.length; i += BATCH_SIZE) chunks.push(validGuests.slice(i, i + BATCH_SIZE));
    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentBatch = chunks[i];
        setProgressMsg(`AUDITING INTEL: ${i + 1}/${chunks.length}...`);
        const refinements = await GeminiService.refineGuestBatch(currentBatch, refinementFields);
        if (refinements) {
          setGuests(prev => {
            const next = [...prev];
            currentBatch.forEach((guest, index) => {
              const ref = refinements[index];
              if (ref) {
                const idx = next.findIndex(g => g.id === guest.id);
                if (idx !== -1) next[idx] = { ...next[idx], prefillNotes: ref.notes, facilities: ref.facilities, inRoomItems: ref.inRoomItems, preferences: ref.preferences, packageName: ref.packages, ll: ref.history };
              }
            });
            return next;
          });
        }
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 1000));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startLiveAssistant = async () => {
    if (isLiveActive) {
      if (sessionRef.current) sessionRef.current.close();
      setIsLiveActive(false);
      return;
    }
    setIsProcessing(true);
    setProgressMsg("INITIALIZING AI ASSISTANT...");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const guestsBrief = guests.map(g => `${g.room}: ${g.name} (${g.packageName}) - ${g.prefillNotes}`).join('\n');
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let currentInput = "";
      let currentOutput = "";

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
            setIsLiveActive(true);
            setIsProcessing(false);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }
            // Corrected property names for transcription based on @google/genai guidelines
            if (msg.serverContent?.inputTranscription) currentInput += msg.serverContent.inputTranscription.text;
            if (msg.serverContent?.outputTranscription) currentOutput += msg.serverContent.outputTranscription.text;
            if (msg.serverContent?.turnComplete) {
              if (currentInput) setTranscriptions(p => [...p, { text: currentInput, role: 'user' }]);
              if (currentOutput) setTranscriptions(p => [...p, { text: currentOutput, role: 'model' }]);
              currentInput = ""; currentOutput = "";
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop()); sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: () => setIsLiveActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are the Gilpin Hotel GIU. MISSION: Tactical help with arrivals list. Data:\n${guestsBrief}\nMaintain luxury Gilpin DNA.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
      setIsProcessing(false); setIsLiveActive(false);
    }
  };

  const updateGuest = useCallback((id: string, updates: Partial<Guest>) => setGuests(p => p.map(g => g.id === id ? { ...g, ...updates } : g)), []);
  const deleteGuest = useCallback((id: string) => setGuests(p => p.filter(g => g.id !== id)), []);
  const addManual = () => {
    const g: Guest = { id: "MAN-" + Date.now(), room: "TBD", name: "New Guest", car: "", ll: "No", eta: "14:00", duration: "1", facilities: "", prefillNotes: "", inRoomItems: "", preferences: "", rawHtml: "Manual", isManual: true };
    setGuests(p => [g, ...p]);
  };

  const triggerPrint = (mode: PrintMode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const filteredGuests = useMemo(() => guests.filter(g => {
    if (activeFilter === 'all') return true;
    const rNum = parseInt(g.room.split(' ')[0]);
    if (activeFilter === 'main') return rNum > 0 && rNum <= 31;
    if (activeFilter === 'lake') return rNum >= 51 && rNum <= 60;
    if (activeFilter === 'vip') return g.prefillNotes.includes('⭐') || g.prefillNotes.includes('VIP') || g.packageName === 'POB_STAFF';
    if (activeFilter === 'allergy') return ['⚠️', '🥛', '🥜', '🍞', '🧀'].some(e => g.prefillNotes.includes(e));
    if (activeFilter === 'return') return g.ll.toLowerCase().includes('yes');
    return true;
  }), [guests, activeFilter]);

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ paddingTop: mainPaddingTop + 'px' }}>
      <nav className="navbar no-print">
        <div className="flex items-center">
          <button className="nav-logo-bubble" onClick={() => window.location.reload()}>
            <img src={GILPIN_LOGO_URL} alt="Gilpin" className="nav-logo-img" />
          </button>
          <div className="ml-12">
            <h1 className="text-3xl font-black heading-font uppercase tracking-tighter leading-none mb-1">Gilpin Hotel</h1>
            <div className="font-black text-[#c5a065] text-[10px] tracking-[0.4em] uppercase">{arrivalDateStr}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDark(!isDark)} className="px-6 py-2.5 rounded-full border-2 border-[#c5a065]/30 text-[10px] font-black uppercase tracking-widest">{isDark ? 'Obsidian' : 'Ivory'}</button>
          {guests.length > 0 && (
            <div className="flex gap-2">
              <button onClick={handleAIRefine} className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-105 active:scale-95">✨ AI Audit</button>
              
             <div className="relative group">
  <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black">
    🖨️ Print
  </button>
  
  {/* Added pt-2 here and removed mt-2 */}
  <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-[2000]">
    {/* This inner div holds your actual styling */}
    <div className="bg-white dark:bg-stone-900 border border-[#c5a065]/20 shadow-2xl rounded-xl p-2 w-44">
      <button onClick={() => triggerPrint('main')} className="w-full text-left p-3 text-[10px] font-black uppercase hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg">Master List</button>
      <button onClick={() => triggerPrint('greeter')} className="w-full text-left p-3 text-[10px] font-black uppercase hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg">Greeter View</button>
      <button onClick={() => triggerPrint('inroom')} className="w-full text-left p-3 text-[10px] font-black uppercase hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg">In-Room Assets</button>
    </div>
    </div>
  </div>

              <button onClick={() => ExcelService.export(guests)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">⬇️ Excel</button>
              <button onClick={addManual} className="bg-[#c5a065] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">➕ Add</button>
            </div>
          )}
          <button onClick={() => setIsSopOpen(true)} className="w-10 h-10 rounded-full border-2 border-[#c5a065]/30 flex items-center justify-center font-bold">?</button>
        </div>
      </nav>

      {isOldFile && guests.length > 0 && (
        <div className="no-print pulsate-alert text-white text-center font-black py-1 tracking-widest text-[10px] flex items-center justify-center gap-2" style={{ top: NAV_HEIGHT + 'px', position: 'fixed', width: '100%', zIndex: 1009 }}>
          <span>⚠️ HISTORICAL FILE DETECTED</span>
          <span className="opacity-60">[DATE: {arrivalDateStr}]</span>
        </div>
      )}

      {guests.length > 0 && (
        <div className="no-print relative my-10 h-[64px]">
          <div className={`dashboard-container no-print py-4 transition-all ${isSticky ? 'sticky top-[72px]' : ''}`}>
            <Dashboard guests={guests} activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          </div>
        </div>
      )}

      <main className="max-w-[1800px] mx-auto px-10 pb-32 no-print">
        {guests.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="p-24 border-2 border-dashed border-[#c5a065]/40 rounded-[3rem] bg-white/50 dark:bg-white/5 backdrop-blur flex flex-col items-center gap-8 cursor-pointer hover:border-[#c5a065] transition-all" onClick={() => document.getElementById('file-upload')?.click()}>
              <span className="text-6xl animate-bounce">📁</span>
              <div className="text-center">
                <h2 className="heading-font text-5xl font-black uppercase tracking-tighter mb-2">Arrivals Hub</h2>
                <p className="text-[#c5a065] font-black uppercase tracking-[0.4em] text-sm">Deploy Arrivals Stream</p>
              </div>
              <input id="file-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
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
                  {filteredGuests.map(g => (
                    <GuestRow key={g.id} guest={g} isEditMode={true} onUpdate={(u) => updateGuest(g.id, u)} onDelete={() => deleteGuest(g.id)} isExpanded={expandedRows.has(g.id)} onToggleExpand={() => { setExpandedRows(prev => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; }); }} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* TRIPLE PRINT ARCHITECTURE */}
      <div className="print-only">
        {printMode === 'main' && (
          <div className="p-10">
            <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-6">
              <h1 className="heading-font text-4xl font-black uppercase">Master Arrival List</h1>
              <span className="text-xl font-bold uppercase">{arrivalDateStr}</span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black text-white text-[10pt] uppercase font-bold text-left">
                  <th className="p-2">Room</th>
                  <th className="p-2">Identity</th>
                  <th className="p-2 text-center">Nts</th>
                  <th className="p-2">Vehicle</th>
                  <th className="p-2 text-center">L&L</th>
                  <th className="p-2 text-center">ETA</th>
                  <th className="p-2">Strategic Intelligence</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map(g => (
                  <tr key={g.id} className="border-b border-gray-300">
                    <td className="p-2 font-black text-lg">{g.room}</td>
                    <td className="p-2"><span className="font-bold text-lg">{g.name}</span> <br/><span className="text-[8pt] text-gray-600 font-bold uppercase">{g.packageName}</span></td>
                    <td className="p-2 text-center font-bold">{g.duration}</td>
                    <td className="p-2 font-mono font-bold">{g.car}</td>
                    <td className="p-2 text-center font-bold">{g.ll}</td>
                    <td className="p-2 text-center font-black text-lg">{g.eta}</td>
                    <td className="p-2 text-[9pt] italic leading-tight">{g.prefillNotes} <br/> <span className="font-bold text-indigo-800">{g.preferences}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {printMode === 'greeter' && (
          <div className="p-10 greeter-view">
            <h1 className="heading-font text-4xl font-black uppercase mb-12 text-center border-b-8 border-black pb-6">Daily Arrivals Greeter Sheet - {arrivalDateStr}</h1>
            <div className="grid grid-cols-1 gap-12">
              {filteredGuests.map(g => (
                <div key={g.id} className="flex items-center gap-16 border-b-4 border-black pb-8 page-break-inside-avoid">
                  <div className="g-r-num text-center min-w-[200pt]">{g.room.split(' ')[0]}</div>
                  <div className="flex-1">
                    <div className="g-name">{g.name}</div>
                    <div className="g-meta mt-4 flex gap-12">
                      <span className="font-black">ETA: {g.eta}</span>
                      <span className="font-mono bg-black text-red px-4 py-1">REG: {g.car || 'NONE'}</span>
                      <span className="font-bold text-gray-500 uppercase">{g.ll === 'Yes' ? 'RETURN GUEST' : 'FIRST TIME'}</span>
                    </div>
                    <div className="text-2xl italic mt-4 text-gray-700 font-medium">{g.prefillNotes}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {printMode === 'inroom' && (
          <div className="p-10">
            <h1 className="heading-font text-5xl font-black uppercase mb-10 border-b-8 border-black pb-4">In-Room Assets & Dietary Audit</h1>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black text-white text-[14pt] uppercase text-left">
                  <th className="p-4">Room</th>
                  <th className="p-4">Guest Identity</th>
                  <th className="p-4">Assets Required</th>
                  <th className="p-4">Dietary</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.filter(g => g.inRoomItems || g.prefillNotes.match(/Oat|Soya|Nut|Gluten|Dairy/i)).map(g => (
                  <tr key={g.id} className="border-b-4 border-black">
                    <td className="p-6 font-black text-6xl text-center">{g.room.split(' ')[0]}</td>
                    <td className="p-6"><span className="font-black text-2xl uppercase">{g.name}</span><br/><span className="text-xl text-gray-500 font-bold">{g.packageName}</span></td>
                    <td className="p-6 font-black text-2xl text-indigo-700">{g.inRoomItems || "NO SPECIFIC ASSETS"}</td>
                    <td className="p-6 text-xl italic font-bold text-rose-800">{g.prefillNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI ASSISTANT ORB */}
      {guests.length > 0 && (
        <div className="live-orb-container no-print flex flex-col items-end gap-4 pointer-events-none">
          {isLiveActive && (
             <div className="bg-white dark:bg-stone-900 shadow-2xl border border-[#c5a065] p-5 rounded-[2rem] w-80 max-h-[400px] flex flex-col animate-in slide-in-from-bottom-4 pointer-events-auto">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-black uppercase text-[#c5a065] tracking-widest">Tactical Feed</p>
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                </div>
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 py-1">
                  {transcriptions.map((t, i) => (
                    <div key={i} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 text-[11px] leading-snug font-medium shadow-sm rounded-2xl ${t.role === 'user' ? 'bg-[#c5a065] text-white rounded-br-none' : 'bg-slate-100 dark:bg-stone-800 text-slate-800 dark:text-white rounded-bl-none border border-slate-200 dark:border-stone-700'}`}>{t.text}</div>
                    </div>
                  ))}
                </div>
             </div>
          )}
          <div className={`live-orb ${isLiveActive ? 'active' : ''} pointer-events-auto`} onClick={startLiveAssistant}>
            {isLiveActive ? <span className="text-white text-3xl">🎙️</span> : <span className="text-white text-3xl">🤖</span>}
          </div>
        </div>
      )}

      {/* LOADING HUB */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[5000] flex flex-col items-center justify-center text-white text-center p-12 animate-in fade-in duration-500">
          <div className="loading-hub mb-12">
            <div className="loading-ring loading-ring-1"></div>
            <div className="loading-ring loading-ring-2"></div>
            <img src={GILPIN_LOGO_URL} alt="Gilpin" className="w-[80px] z-10 animate-pulse" />
          </div>
          <h2 className="heading-font text-4xl font-black tracking-tighter uppercase leading-none mb-3">Loading</h2>
          <p className="text-[#c5a065] font-black uppercase tracking-[0.6em] text-[10px] animate-pulse">{progressMsg}</p>
        </div>
      )}

      <SOPModal isOpen={isSopOpen} onClose={() => setIsSopOpen(false)} />
    </div>
  );
};

export default App;
