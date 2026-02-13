import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Transcription } from '../hooks/useLiveAssistant';
import { motion, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════
   AIAssistantTab — Messenger-style Gemini Live panel
   ═══════════════════════════════════════════════════════════
   • Matching Messenger bubble style with AI purple gradient
   • Status bar with live indicators
   • Smooth spring-animated message entries
   • Auto-connect on tab visibility
   • Inline text + voice input
   ═══════════════════════════════════════════════════════════ */

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
    const [isListening, setIsListening] = useState(false);
    const [micError, setMicError] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasAutoStarted = useRef(false);
    const recognitionRef = useRef<any>(null);

    /* ─── Speech Recognition setup ─── */
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-GB';

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            setInput(prev => {
                // If final result, append with space
                if (event.results[event.results.length - 1].isFinal) {
                    return (prev ? prev + ' ' : '') + transcript.trim();
                }
                return transcript;
            });
        };

        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            setIsListening(false);
            if (event.error === 'not-allowed') {
                setMicError('🎙️ Mic access denied — allow in browser settings');
            } else if (event.error === 'no-speech') {
                // Normal — user didn't speak, just ignore
            } else {
                setMicError(`🎙️ Mic unavailable (${event.error})`);
            }
            if (micError) {
                setTimeout(() => setMicError(''), 4000);
            }
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.abort();
        };
    }, []);

    // Auto-dismiss mic error
    useEffect(() => {
        if (micError) {
            const timer = setTimeout(() => setMicError(''), 4000);
            return () => clearTimeout(timer);
        }
    }, [micError]);

    const toggleListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setMicError('🎙️ Voice input not supported in this browser');
            return;
        }
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setMicError('');
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                // Already started
            }
        }
    }, [isListening]);

    /* ─── Auto-start session on visibility ─── */
    useEffect(() => {
        if (isVisible && !isLiveActive && !hasAutoStarted.current) {
            hasAutoStarted.current = true;
            const timer = setTimeout(() => onStart(), 300);
            return () => clearTimeout(timer);
        }
        if (!isVisible) hasAutoStarted.current = false;
    }, [isVisible, isLiveActive, onStart]);

    /* ─── Auto-scroll ─── */
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
            {/* ─── Status Bar ─── */}
            <div style={{
                padding: '10px 14px', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--surface, rgba(120,120,128,0.04))',
                borderBottom: '0.5px solid var(--border-ui, rgba(197,160,101,0.1))',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Status dot */}
                    <motion.div
                        animate={isLiveActive ? {
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.7, 1],
                        } : { scale: 1, opacity: [1, 0.4, 1] }}
                        transition={{ duration: isLiveActive ? 2.5 : 1.5, repeat: Infinity }}
                        style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: isLiveActive
                                ? (isMicEnabled ? '#ff3b30' : '#34c759')
                                : '#ff9500',
                            boxShadow: isLiveActive
                                ? `0 0 8px ${isMicEnabled ? 'rgba(255,59,48,0.5)' : 'rgba(52,199,89,0.5)'}`
                                : '0 0 6px rgba(255,149,0,0.4)',
                        }}
                    />
                    <span style={{
                        fontSize: '12px', fontWeight: 600,
                        color: isLiveActive
                            ? (isMicEnabled ? '#ff3b30' : '#34c759')
                            : '#ff9500',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                    }}>
                        {isLiveActive ? (isMicEnabled ? 'Listening' : 'Live') : 'Connecting…'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {isLiveActive && (
                        <>
                            {hasMic && (
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onToggleMic}
                                    style={{
                                        padding: '5px 12px', borderRadius: '14px',
                                        fontSize: '11px', fontWeight: 600,
                                        cursor: 'pointer', border: 'none',
                                        background: isMicEnabled
                                            ? '#ff3b30'
                                            : 'var(--surface, rgba(120,120,128,0.12))',
                                        color: isMicEnabled
                                            ? 'white'
                                            : 'var(--text-muted, #8e8e93)',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                                    }}
                                >🎙️ {isMicEnabled ? 'Mic On' : 'Mic Off'}</motion.button>
                            )}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={onDisconnect}
                                style={{
                                    padding: '5px 12px', borderRadius: '14px',
                                    fontSize: '11px', fontWeight: 600,
                                    cursor: 'pointer', border: 'none',
                                    background: 'var(--surface, rgba(255,59,48,0.1))',
                                    color: '#ff3b30',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                                }}
                            >⏹ Stop</motion.button>
                        </>
                    )}
                    {transcriptions.length > 0 && !isLiveActive && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={onClearHistory}
                            style={{
                                padding: '5px 12px', borderRadius: '14px',
                                fontSize: '11px', fontWeight: 600,
                                cursor: 'pointer', border: 'none',
                                background: 'var(--surface, rgba(120,120,128,0.12))',
                                color: 'var(--text-muted, #8e8e93)',
                                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                            }}
                        >Clear</motion.button>
                    )}
                </div>
            </div>

            {/* ─── Mic Error Banner ─── */}
            <AnimatePresence>
                {micError && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setMicError('')}
                        style={{
                            overflow: 'hidden', cursor: 'pointer',
                            padding: '8px 14px',
                            background: 'rgba(255,59,48,0.08)',
                            borderBottom: '0.5px solid rgba(255,59,48,0.15)',
                            fontSize: '12px', fontWeight: 500,
                            color: '#ff3b30', textAlign: 'center',
                        }}
                    >
                        {micError}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Error banner ─── */}
            <AnimatePresence>
                {errorMessage && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{
                            overflow: 'hidden',
                            background: 'var(--surface, rgba(255,59,48,0.06))',
                            borderBottom: '0.5px solid rgba(255,59,48,0.2)',
                        }}
                    >
                        <div style={{
                            padding: '10px 14px', fontSize: '12px', fontWeight: 600,
                            color: '#ff3b30', display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <span>⚠️</span>
                            <span style={{ flex: 1 }}>{errorMessage}</span>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={onStart}
                                style={{
                                    padding: '4px 12px', borderRadius: '12px',
                                    fontSize: '11px', fontWeight: 600,
                                    background: '#5856d6', color: 'white',
                                    border: 'none', cursor: 'pointer',
                                }}
                            >Retry</motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Messages ─── */}
            <div ref={scrollRef} style={{
                flex: 1, overflowY: 'auto', padding: '14px',
                display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
                {transcriptions.length === 0 && !interimInput && !interimOutput && (
                    <div style={{
                        textAlign: 'center', paddingTop: '40px',
                        color: 'var(--text-muted, #8e8e93)',
                    }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '32px',
                            background: 'linear-gradient(135deg, #5856d6, #af52de)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px', fontSize: '28px',
                            boxShadow: '0 4px 16px rgba(88,86,214,0.3)',
                        }}>🤖</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main, #1c1c1e)' }}>
                            {isLiveActive ? 'Assistant Ready' : 'Connecting…'}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 400, opacity: 0.7, lineHeight: 1.5 }}>
                            Speak or type a command
                        </div>
                        <div style={{
                            fontSize: '11px', marginTop: '16px',
                            color: 'var(--text-muted, #8e8e93)',
                            lineHeight: 1.7, fontWeight: 400,
                        }}>
                            Try: "Morning briefing" · "What room is [Guest]?"<br />
                            "Mark Room 5 cleaned" · "Note for Room 3"
                        </div>
                    </div>
                )}

                {transcriptions.map((t, i) => {
                    const isUser = t.role === 'user';
                    return (
                        <motion.div
                            key={i}
                            initial={isUser
                                ? { scale: 0.85, opacity: 0, x: 20 }
                                : { scale: 0.85, opacity: 0, x: -20 }
                            }
                            animate={{ scale: 1, opacity: 1, x: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                            style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: isUser ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                alignSelf: isUser ? 'flex-end' : 'flex-start',
                            }}
                        >
                            <div style={{
                                padding: '10px 14px',
                                fontSize: '13px', lineHeight: 1.55, fontWeight: 450,
                                wordBreak: 'break-word',
                                borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                background: isUser
                                    ? 'linear-gradient(135deg, #5856d6, #4f46e5)'
                                    : 'var(--surface, rgba(229,229,234,0.6))',
                                color: isUser ? 'white' : 'var(--text-main, #1c1c1e)',
                                boxShadow: isUser
                                    ? '0 1px 4px rgba(88,86,214,0.25)'
                                    : '0 0.5px 1px rgba(0,0,0,0.04)',
                            }}>{t.text}</div>
                        </motion.div>
                    );
                })}

                {/* Interim input (live transcription) */}
                <AnimatePresence>
                    {interimInput && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 0.6, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            style={{
                                alignSelf: 'flex-end', maxWidth: '85%',
                            }}
                        >
                            <div style={{
                                padding: '10px 14px', fontSize: '13px', lineHeight: 1.55,
                                fontStyle: 'italic',
                                borderRadius: '18px 18px 4px 18px',
                                background: 'rgba(88,86,214,0.25)',
                                color: 'white',
                            }}>{interimInput}…</div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Interim output (AI typing) */}
                <AnimatePresence>
                    {interimOutput && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 0.6, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            style={{ alignSelf: 'flex-start', maxWidth: '85%' }}
                        >
                            <div style={{
                                padding: '10px 14px', fontSize: '13px', lineHeight: 1.55,
                                fontStyle: 'italic',
                                borderRadius: '18px 18px 18px 4px',
                                background: 'var(--surface, rgba(229,229,234,0.4))',
                                color: 'var(--text-muted, #8e8e93)',
                            }}>
                                {interimOutput}…
                                {/* Animated cursor */}
                                <motion.span
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    style={{ display: 'inline-block', width: '2px', height: '14px', background: '#8e8e93', marginLeft: '2px', verticalAlign: 'text-bottom' }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ═══ INPUT BAR ═══ */}
            <div style={{
                padding: '8px 12px calc(env(safe-area-inset-bottom, 0px) + 8px)',
                borderTop: '0.5px solid var(--border-ui, rgba(197,160,101,0.1))',
                display: 'flex', gap: '8px', alignItems: 'flex-end',
                background: 'var(--surface, rgba(249,249,249,0.94))',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                opacity: isLiveActive ? 1 : 0.4,
                pointerEvents: isLiveActive ? 'auto' : 'none',
                transition: 'opacity 0.3s ease',
            }}>
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
                        id="ai-assistant-input"
                        name="aiCommand"
                        autoComplete="off"
                        aria-label="AI assistant command"
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={isLiveActive ? 'Type a command…' : 'Connecting…'}
                        disabled={!isLiveActive}
                        style={{
                            flex: 1, border: 'none', background: 'transparent',
                            outline: 'none', fontSize: '14px', fontFamily: 'inherit',
                            color: 'var(--text-main, #1c1c1e)',
                            padding: '8px 0',
                        }}
                    />
                    <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={handleSend}
                        disabled={!isLiveActive || !input.trim()}
                        animate={{
                            scale: input.trim() ? 1 : 0,
                            opacity: input.trim() ? 1 : 0,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        style={{
                            width: '30px', height: '30px', borderRadius: '15px',
                            background: 'linear-gradient(135deg, #5856d6, #4f46e5)',
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
                    {/* Microphone button — shows when input is empty */}
                    {!input.trim() && isLiveActive && (
                        <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={toggleListening}
                            animate={isListening ? {
                                scale: [1, 1.1, 1],
                                transition: { duration: 1.5, repeat: Infinity },
                            } : { scale: 1 }}
                            style={{
                                width: '30px', height: '30px', borderRadius: '15px',
                                background: isListening
                                    ? '#ff3b30'
                                    : 'var(--surface, rgba(120,120,128,0.12))',
                                color: isListening ? 'white' : 'var(--text-muted, #8e8e93)',
                                border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: isListening ? '0 0 12px rgba(255,59,48,0.4)' : 'none',
                                transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                            }}
                            aria-label={isListening ? 'Stop listening' : 'Voice input'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAssistantTab;
