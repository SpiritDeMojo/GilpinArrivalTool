import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, sendChatMessage, subscribeToChatMessages } from '../services/firebaseService';

interface ChatBubbleProps {
    sessionId: string;
    userName: string;
    department: string;
}

const DEPT_COLORS: Record<string, string> = {
    reception: '#3b82f6',
    housekeeping: '#22c55e',
    maintenance: '#f59e0b',
    management: '#8b5cf6',
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ sessionId, userName, department }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [unread, setUnread] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isOpenRef = useRef(false);
    const lastCountRef = useRef(0);

    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen) setUnread(0);
    }, [isOpen]);

    useEffect(() => {
        if (!sessionId) return;

        const unsub = subscribeToChatMessages(sessionId, (msgs) => {
            setMessages(msgs);
            // Track unread if chat is closed
            if (!isOpenRef.current && msgs.length > lastCountRef.current) {
                setUnread(prev => prev + (msgs.length - lastCountRef.current));
            }
            lastCountRef.current = msgs.length;
        });

        return unsub;
    }, [sessionId]);

    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || !sessionId) return;
        await sendChatMessage(sessionId, {
            author: userName,
            department,
            text: input.trim()
        });
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            {/* Floating Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="chat-fab no-print"
                style={{
                    position: 'fixed',
                    bottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
                    right: '24px',
                    zIndex: 9999,
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #c5a065, #b08d54)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(197, 160, 101, 0.4)',
                    cursor: 'pointer',
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 6px 30px rgba(197, 160, 101, 0.6)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(197, 160, 101, 0.4)';
                }}
            >
                {isOpen ? '✕' : '💬'}
                {unread > 0 && !isOpen && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: '#ef4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        fontSize: '11px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white'
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="no-print" style={{
                    position: 'fixed',
                    bottom: 'max(90px, calc(env(safe-area-inset-bottom, 0px) + 80px))',
                    right: '16px',
                    zIndex: 9998,
                    width: '380px',
                    maxWidth: 'calc(100vw - 32px)',
                    height: '500px',
                    maxHeight: 'calc(100vh - 140px)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--nav-bg, rgba(253, 250, 243, 0.92))',
                    backdropFilter: 'blur(28px)',
                    WebkitBackdropFilter: 'blur(28px)',
                    border: '1px solid var(--border-ui, rgba(197, 160, 101, 0.3))',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(197, 160, 101, 0.1)',
                    animation: 'chatSlideUp 0.3s ease-out',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '18px 20px',
                        background: 'linear-gradient(135deg, rgba(197, 160, 101, 0.12), rgba(197, 160, 101, 0.04))',
                        borderBottom: '1px solid var(--border-ui, rgba(197, 160, 101, 0.15))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #c5a065, #b08d54)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                boxShadow: '0 4px 12px rgba(197, 160, 101, 0.3)',
                            }}>💬</div>
                            <div>
                                <div style={{ color: 'var(--text-main)', fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Team Chat
                                </div>
                                <div style={{ color: '#c5a065', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                                    {messages.length} messages • {department}
                                </div>
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                        }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online</span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }}>
                        {messages.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                color: 'var(--text-muted, #94a3b8)',
                                fontSize: '12px',
                                fontWeight: 700,
                                paddingTop: '50px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
                                No messages yet.<br />Start the conversation!
                            </div>
                        )}
                        {messages.map(msg => {
                            const isMe = msg.author === userName;
                            const deptColor = DEPT_COLORS[msg.department] || '#94a3b8';

                            return (
                                <div
                                    key={msg.id}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isMe ? 'flex-end' : 'flex-start',
                                        maxWidth: '82%',
                                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    {!isMe && (
                                        <div style={{
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            color: deptColor,
                                            marginBottom: '3px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            paddingLeft: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}>
                                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: deptColor, display: 'inline-block' }} />
                                            {msg.author}
                                        </div>
                                    )}
                                    <div style={{
                                        padding: '10px 16px',
                                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        background: isMe
                                            ? 'linear-gradient(135deg, #c5a065, #b08d54)'
                                            : 'var(--surface, rgba(255, 255, 255, 0.7))',
                                        border: isMe ? 'none' : '1px solid var(--border-ui, rgba(197, 160, 101, 0.15))',
                                        color: isMe ? 'white' : 'var(--text-main)',
                                        fontSize: '13px',
                                        lineHeight: '1.5',
                                        wordBreak: 'break-word',
                                        boxShadow: isMe ? '0 2px 8px rgba(197, 160, 101, 0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
                                    }}>
                                        {msg.text}
                                    </div>
                                    <div style={{
                                        fontSize: '9px',
                                        color: 'var(--text-muted, rgba(148, 163, 184, 0.7))',
                                        marginTop: '3px',
                                        paddingLeft: isMe ? '0' : '10px',
                                        paddingRight: isMe ? '10px' : '0',
                                        fontWeight: 600,
                                    }}>
                                        {formatTime(msg.timestamp)}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '14px 16px',
                        borderTop: '1px solid var(--border-ui, rgba(197, 160, 101, 0.1))',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        background: 'rgba(197, 160, 101, 0.03)',
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            style={{
                                flex: 1,
                                background: 'var(--surface, rgba(255, 255, 255, 0.5))',
                                border: '1px solid var(--border-ui, rgba(197, 160, 101, 0.2))',
                                borderRadius: '14px',
                                padding: '11px 16px',
                                color: 'var(--text-main)',
                                fontSize: '13px',
                                outline: 'none',
                                fontFamily: 'inherit',
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '14px',
                                background: input.trim() ? 'linear-gradient(135deg, #c5a065, #b08d54)' : 'var(--surface, rgba(255, 255, 255, 0.3))',
                                color: input.trim() ? 'white' : 'var(--text-muted, rgba(148, 163, 184, 0.5))',
                                border: input.trim() ? 'none' : '1px solid var(--border-ui, rgba(197, 160, 101, 0.15))',
                                cursor: input.trim() ? 'pointer' : 'default',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                flexShrink: 0,
                                boxShadow: input.trim() ? '0 4px 12px rgba(197, 160, 101, 0.3)' : 'none',
                            }}
                        >
                            ↑
                        </button>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
        </>
    );
};

export default ChatBubble;
