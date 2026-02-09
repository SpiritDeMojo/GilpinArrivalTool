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
}

const Navbar: React.FC<NavbarProps> = ({
  arrivalDateStr, isDark, toggleTheme, onFileUpload, onPrint, onExcel, onAddManual, onOpenSOP,
  hasGuests, onAIRefine, onToggleAnalytics, showAnalytics,
  isMuted, onToggleMute, connectionStatus, onReconnect, onSaveSession, isSessionLocked
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const { userName, department, logout } = useUser();
  const weather = useWeather();
  const isRec = department === 'REC';
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on route change or escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsMenuOpen(false); setIsPrintOpen(false); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  // Inline styles for mobile div-buttons (bypasses global CSS)
  const mobBtn: React.CSSProperties = { cursor: 'pointer', minHeight: 'auto', padding: 0 };
  const mobIcon: React.CSSProperties = { width: 38, height: 38, ...mobBtn };

  return (
    <nav className="navbar no-print flex justify-between items-center">
      {/* LEFT: Logo + Title */}
      <div className="flex items-center min-w-0">
        <div role="button" className="nav-logo-bubble flex-shrink-0" style={{ cursor: 'pointer' }} onClick={() => window.location.reload()}>
          <img src={GILPIN_LOGO_URL} alt="Gilpin" className="nav-logo-img" />
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
                <span className="text-lg md:text-2xl leading-none">{weather.icon}</span>
                <span className="text-base md:text-2xl font-black heading-font tracking-tight leading-none text-[#c5a065]">{weather.temp}°C</span>
              </div>
            )}
          </div>
          <div className="font-black text-[#c5a065] text-[8px] md:text-[10px] tracking-[0.15em] md:tracking-[0.3em] uppercase truncate max-w-[130px] md:max-w-[200px] whitespace-nowrap overflow-hidden">
            {arrivalDateStr || 'Intelligence Hub'}
          </div>
        </div>
      </div>

      {/* CENTER-RIGHT: Sync indicator (visible on all sizes) */}
      {connectionStatus && (
        <div className="hidden md:flex items-center mx-4 flex-shrink-0">
          {connectionStatus === 'connected' && (
            <span className="status-badge connected" title="Real-time sync active">🟢 Synced</span>
          )}
          {connectionStatus === 'connecting' && (
            <span
              className="status-badge connecting"
              title="Click to reconnect"
              style={{ cursor: 'pointer' }}
              onClick={onReconnect}
            >🟡 Connecting</span>
          )}
          {connectionStatus === 'offline' && (
            <span
              className="status-badge offline"
              title="Click to reconnect"
              onClick={onReconnect}
            >🔴 Offline</span>
          )}
        </div>
      )}

      {/* --- Desktop Actions --- */}
      <div className="hidden lg:flex items-center gap-3">
        <button onClick={toggleTheme} className="nav-action-btn">
          {isDark ? 'Obsidian' : 'Ivory'}
        </button>

        <div className="flex gap-2">
          {hasGuests && (
            <>
              {isRec && (
                <button
                  onClick={onToggleAnalytics}
                  className={`nav-action-btn ${showAnalytics ? 'nav-action-btn--active' : ''}`}
                >
                  📊 Intelligence
                </button>
              )}

              {isRec && (
                <button onClick={onAIRefine} className="nav-action-btn">
                  ✨ AI Audit
                </button>
              )}

              {isRec && hasGuests && onSaveSession && (
                <button
                  onClick={onSaveSession}
                  className={`nav-action-btn ${isSessionLocked ? 'nav-action-btn--active' : ''}`}
                  title={isSessionLocked ? 'Session saved — click to unlock' : 'Save & lock this session'}
                >
                  {isSessionLocked ? '🔒 Saved' : '💾 Save'}
                </button>
              )}

              {isRec && (
                <div className="relative">
                  <button onClick={() => setIsPrintOpen(!isPrintOpen)} className={`nav-action-btn ${isPrintOpen ? 'nav-action-btn--active' : ''}`}>
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
              )}

              {isRec && (
                <button onClick={onExcel} className="nav-action-btn">⬇️ Excel</button>
              )}
              {isRec && (
                <button onClick={onAddManual} className="nav-action-btn">➕ Add</button>
              )}




              <button
                onClick={onToggleMute}
                className={`nav-action-btn nav-action-btn--icon ${isMuted ? 'nav-action-btn--active' : ''}`}
                title={isMuted ? 'Notifications muted' : 'Notifications on'}
              >
                <span className="text-lg leading-none">{isMuted ? '🔕' : '🔔'}</span>
              </button>
            </>
          )}

          <button
            onClick={() => document.getElementById('file-upload-nav')?.click()}
            className="nav-action-btn nav-action-btn--icon"
          >
            <span className="text-lg">📁</span>
          </button>
        </div>

        <button onClick={onOpenSOP} className="nav-action-btn nav-action-btn--icon">?</button>

        {/* User Badge with Department */}
        {userName && (
          <div className="flex items-center gap-2 ml-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#c5a065]/10 border border-[#c5a065]/30">
              <div className="w-6 h-6 rounded-full bg-[#c5a065] flex items-center justify-center text-white text-[10px] font-black">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{userName}</span>
              {department && (
                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#c5a065]/20 text-[#c5a065]">
                  {DEPARTMENT_LABELS[department]}
                </span>
              )}
            </div>
            <button
              onClick={logout}
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-stone-800 flex items-center justify-center text-xs transition-all hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 border border-transparent hover:border-red-300 dark:hover:border-red-800"
              title="Sign out"
            >
              ↪
            </button>
          </div>
        )}
      </div>

      {/* ===== MOBILE ACTIONS BAR ===== */}
      <div className="flex lg:hidden items-center gap-1.5 flex-shrink-0 relative z-[1015]">
        {/* Sync dot (mobile: compact) */}
        {connectionStatus && (
          <div
            role="button"
            title={connectionStatus === 'connected' ? 'Synced' : 'Tap to reconnect'}
            style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, cursor: connectionStatus !== 'connected' ? 'pointer' : 'default' }}
            className={`reconnect-dot-mobile ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}
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

        {/* Manual — standalone icon */}
        <div role="button" onClick={() => { onOpenSOP(); setIsMenuOpen(false); setIsPrintOpen(false); }} style={mobIcon}
          className="rounded-xl flex items-center justify-center transition-all bg-slate-800 active:scale-95"
          title="Titanium Manual"
        >
          <span className="text-sm leading-none">📖</span>
        </div>

        {/* Hamburger */}
        <div role="button"
          onClick={() => { setIsMenuOpen(!isMenuOpen); setIsPrintOpen(false); }}
          style={{ width: 42, height: 42, ...mobBtn, WebkitTapHighlightColor: 'transparent' }}
          className={`rounded-xl text-white flex items-center justify-center shadow-lg active:scale-90 flex-shrink-0 select-none transition-all ${isMenuOpen ? 'bg-slate-700 ring-2 ring-[#c5a065]' : 'bg-[#c5a065]'}`}
        >
          <span className="text-xl font-bold leading-none">{isMenuOpen ? '✕' : '☰'}</span>
        </div>
      </div>

      {/* Tap-outside dismiss */}
      {(isPrintOpen || isMenuOpen) && (
        <div className="lg:hidden fixed inset-0 z-[2999]" onClick={() => { setIsPrintOpen(false); setIsMenuOpen(false); }} />
      )}

      {/* ===== MOBILE SLIDE-OUT MENU (2 compact groups) ===== */}
      {isMenuOpen && (
        <div ref={menuRef} className="lg:hidden fixed left-0 right-0 z-[3000]"
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
              </div>
            )}
          </div>
        </div>
      )}

      <input id="file-upload-nav" type="file" className="hidden" accept=".pdf" onChange={onFileUpload} />
    </nav>
  );
};

export default Navbar;