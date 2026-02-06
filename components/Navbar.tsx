import React, { useState } from 'react';
import { GILPIN_LOGO_URL } from '../constants';

interface NavbarProps {
  arrivalDateStr: string;
  isDark: boolean;
  toggleTheme: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrint: (mode: 'main' | 'greeter' | 'inroom') => void;
  onExcel: () => void;
  onAddManual: () => void;
  onOpenSOP: () => void;
  isLiveActive: boolean;
  isMicEnabled: boolean;
  onToggleLive: () => void;
  hasGuests: boolean;
  onAIRefine: () => void;
  onToggleAnalytics: () => void;
  showAnalytics: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  arrivalDateStr, isDark, toggleTheme, onFileUpload, onPrint, onExcel, onAddManual, onOpenSOP, isLiveActive, isMicEnabled, onToggleLive, hasGuests, onAIRefine, onToggleAnalytics, showAnalytics
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="navbar no-print h-[72px] md:h-[72px] px-4 md:px-12">
      <div className="flex items-center">
        <button className="nav-logo-bubble scale-75 md:scale-100" onClick={() => window.location.reload()}>
          <img src={GILPIN_LOGO_URL} alt="Gilpin" className="nav-logo-img" />
        </button>
        <div className="ml-4 md:ml-12">
          <h1 className="text-xl md:text-3xl font-black heading-font uppercase tracking-tighter leading-none mb-1">Gilpin Hotel</h1>
          <div className="font-black text-[#c5a065] text-[8px] md:text-[10px] tracking-[0.2em] md:tracking-[0.4em] uppercase truncate max-w-[120px] md:max-w-none">
            {arrivalDateStr}
          </div>
        </div>
      </div>

      {/* --- Desktop Actions --- */}
      <div className="hidden lg:flex items-center gap-4">
        <button onClick={toggleTheme} className="px-6 py-2.5 rounded-full border-2 border-[#c5a065]/30 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#c5a065]/10">
          {isDark ? 'Obsidian' : 'Ivory'}
        </button>
        
        <div className="flex gap-2">
          {hasGuests && (
            <>
              <button 
                onClick={onToggleAnalytics} 
                className={`${showAnalytics ? 'bg-[#c5a065] text-white' : 'bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-slate-300'} px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-105 active:scale-95 border border-[#c5a065]/20`}
              >
                📊 Intelligence
              </button>

              <button onClick={onAIRefine} className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-transform hover:scale-105 active:scale-95">
                ✨ AI Audit
              </button>
              
              <div className="relative group">
                <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                  🖨️ Print
                </button>
                <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-[2000]">
                  <div className="bg-white dark:bg-stone-900 border border-[#c5a065]/20 shadow-2xl rounded-xl p-2 w-44">
                    <button onClick={() => onPrint('main')} className="w-full text-left p-3 text-[10px] font-black uppercase hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg">Master List</button>
                    <button onClick={() => onPrint('greeter')} className="w-full text-left p-3 text-[10px] font-black uppercase hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg">Greeter View</button>
                    <button onClick={() => onPrint('inroom')} className="w-full text-left p-3 text-[10px] font-black uppercase hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg">In-Room Assets</button>
                  </div>
                </div>
              </div>

              <button onClick={onExcel} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all">⬇️ Excel</button>
              <button onClick={onAddManual} className="bg-[#c5a065] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#b08d54] transition-all">➕ Add</button>
              
              <button 
                onClick={onToggleLive} 
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isLiveActive ? 'bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-110' : 'bg-slate-900 hover:bg-black'} shadow-lg active:scale-90`}
              >
                <span className="text-xl leading-none">{isLiveActive ? (isMicEnabled ? '🎙️' : '🤖') : '🤖'}</span>
                {isMicEnabled && <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping"></div>}
              </button>
            </>
          )}
          
          <button 
            onClick={() => document.getElementById('file-upload-nav')?.click()} 
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-stone-800 flex items-center justify-center transition-all hover:bg-slate-200 dark:hover:bg-stone-700 border border-[#c5a065]/20"
          >
            <span className="text-xl">📁</span>
          </button>
        </div>

        <button onClick={onOpenSOP} className="w-10 h-10 rounded-full border-2 border-[#c5a065]/30 flex items-center justify-center font-bold transition-all hover:bg-[#c5a065]/10">?</button>
      </div>

      {/* --- Mobile Actions --- */}
      <div className="flex lg:hidden items-center gap-2">
        {hasGuests && (
          <button 
            onClick={onToggleLive} 
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isLiveActive ? 'bg-indigo-600 shadow-lg scale-105' : 'bg-slate-900'} active:scale-95`}
          >
            <span className="text-xl leading-none">{isLiveActive ? (isMicEnabled ? '🎙️' : '🤖') : '🤖'}</span>
          </button>
        )}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-10 h-10 rounded-xl bg-[#c5a065] text-white flex items-center justify-center shadow-lg active:scale-90"
        >
          <span className="text-xl">{isMenuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* --- Mobile Slide-out Menu --- */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[72px] bg-slate-950/90 backdrop-blur-xl z-[3000] p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => { onAddManual(); setIsMenuOpen(false); }} className="bg-[#c5a065] text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">➕ Add Manual</button>
             <button onClick={() => { toggleTheme(); setIsMenuOpen(false); }} className="bg-slate-800 text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-slate-700">{isDark ? '☀️ Ivory' : '🌙 Obsidian'}</button>
          </div>

          {hasGuests && (
            <>
              <button onClick={() => { onAIRefine(); setIsMenuOpen(false); }} className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">✨ AI Audit Refine</button>
              <button onClick={() => { onToggleAnalytics(); setIsMenuOpen(false); }} className={`${showAnalytics ? 'bg-[#c5a065]' : 'bg-slate-800'} text-white p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest border border-slate-700`}>📊 Strategic Analytics</button>
              
              <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-2">Print Hub</p>
                <div className="flex flex-col gap-2">
                   <button onClick={() => { onPrint('main'); setIsMenuOpen(false); }} className="text-left py-2 text-sm text-white font-bold flex items-center gap-3">🖨️ Master List</button>
                   <button onClick={() => { onPrint('greeter'); setIsMenuOpen(false); }} className="text-left py-2 text-sm text-white font-bold flex items-center gap-3">🖨️ Greeter List</button>
                   <button onClick={() => { onPrint('inroom'); setIsMenuOpen(false); }} className="text-left py-2 text-sm text-white font-bold flex items-center gap-3">🖨️ Delivery Manifest</button>
                </div>
              </div>

              <button onClick={() => { onExcel(); setIsMenuOpen(false); }} className="bg-emerald-600 text-white p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl">⬇️ Export Excel</button>
            </>
          )}

          <button onClick={() => { document.getElementById('file-upload-nav')?.click(); setIsMenuOpen(false); }} className="bg-slate-100 dark:bg-stone-800 text-slate-900 dark:text-white p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">📁 Upload PDF</button>
          <button onClick={() => { onOpenSOP(); setIsMenuOpen(false); }} className="mt-auto border-2 border-[#c5a065]/30 text-[#c5a065] p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest">? Titanium Manual</button>
        </div>
      )}

      <input id="file-upload-nav" type="file" className="hidden" accept=".pdf" onChange={onFileUpload} />
    </nav>
  );
};

export default Navbar;