import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Transcription } from '../hooks/useLiveAssistant';
import TeamChatTab from './TeamChatTab';
import AIAssistantTab from './AIAssistantTab';

/* ──────────────────────────────────────────────
   UnifiedChatPanel — Shell with FAB + Tabs
   Upgraded with interactive floating animation
   ────────────────────────────────────────────── */

interface UnifiedChatPanelProps {
    // Team chat
    sessionId: string;
    userName: string;
    department: string;
    // AI assistant
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
}

type Tab = 'team' | 'assistant';

const UnifiedChatPanel: React.FC<UnifiedChatPanelProps> = ({
    sessionId, userName, department,
    isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput,
    onToggleMic, onSendAIMessage, onStartAssistant, onDisconnect, onClearHistory,
    errorMessage, hasMic,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('team');
    const [unread, setUnread] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const fabRef = useRef<HTMLButtonElement>(null);

    const handleUnreadChange = useCallback((count: number) => {
        setUnread(prev => count === 0 ? 0 : prev + count);
    }, []);

    // Interactive mouse-follow subtle tilt on FAB
    const handleFabMouseMove = useCallback((e: React.MouseEvent) => {
        if (!fabRef.current) return;
        const rect = fabRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        fabRef.current.style.transform = isOpen
            ? `rotate(45deg) perspective(200px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`
            : `perspective(200px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.08)`;
    }, [isOpen]);

    const handleFabMouseLeave = useCallback(() => {
        if (!fabRef.current) return;
        setIsHovered(false);
        fabRef.current.style.transform = isOpen ? 'rotate(45deg)' : 'none';
    }, [isOpen]);

    const fabSize = 58;

    return (
        <>
            {/* ═══ FAB BUTTON — Interactive with 3D tilt + ripple ring ═══ */}
            <button
                ref={fabRef}
                className="no-print chat-fab"
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) setUnread(0); }}
                onMouseMove={handleFabMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={handleFabMouseLeave}
                style={{
                    position: 'fixed',
                    bottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
                    right: '20px',
                    zIndex: 10001,
                    width: `${fabSize}px`, height: `${fabSize}px`, borderRadius: '50%',
                    background: isOpen
                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                        : isLiveActive
                            ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                            : 'linear-gradient(135deg, #c5a065, #a08050)',
                    border: 'none', cursor: 'pointer', color: 'white',
                    boxShadow: isHovered
                        ? '0 8px 32px rgba(197,160,101,0.45), 0 0 0 3px rgba(197,160,101,0.2)'
                        : '0 6px 24px rgba(0,0,0,0.25)',
                    fontSize: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'box-shadow 0.3s ease, background 0.3s ease',
                    transform: isOpen ? 'rotate(45deg)' : 'none',
                    willChange: 'transform',
                }}
            >
                {isOpen ? '+' : '💬'}
            </button>

            {/* Animated ring pulse behind FAB when not open */}
            {!isOpen && (
                <div className="no-print chat-fab-ring" style={{
                    position: 'fixed',
                    bottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
                    right: '20px',
                    zIndex: 10000,
                    width: `${fabSize}px`, height: `${fabSize}px`, borderRadius: '50%',
                    border: `2px solid ${isLiveActive ? 'rgba(99,102,241,0.4)' : 'rgba(197,160,101,0.35)'}`,
                    pointerEvents: 'none',
                }} />
            )}

            {/* Unread badge */}
            {unread > 0 && !isOpen && (
                <div className="no-print" style={{
                    position: 'fixed',
                    bottom: `max(${24 + fabSize - 10}px, calc(env(safe-area-inset-bottom, 0px) + ${16 + fabSize - 10}px))`,
                    right: '20px',
                    zIndex: 10002,
                    minWidth: '20px', height: '20px', borderRadius: '10px',
                    background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px', boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                    animation: 'badgeBounce 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
                }}>{unread}</div>
            )}

            {/* Live indicator dot */}
            {isLiveActive && !isOpen && (
                <div className="no-print" style={{
                    position: 'fixed',
                    bottom: `max(${24 + fabSize - 6}px, calc(env(safe-area-inset-bottom, 0px) + ${16 + fabSize - 6}px))`,
                    right: `${20 + fabSize - 6}px`,
                    zIndex: 10002,
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: isMicEnabled ? '#ef4444' : '#22c55e',
                    border: '2px solid white',
                    boxShadow: `0 0 8px ${isMicEnabled ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'}`,
                    animation: 'pulse 1.5s infinite',
                }} />
            )}

            {/* ═══ CHAT PANEL — with entrance animation ═══ */}
            {isOpen && (
                <div className="no-print chat-panel-enter" style={{
                    position: 'fixed',
                    bottom: `max(90px, calc(env(safe-area-inset-bottom, 0px) + 82px))`,
                    right: '20px', zIndex: 10000,
                    width: 'min(380px, calc(100vw - 40px))',
                    height: 'min(520px, calc(100vh - 140px))',
                    background: 'var(--surface, rgba(255,255,255,0.95))',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    borderRadius: '24px',
                    boxShadow: '0 16px 64px rgba(0,0,0,0.18), 0 0 0 1px var(--border-ui, rgba(197,160,101,0.15))',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    {/* ─── Tab bar ─── */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid var(--border-ui, rgba(197,160,101,0.15))',
                        background: 'rgba(197,160,101,0.04)',
                        flexShrink: 0,
                    }}>
                        {(['team', 'assistant'] as Tab[]).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    flex: 1, padding: '14px 0', fontSize: '11px', fontWeight: 900,
                                    textTransform: 'uppercase', letterSpacing: '0.08em',
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: activeTab === tab ? (tab === 'assistant' ? '#6366f1' : '#c5a065') : 'var(--text-muted, #94a3b8)',
                                    borderBottom: activeTab === tab ? `2px solid ${tab === 'assistant' ? '#6366f1' : '#c5a065'}` : '2px solid transparent',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}
                            >
                                {tab === 'team' ? '💬 Team' : '🤖 Assistant'}
                                {tab === 'team' && unread > 0 && activeTab !== 'team' && (
                                    <span style={{
                                        background: '#ef4444', color: 'white', fontSize: '9px', fontWeight: 900,
                                        padding: '1px 5px', borderRadius: '8px', minWidth: '16px', textAlign: 'center',
                                    }}>{unread}</span>
                                )}
                                {tab === 'assistant' && isLiveActive && (
                                    <span style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: isMicEnabled ? '#ef4444' : '#22c55e',
                                        boxShadow: `0 0 6px ${isMicEnabled ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'}`,
                                    }} />
                                )}
                            </button>
                        ))}
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

            {/* ─── Premium Chat Animations ─── */}
            <style>{`
                /* FAB floating animation */
                .chat-fab {
                    animation: fabFloat 3s ease-in-out infinite;
                }
                .chat-fab:hover {
                    animation: none;
                }
                @keyframes fabFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }

                /* Ring pulse */
                .chat-fab-ring {
                    animation: ringPulse 2.5s ease-in-out infinite;
                }
                @keyframes ringPulse {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.35); opacity: 0; }
                }

                /* Panel entrance */
                .chat-panel-enter {
                    animation: chatPanelIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                @keyframes chatPanelIn {
                    from {
                        opacity: 0;
                        transform: translateY(24px) scale(0.92);
                        filter: blur(4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                        filter: blur(0);
                    }
                }

                /* Badge bounce entrance */
                @keyframes badgeBounce {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.3); }
                    100% { transform: scale(1); }
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </>
    );
};

export default UnifiedChatPanel;
