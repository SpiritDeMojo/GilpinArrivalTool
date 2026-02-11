import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToSessionList, SessionSummary, isFirebaseEnabled, initializeFirebase, fetchSession, deleteSessionFromFirebase, subscribeToPresence } from '../services/firebaseService';
import { ArrivalSession } from '../types';

/* ── Stagger animation variants ── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95, filter: 'blur(6px)' },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0, scale: 0.9, filter: 'blur(4px)',
    transition: { duration: 0.25 },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const actionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

interface SessionBrowserProps {
  onJoinSession: (session: ArrivalSession) => void;
  onCreateNew: () => void;
  onUploadPDF: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SessionBrowser: React.FC<SessionBrowserProps> = ({ onJoinSession, onCreateNew, onUploadPDF }) => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, number>>({});
  const unsubRef = useRef<(() => void) | null>(null);
  const presenceUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isFirebaseEnabled()) {
      initializeFirebase();
    }

    unsubRef.current = subscribeToSessionList((list) => {
      setSessions(list);
      setLoading(false);
    });

    presenceUnsubRef.current = subscribeToPresence((map) => {
      setPresenceMap(map);
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
      if (presenceUnsubRef.current) presenceUnsubRef.current();
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

  const handleDelete = async (e: React.MouseEvent, sessionId: string, label: string) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete session "${label}"?\n\nThis will remove it from all devices.`);
    if (!confirmed) return;

    setDeleting(sessionId);
    try {
      await deleteSessionFromFirebase(sessionId);
    } catch (error) {
      alert('Failed to delete session');
    } finally {
      setDeleting(null);
    }
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
        weekday: 'short', day: '2-digit', month: 'short'
      });
    } catch { return ''; }
  };

  return (
    <div className="session-browser">
      {/* Header */}
      <motion.div
        className="session-browser__header"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className="session-browser__title heading-font">Gilpin Intelligence Hub</h1>
        <p className="session-browser__subtitle">Select a session or create a new one</p>
      </motion.div>

      {/* Session List */}
      <motion.div
        className="session-browser__list"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {loading ? (
          <div className="session-browser__empty">
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔄</div>
            Connecting to Firebase...
          </div>
        ) : sessions.length === 0 ? (
          <div className="session-browser__empty session-browser__empty--boxed">
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <p style={{ fontWeight: 600 }}>No active sessions</p>
            <p style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.7 }}>
              Upload a PDF or create a new session to get started.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {sessions.map(s => {
              const activeViewers = presenceMap[s.id] || 0;
              const isDeleting = deleting === s.id;

              return (
                <motion.div
                  key={s.id}
                  variants={cardVariants}
                  exit="exit"
                  layout
                  className={`session-card ${joining === s.id ? 'session-card--joining' : ''} ${isDeleting ? 'session-card--deleting' : ''}`}
                  style={{ opacity: (joining && joining !== s.id) || isDeleting ? 0.5 : 1 }}
                  whileHover={{ scale: 1.02, y: -2, boxShadow: '0 12px 32px rgba(197, 160, 101, 0.15)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Clickable area */}
                  <button
                    onClick={() => handleJoin(s.id)}
                    disabled={joining !== null || isDeleting}
                    className="session-card__main"
                  >
                    {/* Icon */}
                    <motion.div
                      className="session-card__icon"
                      animate={joining === s.id ? {
                        scale: [1, 1.15, 1],
                        transition: { duration: 0.8, repeat: Infinity },
                      } : {}}
                    >
                      {s.guestCount > 0 ? '📋' : '📝'}
                    </motion.div>

                    {/* Info */}
                    <div className="session-card__info">
                      <div className="session-card__label">{s.label}</div>
                      <div className="session-card__meta">
                        {s.dateObj && <span>📅 {formatDate(s.dateObj)}</span>}
                        <span>👥 {s.guestCount}</span>
                        <span>🕐 {formatTime(s.lastModified)}</span>
                      </div>
                    </div>

                    {/* Active viewers badge */}
                    {activeViewers > 0 && (
                      <motion.div
                        className="session-card__presence"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      >
                        <span className="session-card__presence-dot"></span>
                        {activeViewers}
                      </motion.div>
                    )}

                    {/* Arrow */}
                    <div className="session-card__arrow">
                      {joining === s.id ? '⏳' : '→'}
                    </div>
                  </button>

                  {/* Delete button */}
                  <motion.button
                    onClick={(e) => handleDelete(e, s.id, s.label)}
                    disabled={joining !== null || isDeleting}
                    className="session-card__delete"
                    title="Delete session"
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                    whileTap={{ scale: 0.85 }}
                  >
                    {isDeleting ? '⏳' : '🗑️'}
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        className="session-browser__actions"
        variants={actionVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.label
          htmlFor="session-pdf-upload"
          className="session-browser__btn session-browser__btn--primary"
          whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(197,160,101,0.35)' }}
          whileTap={{ scale: 0.97 }}
        >
          📄 Upload PDF
          <input
            id="session-pdf-upload"
            name="pdfUpload"
            type="file"
            accept=".pdf"
            onChange={onUploadPDF}
            style={{ display: 'none' }}
          />
        </motion.label>

        <motion.button
          onClick={onCreateNew}
          className="session-browser__btn session-browser__btn--secondary"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          ✏️ New Session
        </motion.button>
      </motion.div>

      {/* Footer */}
      <motion.div
        className="session-browser__footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <div className="session-browser__status">
          <motion.span
            className="session-browser__status-dot"
            style={{ background: !loading ? '#22c55e' : '#ef4444' }}
            animate={!loading ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.4 }}
          />
          {loading ? 'Connecting...' : `Connected • ${sessions.length} sessions`}
        </div>
      </motion.div>

      <style>{`
        .session-browser {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          font-family: 'Inter', sans-serif;
        }

        .session-browser__header {
          text-align: center;
          margin-bottom: 32px;
        }

        .session-browser__title {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin-bottom: 6px;
          line-height: 1.2;
        }

        .session-browser__subtitle {
          color: var(--text-muted, #94a3b8);
          font-size: 0.9rem;
          letter-spacing: 0.04em;
        }

        .session-browser__list {
          width: 100%;
          max-width: 560px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .session-browser__empty {
          text-align: center;
          padding: 32px 20px;
          color: var(--text-muted, #94a3b8);
        }

        .session-browser__empty--boxed {
          background: var(--surface, rgba(255,255,255,0.7));
          border-radius: 16px;
          border: 1px solid var(--border-ui, #c5a065);
        }

        /* Session Card */
        .session-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 16px;
          background: var(--surface, rgba(255,255,255,0.7));
          border: 1px solid var(--border-ui, #c5a065);
          border-radius: 16px;
          width: 100%;
          transition: all 0.2s ease;
          color: var(--text-main, #0f172a);
          box-shadow: var(--shadow-lux, 0 20px 40px -10px rgba(0,0,0,0.08));
        }

        .session-card--joining {
          background: rgba(197, 160, 101, 0.2);
        }

        .session-card--deleting {
          background: rgba(239, 68, 68, 0.1);
        }

        .session-card__main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          color: inherit;
          padding: 0;
          min-height: 48px;
          font-family: inherit;
        }

        .session-card__main:disabled {
          cursor: wait;
        }

        .session-card__icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(197,160,101,0.2), rgba(197,160,101,0.05));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .session-card__info {
          flex: 1;
          min-width: 0;
        }

        .session-card__label {
          font-weight: 700;
          font-size: 0.95rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .session-card__meta {
          font-size: 0.75rem;
          color: var(--text-muted, #94a3b8);
          margin-top: 3px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .session-card__presence {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .session-card__presence-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          display: inline-block;
          animation: sb-pulse 2s infinite;
        }

        .session-card__arrow {
          font-size: 1.1rem;
          color: var(--gilpin-gold, #c5a065);
          flex-shrink: 0;
          margin-left: 4px;
        }

        .session-card__delete {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.05);
          color: #ef4444;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .session-card__delete:active {
          background: rgba(239, 68, 68, 0.2);
          transform: scale(0.95);
        }

        .session-card__delete:disabled {
          opacity: 0.3;
          cursor: wait;
        }

        /* Action Buttons */
        .session-browser__actions {
          display: flex;
          gap: 10px;
          margin-top: 28px;
          width: 100%;
          max-width: 560px;
          justify-content: center;
        }

        .session-browser__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 14px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 48px;
          flex: 1;
          max-width: 260px;
          border: none;
          font-family: inherit;
        }

        .session-browser__btn--primary {
          background: linear-gradient(135deg, #c5a065, #d4b47a);
          color: #000;
          box-shadow: 0 4px 12px rgba(197,160,101,0.3);
        }

        .session-browser__btn--primary:active {
          transform: scale(0.97);
        }

        .session-browser__btn--secondary {
          background: var(--surface, rgba(255,255,255,0.7));
          color: var(--text-main, #0f172a);
          border: 1px solid var(--border-ui, #c5a065);
        }

        .session-browser__btn--secondary:active {
          transform: scale(0.97);
        }

        /* Footer */
        .session-browser__footer {
          margin-top: 32px;
          color: var(--text-muted, #94a3b8);
          font-size: 0.75rem;
          text-align: center;
        }

        .session-browser__status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          background: var(--surface, rgba(255,255,255,0.7));
          border-radius: 20px;
          border: 1px solid var(--border-ui, #c5a065);
        }

        .session-browser__status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
        }

        @keyframes sb-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Desktop overrides */
        @media (min-width: 768px) {
          .session-browser {
            padding: 24px;
          }

          .session-browser__title {
            font-size: 2.5rem;
          }

          .session-browser__subtitle {
            font-size: 1.1rem;
          }

          .session-browser__header {
            margin-bottom: 40px;
          }

          .session-card {
            padding: 20px 24px;
            gap: 12px;
          }

          .session-card__icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            font-size: 1.4rem;
          }

          .session-card__label {
            font-size: 1.05rem;
          }

          .session-card__meta {
            font-size: 0.85rem;
            gap: 12px;
          }

          .session-card__presence {
            font-size: 0.8rem;
            padding: 4px 10px;
          }

          .session-browser__actions {
            margin-top: 32px;
          }

          .session-browser__btn {
            padding: 14px 28px;
            font-size: 0.95rem;
          }

          .session-browser__footer {
            margin-top: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default SessionBrowser;
