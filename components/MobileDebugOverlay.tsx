import React, { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
    ts: number;
    level: 'log' | 'warn' | 'error' | 'info';
    msg: string;
}

const MAX_LOGS = 50;

/**
 * MobileDebugOverlay — on-screen console for mobile debugging.
 * Activated via ?debug=1 in the URL, or by long-pressing the connection dot.
 * Shows intercepted console.warn/error/info messages in a floating panel.
 */
const MobileDebugOverlay: React.FC<{ connectionStatus: string }> = ({ connectionStatus }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const installedRef = useRef(false);

    // Check URL param on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === '1') {
            setIsVisible(true);
        }
    }, []);

    // Intercept console methods
    useEffect(() => {
        if (installedRef.current) return;
        installedRef.current = true;

        const origWarn = console.warn;
        const origError = console.error;
        const origInfo = console.info;
        const origLog = console.log;

        const addLog = (level: LogEntry['level'], args: unknown[]) => {
            const msg = args.map(a => {
                if (typeof a === 'string') return a;
                try { return JSON.stringify(a); } catch { return String(a); }
            }).join(' ');
            setLogs(prev => [...prev.slice(-(MAX_LOGS - 1)), { ts: Date.now(), level, msg }]);
        };

        console.warn = (...args: unknown[]) => { origWarn.apply(console, args); addLog('warn', args); };
        console.error = (...args: unknown[]) => { origError.apply(console, args); addLog('error', args); };
        console.info = (...args: unknown[]) => { origInfo.apply(console, args); addLog('info', args); };
        console.log = (...args: unknown[]) => { origLog.apply(console, args); addLog('log', args); };

        return () => {
            console.warn = origWarn;
            console.error = origError;
            console.info = origInfo;
            console.log = origLog;
        };
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current && !isMinimized) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isMinimized]);

    // Toggle from outside (long-press on connection dot)
    const toggle = useCallback(() => setIsVisible(v => !v), []);

    // Expose toggle globally so connection dot can call it
    useEffect(() => {
        (window as unknown as Record<string, unknown>).__toggleDebug = toggle;
        return () => { delete (window as unknown as Record<string, unknown>).__toggleDebug; };
    }, [toggle]);

    if (!isVisible) return null;

    const statusColor = connectionStatus === 'connected' ? '#22c55e'
        : connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444';

    return (
        <div
            style={{
                position: 'fixed',
                bottom: isMinimized ? 8 : 80,
                left: 8,
                right: 8,
                maxHeight: isMinimized ? 36 : '50vh',
                zIndex: 99999,
                background: 'rgba(0,0,0,0.92)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
                fontFamily: 'monospace',
                fontSize: 10,
                color: '#e2e8f0',
                overflow: 'hidden',
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* Header bar */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderBottom: isMinimized ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                }}
                onClick={() => setIsMinimized(m => !m)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block',
                        boxShadow: `0 0 6px ${statusColor}`,
                    }} />
                    <span style={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                        Debug {connectionStatus}
                    </span>
                    <span style={{ color: '#94a3b8' }}>({logs.length})</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setLogs([]); }}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#f87171', padding: '2px 8px', borderRadius: 6, fontSize: 9, cursor: 'pointer' }}
                    >
                        Clear
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', padding: '2px 8px', borderRadius: 6, fontSize: 9, cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Log entries */}
            {!isMinimized && (
                <div ref={scrollRef} style={{ overflowY: 'auto', maxHeight: 'calc(50vh - 36px)', padding: '4px 8px' }}>
                    {logs.length === 0 && (
                        <div style={{ color: '#64748b', padding: 8, textAlign: 'center' }}>No logs yet</div>
                    )}
                    {logs.map((entry, i) => {
                        const timeStr = new Date(entry.ts).toLocaleTimeString('en-GB', { hour12: false });
                        const color = entry.level === 'error' ? '#f87171'
                            : entry.level === 'warn' ? '#fbbf24'
                                : entry.level === 'info' ? '#60a5fa' : '#94a3b8';
                        return (
                            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '3px 0', wordBreak: 'break-all' }}>
                                <span style={{ color: '#64748b', marginRight: 4 }}>{timeStr}</span>
                                <span style={{ color, fontWeight: entry.level === 'error' ? 700 : 400 }}>
                                    {entry.msg.length > 200 ? entry.msg.slice(0, 200) + '…' : entry.msg}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MobileDebugOverlay;
