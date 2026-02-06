import React, { useState, useEffect, useRef } from 'react';
import { subscribeToSessionList, SessionSummary, isFirebaseEnabled, initializeFirebase, fetchSession } from '../services/firebaseService';
import { ArrivalSession } from '../types';

interface SessionBrowserProps {
    onJoinSession: (session: ArrivalSession) => void;
    onCreateNew: () => void;
    onUploadPDF: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SessionBrowser: React.FC<SessionBrowserProps> = ({ onJoinSession, onCreateNew, onUploadPDF }) => {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState<string | null>(null);
    const unsubRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        // Initialize Firebase if not already
        if (!isFirebaseEnabled()) {
            initializeFirebase();
        }

        // Subscribe to session list
        unsubRef.current = subscribeToSessionList((list) => {
            setSessions(list);
            setLoading(false);
        });

        return () => {
            if (unsubRef.current) unsubRef.current();
        };
    }, []);

    const handleJoin = (sessionId: string) => {
        setJoining(sessionId);
        fetchSession(sessionId, (session) => {
            if (session) {
                onJoinSession(session);
            } else {
                setJoining(null);
                alert('Could not load session. It may have been deleted.');
            }
        });
    };

    const formatTime = (timestamp: number) => {
        if (!timestamp) return 'Unknown';
        const d = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const formatDate = (dateObj?: string) => {
        if (!dateObj) return '';
        try {
            return new Date(dateObj).toLocaleDateString('en-GB', {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
            });
        } catch { return ''; }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: 'Inter, sans-serif'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{
                    fontFamily: 'Playfair Display, serif',
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    marginBottom: '8px'
                }}>
                    Gilpin Intelligence Hub
                </h1>
                <p style={{
                    color: 'var(--text-muted)',
                    fontSize: '1.1rem',
                    letterSpacing: '0.05em'
                }}>
                    Select a session or create a new one
                </p>
            </div>

            {/* Session List */}
            <div style={{
                width: '100%',
                maxWidth: '600px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {loading ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--text-muted)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔄</div>
                        Connecting to Firebase...
                    </div>
                ) : sessions.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--text-muted)',
                        background: 'var(--surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-ui)'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                        <p style={{ fontWeight: 600 }}>No active sessions</p>
                        <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                            Upload a PDF or create a new session to get started.
                        </p>
                    </div>
                ) : (
                    sessions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => handleJoin(s.id)}
                            disabled={joining !== null}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '20px 24px',
                                background: joining === s.id
                                    ? 'rgba(197, 160, 101, 0.2)'
                                    : 'var(--surface)',
                                border: '1px solid var(--border-ui)',
                                borderRadius: '16px',
                                cursor: joining ? 'wait' : 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                transition: 'all 0.2s ease',
                                color: 'var(--text-main)',
                                opacity: joining && joining !== s.id ? 0.5 : 1,
                                boxShadow: 'var(--shadow-lux)'
                            }}
                            onMouseOver={(e) => {
                                if (!joining) e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(197,160,101,0.2), rgba(197,160,101,0.05))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.4rem',
                                flexShrink: 0
                            }}>
                                {s.guestCount > 0 ? '📋' : '📝'}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontWeight: 700,
                                    fontSize: '1.05rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {s.label}
                                </div>
                                <div style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    marginTop: '4px',
                                    display: 'flex',
                                    gap: '12px',
                                    flexWrap: 'wrap'
                                }}>
                                    {s.dateObj && <span>📅 {formatDate(s.dateObj)}</span>}
                                    <span>👥 {s.guestCount} guests</span>
                                    <span>🕐 {formatTime(s.lastModified)}</span>
                                </div>
                            </div>

                            {/* Arrow / Loading */}
                            <div style={{
                                fontSize: '1.2rem',
                                color: 'var(--gilpin-gold)',
                                flexShrink: 0
                            }}>
                                {joining === s.id ? '⏳' : '→'}
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '32px',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                {/* Upload PDF */}
                <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #c5a065, #d4b47a)',
                    color: '#000',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(197,160,101,0.3)'
                }}>
                    📄 Upload Arrivals PDF
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={onUploadPDF}
                        style={{ display: 'none' }}
                    />
                </label>

                {/* Create New */}
                <button
                    onClick={onCreateNew}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '14px 28px',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-ui)',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    ✏️ New Empty Session
                </button>
            </div>

            {/* Footer */}
            <div style={{
                marginTop: '40px',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                textAlign: 'center'
            }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 16px',
                    background: 'var(--surface)',
                    borderRadius: '20px',
                    border: '1px solid var(--border-ui)'
                }}>
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: sessions.length >= 0 && !loading ? '#22c55e' : '#ef4444',
                        display: 'inline-block'
                    }}></span>
                    {loading ? 'Connecting...' : `Firebase Connected • ${sessions.length} active sessions`}
                </div>
            </div>
        </div>
    );
};

export default SessionBrowser;
