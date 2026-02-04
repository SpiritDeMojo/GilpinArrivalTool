import React from 'react';
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
}

const Navbar: React.FC<NavbarProps> = ({
  arrivalDateStr, isDark, toggleTheme, onFileUpload, onPrint, onExcel, onAddManual, onOpenSOP, isLiveActive, isMicEnabled, onToggleLive, hasGuests, onAIRefine
}) => {
  return (
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
        <button onClick={toggleTheme} className="px-6 py-2.5 rounded-full border-2 border-[#c5a065]/30 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-[#c5a065]/10">
          {isDark ? 'Obsidian' : 'Ivory'}
        </button>
        
        <div className="flex gap-2">
          {hasGuests && (
            <>
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

        <input id="file-upload-nav" type="file" className="hidden" accept=".pdf" onChange={onFileUpload} />
        <button onClick={onOpenSOP} className="w-10 h-10 rounded-full border-2 border-[#c5a065]/30 flex items-center justify-center font-bold transition-all hover:bg-[#c5a065]/10">?</button>
      </div>
    </nav>
  );
};

export default Navbar;