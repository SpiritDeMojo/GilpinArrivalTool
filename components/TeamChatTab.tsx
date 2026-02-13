import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppNotification } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChatMessage,
    sendChatMessage,
    subscribeToChatMessages,
    clearChatMessages,
    setTypingIndicator,
    subscribeToTyping,
    addReaction,
} from '../services/firebaseService';

/* ═══════════════════════════════════════════════════════════
   TeamChatTab — Messenger-style team chat
   ═══════════════════════════════════════════════════════════
   • Chat bubbles with SVG tails
   • Message grouping (consecutive same-sender merges)
   • Timestamp grouping (“Today 10:32 AM”)
   • Typing indicator (“Sarah is typing…”)
   • Long-press emoji reactions (👍 ❤️ 😂 😮 🙏)
   • Smooth spring animations
   • Browser + push notifications + chime
   ═══════════════════════════════════════════════════════════ */

interface TeamChatTabProps {
    sessionId: string;
    userName: string;
    department: string;
    isVisible: boolean;
    onUnreadChange: (count: number) => void;
    onPushNotification?: (notif: Omit<AppNotification, 'id' | 'timestamp'>) => void;
    externalMessages?: ChatMessage[];
}

/* ─── Constants ─── */
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🙏'];
const DEPT_COLORS: Record<string, string> = {
    frontofhouse: '#007aff',
    housekeeping: '#34c759',
    maintenance: '#ff9500',
    management: '#af52de',
};

/* ─── Audio: dual-tone ascending chime ─── */
async function playChatChime() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') await ctx.resume();
        const osc1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(660, ctx.currentTime);
        g1.gain.setValueAtTime(0.10, ctx.currentTime);
        g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc1.connect(g1).connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.18);

        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        g2.gain.setValueAtTime(0, ctx.currentTime);
        g2.gain.setValueAtTime(0.10, ctx.currentTime + 0.1);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.30);
        osc2.connect(g2).connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.1);
        osc2.stop(ctx.currentTime + 0.30);
    } catch { /* Audio API not available */ }
}

/* ─── Browser notification ─── */
function showChatNotification(author: string, text: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(`💬 ${author}`, {
                body: text.length > 80 ? text.substring(0, 80) + '…' : text,
                icon: '/gilpin-logo.png',
                tag: 'team-chat',
                silent: true,
            });
        } catch { /* noop */ }
    } else if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

/* ─── Message grouping helpers ─── */
function formatTimeLabel(ts: number) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today ${time}`;
    if (isYesterday) return `Yesterday ${time}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

function shouldShowTimestamp(msgs: ChatMessage[], idx: number): boolean {
    if (idx === 0) return true;
    return (msgs[idx].timestamp - msgs[idx - 1].timestamp) > 5 * 60 * 1000; // 5 min gap
}

function isGrouped(msgs: ChatMessage[], idx: number): { isFirst: boolean; isLast: boolean } {
    const cur = msgs[idx];
    const prev = idx > 0 ? msgs[idx - 1] : null;
    const next = idx < msgs.length - 1 ? msgs[idx + 1] : null;
    const isFirst = !prev || prev.author !== cur.author || (cur.timestamp - prev.timestamp) > 60000;
    const isLast = !next || next.author !== cur.author || (next.timestamp - cur.timestamp) > 60000;
    return { isFirst, isLast };
}

/* ─── iOS Bubble Tail SVG ─── */
const BubbleTail = ({ isMe, color }: { isMe: boolean; color: string }) => (
    <svg
        width="12" height="18"
        viewBox="0 0 12 18"
        style={{
            position: 'absolute',
            bottom: 0,
            ...(isMe ? { right: -6 } : { left: -6 }),
            transform: isMe ? 'none' : 'scaleX(-1)',
        }}
    >
        <path
            d="M0 18 C0 18 0 0 0 0 C4 4 12 12 12 18 Z"
            fill={color}
        />
    </svg>
);

/* ─── Typing Indicator ─── */
const TypingBubble = ({ names }: { names: string[] }) => {
    if (names.length === 0) return null;
    const label = names.length === 1
        ? `${names[0]} is typing`
        : `${names.slice(0, 2).join(', ')} are typing`;
    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                alignSelf: 'flex-start', padding: '6px 14px 6px 12px',
                background: 'var(--surface, rgba(229,229,234,0.6))',
                borderRadius: '18px',
                maxWidth: '200px',
            }}
        >
            {/* Animated dots */}
            <div style={{ display: 'flex', gap: '3px' }}>
                {[0, 1, 2].map(i => (
                    <motion.div
                        key={i}
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.18,
                            ease: 'easeInOut',
                        }}
                        style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: 'var(--text-muted, #8e8e93)',
                        }}
                    />
                ))}
            </div>
            <span style={{
                fontSize: '11px', color: 'var(--text-muted, #8e8e93)',
                fontWeight: 500, fontStyle: 'italic',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{label}</span>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

const TeamChatTab: React.FC<TeamChatTabProps> = ({
    sessionId, userName, department, isVisible, onUnreadChange, onPushNotification,
    externalMessages,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isVisibleRef = useRef(false);
    const lastCountRef = useRef(0);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* ─── Track visibility ─── */
    useEffect(() => {
        isVisibleRef.current = isVisible;
        if (isVisible) onUnreadChange(0);
    }, [isVisible, onUnreadChange]);

    /* ─── Request notification permission ─── */
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    /* ─── Cleanup typing timer on unmount ─── */
    useEffect(() => {
        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        };
    }, []);

    /* ─── Subscribe to messages (use external if provided, else internal sub) ─── */
    useEffect(() => {
        if (externalMessages) {
            // Parent provides messages — no internal subscription needed
            setMessages(externalMessages);
            // Track unread count changes + trigger notifications
            if (!isVisibleRef.current && externalMessages.length > lastCountRef.current) {
                const newCount = externalMessages.length - lastCountRef.current;
                onUnreadChange(newCount);
                // Notify for the latest message (same as internal subscription path)
                const latest = externalMessages[externalMessages.length - 1];
                if (latest && latest.author !== userName) {
                    playChatChime();
                    showChatNotification(latest.author, latest.text);
                    if (onPushNotification) {
                        onPushNotification({
                            type: 'chat_message',
                            department: 'frontofhouse',
                            room: '',
                            guestName: latest.author,
                            message: latest.text.length > 60 ? latest.text.substring(0, 60) + '…' : latest.text,
                            emoji: '💬',
                            color: DEPT_COLORS[latest.department] || '#c5a065',
                            badgeTabs: [],
                        });
                    }
                }
            }
            lastCountRef.current = externalMessages.length;
            return;
        }
        // Fallback: internal Firebase subscription
        if (!sessionId) return;
        const unsub = subscribeToChatMessages(sessionId, (msgs) => {
            setMessages(msgs);
            if (!isVisibleRef.current && msgs.length > lastCountRef.current) {
                const newCount = msgs.length - lastCountRef.current;
                onUnreadChange(newCount);
                const latest = msgs[msgs.length - 1];
                if (latest && latest.author !== userName) {
                    playChatChime();
                    showChatNotification(latest.author, latest.text);
                    if (onPushNotification) {
                        onPushNotification({
                            type: 'chat_message',
                            department: 'frontofhouse',
                            room: '',
                            guestName: latest.author,
                            message: latest.text.length > 60 ? latest.text.substring(0, 60) + '…' : latest.text,
                            emoji: '💬',
                            color: DEPT_COLORS[latest.department] || '#c5a065',
                            badgeTabs: [],
                        });
                    }
                }
            }
            lastCountRef.current = msgs.length;
        });
        return unsub;
    }, [externalMessages, sessionId, onUnreadChange, userName]);

    /* ─── Subscribe to typing indicators ─── */
    useEffect(() => {
        if (!sessionId) return;
        const unsub = subscribeToTyping(sessionId, userName, setTypingUsers);
        return unsub;
    }, [sessionId, userName]);

    /* ─── Auto-scroll ─── */
    useEffect(() => {
        if (isVisible && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isVisible, typingUsers]);

    /* ─── Typing indicator debounce ─── */
    const handleInputChange = useCallback((val: string) => {
        setInput(val);
        if (!sessionId) return;
        if (val.trim()) {
            setTypingIndicator(sessionId, userName, true);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
                setTypingIndicator(sessionId, userName, false);
            }, 3000);
        } else {
            setTypingIndicator(sessionId, userName, false);
        }
    }, [sessionId, userName]);

    /* ─── Send message ─── */
    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || !sessionId || isSending) return;
        setIsSending(true);
        setInput('');
        setTypingIndicator(sessionId, userName, false);
        try {
            await sendChatMessage(sessionId, { author: userName, department, text });
        } catch {
            setInput(text);
        } finally {
            setIsSending(false);
        }
    }, [input, sessionId, isSending, userName, department]);

    /* ─── Clear chat ─── */
    const handleClearChat = useCallback(async () => {
        await clearChatMessages(sessionId);
        setShowClearConfirm(false);
    }, [sessionId]);

    /* ─── Long-press for reactions ─── */
    const handleLongPressStart = useCallback((msgId: string) => {
        longPressTimerRef.current = setTimeout(() => {
            setReactionMsgId(msgId);
        }, 400);
    }, []);

    const handleLongPressEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    /* ─── Add reaction ─── */
    const handleReaction = useCallback(async (msgId: string, emoji: string) => {
        if (!sessionId) return;
        // Toggle: if same emoji already set, remove it
        const msg = messages.find(m => m.id === msgId);
        const key = userName.replace(/[.#$/[\]]/g, '_');
        const existing = msg?.reactions?.[key];
        await addReaction(sessionId, msgId, userName, existing === emoji ? null : emoji);
        setReactionMsgId(null);
    }, [sessionId, userName, messages]);

    /* ─── Format time ─── */
    const formatTime = (ts: number) =>
        new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Clear confirmation banner */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            padding: '10px 16px', display: 'flex',
                            alignItems: 'center', justifyContent: 'space-between',
                            background: 'var(--surface, rgba(255,59,48,0.06))',
                            borderBottom: '0.5px solid rgba(255,59,48,0.2)',
                        }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ff3b30' }}>
                                Delete all messages?
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={handleClearChat} style={{
                                    padding: '5px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 600,
                                    background: '#ff3b30', color: 'white', border: 'none', cursor: 'pointer',
                                }}>Delete</button>
                                <button onClick={() => setShowClearConfirm(false)} style={{
                                    padding: '5px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 600,
                                    background: 'var(--surface, rgba(120,120,128,0.12))',
                                    color: 'var(--text-muted, #8e8e93)', border: 'none', cursor: 'pointer',
                                }}>Cancel</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Messages ─── */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1, overflowY: 'auto', padding: '10px 14px',
                    display: 'flex', flexDirection: 'column', gap: '2px',
                }}
            >
                {messages.length === 0 && (
                    <div style={{
                        textAlign: 'center', paddingTop: '60px',
                        color: 'var(--text-muted, #8e8e93)',
                    }}>
                        <div style={{
                            fontSize: '48px', marginBottom: '12px',
                            filter: 'grayscale(0.3)',
                        }}>💬</div>
                        <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                            No Messages Yet
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 400, opacity: 0.7 }}>
                            Start a conversation with your team
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isMe = msg.author === userName;
                    const deptColor = DEPT_COLORS[msg.department] || '#8e8e93';
                    const showTs = shouldShowTimestamp(messages, idx);
                    const { isFirst, isLast } = isGrouped(messages, idx);
                    const userKey = userName.replace(/[.#$/[\]]/g, '_');
                    const reactions = msg.reactions ? Object.entries(msg.reactions) : [];
                    const showReactionBar = reactionMsgId === msg.id;

                    // Dynamic border-radius for grouped messages (Messenger-style)
                    let borderRadius: string;
                    if (isMe) {
                        borderRadius = `${isFirst ? 20 : 6}px ${isFirst ? 20 : 20}px ${isLast ? 4 : 20}px ${isFirst ? 20 : 6}px`;
                    } else {
                        borderRadius = `${isFirst ? 20 : 20}px ${isFirst ? 20 : 6}px ${isLast ? 6 : 6}px ${isLast ? 4 : 20}px`;
                    }

                    return (
                        <React.Fragment key={msg.id}>
                            {/* Timestamp divider */}
                            {showTs && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: idx === 0 ? '4px 0 8px' : '14px 0 8px',
                                    fontSize: '11px', fontWeight: 500,
                                    color: 'var(--text-muted, #8e8e93)',
                                    letterSpacing: '0.01em',
                                }}>
                                    {formatTimeLabel(msg.timestamp)}
                                </div>
                            )}

                            <motion.div
                                initial={isMe
                                    ? { scale: 0.85, opacity: 0, x: 20 }
                                    : { scale: 0.85, opacity: 0, x: -20 }
                                }
                                animate={{ scale: 1, opacity: 1, x: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: isMe ? 'flex-end' : 'flex-start',
                                    maxWidth: '78%',
                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                    marginTop: isFirst && !showTs ? '8px' : '1px',
                                    position: 'relative',
                                }}
                                onMouseDown={() => handleLongPressStart(msg.id)}
                                onMouseUp={handleLongPressEnd}
                                onMouseLeave={handleLongPressEnd}
                                onTouchStart={() => handleLongPressStart(msg.id)}
                                onTouchEnd={handleLongPressEnd}
                            >
                                {/* Author name — only on first in group, only for others */}
                                {!isMe && isFirst && (
                                    <div style={{
                                        fontSize: '11px', fontWeight: 600,
                                        color: deptColor,
                                        marginBottom: '2px', paddingLeft: '14px',
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                    }}>
                                        <span style={{
                                            width: '5px', height: '5px', borderRadius: '50%',
                                            background: deptColor, display: 'inline-block',
                                        }} />
                                        {msg.author}
                                    </div>
                                )}

                                {/* Message bubble */}
                                <div style={{
                                    position: 'relative',
                                    padding: '8px 14px',
                                    borderRadius,
                                    background: isMe
                                        ? 'linear-gradient(135deg, #c5a065, #b08d54)'
                                        : 'var(--surface, rgba(229,229,234,0.6))',
                                    color: isMe ? 'white' : 'var(--text-main, #1c1c1e)',
                                    fontSize: '14px', lineHeight: '1.45',
                                    wordBreak: 'break-word',
                                    boxShadow: isMe
                                        ? '0 1px 3px rgba(197,160,101,0.2)'
                                        : '0 0.5px 1px rgba(0,0,0,0.04)',
                                    cursor: 'default',
                                    userSelect: 'text',
                                }}>
                                    {msg.text}
                                    {/* Tail on last bubble in group */}
                                    {isLast && <BubbleTail isMe={isMe} color={isMe ? '#b08d54' : 'var(--surface-tail, #e5e5ea)'} />}
                                </div>

                                {/* Reactions display */}
                                {reactions.length > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        style={{
                                            display: 'flex', gap: '2px',
                                            marginTop: '-4px',
                                            padding: '2px 6px',
                                            background: 'var(--surface, rgba(255,255,255,0.9))',
                                            borderRadius: '10px',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                            fontSize: '13px',
                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                            zIndex: 2,
                                        }}
                                    >
                                        {reactions.map(([, emoji], ri) => (
                                            <span key={ri}>{emoji}</span>
                                        ))}
                                    </motion.div>
                                )}

                                {/* Reaction picker (long-press) */}
                                <AnimatePresence>
                                    {showReactionBar && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.8 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                            style={{
                                                position: 'absolute',
                                                bottom: '100%',
                                                [isMe ? 'right' : 'left']: 0,
                                                marginBottom: '6px',
                                                background: 'var(--surface, rgba(255,255,255,0.97))',
                                                backdropFilter: 'blur(20px)',
                                                WebkitBackdropFilter: 'blur(20px)',
                                                borderRadius: '22px',
                                                padding: '6px 8px',
                                                display: 'flex', gap: '4px',
                                                boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.05)',
                                                zIndex: 100,
                                            }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {REACTION_EMOJIS.map(emoji => {
                                                const isSelected = msg.reactions?.[userKey] === emoji;
                                                return (
                                                    <motion.button
                                                        key={emoji}
                                                        whileHover={{ scale: 1.3 }}
                                                        whileTap={{ scale: 0.85 }}
                                                        onClick={() => handleReaction(msg.id, emoji)}
                                                        style={{
                                                            width: '36px', height: '36px',
                                                            borderRadius: '50%',
                                                            border: 'none',
                                                            background: isSelected
                                                                ? 'rgba(197,160,101,0.15)'
                                                                : 'transparent',
                                                            cursor: 'pointer',
                                                            fontSize: '20px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'background 0.15s',
                                                        }}
                                                    >{emoji}</motion.button>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Time on last in group */}
                                {isLast && (
                                    <div style={{
                                        fontSize: '10px',
                                        color: 'var(--text-muted, rgba(142,142,147,0.7))',
                                        marginTop: '2px',
                                        paddingLeft: isMe ? '0' : '14px',
                                        paddingRight: isMe ? '14px' : '0',
                                        fontWeight: 500,
                                    }}>
                                        {formatTime(msg.timestamp)}
                                    </div>
                                )}
                            </motion.div>
                        </React.Fragment>
                    );
                })}

                {/* Typing indicator */}
                <AnimatePresence>
                    {typingUsers.length > 0 && (
                        <TypingBubble names={typingUsers} />
                    )}
                </AnimatePresence>
            </div>

            {/* ═══ INPUT BAR — iOS-style ═══ */}
            <div style={{
                padding: '8px 12px calc(env(safe-area-inset-bottom, 0px) + 8px)',
                borderTop: '0.5px solid var(--border-ui, rgba(197,160,101,0.1))',
                display: 'flex', gap: '8px', alignItems: 'flex-end',
                background: 'var(--surface, rgba(249,249,249,0.94))',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '20px 20px 0 0',
            }}>
                {/* Clear chat */}
                {messages.length > 0 && (
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setShowClearConfirm(true)}
                        title="Clear chat"
                        style={{
                            width: '34px', height: '34px', borderRadius: '17px',
                            background: 'transparent',
                            border: '1px solid var(--border-ui, rgba(197,160,101,0.15))',
                            color: 'var(--text-muted, #8e8e93)',
                            cursor: 'pointer', fontSize: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >🗑️</motion.button>
                )}

                {/* Text input */}
                <div style={{
                    flex: 1,
                    background: 'var(--surface, rgba(255,255,255,0.8))',
                    border: '1px solid var(--border-ui, rgba(197,160,101,0.18))',
                    borderRadius: '20px',
                    display: 'flex', alignItems: 'center',
                    padding: '0 4px 0 14px',
                    minHeight: '36px',
                }}>
                    <input
                        id="team-chat-input"
                        name="chatMessage"
                        autoComplete="off"
                        aria-label="Chat message"
                        type="text"
                        value={input}
                        onChange={e => handleInputChange(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Message..."
                        style={{
                            flex: 1, border: 'none', background: 'transparent',
                            outline: 'none', fontSize: '14px', fontFamily: 'inherit',
                            color: 'var(--text-main, #1c1c1e)',
                            padding: '8px 0',
                        }}
                    />
                    {/* Send button — visible only when input has text */}
                    <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        animate={{
                            scale: input.trim() ? 1 : 0,
                            opacity: input.trim() ? 1 : 0,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        style={{
                            width: '30px', height: '30px', borderRadius: '15px',
                            background: 'linear-gradient(135deg, #c5a065, #b08d54)',
                            color: 'white', border: 'none',
                            cursor: input.trim() ? 'pointer' : 'default',
                            fontSize: '14px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                        </svg>
                    </motion.button>
                </div>
            </div>

            {/* Close reaction picker on tap elsewhere */}
            {reactionMsgId && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99,
                        background: 'transparent',
                    }}
                    onClick={() => setReactionMsgId(null)}
                />
            )}

            {/* ─── Dark mode variable for tail ─── */}
            <style>{`
                :root { --surface-tail: #e5e5ea; }
                [data-theme="dark"] { --surface-tail: #1c1c1e; }
            `}</style>
        </div>
    );
};

export default TeamChatTab;
