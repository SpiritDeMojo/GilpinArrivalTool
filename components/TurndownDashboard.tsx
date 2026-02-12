import React, { useMemo, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Guest,
  TurndownStatus,
  TURNDOWN_STATUS_INFO,
  GUEST_STATUS_INFO,
  ArrivalSession,
} from '../types';
import { getRoomNumber } from '../constants';
import { useStayoverCalculator, StayoverGuest } from '../hooks/useStayoverCalculator';

interface TurndownDashboardProps {
  sessions: ArrivalSession[];
  activeSessionDate: string | null;
  onUpdateTurndownStatus: (guestId: string, status: TurndownStatus, originSessionId: string) => void;
  onUpdateDinnerTime: (guestId: string, dinnerTime: string, originSessionId: string) => void;
  onUpdateDinnerVenue: (guestId: string, venue: string, originSessionId: string) => void;
  /** Verify and save the turndown list for HK */
  onVerifyTurndown?: () => void;
  /** Active session for verification badge */
  activeSession?: ArrivalSession | null;
  /** Current user name for verification badge */
  userName?: string;
}

const TurndownDashboard: React.FC<TurndownDashboardProps> = ({
  sessions,
  activeSessionDate,
  onUpdateTurndownStatus,
  onUpdateDinnerTime,
  onUpdateDinnerVenue,
  onVerifyTurndown,
  activeSession,
  userName,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | TurndownStatus>('all');
  const [showMainHotel, setShowMainHotel] = useState(true);
  const [showLakeHouse, setShowLakeHouse] = useState(true);
  const [sortMode, setSortMode] = useState<'dinner' | 'room'>('dinner');
  const [editingDinner, setEditingDinner] = useState<string | null>(null);
  const [dinnerInput, setDinnerInput] = useState('');
  const [venueInput, setVenueInput] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // Compute target date from active session
  const targetDate = useMemo(() => {
    if (activeSessionDate) {
      const d = new Date(activeSessionDate);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [activeSessionDate]);

  const { stayovers, sessionCoverage, hasEnoughSessions, totalStayovers } =
    useStayoverCalculator(sessions, targetDate);

  // Filter stayovers
  const filteredStayovers = useMemo(() => {
    let result = [...stayovers];

    // Property filter
    result = result.filter(s => {
      const roomNum = getRoomNumber(s.guest.room);
      const isLakeHouse = roomNum >= 51 && roomNum <= 58;
      if (isLakeHouse) return showLakeHouse;
      return showMainHotel;
    });

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(s => (s.guest.turndownStatus || 'not_started') === statusFilter);
    }

    // Sort
    if (sortMode === 'room') {
      result.sort((a, b) => getRoomNumber(a.guest.room) - getRoomNumber(b.guest.room));
    }
    // dinner sort is the default from the hook

    return result;
  }, [stayovers, statusFilter, showMainHotel, showLakeHouse, sortMode]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<TurndownStatus, number> = {
      not_started: 0,
      in_progress: 0,
      complete: 0,
    };
    stayovers.forEach(s => {
      const status = s.guest.turndownStatus || 'not_started';
      counts[status]++;
    });
    return counts;
  }, [stayovers]);

  // Next status in workflow
  const getNextStatus = (current: TurndownStatus): TurndownStatus | null => {
    const flow: Record<TurndownStatus, TurndownStatus | null> = {
      not_started: 'in_progress',
      in_progress: 'complete',
      complete: null,
    };
    return flow[current];
  };

  // Handle dinner time save
  const saveDinnerEdit = (stayover: StayoverGuest) => {
    const timeVal = dinnerInput.trim() || 'none';
    onUpdateDinnerTime(stayover.guest.id, timeVal, stayover.originSessionId);
    if (venueInput.trim()) {
      onUpdateDinnerVenue(stayover.guest.id, venueInput.trim(), stayover.originSessionId);
    }
    setEditingDinner(null);
    setDinnerInput('');
    setVenueInput('');
  };

  // Print handler
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = targetDate.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    // Build print-ordered list: no dinner first, then by dinner time
    const printList = [...filteredStayovers].sort((a, b) => {
      const timeA = a.guest.dinnerTime || a.dinnerTime;
      const timeB = b.guest.dinnerTime || b.dinnerTime;
      if (!timeA && !timeB) return getRoomNumber(a.guest.room) - getRoomNumber(b.guest.room);
      if (!timeA || timeA === 'none') return -1;
      if (!timeB || timeB === 'none') return 1;
      return timeA.localeCompare(timeB);
    });

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Turndown List — ${dateStr}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; padding: 24px; color: #1e293b; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #c5a065; padding-bottom: 16px; }
    .header h1 { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
    .header .date { font-size: 14px; color: #64748b; margin-top: 4px; }
    .header .stats { font-size: 12px; color: #94a3b8; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #0f172a; color: white; padding: 10px 12px; text-align: left;
         font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .room { font-weight: 800; color: #c5a065; font-size: 15px; }
    .guest-name { font-weight: 600; }
    .no-dinner { color: #dc2626; font-weight: 700; font-size: 11px; text-transform: uppercase; }
    .dinner-time { font-weight: 700; color: #16a34a; }
    .venue { color: #6366f1; font-weight: 600; }
    .night-info { color: #64748b; font-size: 11px; }
    .off-site { color: #dc2626; font-weight: 700; }
    .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #94a3b8;
              text-transform: uppercase; letter-spacing: 2px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 0; } .footer { position: fixed; bottom: 10px; left: 0; right: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌙 Turndown List</h1>
    <div class="date">${dateStr}</div>
    <div class="stats">${printList.length} rooms • ${printList.filter(s => !s.dinnerTime && !(s.guest.dinnerTime && s.guest.dinnerTime !== 'none')).length} no dinner</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 10%">#</th>
        <th style="width: 12%">Room</th>
        <th style="width: 22%">Guest</th>
        <th style="width: 14%">Dinner</th>
        <th style="width: 16%">Venue</th>
        <th style="width: 12%">Night</th>
        <th style="width: 14%">Status</th>
      </tr>
    </thead>
    <tbody>
      ${printList.map((s, i) => {
      const time = s.guest.dinnerTime || s.dinnerTime;
      const venue = s.guest.dinnerVenue || s.dinnerVenue;
      const isOffSite = s.guest.guestStatus === 'off_site';
      return `<tr>
          <td>${i + 1}</td>
          <td class="room">${s.guest.room}</td>
          <td class="guest-name">${s.guest.name}${isOffSite ? ' <span class="off-site">(OFF SITE)</span>' : ''}</td>
          <td>${!time || time === 'none'
          ? '<span class="no-dinner">❌ No Dinner</span>'
          : `<span class="dinner-time">${time}</span>`
        }</td>
          <td>${venue ? `<span class="venue">${venue}</span>` : '—'}</td>
          <td class="night-info">Night ${s.nightNumber} of ${s.totalNights}</td>
          <td>${s.guest.turndownStatus === 'complete' ? '✅' : s.guest.turndownStatus === 'in_progress' ? '🧹' : '🌙'}</td>
        </tr>`;
    }).join('')}
    </tbody>
  </table>
  <div class="footer">Gilpin Hotel & Lake House • Turndown Schedule • Internal Use Only</div>
</body>
</html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <div className="td-dashboard">
      {/* Header */}
      <motion.header
        className="td-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="td-header-content">
          <div className="td-header-icon">🌙</div>
          <div>
            <h1>Turndown</h1>
            <p>Evening room preparation — ordered by dinner time</p>
          </div>
        </div>
        <div className="td-header-stats">
          <div className="td-stat not-started">
            <span className="td-stat-number">{statusCounts.not_started}</span>
            <span className="td-stat-label">Pending</span>
          </div>
          <div className="td-stat in-progress">
            <span className="td-stat-number">{statusCounts.in_progress}</span>
            <span className="td-stat-label">In Progress</span>
          </div>
          <div className="td-stat complete">
            <span className="td-stat-number">{statusCounts.complete}</span>
            <span className="td-stat-label">Complete</span>
          </div>
        </div>
      </motion.header>

      {/* Session Coverage Banner */}
      {!hasEnoughSessions && (
        <motion.div
          className="td-coverage-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="td-coverage-icon">⚠️</span>
          <div>
            <strong>Limited Data — {sessionCoverage} of 7 sessions loaded</strong>
            <p>Import more arrival days for complete stayover coverage. Some guests may be missing.</p>
          </div>
        </motion.div>
      )}

      {/* Filter Bar */}
      <div className="td-filter-bar">
        <div className="td-status-filters">
          {Object.entries(TURNDOWN_STATUS_INFO).map(([status, info]) => (
            <button
              key={status}
              className={`td-filter-chip ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status as TurndownStatus)}
              style={{ '--chip-color': info.color } as React.CSSProperties}
            >
              <span>{info.emoji}</span>
              <span>{statusCounts[status as TurndownStatus]}</span>
            </button>
          ))}
        </div>
        <div className="td-controls">
          <button
            className="td-sort-btn"
            onClick={() => setSortMode(sortMode === 'dinner' ? 'room' : 'dinner')}
          >
            {sortMode === 'dinner' ? '🍽️ Dinner Order' : '🚪 Room Order'}
          </button>
          <button className="td-print-btn" onClick={handlePrint} disabled={stayovers.length === 0}>
            🖨️ Print List
          </button>
          <label className="td-toggle" htmlFor="td-show-main">
            <input id="td-show-main" name="showMainHotel" type="checkbox" checked={showMainHotel} onChange={e => setShowMainHotel(e.target.checked)} />
            <span>🏨 Main</span>
          </label>
          <label className="td-toggle" htmlFor="td-show-lake">
            <input id="td-show-lake" name="showLakeHouse" type="checkbox" checked={showLakeHouse} onChange={e => setShowLakeHouse(e.target.checked)} />
            <span>🏡 Lake</span>
          </label>
        </div>
      </div>

      {/* Room Grid */}
      <motion.div
        className="td-room-grid"
        initial="hidden"
        animate="show"
        key={statusFilter + sortMode + String(showMainHotel) + String(showLakeHouse)}
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.04 } },
        }}
      >
        {filteredStayovers.length === 0 ? (
          <motion.div
            className="td-empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="td-empty-icon">{totalStayovers === 0 ? '🌙' : '✨'}</span>
            <h3>{totalStayovers === 0 ? 'No Stayovers' : 'All Clear!'}</h3>
            <p>{totalStayovers === 0
              ? 'No stayover guests found for this date. Import more sessions to populate this view.'
              : 'No rooms match your current filter'
            }</p>
          </motion.div>
        ) : (
          filteredStayovers.map((stayover, index) => {
            const tdStatus = stayover.guest.turndownStatus || 'not_started';
            const tdInfo = TURNDOWN_STATUS_INFO[tdStatus];
            const nextStatus = getNextStatus(tdStatus);
            const isOffSite = stayover.guest.guestStatus === 'off_site';
            const isEditing = editingDinner === stayover.guest.id;
            const effectiveDinnerTime = stayover.guest.dinnerTime && stayover.guest.dinnerTime !== 'none'
              ? stayover.guest.dinnerTime
              : stayover.dinnerTime;
            const effectiveVenue = stayover.guest.dinnerVenue || stayover.dinnerVenue;
            const noDinner = !effectiveDinnerTime || effectiveDinnerTime === 'none';

            return (
              <motion.div
                key={stayover.guest.id}
                className={`td-card ${noDinner ? 'no-dinner' : ''}`}
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.92, filter: 'blur(6px)' },
                  show: {
                    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
                    transition: { type: 'spring', stiffness: 300, damping: 24 },
                  },
                }}
                whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(99, 102, 241, 0.15)' }}
                style={{ '--card-accent': tdInfo.color } as React.CSSProperties}
              >
                {/* Order Badge */}
                <div className="td-order-badge">#{index + 1}</div>

                {/* Card Header */}
                <div className="td-card-header">
                  <div className="td-room-info">
                    <span className="td-room-number">{stayover.guest.room}</span>
                    <span className="td-night-badge">
                      Night {stayover.nightNumber}/{stayover.totalNights}
                    </span>
                  </div>
                  <span
                    className="td-status-badge"
                    style={{ background: tdInfo.bgColor, color: tdInfo.color }}
                  >
                    {tdInfo.emoji} {tdInfo.label}
                  </span>
                </div>

                {/* Guest Presence */}
                {stayover.guest.guestStatus && stayover.guest.guestStatus !== 'pre_arrival' && (
                  <div className={`td-presence ${isOffSite ? 'off-site' : 'on-site'}`}>
                    <span className="td-presence-dot"></span>
                    <span>{isOffSite ? '🔴 Guest Off Site' : '🟢 Guest On Site'}</span>
                  </div>
                )}

                {/* Guest Info */}
                <div className="td-guest-info">
                  <p className="td-guest-name">{stayover.guest.name}</p>
                  <p className="td-origin">Arrived: {stayover.originSessionLabel.split(',')[0]}</p>
                </div>

                {/* Dinner Info */}
                <div className={`td-dinner-section ${noDinner ? 'no-dinner' : 'has-dinner'}`}>
                  {isEditing ? (
                    <div className="td-dinner-edit">
                      <div className="td-dinner-edit-row">
                        <input
                          type="time"
                          value={dinnerInput}
                          onChange={e => setDinnerInput(e.target.value)}
                          placeholder="19:00"
                          className="td-time-input"
                          autoFocus
                        />
                        <select
                          value={venueInput}
                          onChange={e => setVenueInput(e.target.value)}
                          className="td-venue-select"
                        >
                          <option value="">Venue...</option>
                          <option value="Source">Source</option>
                          <option value="Gilpin Spice">Gilpin Spice</option>
                          <option value="Bento">Bento</option>
                          <option value="The Lake House">Lake House</option>
                          <option value="In Room">In Room</option>
                        </select>
                      </div>
                      <div className="td-dinner-edit-actions">
                        <button className="td-btn-save" onClick={() => saveDinnerEdit(stayover)}>
                          ✓ Save
                        </button>
                        <button className="td-btn-no-dinner" onClick={() => {
                          onUpdateDinnerTime(stayover.guest.id, 'none', stayover.originSessionId);
                          setEditingDinner(null);
                        }}>
                          ❌ No Dinner
                        </button>
                        <button className="td-btn-cancel" onClick={() => setEditingDinner(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="td-dinner-display"
                      onClick={() => {
                        setEditingDinner(stayover.guest.id);
                        setDinnerInput(effectiveDinnerTime || '');
                        setVenueInput(effectiveVenue || '');
                      }}
                      title="Click to edit dinner time"
                    >
                      {noDinner ? (
                        <span className="td-no-dinner-tag">❌ No Dinner — tap to set</span>
                      ) : (
                        <>
                          <span className="td-dinner-time">🍽️ {effectiveDinnerTime}</span>
                          {effectiveVenue && <span className="td-dinner-venue">{effectiveVenue}</span>}
                          {stayover.dinnerCovers && <span className="td-dinner-covers">({stayover.dinnerCovers} pax)</span>}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* HK Notes Preview (shared with arrivals HK) */}
                {stayover.guest.hkNotes && (
                  <div className="td-hk-notes">
                    <span className="td-hk-notes-icon">📋</span>
                    <span>{stayover.guest.hkNotes}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="td-card-actions">
                  {nextStatus && (
                    <motion.button
                      className="td-action-btn primary"
                      onClick={() => onUpdateTurndownStatus(stayover.guest.id, nextStatus, stayover.originSessionId)}
                      whileTap={{ scale: 0.92 }}
                      whileHover={{ scale: 1.03 }}
                    >
                      {TURNDOWN_STATUS_INFO[nextStatus].emoji} {TURNDOWN_STATUS_INFO[nextStatus].label}
                    </motion.button>
                  )}
                  <select
                    className="td-status-select"
                    value={tdStatus}
                    onChange={e => onUpdateTurndownStatus(stayover.guest.id, e.target.value as TurndownStatus, stayover.originSessionId)}
                  >
                    {Object.entries(TURNDOWN_STATUS_INFO).map(([key, info]) => (
                      <option key={key} value={key}>{info.emoji} {info.label}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Verification Section */}
      {stayovers.length > 0 && (
        <motion.div
          className="td-verify-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {activeSession?.turndownVerifiedAt ? (
            <div className="td-verified-badge">
              <span className="td-verified-icon">Verified</span>
              <div>
                <strong>Turndown list verified</strong>
                <p>
                  By {activeSession.turndownVerifiedBy || 'Reception'} at{' '}
                  {new Date(activeSession.turndownVerifiedAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ) : (
            onVerifyTurndown && (
              <motion.button
                className="td-verify-btn"
                onClick={() => {
                  if (window.confirm(
                    `Verify turndown list for tonight?\n\n` +
                    `${stayovers.length} stayover rooms\n` +
                    `This confirms dinner times and guest data are correct for housekeeping.`
                  )) {
                    onVerifyTurndown();
                  }
                }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
              >
                Verify & Save for Housekeeping
              </motion.button>
            )
          )}
        </motion.div>
      )}

      <style>{`
        .td-dashboard {
          padding: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* Header */
        .td-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%);
          border-radius: 20px;
          padding: 24px 32px;
          margin-bottom: 20px;
          color: white;
        }

        .td-header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .td-header-icon {
          font-size: 48px;
          background: rgba(255,255,255,0.1);
          padding: 16px;
          border-radius: 16px;
        }

        .td-header-content h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
        }

        .td-header-content p {
          margin: 4px 0 0;
          opacity: 0.7;
          font-size: 14px;
        }

        .td-header-stats {
          display: flex;
          gap: 24px;
        }

        .td-stat {
          text-align: center;
          padding: 12px 20px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          min-width: 80px;
        }

        .td-stat-number {
          display: block;
          font-size: 28px;
          font-weight: 800;
        }

        .td-stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.8;
        }

        .td-stat.not-started .td-stat-number { color: #a5b4fc; }
        .td-stat.in-progress .td-stat-number { color: #fbbf24; }
        .td-stat.complete .td-stat-number { color: #4ade80; }

        /* Coverage Banner */
        .td-coverage-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: #fef9c3;
          border: 1px solid #fbbf24;
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 20px;
          color: #92400e;
        }

        [data-theme="dark"] .td-coverage-banner {
          background: rgba(251, 191, 36, 0.1);
          border-color: rgba(251, 191, 36, 0.3);
          color: #fbbf24;
        }

        .td-coverage-icon { font-size: 24px; flex-shrink: 0; }
        .td-coverage-banner strong { font-size: 14px; }
        .td-coverage-banner p { margin: 4px 0 0; font-size: 12px; opacity: 0.8; }

        /* Filter Bar */
        .td-filter-bar {
          display: flex;
          flex-direction: column;
          background: var(--bg-container);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 20px;
          gap: 12px;
        }

        @media (min-width: 900px) {
          .td-filter-bar {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
          }
        }

        .td-status-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .td-filter-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 2px solid var(--border-color);
          background: var(--bg-color);
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .td-filter-chip:hover { border-color: var(--chip-color); }

        .td-filter-chip.active {
          border-color: var(--chip-color);
          background: var(--chip-color);
          color: white;
        }

        .td-controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-start;
        }

        @media (min-width: 900px) {
          .td-controls { margin-left: auto; }
        }

        .td-sort-btn, .td-print-btn {
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid var(--border-color);
          background: var(--bg-color);
          cursor: pointer;
          transition: all 0.2s;
        }

        .td-print-btn {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
        }

        .td-print-btn:hover { box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
        .td-print-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .td-sort-btn:hover { border-color: #6366f1; }

        .td-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 20px;
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          transition: border-color 0.2s;
        }

        .td-toggle:hover { border-color: #6366f1; }

        /* Room Grid */
        .td-room-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        /* Empty State */
        .td-empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
          background: var(--bg-container);
          border-radius: 20px;
          border: 2px dashed var(--border-color);
        }

        .td-empty-icon { font-size: 64px; display: block; margin-bottom: 16px; }
        .td-empty h3 { margin: 0; color: var(--text-bold); }
        .td-empty p { margin: 8px 0 0; color: var(--text-sub); font-size: 14px; }

        /* Room Card */
        .td-card {
          background: var(--bg-container);
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--card-accent);
          border-radius: 16px;
          padding: 20px;
          position: relative;
          transition: all 0.2s;
        }

        .td-card.no-dinner {
          border-left-color: #6366f1;
        }

        .td-order-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 10px;
        }

        .td-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          padding-right: 48px;
        }

        .td-room-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .td-room-number {
          font-size: 18px;
          font-weight: 800;
          color: var(--gilpin-gold, #c5a065);
          text-transform: uppercase;
        }

        .td-night-badge {
          background: rgba(99, 102, 241, 0.1);
          color: #6366f1;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .td-status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        /* Guest Presence */
        .td-presence {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .td-presence.on-site {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }

        .td-presence.off-site {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .td-presence-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .td-presence.on-site .td-presence-dot {
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
        }

        .td-presence.off-site .td-presence-dot {
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
        }

        /* Guest Info */
        .td-guest-info { margin-bottom: 12px; }

        .td-guest-name {
          margin: 0;
          font-weight: 600;
          color: var(--text-bold);
          font-size: 15px;
        }

        .td-origin {
          margin: 2px 0 0;
          font-size: 11px;
          color: var(--text-sub);
        }

        /* Dinner Section */
        .td-dinner-section {
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .td-dinner-section.has-dinner {
          background: rgba(34, 197, 94, 0.06);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .td-dinner-section.no-dinner {
          background: rgba(99, 102, 241, 0.06);
          border: 1px dashed rgba(99, 102, 241, 0.3);
        }

        .td-dinner-display {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .td-dinner-time {
          font-size: 16px;
          font-weight: 800;
          color: #16a34a;
        }

        .td-dinner-venue {
          font-size: 13px;
          font-weight: 600;
          color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
          padding: 2px 10px;
          border-radius: 8px;
        }

        .td-dinner-covers {
          font-size: 11px;
          color: var(--text-sub);
          font-weight: 600;
        }

        .td-no-dinner-tag {
          font-size: 13px;
          font-weight: 700;
          color: #6366f1;
          opacity: 0.8;
        }

        /* Dinner Edit Mode */
        .td-dinner-edit { display: flex; flex-direction: column; gap: 8px; }

        .td-dinner-edit-row {
          display: flex;
          gap: 8px;
        }

        .td-time-input, .td-venue-select {
          padding: 8px 12px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          background: var(--bg-color);
          color: var(--text-bold);
          flex: 1;
        }

        .td-time-input:focus, .td-venue-select:focus {
          border-color: #6366f1;
          outline: none;
        }

        .td-dinner-edit-actions {
          display: flex;
          gap: 8px;
        }

        .td-btn-save, .td-btn-no-dinner, .td-btn-cancel {
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .td-btn-save {
          background: #22c55e;
          color: white;
        }

        .td-btn-no-dinner {
          background: rgba(220, 38, 38, 0.1);
          color: #dc2626;
          border: 1px solid rgba(220, 38, 38, 0.2);
        }

        .td-btn-cancel {
          background: var(--bg-color);
          color: var(--text-sub);
          border: 1px solid var(--border-color);
        }

        /* HK Notes */
        .td-hk-notes {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          background: rgba(251, 191, 36, 0.08);
          border: 1px solid rgba(251, 191, 36, 0.2);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          color: var(--text-sub);
          margin-bottom: 12px;
        }

        .td-hk-notes-icon { font-size: 14px; flex-shrink: 0; }

        /* Card Actions */
        .td-card-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .td-action-btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .td-action-btn.primary {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .td-action-btn.primary:hover {
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }

        .td-status-select {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          background: var(--bg-color);
          color: var(--text-sub);
          cursor: pointer;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .td-header {
            flex-direction: column;
            gap: 16px;
            padding: 20px;
            text-align: center;
          }

          .td-header-content { justify-content: center; }
          .td-header-stats { justify-content: center; }
          .td-header-icon { font-size: 36px; padding: 12px; }

          .td-header-content h1 { font-size: 22px; }

          .td-stat {
            padding: 8px 14px;
            min-width: 60px;
          }

          .td-stat-number { font-size: 22px; }

          .td-room-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Verification Section */
        .td-verify-section {
          margin-top: 24px;
          text-align: center;
        }

        .td-verify-btn {
          padding: 16px 48px;
          font-size: 16px;
          font-weight: 800;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
          transition: all 0.3s;
        }

        .td-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 28px;
          background: rgba(34, 197, 94, 0.1);
          border: 2px solid rgba(34, 197, 94, 0.3);
          border-radius: 16px;
          color: #16a34a;
        }

        .td-verified-icon {
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: #16a34a;
          color: white;
          padding: 6px 14px;
          border-radius: 10px;
        }

        .td-verified-badge strong {
          font-size: 14px;
          display: block;
        }

        .td-verified-badge p {
          margin: 2px 0 0;
          font-size: 12px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default React.memo(TurndownDashboard);
