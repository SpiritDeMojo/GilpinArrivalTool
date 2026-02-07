import React, { useState, useEffect, useRef } from 'react';
import { Transcription } from '../hooks/useLiveAssistant';

/* ──────────────────────────────────────────────
   AIAssistantTab — Gemini Live session panel
   Auto-connects when visible, text + voice input
   ────────────────────────────────────────────── */

export interface AIAssistantTabProps {
    isLiveActive: boolean;
    isMicEnabled: boolean;
    transcriptions: Transcription[];
    interimInput: string;
    interimOutput: string;
    errorMessage?: string | null;
    hasMic: boolean;
    onToggleMic: () => void;
    onSendMessage: (text: string) => void;
    onStart: () => void;
    onDisconnect: () => void;
    onClearHistory: () => void;
    isVisible: boolean;
}

const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
    isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput,
    errorMessage, hasMic, onToggleMic, onSendMessage, onStart, onDisconnect, onClearHistory,
    isVisible,
}) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasAutoStarted = useRef(false);

    // Auto-start session when tab becomes visible
    useEffect(() => {
        if (isVisible && !isLiveActive && !hasAutoStarted.current) {
            hasAutoStarted.current = true;
            // Small delay to let the tab render first
            const timer = setTimeout(() => onStart(), 300);
            return () => clearTimeout(timer);
        }
        // Reset auto-start flag when tab is hidden so it re-connects next time
        if (!isVisible) {
            hasAutoStarted.current = false;
        }
    }, [isVisible, isLiveActive, onStart]);

    // Auto-scroll
    useEffect(() => {
        if (isVisible && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcriptions, interimInput, interimOutput, isVisible]);

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        onSendMessage(text);
        setInput('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Status bar */}
            <div style={{
                padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(197,160,101,0.04)',
                borderBottom: '1px solid var(--border-ui, rgba(197,160,101,0.1))',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: isLiveActive ? (isMicEnabled ? '#ef4444' : '#22c55e') : '#f59e0b',
                        boxShadow: isLiveActive ? `0 0 8px ${isMicEnabled ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'}` : '0 0 6px rgba(245,158,11,0.4)',
                        animation: isLiveActive
                            ? (isMicEnabled ? 'pulse 1.5s infinite' : undefined)
                            : 'pulse 1s infinite',
                    }} />
                    <span style={{
                        fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                        color: isLiveActive ? (isMicEnabled ? '#ef4444' : '#22c55e') : '#f59e0b'
                    }}>
                        {isLiveActive ? (isMicEnabled ? 'Listening' : 'Live') : 'Connecting...'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {isLiveActive && (
                        <>
                            {hasMic && (
                                <button onClick={onToggleMic} style={{
                                    padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: 900,
                                    textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                                    background: isMicEnabled ? '#ef4444' : 'var(--surface, rgba(200,200,200,0.3))',
                                    color: isMicEnabled ? 'white' : 'var(--text-muted, #94a3b8)',
                                }}>🎙️ {isMicEnabled ? 'Mic On' : 'Mic Off'}</button>
                            )}
                            <button onClick={onDisconnect} style={{
                                padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: 900,
                                textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                            }}>⏹ Stop</button>
                        </>
                    )}
                    {transcriptions.length > 0 && !isLiveActive && (
                        <button onClick={onClearHistory} style={{
                            padding: '5px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: 900,
                            textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                            background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                        }}>Clear</button>
                    )}
                </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
                <div style={{
                    padding: '10px 16px', fontSize: '11px', fontWeight: 700,
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    borderBottom: '1px solid rgba(239,68,68,0.2)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                    <span>⚠️</span>
                    <span style={{ flex: 1 }}>{errorMessage}</span>
                    <button onClick={onStart} style={{
                        padding: '3px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: 900,
                        background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer',
                        textTransform: 'uppercase',
                    }}>Retry</button>
                </div>
            )}

            {/* Messages area */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {transcriptions.length === 0 && !interimInput && !interimOutput && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '12px', fontWeight: 700, paddingTop: '40px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
                        {isLiveActive ? 'Assistant is ready. Speak or type.' : 'Connecting to assistant...'}
                        <div style={{ fontSize: '10px', marginTop: '12px', color: '#94a3b8', textTransform: 'none', letterSpacing: 'normal', lineHeight: '1.6', fontWeight: 500 }}>
                            Try: "Morning briefing" • "What room is [Guest]?" • "Mark Room 5 cleaned" • "Note for Room 3: extra towels"
                        </div>
                    </div>
                )}

                {transcriptions.map((t, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: t.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', alignSelf: t.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                            padding: '10px 14px', fontSize: '12px', lineHeight: '1.6', fontWeight: 500, wordBreak: 'break-word',
                            borderRadius: t.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: t.role === 'user'
                                ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                                : 'var(--surface, rgba(255,255,255,0.7))',
                            color: t.role === 'user' ? 'white' : 'var(--text-main)',
                            border: t.role === 'user' ? 'none' : '1px solid var(--border-ui, rgba(197,160,101,0.15))',
                            boxShadow: t.role === 'user' ? '0 2px 8px rgba(99,102,241,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
                        }}>{t.text}</div>
                    </div>
                ))}

                {interimInput && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '88%', alignSelf: 'flex-end', opacity: 0.6 }}>
                        <div style={{
                            padding: '10px 14px', fontSize: '12px', lineHeight: '1.6', fontStyle: 'italic',
                            borderRadius: '16px 16px 4px 16px', background: 'rgba(99,102,241,0.3)', color: 'white',
                        }}>{interimInput}...</div>
                    </div>
                )}
                {interimOutput && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '88%', alignSelf: 'flex-start', opacity: 0.6 }}>
                        <div style={{
                            padding: '10px 14px', fontSize: '12px', lineHeight: '1.6', fontStyle: 'italic',
                            borderRadius: '16px 16px 16px 4px',
                            background: 'var(--surface, rgba(255,255,255,0.5))',
                            border: '1px solid var(--border-ui, rgba(197,160,101,0.1))',
                            color: 'var(--text-muted, #94a3b8)',
                        }}>{interimOutput}...</div>
                    </div>
                )}
            </div>

            {/* Input bar */}
            <div style={{
                padding: '12px 14px',
                borderTop: '1px solid var(--border-ui, rgba(197, 160, 101, 0.1))',
                display: 'flex', gap: '8px', alignItems: 'center',
                background: 'rgba(197, 160, 101, 0.03)',
                opacity: isLiveActive ? 1 : 0.4,
                pointerEvents: isLiveActive ? 'auto' : 'none',
            }}>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={isLiveActive ? 'Type a command...' : 'Connecting...'}
                    disabled={!isLiveActive}
                    style={{
                        flex: 1,
                        background: 'var(--surface, rgba(255, 255, 255, 0.5))',
                        border: '1px solid var(--border-ui, rgba(197, 160, 101, 0.2))',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        color: 'var(--text-main)',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'inherit',
                    }}
                />
                <button
                    onClick={handleSend}
                    disabled={!isLiveActive || !input.trim()}
                    style={{
                        width: '38px', height: '38px', borderRadius: '12px',
                        background: (isLiveActive && input.trim()) ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--surface, rgba(255,255,255,0.3))',
                        color: (isLiveActive && input.trim()) ? 'white' : 'var(--text-muted, rgba(148,163,184,0.5))',
                        border: (isLiveActive && input.trim()) ? 'none' : '1px solid var(--border-ui, rgba(197,160,101,0.15))',
                        cursor: (isLiveActive && input.trim()) ? 'pointer' : 'default',
                        fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', flexShrink: 0,
                    }}
                >↑</button>
            </div>
        </div>
    );
};

export default AIAssistantTab;
