import React, { useState, useEffect } from 'react';

interface LoadingHubProps {
  isVisible: boolean;
  message?: string;
  currentBatch?: number;
  totalBatches?: number;
  /** Optional: names of guests currently being processed */
  guestNames?: string[];
  /** Optional: current phase of AI audit */
  phase?: 'parsing' | 'auditing' | 'applying' | 'complete';
}

const PHASE_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  parsing: { label: 'Parsing Data', emoji: '📄', color: '#60a5fa' },
  auditing: { label: 'AI Auditing', emoji: '🤖', color: '#8b5cf6' },
  applying: { label: 'Applying Results', emoji: '✨', color: '#c5a065' },
  complete: { label: 'Complete', emoji: '✅', color: '#22c55e' },
};

const LoadingHub: React.FC<LoadingHubProps> = ({
  isVisible,
  message = "Processing...",
  currentBatch,
  totalBatches,
  guestNames = [],
  phase,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [visibleNameIdx, setVisibleNameIdx] = useState(0);

  // Elapsed timer
  useEffect(() => {
    if (!isVisible) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(t);
  }, [isVisible]);

  // Cycle through guest names
  useEffect(() => {
    if (guestNames.length <= 1) return;
    const t = setInterval(() => setVisibleNameIdx(p => (p + 1) % guestNames.length), 800);
    return () => clearInterval(t);
  }, [guestNames]);

  if (!isVisible) return null;

  const progress = currentBatch && totalBatches
    ? Math.round((currentBatch / totalBatches) * 100)
    : null;

  const phaseInfo = phase ? PHASE_INFO[phase] : null;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div style={{
        background: 'var(--bg-container, #fff)',
        borderRadius: '2rem',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(197, 160, 101, 0.3)',
        border: '2px solid #c5a065',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        minWidth: '340px',
        maxWidth: '420px',
      }}>
        {/* Animated Rings */}
        <div className="loading-hub">
          <div className="loading-ring loading-ring-1"></div>
          <div className="loading-ring loading-ring-2"></div>
          <div className="w-24 h-24 rounded-full bg-[#c5a065]/10 flex items-center justify-center">
            <span className="text-4xl animate-pulse">{phaseInfo?.emoji || '✨'}</span>
          </div>
        </div>

        {/* Phase Indicator */}
        {phaseInfo && (
          <div style={{
            display: 'flex',
            gap: '6px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {Object.entries(PHASE_INFO).map(([key, info]) => (
              <span key={key} style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '9px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                background: phase === key ? info.color : 'var(--bg-color, #f1f5f9)',
                color: phase === key ? '#fff' : 'var(--text-sub, #94a3b8)',
                transition: 'all 0.3s ease',
                opacity: phase === key ? 1 : 0.5,
              }}>
                {info.emoji} {info.label}
              </span>
            ))}
          </div>
        )}

        {/* Message */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: '#c5a065',
            marginBottom: '6px',
          }}>
            {message}
          </p>

          {/* Subtitle */}
          <p style={{
            fontSize: '11px',
            color: 'var(--text-sub, #94a3b8)',
            margin: 0,
            fontWeight: 500,
          }}>
            {elapsed < 10
              ? 'Analysing guest data for best results...'
              : elapsed < 25
                ? 'Deep audit in progress — this ensures accuracy'
                : 'Almost there — finalising refinements...'}
          </p>
        </div>

        {/* Progress Bar */}
        {progress !== null && (
          <div style={{ width: '100%' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9px',
              fontWeight: 700,
              color: 'var(--text-sub, #64748b)',
              marginBottom: '4px',
            }}>
              <span>Batch {currentBatch} of {totalBatches}</span>
              <span>{progress}%</span>
            </div>
            <div style={{
              height: '8px',
              background: 'var(--bg-color, #e2e8f0)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #c5a065, #d4b078)',
                borderRadius: '999px',
                transition: 'width 0.5s ease-out',
                width: `${progress}%`,
              }} />
            </div>
          </div>
        )}

        {/* Guest Name Ticker */}
        {guestNames.length > 0 && (
          <div style={{
            background: 'var(--bg-color, #f8fafc)',
            borderRadius: '12px',
            padding: '8px 16px',
            width: '100%',
            textAlign: 'center',
            minHeight: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-main, #334155)',
              transition: 'opacity 0.3s',
            }}>
              🔍 {guestNames[visibleNameIdx]}
            </span>
          </div>
        )}

        {/* Elapsed Time */}
        <div style={{
          fontSize: '10px',
          color: 'var(--text-sub, #94a3b8)',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          ⏱️ {formatTime(elapsed)}
        </div>

        {/* Skeleton Preview */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: '3px',
                borderRadius: '999px',
                background: 'var(--bg-color, #e2e8f0)',
                width: `${80 - (i * 15)}%`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingHub;