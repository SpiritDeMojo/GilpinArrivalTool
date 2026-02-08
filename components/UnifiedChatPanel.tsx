import React, { useState, useCallback } from 'react';
import { Transcription } from '../hooks/useLiveAssistant';
import TeamChatTab from './TeamChatTab';
import AIAssistantTab from './AIAssistantTab';

/* ──────────────────────────────────────────────
   UnifiedChatPanel — Shell with FAB + Tabs
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

    const handleUnreadChange = useCallback((count: number) => {
        setUnread(prev => count === 0 ? 0 : prev + count);
    }, []);

    const fabSize = 56;

    return (
        <>
            {/* ═══ FAB BUTTON ═══ */}
            <button
                className="no-print"
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) setUnread(0); }}
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
                            : 'linear-gradient(135deg, #c5a065, #b08d54)',
                    border: 'none', cursor: 'pointer', color: 'white',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.25)', fontSize: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    transform: isOpen ? 'rotate(45deg)' : 'none',
                }}
            >
                {isOpen ? '+' : '💬'}
            </button>

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

            {/* ═══ CHAT PANEL ═══ */}
            {isOpen && (
                <div className="no-print" style={{
                    position: 'fixed',
                    bottom: `max(90px, calc(env(safe-area-inset-bottom, 0px) + 82px))`,
                    right: '20px', zIndex: 10000,
                    width: 'min(380px, calc(100vw - 40px))',
                    height: 'min(520px, calc(100vh - 140px))',
                    background: 'var(--bg-main, rgba(255,255,255,0.95))',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.15), 0 0 0 1px var(--border-ui, rgba(197,160,101,0.15))',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'slideUp 0.3s ease',
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
                                    transition: 'all 0.2s',
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

            {/* ─── Slide-up animation ─── */}
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
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
