import React, { useState } from 'react';
import { GILPIN_LOGO_URL } from '../constants';
import { useUser } from '../contexts/UserProvider';

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
  isMuted: boolean;
  onToggleMute: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  arrivalDateStr, isDark, toggleTheme, onFileUpload, onPrint, onExcel, onAddManual, onOpenSOP, isLiveActive, isMicEnabled, onToggleLive, hasGuests, onAIRefine, onToggleAnalytics, showAnalytics, isMuted, onToggleMute
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const { userName, logout } = useUser();

  return (
    <nav className="navbar no-print flex justify-between items-center">
      <div className="flex items-center min-w-0">
        <div role="button" className="nav-logo-bubble scale-75 md:scale-100 flex-shrink-0" style={{ cursor: 'pointer' }} onClick={() => window.location.reload()}>
          <img src={GILPIN_LOGO_URL} alt="Gilpin" className="nav-logo-img" />
        </div>
        <div className="ml-3 md:ml-12 min-w-0">
          <h1 className="text-lg md:text-3xl font-black heading-font uppercase tracking-tighter leading-none mb-0.5 truncate">Gilpin Hotel</h1>
          <div className="font-black text-[#c5a065] text-[8px] md:text-[10px] tracking-[0.15em] md:tracking-[0.4em] uppercase truncate max-w-[110px] md:max-w-none">
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

              <div className="relative">
                <button onClick={() => setIsPrintOpen(!isPrintOpen)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
                  🖨️ Print
                </button>
                {isPrintOpen && (
                  <div className="absolute right-0 top-full pt-2 z-[2000]">
                    <div className="bg-white dark:bg-stone-900 border border-[#c5a065]/20 shadow-2xl rounded-xl p-2 w-44">
                      <button onClick={() => { onPrint('main'); setIsPrintOpen(false); }} className="w-full text-left p-3 text-[10px] font-black uppercase hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg">Master List</button>
                      <button onClick={() => { onPrint('greeter'); setIsPrintOpen(false); }} className="w-full text-left p-3 text-[10px] font-black uppercase hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg">Greeter View</button>
                      <button onClick={() => { onPrint('inroom'); setIsPrintOpen(false); }} className="w-full text-left p-3 text-[10px] font-black uppercase hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg">In-Room Assets</button>
                    </div>
                  </div>
                )}
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

              <button
                onClick={onToggleMute}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isMuted ? 'bg-slate-600' : 'bg-slate-900 hover:bg-black'} shadow-lg active:scale-90`}
                title={isMuted ? 'Notifications muted' : 'Notifications on'}
              >
                <span className="text-xl leading-none">{isMuted ? '🔕' : '🔔'}</span>
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

        {/* User Badge */}
        {userName && (
          <div className="flex items-center gap-2 ml-1">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#c5a065]/10 border border-[#c5a065]/30">
              <div className="w-6 h-6 rounded-full bg-[#c5a065] flex items-center justify-center text-white text-[10px] font-black">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{userName}</span>
            </div>
            <button
              onClick={logout}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-stone-800 flex items-center justify-center text-xs transition-all hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 border border-transparent hover:border-red-300 dark:hover:border-red-800"
              title="Sign out"
            >
              ↪
            </button>
          </div>
        )}
      </div>

      {/* --- Mobile Actions: div-based to bypass global button CSS --- */}
      <div className="flex lg:hidden items-center gap-2 flex-shrink-0 relative z-[1015]">
        {hasGuests && (
          <>
            <div
              role="button"
              onClick={onToggleLive}
              style={{ width: 40, height: 40, minHeight: 'auto', padding: 0, cursor: 'pointer' }}
              className={`rounded-xl flex items-center justify-center transition-all ${isLiveActive ? 'bg-indigo-600 shadow-lg scale-105' : 'bg-slate-800'} active:scale-95`}
            >
              <span className="text-base leading-none">{isLiveActive ? (isMicEnabled ? '🎙️' : '🤖') : '🤖'}</span>
            </div>
            <div
              role="button"
              onClick={onToggleMute}
              style={{ width: 40, height: 40, minHeight: 'auto', padding: 0, cursor: 'pointer' }}
              className={`rounded-xl flex items-center justify-center transition-all ${isMuted ? 'bg-slate-600' : 'bg-slate-800'} active:scale-95`}
            >
              <span className="text-base leading-none">{isMuted ? '🔕' : '🔔'}</span>
            </div>

            {/* Print — standalone, separate from hamburger */}
            <div className="relative">
              <div
                role="button"
                onClick={() => { setIsPrintOpen(!isPrintOpen); setIsMenuOpen(false); }}
                style={{ width: 40, height: 40, minHeight: 'auto', padding: 0, cursor: 'pointer' }}
                className={`rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${isPrintOpen ? 'bg-slate-700 ring-2 ring-[#c5a065]' : 'bg-slate-800'}`}
              >
                <span className="text-base leading-none">🖨️</span>
              </div>
              {/* Print dropdown — positioned below the print icon */}
              {isPrintOpen && (
                <div className="absolute right-0 top-full mt-2 z-[3000] w-48">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-1">
                      <div
                        role="button"
                        onClick={() => { onPrint('main'); setIsPrintOpen(false); }}
                        style={{ cursor: 'pointer', minHeight: 'auto', padding: '12px 16px' }}
                        className="text-white text-xs font-bold flex items-center gap-2 rounded-xl active:bg-white/10 transition-colors"
                      >
                        📄 Master List
                      </div>
                      <div
                        role="button"
                        onClick={() => { onPrint('greeter'); setIsPrintOpen(false); }}
                        style={{ cursor: 'pointer', minHeight: 'auto', padding: '12px 16px' }}
                        className="text-white text-xs font-bold flex items-center gap-2 rounded-xl active:bg-white/10 transition-colors"
                      >
                        👋 Greeter View
                      </div>
                      <div
                        role="button"
                        onClick={() => { onPrint('inroom'); setIsPrintOpen(false); }}
                        style={{ cursor: 'pointer', minHeight: 'auto', padding: '12px 16px' }}
                        className="text-white text-xs font-bold flex items-center gap-2 rounded-xl active:bg-white/10 transition-colors"
                      >
                        🛏️ In-Room Delivery
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Hamburger — opens slide-out menu, closes print dropdown */}
        <div
          role="button"
          onClick={() => { setIsMenuOpen(!isMenuOpen); setIsPrintOpen(false); }}
          style={{ width: 44, height: 44, minHeight: 'auto', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
          className={`rounded-xl text-white flex items-center justify-center shadow-lg active:scale-90 flex-shrink-0 select-none ${isMenuOpen ? 'bg-slate-700 ring-2 ring-[#c5a065]' : 'bg-[#c5a065]'}`}
        >
          <span className="text-xl font-bold leading-none">{isMenuOpen ? '✕' : '☰'}</span>
        </div>
      </div>

      {/* Close dropdowns when tapping outside */}
      {(isPrintOpen || isMenuOpen) && (
        <div
          className="lg:hidden fixed inset-0 z-[2999]"
          style={{ top: 0 }}
          onClick={() => { setIsPrintOpen(false); setIsMenuOpen(false); }}
        />
      )}

      {/* --- Mobile Slide-out Menu (no print — print is separate) --- */}
      {isMenuOpen && (
        <div className="lg:hidden fixed left-0 right-0 bottom-0 bg-slate-950/95 backdrop-blur-xl z-[3000] overflow-y-auto" style={{ top: 56 }}>
          <div className="p-5 pb-20 space-y-4 max-w-md mx-auto">

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <div role="button" onClick={() => { onAddManual(); setIsMenuOpen(false); }} style={{ cursor: 'pointer', minHeight: 'auto' }} className="bg-[#c5a065] text-white py-4 px-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform">➕ Add Manual</div>
              <div role="button" onClick={() => { toggleTheme(); setIsMenuOpen(false); }} style={{ cursor: 'pointer', minHeight: 'auto' }} className="bg-slate-800 text-white py-4 px-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-slate-700 active:scale-95 transition-transform">{isDark ? '☀️ Ivory' : '🌙 Obsidian'}</div>
            </div>

            {hasGuests && (
              <>
                {/* AI & Analytics */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] px-1">Intelligence</p>
                  <div role="button" onClick={() => { onAIRefine(); setIsMenuOpen(false); }} style={{ cursor: 'pointer', minHeight: 'auto' }} className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 px-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-[0.98] transition-transform">✨ AI Audit Refine</div>
                  <div role="button" onClick={() => { onToggleAnalytics(); setIsMenuOpen(false); }} style={{ cursor: 'pointer', minHeight: 'auto' }} className={`w-full ${showAnalytics ? 'bg-[#c5a065]' : 'bg-slate-800'} text-white py-4 px-5 rounded-2xl font-black uppercase text-[11px] tracking-widest border border-slate-700 active:scale-[0.98] transition-transform`}>📊 Strategic Analytics</div>
                </div>

                {/* Export */}
                <div role="button" onClick={() => { onExcel(); setIsMenuOpen(false); }} style={{ cursor: 'pointer', minHeight: 'auto' }} className="w-full bg-emerald-600 text-white py-4 px-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-[0.98] transition-transform">⬇️ Export Excel</div>
              </>
            )}

            {/* User & Utility */}
            <div className="pt-2 space-y-3">
              {userName && (
                <div className="flex items-center justify-between p-4 bg-[#c5a065]/10 border border-[#c5a065]/30 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#c5a065] flex items-center justify-center text-white text-sm font-black">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{userName}</p>
                      <p className="text-[10px] text-slate-400">Signed in</p>
                    </div>
                  </div>
                  <div role="button" onClick={() => { logout(); setIsMenuOpen(false); }} style={{ cursor: 'pointer', minHeight: 'auto' }} className="px-4 py-2 rounded-xl bg-slate-800 text-rose-400 text-[10px] font-black uppercase tracking-widest border border-slate-700 active:scale-95 transition-transform">
                    Sign Out
                  </div>
                </div>
              )}
              <div role="button" onClick={() => { document.getElementById('file-upload-nav')?.click(); setIsMenuOpen(false); }} style={{ cursor: 'pointer', minHeight: 'auto' }} className="w-full bg-slate-800 text-white py-4 px-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-slate-700 active:scale-[0.98] transition-transform">📁 Upload PDF</div>
              <div role="button" onClick={() => { onOpenSOP(); setIsMenuOpen(false); }} style={{ cursor: 'pointer', minHeight: 'auto' }} className="w-full border-2 border-[#c5a065]/30 text-[#c5a065] py-4 px-5 rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-[0.98] transition-transform">? Titanium Manual</div>
            </div>
          </div>
        </div>
      )}

      <input id="file-upload-nav" type="file" className="hidden" accept=".pdf" onChange={onFileUpload} />
    </nav>
  );
};

export default Navbar;