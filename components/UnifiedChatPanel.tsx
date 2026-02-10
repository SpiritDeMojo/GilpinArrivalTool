import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Transcription } from '../hooks/useLiveAssistant';
import { AppNotification } from '../hooks/useNotifications';
import TeamChatTab from './TeamChatTab';
import AIAssistantTab from './AIAssistantTab';

/* ═══════════════════════════════════════════════════════════
   UnifiedChatPanel — Messenger Shell
   ═══════════════════════════════════════════════════════════
   FAB with hover tilt · Frosted-glass panel
   Segmented control tab bar · Unread badge
   ═══════════════════════════════════════════════════════════ */

interface UnifiedChatPanelProps {
    sessionId: string;
    userName: string;
    department: string;
    isLiveActive: boolean;
    isMicEnabled: boolean;
    transcriptions: Transcription[];
    interimInput: string;
    interimOutput: string;
    onToggleMic: () => void;
    onSendAIMessage: (text: string) => void;
    onStartAssistant: () => void;
    onDisconnect: () => void;
    onClearHistory: () => void;
    errorMessage?: string | null;
    hasMic: boolean;
    onPushNotification?: (notif: Omit<AppNotification, 'id' | 'timestamp'>) => void;
}

type Tab = 'team' | 'assistant';

const UnifiedChatPanel: React.FC<UnifiedChatPanelProps> = ({
    sessionId, userName, department,
    isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput,
    onToggleMic, onSendAIMessage, onStartAssistant, onDisconnect, onClearHistory,
    errorMessage, hasMic, onPushNotification,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('team');
    const [unread, setUnread] = useState(0);
    const [panelVisible, setPanelVisible] = useState(false);
    const fabRef = useRef<HTMLButtonElement>(null);

    const handleUnreadChange = useCallback((count: number) => {
        setUnread(prev => count === 0 ? 0 : prev + count);
    }, []);

    /* ─── Open/Close with animation states ─── */
    const handleToggle = useCallback(() => {
        if (isOpen) {
            // Close: trigger exit animation, then unmount
            setPanelVisible(false);
            setTimeout(() => setIsOpen(false), 400);
        } else {
            setIsOpen(true);
            // Small delay for mount → animate
            requestAnimationFrame(() => setPanelVisible(true));
            if (activeTab === 'team') setUnread(0);
        }
    }, [isOpen, activeTab]);

    /* ─── Interactive 3D tilt on FAB ─── */
    const handleFabMouseMove = useCallback((e: React.MouseEvent) => {
        if ('ontouchstart' in window || !fabRef.current) return;
        const rect = fabRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        fabRef.current.style.transform = `perspective(200px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.06)`;
    }, []);

    const handleFabMouseLeave = useCallback(() => {
        if (fabRef.current) fabRef.current.style.transform = 'none';
    }, []);

    /* ─── Tab change ─── */
    const handleTabChange = useCallback((tab: Tab) => {
        setActiveTab(tab);
        if (tab === 'team') setUnread(0);
    }, []);

    return (
        <>
            {/* ═══ FAB BUTTON ═══ */}
            <button
                ref={fabRef}
                className="no-print ios-chat-fab"
                onClick={handleToggle}
                onMouseMove={handleFabMouseMove}
                onMouseLeave={handleFabMouseLeave}
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
                style={{
                    position: 'fixed',
                    bottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
                    right: '20px',
                    zIndex: 10001,
                    width: '56px', height: '56px', borderRadius: '28px',
                    background: isOpen
                        ? 'linear-gradient(135deg, #ff3b30, #ff2d55)'
                        : isLiveActive
                            ? 'linear-gradient(135deg, #5856d6, #af52de)'
                            : 'linear-gradient(135deg, #c5a065, #a08050)',
                    border: 'none', cursor: 'pointer', color: 'white',
                    fontSize: '22px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isOpen
                        ? '0 4px 16px rgba(255,59,48,0.4)'
                        : '0 6px 24px rgba(0,0,0,0.2), 0 0 0 0.5px rgba(255,255,255,0.1) inset',
                    transition: 'background 0.3s ease, box-shadow 0.3s ease',
                    willChange: 'transform',
                }}
            >
                {isOpen ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ transition: 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)', transform: 'rotate(90deg)' }}>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                )}
            </button>

            {/* Breathing ring behind FAB */}
            {!isOpen && (
                <div className="no-print ios-fab-ring" style={{
                    position: 'fixed',
                    bottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
                    right: '20px',
                    zIndex: 10000,
                    width: '56px', height: '56px', borderRadius: '28px',
                    border: `2px solid ${isLiveActive ? 'rgba(88,86,214,0.35)' : 'rgba(197,160,101,0.3)'}`,
                    pointerEvents: 'none',
                }} />
            )}

            {/* Unread badge */}
            {unread > 0 && !isOpen && (
                <div className="no-print ios-badge-bounce" style={{
                    position: 'fixed',
                    bottom: 'max(68px, calc(env(safe-area-inset-bottom, 0px) + 60px))',
                    right: '18px',
                    zIndex: 10002,
                    minWidth: '20px', height: '20px', borderRadius: '10px',
                    background: '#ff3b30', color: 'white',
                    fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px',
                    boxShadow: '0 2px 8px rgba(255,59,48,0.4)',
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                }}>{unread}</div>
            )}

            {/* Live indicator dot */}
            {isLiveActive && !isOpen && (
                <div className="no-print ios-live-dot" style={{
                    position: 'fixed',
                    bottom: 'max(68px, calc(env(safe-area-inset-bottom, 0px) + 60px))',
                    right: '70px',
                    zIndex: 10002,
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: isMicEnabled ? '#ff3b30' : '#34c759',
                    border: '2px solid white',
                    boxShadow: `0 0 8px ${isMicEnabled ? 'rgba(255,59,48,0.5)' : 'rgba(52,199,89,0.5)'}`,
                }} />
            )}

            {/* ═══ CHAT PANEL ═══ */}
            {isOpen && (
                <div
                    className={`no-print ios-chat-panel ${panelVisible ? 'ios-chat-panel--open' : 'ios-chat-panel--closed'}`}
                    style={{
                        position: 'fixed',
                        bottom: 'max(90px, calc(env(safe-area-inset-bottom, 0px) + 82px))',
                        right: '20px',
                        zIndex: 10000,
                        width: 'min(380px, calc(100vw - 32px))',
                        height: 'min(540px, calc(100vh - 140px))',
                        borderRadius: '22px',
                        overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        /* iOS frosted glass */
                        background: 'var(--surface, rgba(255,255,255,0.92))',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 0.5px rgba(197,160,101,0.15)',
                    }}
                >
                    {/* ─── iOS Segmented Control Tab Bar ─── */}
                    <div style={{
                        padding: '12px 14px 8px',
                        background: 'var(--surface, rgba(197,160,101,0.03))',
                        borderBottom: '0.5px solid var(--border-ui, rgba(197,160,101,0.12))',
                    }}>
                        <div style={{
                            display: 'flex',
                            background: 'var(--surface, rgba(120,120,128,0.08))',
                            borderRadius: '8px',
                            padding: '2px',
                            position: 'relative',
                        }}>
                            {(['team', 'assistant'] as Tab[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 0',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        letterSpacing: '-0.01em',
                                        background: activeTab === tab
                                            ? 'var(--surface, rgba(255,255,255,0.95))'
                                            : 'transparent',
                                        border: 'none',
                                        borderRadius: '7px',
                                        cursor: 'pointer',
                                        color: activeTab === tab
                                            ? 'var(--text-main, #1c1c1e)'
                                            : 'var(--text-muted, #8e8e93)',
                                        boxShadow: activeTab === tab
                                            ? '0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)'
                                            : 'none',
                                        transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                    }}
                                >
                                    {tab === 'team' ? '💬 Team Chat' : '🤖 Assistant'}
                                    {tab === 'team' && unread > 0 && activeTab !== 'team' && (
                                        <span style={{
                                            background: '#ff3b30', color: 'white',
                                            fontSize: '9px', fontWeight: 700,
                                            padding: '1px 5px', borderRadius: '8px',
                                            minWidth: '16px', textAlign: 'center',
                                        }}>{unread}</span>
                                    )}
                                    {tab === 'assistant' && isLiveActive && (
                                        <span style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            background: isMicEnabled ? '#ff3b30' : '#34c759',
                                            boxShadow: `0 0 6px ${isMicEnabled ? 'rgba(255,59,48,0.5)' : 'rgba(52,199,89,0.5)'}`,
                                            display: 'inline-block',
                                        }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ─── Content ─── */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        {activeTab === 'team' ? (
                            <TeamChatTab
                                sessionId={sessionId}
                                userName={userName}
                                department={department}
                                isVisible={isOpen && activeTab === 'team'}
                                onUnreadChange={handleUnreadChange}
                                onPushNotification={onPushNotification}
                            />
                        ) : (
                            <AIAssistantTab
                                isLiveActive={isLiveActive}
                                isMicEnabled={isMicEnabled}
                                transcriptions={transcriptions}
                                interimInput={interimInput}
                                interimOutput={interimOutput}
                                errorMessage={errorMessage}
                                hasMic={hasMic}
                                onToggleMic={onToggleMic}
                                onSendMessage={onSendAIMessage}
                                onStart={onStartAssistant}
                                onDisconnect={onDisconnect}
                                onClearHistory={onClearHistory}
                                isVisible={isOpen && activeTab === 'assistant'}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ─── iOS Chat Animations ─── */}
            <style>{`
                /* FAB idle breathing — gentle, 6s cycle */
                .ios-chat-fab {
                    animation: iosFabIdle 6s ease-in-out infinite;
                }
                .ios-chat-fab:hover { animation-play-state: paused; }
                .ios-chat-fab:active {
                    transform: scale(0.92) !important;
                    transition: transform 0.12s ease !important;
                }
                @keyframes iosFabIdle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-2px); }
                }

                /* Ring pulse — slow, subtle */
                .ios-fab-ring {
                    animation: iosRingPulse 4s ease-in-out infinite;
                }
                @keyframes iosRingPulse {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.4); opacity: 0; }
                }

                /* Panel enter/exit — smooth spring */
                .ios-chat-panel {
                    transform-origin: bottom right;
                    transition:
                        transform 0.5s cubic-bezier(0.32, 0.72, 0, 1),
                        opacity 0.35s ease,
                        filter 0.35s ease;
                }
                .ios-chat-panel--open {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                    filter: blur(0);
                }
                .ios-chat-panel--closed {
                    transform: scale(0.85) translateY(20px);
                    opacity: 0;
                    filter: blur(6px);
                }

                /* Badge bounce — slightly slower */
                .ios-badge-bounce {
                    animation: iosBadgeBounce 0.6s cubic-bezier(0.68, -0.55, 0.27, 1.55);
                }
                @keyframes iosBadgeBounce {
                    0% { transform: scale(0); }
                    60% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }

                /* Live dot pulse — gentle */
                .ios-live-dot {
                    animation: iosDotPulse 2.5s ease-in-out infinite;
                }
                @keyframes iosDotPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.75; transform: scale(1.1); }
                }

                /* Dark mode adjustments */
                [data-theme="dark"] .ios-chat-panel {
                    background: rgba(28, 28, 30, 0.92) !important;
                }
            `}</style>
        </>
    );
};

export default UnifiedChatPanel;
