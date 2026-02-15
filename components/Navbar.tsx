import React, { useState, useEffect, useRef } from 'react';
import { GILPIN_LOGO_URL } from '../constants';
import { useUser } from '../contexts/UserProvider';
import { useWeather } from '../hooks/useWeather';
import { DEPARTMENT_LABELS } from '../types';

interface NavbarProps {
  arrivalDateStr: string;
  isDark: boolean;
  toggleTheme: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrint: (mode: 'main' | 'greeter' | 'inroom') => void;
  onExcel: () => void;
  onAddManual: () => void;
  onOpenSOP: () => void;
  hasGuests: boolean;
  onAIRefine: () => void;
  onToggleAnalytics: () => void;
  showAnalytics: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  connectionStatus?: 'connected' | 'connecting' | 'offline';
  onReconnect?: () => void;
  onSaveSession?: () => void;
  isSessionLocked?: boolean;
  isSticky?: boolean;
  onOpenPackages?: () => void;
  showPackages?: boolean;
  onOpenHandover?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  arrivalDateStr, isDark, toggleTheme, onFileUpload, onPrint, onExcel, onAddManual, onOpenSOP,
  hasGuests, onAIRefine, onToggleAnalytics, showAnalytics,
  isMuted, onToggleMute, connectionStatus, onReconnect, onSaveSession, isSessionLocked, isSticky,
  onOpenPackages, showPackages, onOpenHandover
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isDesktopPrintOpen, setIsDesktopPrintOpen] = useState(false);
  const { userName, department, logout } = useUser();
  const weather = useWeather();
  const isRec = department === 'REC';
  const menuRef = useRef<HTMLDivElement>(null);
  const desktopMenuRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<HTMLDivElement>(null);

  // Listen for page-change events to spin the globe
  useEffect(() => {
    const spinGlobe = () => {
      const el = globeRef.current;
      if (!el) return;
      el.classList.remove('globe-spin');
      // Force reflow to restart animation
      void el.offsetWidth;
      el.classList.add('globe-spin');
      setTimeout(() => el.classList.remove('globe-spin'), 700);
    };
    document.addEventListener('gilpin:viewchange', spinGlobe);
    return () => document.removeEventListener('gilpin:viewchange', spinGlobe);
  }, []);

  // Close menu on route change or escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsMenuOpen(false); setIsPrintOpen(false); setIsDesktopMenuOpen(false); setIsDesktopPrintOpen(false); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = (isMenuOpen || isDesktopMenuOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen, isDesktopMenuOpen]);

  // Close desktop menu on click outside
  useEffect(() => {
    if (!isDesktopMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as Node)) {
        setIsDesktopMenuOpen(false);
        setIsDesktopPrintOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isDesktopMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  // Inline styles for mobile div-buttons (bypasses global CSS)
  const mobBtn: React.CSSProperties = { cursor: 'pointer', minHeight: 'auto', padding: 0 };
  const mobIcon: React.CSSProperties = { width: 34, height: 34, ...mobBtn };

  return (
    <nav className="navbar no-print flex justify-between items-center">
      {/* LEFT: Logo + Title */}
      <div className="flex items-center min-w-0">
        <div className={`nav-logo-wrapper relative flex-shrink-0${isSticky ? ' globe-tucked' : ''}`}>
          <div ref={globeRef} role="button" className="nav-logo-bubble" style={{ cursor: 'pointer', position: 'absolute', inset: 4 }}
            onClick={() => window.location.reload()}
            onTouchStart={(e) => {
              const el = e.currentTarget;
              el.classList.add('globe-bounce');
            }}
            onTouchEnd={(e) => {
              const el = e.currentTarget;
              setTimeout(() => el.classList.remove('globe-bounce'), 500);
            }}
          >
            <img src={GILPIN_LOGO_URL} alt="Gilpin" className="nav-logo-img" />
          </div>
        </div>
        <div className="ml-3 md:ml-6 min-w-0">
          <div className="flex items-center gap-1.5">
            {weather.loading ? (
              <div className="flex items-center gap-1.5 animate-pulse">
                <span className="text-lg md:text-2xl">🌤️</span>
                <span className="text-base md:text-2xl font-black heading-font tracking-tight text-slate-300 dark:text-slate-600">--°C</span>
              </div>
            ) : weather.error ? (
              <h1 className="text-base md:text-2xl font-black heading-font uppercase tracking-tighter leading-none truncate">Gilpin Hotel</h1>
            ) : (
              <div className="flex items-center gap-1" title={`${weather.description} in Windermere`}>
                <span className="text-lg md:text-2xl leading-none weather-pulse">{weather.icon}</span>
                <span className="text-base md:text-2xl font-black heading-font tracking-tight leading-none text-[#c5a065]">{weather.temp}°C</span>
              </div>
            )}
          </div>
          <div className="font-black text-[#c5a065] text-[8px] md:text-[10px] tracking-[0.15em] md:tracking-[0.3em] uppercase truncate max-w-[160px] md:max-w-[250px] whitespace-nowrap overflow-hidden">
            {arrivalDateStr || 'Intelligence Hub'}
          </div>
        </div>
      </div>


      {/* --- Desktop Actions --- */}
      <div className="hidden xl:flex items-center gap-3">
        {/* Sync Indicator — polished pill next to hamburger */}
        {connectionStatus && (
          <button
            className={`nav-sync-pill nav-sync-pill--${connectionStatus}`}
            onClick={() => { if (connectionStatus !== 'connected' && onReconnect) onReconnect(); }}
            title={connectionStatus === 'connected' ? 'Real-time sync active' : 'Click to reconnect'}
          >
            <span className="nav-sync-dot" />
            <span className="nav-sync-label">
              {connectionStatus === 'connected' ? 'Synced' : connectionStatus === 'connecting' ? 'Syncing' : 'Offline'}
            </span>
          </button>
        )}

        {/* Desktop Hamburger Button */}
        <button
          onClick={() => { setIsDesktopMenuOpen(!isDesktopMenuOpen); setIsDesktopPrintOpen(false); }}
          className={`nav-action-btn nav-action-btn--icon transition-all ${isDesktopMenuOpen ? 'nav-action-btn--active ring-2 ring-[#c5a065]/50' : ''}`}
          title="Menu"
          style={{ fontSize: 16 }}
        >
          <span className="text-lg leading-none">{isDesktopMenuOpen ? '✕' : '☰'}</span>
        </button>

        {/* Manual / SOP — always visible as ❓ */}
        <button
          onClick={onOpenSOP}
          className="nav-action-btn nav-action-btn--icon"
          title="Titanium Manual"
          style={{ fontSize: 16 }}
        >
          <span className="text-lg leading-none">❓</span>
        </button>
      </div>

      {/* ===== DESKTOP SLIDE-DOWN MENU ===== */}
      {isDesktopMenuOpen && (
        <>
          {/* Backdrop */}
          <div className="hidden xl:block fixed inset-0 z-[2998]" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => { setIsDesktopMenuOpen(false); setIsDesktopPrintOpen(false); }} />

          <div ref={desktopMenuRef} className="hidden xl:block fixed right-4 z-[3000]"
            style={{
              top: 56,
              width: 320,
              background: 'rgba(2, 6, 23, 0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              animation: 'menuSlide 0.2s ease-out',
              borderRadius: '0 0 16px 16px',
              border: '1px solid rgba(197,160,101,0.12)',
              borderTop: 'none',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <style>{`
              @keyframes menuSlide {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            <div className="p-4 space-y-3">
              {/* ── GROUP 1: Account ── */}
              <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] px-4 pt-3 pb-1">Account</p>

                {userName && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#c5a065] flex items-center justify-center text-white text-xs font-black">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">{userName}</span>
                        {department && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-[#c5a065]">
                            {DEPARTMENT_LABELS[department]}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { logout(); setIsDesktopMenuOpen(false); }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/20 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                )}

                {/* Theme */}
                <button onClick={() => { toggleTheme(); setIsDesktopMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-white font-semibold text-sm border-t border-slate-700/30 hover:bg-white/5 transition-colors w-full text-left cursor-pointer"
                >
                  <span className="w-6 text-center">{isDark ? '☀️' : '🌙'}</span>
                  <span>{isDark ? 'Ivory Mode' : 'Obsidian Mode'}</span>
                </button>

                {/* Mute */}
                <button onClick={() => { onToggleMute(); }}
                  className={`flex items-center gap-3 px-4 py-3 font-semibold text-sm border-t border-slate-700/30 hover:bg-white/5 transition-colors w-full text-left cursor-pointer ${isMuted ? 'text-[#c5a065]' : 'text-white'}`}
                >
                  <span className="w-6 text-center">{isMuted ? '🔕' : '🔔'}</span>
                  <span>{isMuted ? 'Notifications Off' : 'Notifications On'}</span>
                </button>
              </div>

              {/* ── GROUP 2: Tools (REC only) ── */}
              {hasGuests && isRec && (
                <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] px-4 pt-3 pb-1">Tools</p>

                  {/* AI Audit */}
                  <button onClick={() => { onAIRefine(); setIsDesktopMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 text-white font-semibold text-sm hover:bg-white/5 transition-colors w-full text-left cursor-pointer"
                  >
                    <span className="w-6 text-center">✨</span>
                    <span>AI Audit</span>
                  </button>

                  {/* Save / Lock */}
                  {onSaveSession && (
                    <button onClick={() => { onSaveSession(); setIsDesktopMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 font-semibold text-sm border-t border-slate-700/30 hover:bg-white/5 transition-colors w-full text-left cursor-pointer ${isSessionLocked ? 'text-[#c5a065]' : 'text-white'}`}
                    >
                      <span className="w-6 text-center">{isSessionLocked ? '🔒' : '💾'}</span>
                      <span>{isSessionLocked ? 'Saved — Click to Unlock' : 'Save & Lock'}</span>
                    </button>
                  )}

                  {/* Intelligence */}
                  <button onClick={() => { onToggleAnalytics(); setIsDesktopMenuOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-3 font-semibold text-sm border-t border-slate-700/30 hover:bg-white/5 transition-colors w-full text-left cursor-pointer ${showAnalytics ? 'text-[#c5a065]' : 'text-white'}`}
                  >
                    <span className="w-6 text-center">📊</span>
                    <span>Intelligence</span>
                  </button>

                  {/* Print — with sub-menu */}
                  <div className="border-t border-slate-700/30">
                    <button onClick={() => setIsDesktopPrintOpen(!isDesktopPrintOpen)}
                      className={`flex items-center gap-3 px-4 py-3 font-semibold text-sm hover:bg-white/5 transition-colors w-full text-left cursor-pointer ${isDesktopPrintOpen ? 'text-[#c5a065]' : 'text-white'}`}
                    >
                      <span className="w-6 text-center">🖨️</span>
                      <span>Print</span>
                      <span className="ml-auto text-[10px] text-slate-500">{isDesktopPrintOpen ? '▲' : '▼'}</span>
                    </button>
                    {isDesktopPrintOpen && (
                      <div className="bg-slate-800/50 px-4 py-1">
                        {(['main', 'greeter', 'inroom'] as const).map(mode => (
                          <button key={mode}
                            onClick={() => { onPrint(mode); setIsDesktopMenuOpen(false); setIsDesktopPrintOpen(false); }}
                            className="w-full text-left py-2.5 text-xs font-bold text-slate-300 hover:text-[#c5a065] transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            {mode === 'main' ? '📄 Master List' : mode === 'greeter' ? '👋 Greeter View' : '🛏️ In-Room Delivery'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Excel */}
                  <button onClick={() => { onExcel(); setIsDesktopMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 text-white font-semibold text-sm border-t border-slate-700/30 hover:bg-white/5 transition-colors w-full text-left cursor-pointer"
                  >
                    <span className="w-6 text-center">⬇️</span>
                    <span>Export Excel</span>
                  </button>

                  {/* New Booking */}
                  <button onClick={() => { onAddManual(); setIsDesktopMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 text-[#c5a065] font-semibold text-sm border-t border-slate-700/30 hover:bg-white/5 transition-colors w-full text-left cursor-pointer"
                  >
                    <span className="w-6 text-center">➕</span>
                    <span>New Booking</span>
                  </button>
                </div>
              )}

              {/* ── GROUP 3: Utilities ── */}
              <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] px-4 pt-3 pb-1">Utilities</p>

                {/* Day Handover */}
                {onOpenHandover && (
                  <button onClick={() => { onOpenHandover(); setIsDesktopMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 text-white font-semibold text-sm hover:bg-white/5 transition-colors w-full text-left cursor-pointer"
                  >
                    <span className="w-6 text-center">📝</span>
                    <span>Day Handover</span>
                  </button>
                )}

                {/* Package Generator */}
                {isRec && onOpenPackages && (
                  <button onClick={() => { onOpenPackages(); setIsDesktopMenuOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-3 font-semibold text-sm border-t border-slate-700/30 hover:bg-white/5 transition-colors w-full text-left cursor-pointer ${showPackages ? 'text-[#c5a065]' : 'text-white'}`}
                  >
                    <span className="w-6 text-center">📦</span>
                    <span>Itinerary Generator</span>
                  </button>
                )}

                {/* Upload File */}
                <button onClick={() => { document.getElementById('file-upload-nav')?.click(); setIsDesktopMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-white font-semibold text-sm border-t border-slate-700/30 hover:bg-white/5 transition-colors w-full text-left cursor-pointer"
                >
                  <span className="w-6 text-center">📁</span>
                  <span>Upload PDF</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== MOBILE ACTIONS BAR ===== */}
      <div className="flex xl:hidden items-center gap-1 flex-shrink-0 relative z-[1015]">
        {/* Sync dot (mobile: compact) */}
        {connectionStatus && (
          <div
            role="button"
            title={connectionStatus === 'connected' ? 'Synced' : 'Tap to reconnect'}
            style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, cursor: connectionStatus !== 'connected' ? 'pointer' : 'default' }}
            className={`reconnect-dot-mobile ${connectionStatus === 'connected' ? 'bg-green-500 sync-dot-connected' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}
            onClick={() => { if (connectionStatus !== 'connected' && onReconnect) onReconnect(); }}
          />
        )}

        {hasGuests && (
          <>

            <div role="button" onClick={onToggleMute} style={mobIcon}
              className={`rounded-xl flex items-center justify-center transition-all ${isMuted ? 'bg-slate-600' : 'bg-slate-800'} active:scale-95`}
            >
              <span className="text-sm leading-none">{isMuted ? '🔕' : '🔔'}</span>
            </div>

            {/* Print — standalone icon (REC only) */}
            {isRec && (
              <div className="relative">
                <div role="button" onClick={() => { setIsPrintOpen(!isPrintOpen); setIsMenuOpen(false); }} style={mobIcon}
                  className={`rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${isPrintOpen ? 'bg-slate-700 ring-2 ring-[#c5a065]' : 'bg-slate-800'}`}
                >
                  <span className="text-sm leading-none">🖨️</span>
                </div>
                {isPrintOpen && (
                  <div className="absolute right-0 top-full mt-2 z-[3001] w-48">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="p-1">
                        {(['main', 'greeter', 'inroom'] as const).map((mode) => (
                          <div key={mode} role="button"
                            onClick={() => { onPrint(mode); setIsPrintOpen(false); }}
                            style={{ cursor: 'pointer', minHeight: 'auto', padding: '12px 16px' }}
                            className="text-white text-xs font-bold flex items-center gap-2 rounded-xl active:bg-white/10 transition-colors"
                          >
                            {mode === 'main' ? '📄 Master List' : mode === 'greeter' ? '👋 Greeter View' : '🛏️ In-Room Delivery'}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Manual — standalone ❓ icon */}
        <div role="button" onClick={() => { onOpenSOP(); setIsMenuOpen(false); setIsPrintOpen(false); }} style={mobIcon}
          className="rounded-xl flex items-center justify-center transition-all bg-slate-800 active:scale-95"
          title="Titanium Manual"
        >
          <span className="text-sm leading-none">❓</span>
        </div>

        {/* Hamburger */}
        <div role="button"
          onClick={() => { setIsMenuOpen(!isMenuOpen); setIsPrintOpen(false); }}
          style={{ width: 38, height: 38, ...mobBtn, WebkitTapHighlightColor: 'transparent' }}
          className={`rounded-xl text-white flex items-center justify-center shadow-lg active:scale-90 flex-shrink-0 select-none transition-all ${isMenuOpen ? 'bg-slate-700 ring-2 ring-[#c5a065]' : 'bg-[#c5a065]'}`}
        >
          <span className="text-xl font-bold leading-none">{isMenuOpen ? '✕' : '☰'}</span>
        </div>
      </div>

      {/* Tap-outside dismiss */}
      {(isPrintOpen || isMenuOpen) && (
        <div className="xl:hidden fixed inset-0 z-[2999]" onClick={() => { setIsPrintOpen(false); setIsMenuOpen(false); }} />
      )}

      {/* ===== MOBILE SLIDE-OUT MENU (2 compact groups) ===== */}
      {isMenuOpen && (
        <div ref={menuRef} className="xl:hidden fixed left-0 right-0 z-[3000]"
          style={{
            top: 56,
            background: 'rgba(2, 6, 23, 0.97)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            animation: 'menuSlide 0.2s ease-out',
          }}
        >
          <style>{`
            @keyframes menuSlide {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div className="p-4 space-y-3">

            {/* ── GROUP 1: Account ── */}
            <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] px-4 pt-3 pb-1">Account</p>

              {/* User + Department */}
              {userName && (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#c5a065] flex items-center justify-center text-white text-xs font-black">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm">{userName}</span>
                      {department && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-[#c5a065]">
                          {DEPARTMENT_LABELS[department]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div role="button" onClick={() => { logout(); closeMenu(); }} style={{ cursor: 'pointer', minHeight: 'auto' }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-rose-400 text-[10px] font-black uppercase tracking-wider border border-rose-500/20 active:scale-95 transition-transform"
                  >
                    Sign Out
                  </div>
                </div>
              )}

              {/* Theme */}
              <div role="button" onClick={() => { toggleTheme(); closeMenu(); }} style={{ cursor: 'pointer', minHeight: 'auto' }}
                className="flex items-center gap-3 px-4 py-3 text-white font-semibold text-sm border-t border-slate-700/30 active:bg-white/5 transition-colors"
              >
                <span className="w-6 text-center">{isDark ? '☀️' : '🌙'}</span>
                <span>{isDark ? 'Ivory Mode' : 'Obsidian Mode'}</span>
              </div>
            </div>

            {/* ── GROUP 2: Tools (REC only) ── */}
            {hasGuests && isRec && (
              <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] px-4 pt-3 pb-1">Tools</p>

                {/* AI Audit */}
                <div role="button" onClick={() => { onAIRefine(); closeMenu(); }} style={{ cursor: 'pointer', minHeight: 'auto' }}
                  className="flex items-center gap-3 px-4 py-3 text-white font-semibold text-sm active:bg-white/5 transition-colors"
                >
                  <span className="w-6 text-center">✨</span>
                  <span>AI Audit</span>
                </div>

                {/* Save / Lock */}
                {onSaveSession && (
                  <div role="button" onClick={() => { onSaveSession(); closeMenu(); }} style={{ cursor: 'pointer', minHeight: 'auto' }}
                    className={`flex items-center gap-3 px-4 py-3 font-semibold text-sm border-t border-slate-700/30 active:bg-white/5 transition-colors ${isSessionLocked ? 'text-[#c5a065]' : 'text-white'}`}
                  >
                    <span className="w-6 text-center">{isSessionLocked ? '🔒' : '💾'}</span>
                    <span>{isSessionLocked ? 'Saved — Tap to Unlock' : 'Save & Lock'}</span>
                  </div>
                )}

                {/* Intelligence */}
                <div role="button" onClick={() => { onToggleAnalytics(); closeMenu(); }} style={{ cursor: 'pointer', minHeight: 'auto' }}
                  className={`flex items-center gap-3 px-4 py-3 font-semibold text-sm border-t border-slate-700/30 active:bg-white/5 transition-colors ${showAnalytics ? 'text-[#c5a065]' : 'text-white'}`}
                >
                  <span className="w-6 text-center">📊</span>
                  <span>Intelligence</span>
                </div>

                {/* New Booking */}
                <div role="button" onClick={() => { onAddManual(); closeMenu(); }} style={{ cursor: 'pointer', minHeight: 'auto' }}
                  className="flex items-center gap-3 px-4 py-3 text-[#c5a065] font-semibold text-sm border-t border-slate-700/30 active:bg-white/5 transition-colors"
                >
                  <span className="w-6 text-center">➕</span>
                  <span>New Booking</span>
                </div>

                {/* Package Generator */}
                {onOpenPackages && (
                  <div role="button" onClick={() => { onOpenPackages(); closeMenu(); }} style={{ cursor: 'pointer', minHeight: 'auto' }}
                    className={`flex items-center gap-3 px-4 py-3 font-semibold text-sm border-t border-slate-700/30 active:bg-white/5 transition-colors ${showPackages ? 'text-[#c5a065]' : 'text-white'}`}
                  >
                    <span className="w-6 text-center">📦</span>
                    <span>Itinerary Generator</span>
                  </div>
                )}
              </div>
            )}

            {/* ── GROUP 3: Utilities (Mobile) ── */}
            <div className="rounded-2xl border border-slate-700/50 overflow-hidden">
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] px-4 pt-3 pb-1">Utilities</p>
              {onOpenHandover && (
                <div role="button" onClick={() => { onOpenHandover(); closeMenu(); }} style={{ cursor: 'pointer', minHeight: 'auto' }}
                  className="flex items-center gap-3 px-4 py-3 text-white font-semibold text-sm active:bg-white/5 transition-colors"
                >
                  <span className="w-6 text-center">📝</span>
                  <span>Day Handover</span>
                </div>
              )}
            </div>


          </div>
        </div>
      )}

      <input id="file-upload-nav" type="file" className="hidden" accept=".pdf" onChange={onFileUpload} />
    </nav>
  );
};

export default Navbar;