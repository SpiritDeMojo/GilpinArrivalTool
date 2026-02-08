import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, sendChatMessage, subscribeToChatMessages, clearChatMessages } from '../services/firebaseService';

/* ──────────────────────────────────────────────
   TeamChatTab — Firebase real-time team chat
   ────────────────────────────────────────────── */

interface TeamChatTabProps {
    sessionId: string;
    userName: string;
    department: string;
    isVisible: boolean;
    onUnreadChange: (count: number) => void;
}

// Play a short chat notification chime via Web Audio API
function playChatChime() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Two-tone ascending chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(660, ctx.currentTime);
        gain1.gain.setValueAtTime(0.12, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.2);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.12);
        osc2.stop(ctx.currentTime + 0.35);
    } catch { /* Audio API not available */ }
}

// Show a browser push notification for a chat message
function showChatNotification(author: string, text: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(`💬 ${author}`, {
                body: text.length > 80 ? text.substring(0, 80) + '...' : text,
                icon: '/favicon.svg',
                tag: 'team-chat', // Replaces previous chat notification
                silent: true, // We play our own sound
            });
        } catch { /* Notification API error */ }
    } else if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

const DEPT_COLORS: Record<string, string> = {
    reception: '#3b82f6',
    housekeeping: '#22c55e',
    maintenance: '#f59e0b',
    management: '#8b5cf6',
};

const TeamChatTab: React.FC<TeamChatTabProps> = ({
    sessionId, userName, department, isVisible, onUnreadChange,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isVisibleRef = useRef(false);
    const lastCountRef = useRef(0);

    // Track visibility
    useEffect(() => {
        isVisibleRef.current = isVisible;
        if (isVisible) onUnreadChange(0);
    }, [isVisible, onUnreadChange]);

    // Subscribe to messages
    useEffect(() => {
        if (!sessionId) return;
        const unsub = subscribeToChatMessages(sessionId, (msgs) => {
            setMessages(msgs);
            if (!isVisibleRef.current && msgs.length > lastCountRef.current) {
                const newCount = msgs.length - lastCountRef.current;
                onUnreadChange(newCount);

                // Play chime + browser notification for each new message from others
                const latestMsg = msgs[msgs.length - 1];
                if (latestMsg && latestMsg.author !== userName) {
                    playChatChime();
                    showChatNotification(latestMsg.author, latestMsg.text);
                }
            }
            lastCountRef.current = msgs.length;
        });
        return unsub;
    }, [sessionId, onUnreadChange, userName]);

    // Auto-scroll
    useEffect(() => {
        if (isVisible && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isVisible]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || !sessionId || isSending) return;
        setIsSending(true);
        setInput('');
        try {
            await sendChatMessage(sessionId, { author: userName, department, text });
        } catch (e) {
            console.error('Failed to send message:', e);
            setInput(text); // restore on failure
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (ts: number) =>
        new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const handleClearChat = async () => {
        await clearChatMessages(sessionId);
        setShowClearConfirm(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Clear confirmation banner */}
            {showClearConfirm && (
                <div style={{
                    padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--surface, rgba(239,68,68,0.08))', borderBottom: '1px solid rgba(239,68,68,0.25)',
                }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>Delete all messages?</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={handleClearChat} style={{
                            padding: '4px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 900,
                            background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer',
                            textTransform: 'uppercase',
                        }}>Delete</button>
                        <button onClick={() => setShowClearConfirm(false)} style={{
                            padding: '4px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: 900,
                            background: 'var(--surface, rgba(200,200,200,0.3))', color: 'var(--text-muted, #94a3b8)',
                            border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                        }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '12px', fontWeight: 700, paddingTop: '50px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
                        No messages yet.<br />Start the conversation!
                    </div>
                )}
                {messages.map(msg => {
                    const isMe = msg.author === userName;
                    const deptColor = DEPT_COLORS[msg.department] || '#94a3b8';
                    return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '82%', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                            {!isMe && (
                                <div style={{ fontSize: '10px', fontWeight: 800, color: deptColor, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: deptColor, display: 'inline-block' }} />
                                    {msg.author}
                                </div>
                            )}
                            <div style={{
                                padding: '10px 16px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                background: isMe ? 'linear-gradient(135deg, #c5a065, #b08d54)' : 'var(--surface, rgba(255,255,255,0.7))',
                                border: isMe ? 'none' : '1px solid var(--border-ui, rgba(197,160,101,0.15))',
                                color: isMe ? 'white' : 'var(--text-main)', fontSize: '13px', lineHeight: '1.5', wordBreak: 'break-word',
                                boxShadow: isMe ? '0 2px 8px rgba(197,160,101,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
                            }}>{msg.text}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted, rgba(148,163,184,0.7))', marginTop: '3px', paddingLeft: isMe ? '0' : '10px', paddingRight: isMe ? '10px' : '0', fontWeight: 600 }}>
                                {formatTime(msg.timestamp)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input bar */}
            <div style={{
                padding: '12px 14px',
                borderTop: '1px solid var(--border-ui, rgba(197, 160, 101, 0.1))',
                display: 'flex', gap: '8px', alignItems: 'center',
                background: 'var(--surface, rgba(197, 160, 101, 0.03))',
            }}>
                {/* Clear chat button */}
                {messages.length > 0 && (
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        title="Clear chat"
                        style={{
                            width: '38px', height: '38px', borderRadius: '12px',
                            background: 'transparent', border: '1px solid var(--border-ui, rgba(197,160,101,0.15))',
                            color: 'var(--text-muted, #94a3b8)', cursor: 'pointer',
                            fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 0.2s',
                        }}
                    >🗑️</button>
                )}
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..."
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
                    disabled={!input.trim() || isSending}
                    style={{
                        width: '38px', height: '38px', borderRadius: '12px',
                        background: input.trim() ? 'linear-gradient(135deg, #c5a065, #b08d54)' : 'var(--surface, rgba(255,255,255,0.3))',
                        color: input.trim() ? 'white' : 'var(--text-muted, rgba(148,163,184,0.5))',
                        border: input.trim() ? 'none' : '1px solid var(--border-ui, rgba(197,160,101,0.15))',
                        cursor: input.trim() ? 'pointer' : 'default',
                        fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', flexShrink: 0,
                    }}
                >↑</button>
            </div>
        </div>
    );
};

export default TeamChatTab;
