import React, { useMemo, useState } from 'react';
import {
  Guest,
  GuestStatus,
  CourtesyCallNote,
  GUEST_STATUS_INFO,
  HK_STATUS_INFO,
  MAINTENANCE_STATUS_INFO,
  getRoomReadinessInfo
} from '../types';
import { getRoomNumber } from '../constants';

interface ReceptionDashboardProps {
  guests: Guest[];
  onUpdateGuestStatus: (guestId: string, status: GuestStatus) => void;
  onUpdateInRoomDelivery: (guestId: string, delivered: boolean) => void;
  onAddCourtesyNote: (guestId: string, note: Omit<CourtesyCallNote, 'id' | 'timestamp'>) => void;
  onViewAuditLog?: (guest: Guest) => void;
}

type ViewFilter = 'all' | 'pre_arrival' | 'on_site' | 'checked_in' | 'courtesy_due';

const ReceptionDashboard: React.FC<ReceptionDashboardProps> = ({
  guests,
  onUpdateGuestStatus,
  onUpdateInRoomDelivery,
  onAddCourtesyNote,
  onViewAuditLog
}) => {
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [showMainHotel, setShowMainHotel] = useState(true);
  const [showLakeHouse, setShowLakeHouse] = useState(true);
  const [courtesyModal, setCourtesyModal] = useState<{ guestId: string; guestName: string; room: string } | null>(null);
  const [courtesyNote, setCourtesyNote] = useState('');
  const [courtesyType, setCourtesyType] = useState<'happy' | 'issue' | 'neutral'>('happy');
  const [authorName, setAuthorName] = useState('');
  const [sortMode, setSortMode] = useState<'eta' | 'room'>('eta');

  // Filter guests
  const filteredGuests = useMemo(() => {
    let result = [...guests];

    // Property filter
    result = result.filter(g => {
      const roomNum = getRoomNumber(g.room);
      const isLakeHouse = roomNum >= 51 && roomNum <= 58;
      if (isLakeHouse) return showLakeHouse;
      return showMainHotel;
    });

    switch (viewFilter) {
      case 'pre_arrival':
        result = result.filter(g => (g.guestStatus || 'pre_arrival') === 'pre_arrival');
        break;
      case 'on_site':
        result = result.filter(g => {
          const status = g.guestStatus || 'pre_arrival';
          return ['on_site', 'awaiting_room', 'room_ready_notified'].includes(status);
        });
        break;
      case 'checked_in':
        result = result.filter(g => (g.guestStatus || 'pre_arrival') === 'checked_in');
        break;
      case 'courtesy_due':
        result = result.filter(g => (g.guestStatus || 'pre_arrival') === 'courtesy_call_due');
        break;
    }

    return result.sort((a, b) => {
      if (sortMode === 'eta') {
        const etaA = a.eta || '23:59';
        const etaB = b.eta || '23:59';
        return etaA.localeCompare(etaB);
      }
      return getRoomNumber(a.room) - getRoomNumber(b.room);
    });
  }, [guests, viewFilter, showMainHotel, showLakeHouse, sortMode]);

  // Counts
  const counts = useMemo(() => ({
    total: guests.length,
    preArrival: guests.filter(g => (g.guestStatus || 'pre_arrival') === 'pre_arrival').length,
    onSite: guests.filter(g => ['on_site', 'awaiting_room', 'room_ready_notified'].includes(g.guestStatus || 'pre_arrival')).length,
    checkedIn: guests.filter(g => g.guestStatus === 'checked_in').length,
    courtesyDue: guests.filter(g => g.guestStatus === 'courtesy_call_due').length,
  }), [guests]);

  // Handle courtesy call submission
  const handleCourtesySubmit = () => {
    if (!courtesyModal || !courtesyNote.trim()) return;

    onAddCourtesyNote(courtesyModal.guestId, {
      author: authorName || 'Reception',
      type: courtesyType,
      note: courtesyNote.trim(),
    });

    setCourtesyModal(null);
    setCourtesyNote('');
    setCourtesyType('happy');
  };

  // Get workflow action
  const getNextAction = (status: GuestStatus): { label: string; next: GuestStatus; icon: string } | null => {
    const actions: Record<GuestStatus, { label: string; next: GuestStatus; icon: string } | null> = {
      'pre_arrival': { label: 'Guest Arrived', next: 'on_site', icon: '🚗' },
      'on_site': { label: 'Awaiting Room', next: 'awaiting_room', icon: '⏳' },
      'off_site': { label: 'Guest Returned', next: 'on_site', icon: '🚗' },
      'awaiting_room': { label: 'Notified', next: 'room_ready_notified', icon: '📱' },
      'room_ready_notified': { label: 'Checked In', next: 'checked_in', icon: '🔑' },
      'checked_in': { label: 'Courtesy Due', next: 'courtesy_call_due', icon: '📞' },
      'courtesy_call_due': null,
      'call_complete': null,
    };
    return actions[status];
  };

  return (
    <div className="rx-dashboard">
      {/* Header */}
      <header className="rx-header">
        <div className="header-content">
          <div className="header-icon">🛎️</div>
          <div>
            <h1>Reception</h1>
            <p>Guest arrival workflow, check-in management & courtesy call tracking</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item total">
            <span className="stat-number">{counts.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item arriving">
            <span className="stat-number">{counts.preArrival}</span>
            <span className="stat-label">Expected</span>
          </div>
          <div className="stat-item onsite">
            <span className="stat-number">{counts.onSite}</span>
            <span className="stat-label">On Site</span>
          </div>
          <div className="stat-item checked">
            <span className="stat-number">{counts.checkedIn}</span>
            <span className="stat-label">Checked In</span>
          </div>
          {counts.courtesyDue > 0 && (
            <div className="stat-item courtesy">
              <span className="stat-number">{counts.courtesyDue}</span>
              <span className="stat-label">Calls Due</span>
            </div>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`tab ${viewFilter === 'all' ? 'active' : ''}`}
          onClick={() => setViewFilter('all')}
        >
          All
        </button>
        <button
          className={`tab ${viewFilter === 'pre_arrival' ? 'active' : ''}`}
          onClick={() => setViewFilter('pre_arrival')}
        >
          📅 Expected ({counts.preArrival})
        </button>
        <button
          className={`tab ${viewFilter === 'on_site' ? 'active' : ''}`}
          onClick={() => setViewFilter('on_site')}
        >
          🚗 On Site ({counts.onSite})
        </button>
        <button
          className={`tab ${viewFilter === 'checked_in' ? 'active' : ''}`}
          onClick={() => setViewFilter('checked_in')}
        >
          🔑 Checked In ({counts.checkedIn})
        </button>
        <button
          className={`tab urgent ${viewFilter === 'courtesy_due' ? 'active' : ''} ${counts.courtesyDue > 0 ? 'pulse' : ''}`}
          onClick={() => setViewFilter('courtesy_due')}
        >
          📞 Courtesy Due ({counts.courtesyDue})
        </button>
        <div className="property-toggles">
          <button
            className={`sort-toggle-btn`}
            onClick={() => setSortMode(sortMode === 'eta' ? 'room' : 'eta')}
            title={`Currently sorted by ${sortMode === 'eta' ? 'ETA' : 'Room Number'}`}
          >
            {sortMode === 'eta' ? '🕐 ETA Order' : '🚪 Room Order'}
          </button>
          <label className="toggle-label" htmlFor="rx-show-main">
            <input id="rx-show-main" name="showMainHotel" type="checkbox" checked={showMainHotel} onChange={e => setShowMainHotel(e.target.checked)} />
            <span>🏨 Main (1-31)</span>
          </label>
          <label className="toggle-label" htmlFor="rx-show-lake">
            <input id="rx-show-lake" name="showLakeHouse" type="checkbox" checked={showLakeHouse} onChange={e => setShowLakeHouse(e.target.checked)} />
            <span>🏡 Lake (51-58)</span>
          </label>
        </div>
      </div>

      {/* Guest Cards */}
      <div className="guest-list">
        {filteredGuests.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👋</span>
            <h3>No guests in this category</h3>
            <p>Select a different filter or wait for arrivals</p>
          </div>
        ) : (
          filteredGuests.map(guest => {
            const guestStatus = guest.guestStatus || 'pre_arrival';
            const guestInfo = GUEST_STATUS_INFO[guestStatus];
            const readiness = getRoomReadinessInfo(guest);
            const nextAction = getNextAction(guestStatus);

            return (
              <div key={guest.id} className="guest-card">
                {/* Header Row */}
                <div className="card-header">
                  <div className="guest-identity">
                    <span className="room-badge">{guest.room}</span>
                    <div>
                      <h3 className="guest-name">{guest.name}</h3>
                      <span className="guest-details">
                        ETA: {guest.eta || 'N/A'} • {guest.duration || '1'} night(s)
                      </span>
                    </div>
                  </div>
                  <div className="status-area">
                    <span
                      className="status-pill"
                      style={{ backgroundColor: guestInfo.color }}
                    >
                      {guestInfo.emoji} {guestInfo.label}
                    </span>
                  </div>
                </div>

                {/* Cross-Department Status Badges */}
                <div className="dept-status-bar">
                  <span className={`dept-badge ${readiness.hkDone ? 'done' : ''}`}>
                    🧹 {HK_STATUS_INFO[guest.hkStatus || 'pending'].label}
                  </span>
                  <span className={`dept-badge ${readiness.maintDone ? 'done' : ''}`}>
                    🔧 {MAINTENANCE_STATUS_INFO[guest.maintenanceStatus || 'pending'].label}
                  </span>
                  {readiness.ready && (
                    <span className="dept-badge ready">✅ Room Ready</span>
                  )}
                </div>

                {/* Room Readiness Bar */}
                <div className="readiness-section">
                  <div className="readiness-header">
                    <span>Room Status</span>
                    <span
                      className="readiness-label"
                      style={{ color: readiness.color }}
                    >
                      {readiness.label}
                    </span>
                  </div>
                  <div className="readiness-progress">
                    <div
                      className={`progress-step ${readiness.hkDone ? 'done' : ''}`}
                    >
                      <span className="step-icon">🧹</span>
                      <span>Housekeeping</span>
                      <span className="step-status">{readiness.hkDone ? '✓' : '○'}</span>
                    </div>
                    <div className="progress-connector"></div>
                    <div
                      className={`progress-step ${readiness.maintDone ? 'done' : ''}`}
                    >
                      <span className="step-icon">🔧</span>
                      <span>Maintenance</span>
                      <span className="step-status">{readiness.maintDone ? '✓' : '○'}</span>
                    </div>
                    {readiness.ready && (
                      <>
                        <div className="progress-connector"></div>
                        <div className="progress-step done final">
                          <span className="step-icon">✅</span>
                          <span>READY</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* In-Room Delivery */}
                {guest.inRoomItems && (
                  <div className="delivery-section">
                    <label className="delivery-toggle" htmlFor={`rx-delivery-${guest.id}`}>
                      <input
                        id={`rx-delivery-${guest.id}`}
                        name="inRoomDelivered"
                        type="checkbox"
                        checked={guest.inRoomDelivered || false}
                        onChange={(e) => onUpdateInRoomDelivery(guest.id, e.target.checked)}
                      />
                      <span className="toggle-track">
                        <span className="toggle-thumb"></span>
                      </span>
                      <span className="toggle-label">
                        🎁 In-Room Items Delivered
                      </span>
                    </label>
                    <p className="delivery-items">{guest.inRoomItems}</p>
                    {guest.inRoomDelivered && guest.inRoomDeliveredAt && (
                      <span className="delivery-time">
                        ✓ {new Date(guest.inRoomDeliveredAt).toLocaleTimeString()}
                        {guest.inRoomDeliveredBy && ` by ${guest.inRoomDeliveredBy}`}
                      </span>
                    )}
                  </div>
                )}

                {/* Courtesy Call Notes */}
                {guest.courtesyCallNotes && guest.courtesyCallNotes.length > 0 && (
                  <div className="courtesy-section">
                    <h4>📝 Courtesy Call Notes</h4>
                    {guest.courtesyCallNotes.map(note => (
                      <div key={note.id} className={`courtesy-note ${note.type}`}>
                        <span className="note-icon">
                          {note.type === 'happy' ? '😊' : note.type === 'issue' ? '⚠️' : '📝'}
                        </span>
                        <div className="note-content">
                          <p>{note.note}</p>
                          <span className="note-meta">— {note.author}, {new Date(note.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="card-actions">
                  <select
                    id={`rx-status-${guest.id}`}
                    name="guestStatus"
                    aria-label={`Guest status for ${guest.name}`}
                    className="status-select"
                    value={guestStatus}
                    onChange={(e) => onUpdateGuestStatus(guest.id, e.target.value as GuestStatus)}
                  >
                    {Object.entries(GUEST_STATUS_INFO).map(([key, info]) => (
                      <option key={key} value={key}>{info.emoji} {info.label}</option>
                    ))}
                  </select>

                  {nextAction && (
                    <button
                      className="action-btn primary"
                      onClick={() => onUpdateGuestStatus(guest.id, nextAction.next)}
                    >
                      {nextAction.icon} {nextAction.label}
                    </button>
                  )}

                  {/* Guest Off-Site Button */}
                  {(guestStatus === 'on_site' || guestStatus === 'awaiting_room' || guestStatus === 'checked_in') && (
                    <button
                      className="action-btn offsite"
                      onClick={() => onUpdateGuestStatus(guest.id, 'off_site')}
                    >
                      🚶 Guest Off Site
                    </button>
                  )}

                  {(guestStatus === 'checked_in' || guestStatus === 'courtesy_call_due') && (
                    <button
                      className="action-btn courtesy"
                      onClick={() => setCourtesyModal({
                        guestId: guest.id,
                        guestName: guest.name,
                        room: guest.room
                      })}
                    >
                      📞 Courtesy Call
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Courtesy Call Modal */}
      {courtesyModal && (
        <div className="modal-overlay" onClick={() => setCourtesyModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📞 Courtesy Call</h3>
            <p className="modal-room">{courtesyModal.room} - {courtesyModal.guestName}</p>

            <div className="form-group">
              <label htmlFor="rx-courtesy-author">Your Name</label>
              <input
                id="rx-courtesy-author"
                name="authorName"
                autoComplete="name"
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="form-group">
              <label>How was the call?</label>
              <div className="type-buttons">
                <button
                  className={`type-btn happy ${courtesyType === 'happy' ? 'active' : ''}`}
                  onClick={() => setCourtesyType('happy')}
                >
                  😊 Happy
                </button>
                <button
                  className={`type-btn neutral ${courtesyType === 'neutral' ? 'active' : ''}`}
                  onClick={() => setCourtesyType('neutral')}
                >
                  😐 Neutral
                </button>
                <button
                  className={`type-btn issue ${courtesyType === 'issue' ? 'active' : ''}`}
                  onClick={() => setCourtesyType('issue')}
                >
                  ⚠️ Issue
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="rx-courtesy-note">Notes</label>
              <textarea
                id="rx-courtesy-note"
                name="courtesyNote"
                autoComplete="off"
                value={courtesyNote}
                onChange={(e) => setCourtesyNote(e.target.value)}
                placeholder="Enter notes from the call..."
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setCourtesyModal(null)}>Cancel</button>
              <button
                className="btn-submit"
                onClick={handleCourtesySubmit}
                disabled={!courtesyNote.trim()}
              >
                Save & Complete Call
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .rx-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Header */
        .rx-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
          border-radius: 20px;
          padding: 24px 32px;
          margin-bottom: 20px;
          color: white;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          font-size: 48px;
          background: rgba(255,255,255,0.1);
          padding: 16px;
          border-radius: 16px;
        }

        .header-content h1 { margin: 0; font-size: 28px; font-weight: 800; }
        .header-content p { margin: 4px 0 0; opacity: 0.7; font-size: 14px; }

        .header-stats { display: flex; gap: 16px; }

        .stat-item {
          text-align: center;
          padding: 12px 20px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          min-width: 70px;
        }

        .stat-number { display: block; font-size: 28px; font-weight: 800; }
        .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; }

        .stat-item.total .stat-number { color: #c5a065; }
        .stat-item.arriving .stat-number { color: #94a3b8; }
        .stat-item.onsite .stat-number { color: #60a5fa; }
        .stat-item.checked .stat-number { color: #4ade80; }
        .stat-item.courtesy .stat-number { color: #f87171; }

        /* Filter Tabs */
        .filter-tabs {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--bg-container);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 20px;
          align-items: stretch;
        }

        @media (min-width: 900px) {
          .filter-tabs {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px;
          }
        }

        .property-toggles {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-start;
        }

        @media (min-width: 900px) {
          .property-toggles {
            margin-left: auto;
          }
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 20px;
          background: var(--bg-color);
          border: 1px solid var(--border-color);
        }

        .toggle-label:hover {
          border-color: var(--gilpin-gold);
        }

        .toggle-label input {
          width: 14px;
          height: 14px;
          accent-color: #c5a065;
        }

        .tab {
          padding: 10px 18px;
          border: 2px solid transparent;
          background: var(--bg-color);
          border-radius: 25px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          color: var(--text-main);
          transition: all 0.2s;
        }

        .tab:hover { border-color: #c5a065; }
        .tab.active { background: #c5a065; color: #0f172a; }
        .tab.urgent.pulse { animation: urgentPulse 2s infinite; }

        @keyframes urgentPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
        }

        /* Guest List */
        .guest-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          background: var(--bg-container);
          border-radius: 20px;
          border: 2px dashed var(--border-color);
        }

        .empty-icon { font-size: 64px; display: block; margin-bottom: 16px; }
        .empty-state h3 { margin: 0; color: var(--text-bold); }
        .empty-state p { margin: 8px 0 0; color: var(--text-sub); }

        /* Guest Card */
        .guest-card {
          background: var(--bg-container);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 24px;
          transition: all 0.2s;
        }

        .guest-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .guest-identity { display: flex; gap: 16px; align-items: center; }

        .room-badge {
          background: linear-gradient(135deg, #c5a065 0%, #a08050 100%);
          color: #0f172a;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 16px;
          text-transform: uppercase;
        }

        .guest-name { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-bold); }
        .guest-details { font-size: 13px; color: var(--text-sub); }

        .status-pill {
          padding: 8px 16px;
          border-radius: 25px;
          font-size: 12px;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
        }

        /* Readiness Section */
        .readiness-section {
          background: rgba(0,0,0,0.03);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        [data-theme="dark"] .readiness-section { background: rgba(255,255,255,0.03); }

        .readiness-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .readiness-progress {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .progress-step.done { background: #dcfce7; color: #166534; }
        .progress-step.final { background: #22c55e; color: white; }

        .progress-connector {
          width: 20px;
          height: 2px;
          background: var(--border-color);
        }

        /* Delivery Section */
        .delivery-section {
          background: #fef3c7;
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 16px;
        }

        [data-theme="dark"] .delivery-section { background: rgba(251, 191, 36, 0.1); }

        .delivery-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .delivery-toggle input { display: none; }

        .toggle-track {
          width: 44px;
          height: 24px;
          background: #d1d5db;
          border-radius: 12px;
          position: relative;
          transition: background 0.2s;
        }

        .delivery-toggle input:checked + .toggle-track { background: #22c55e; }

        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }

        .delivery-toggle input:checked + .toggle-track .toggle-thumb {
          transform: translateX(20px);
        }

        .toggle-label { font-weight: 600; color: var(--text-bold); }
        .delivery-items { margin: 8px 0 0; font-size: 13px; color: var(--text-main); }
        .delivery-time { font-size: 11px; color: #166534; font-weight: 600; }

        /* Courtesy Section */
        .courtesy-section { margin-bottom: 16px; }
        .courtesy-section h4 { margin: 0 0 10px; font-size: 13px; color: var(--text-main); }

        .courtesy-note {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 8px;
        }

        .courtesy-note.happy { background: #dcfce7; border-left: 4px solid #22c55e; }
        .courtesy-note.issue { background: #fef2f2; border-left: 4px solid #ef4444; }
        .courtesy-note.neutral { background: #f1f5f9; border-left: 4px solid #94a3b8; }

        .note-icon { font-size: 20px; }
        .note-content p { margin: 0; font-size: 13px; color: var(--text-bold); }
        .note-meta { font-size: 11px; color: var(--text-sub); display: block; margin-top: 4px; }

        /* Actions */
        .card-actions { display: flex; gap: 10px; flex-wrap: wrap; }

        .status-select {
          padding: 12px 16px;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-color);
          color: var(--text-main);
          font-size: 13px;
          min-width: 180px;
        }

        .action-btn {
          padding: 12px 20px;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #c5a065 0%, #a08050 100%);
          color: #0f172a;
        }

        .action-btn.courtesy { background: #8b5cf6; color: white; }
        .action-btn.offsite { background: #64748b; color: white; }
        .action-btn:hover { transform: translateY(-2px); filter: brightness(110%); }

        /* Cross-Department Status Badges */
        .dept-status-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .dept-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid rgba(185, 28, 28, 0.15);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .dept-badge.done {
          background: #dcfce7;
          color: #166534;
          border-color: rgba(22, 101, 52, 0.15);
        }

        .dept-badge.ready {
          background: #22c55e;
          color: white;
          border-color: transparent;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(8px);
          padding: 20px;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 24px;
          padding: 32px;
          width: 90%;
          max-width: 480px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(197, 160, 101, 0.3);
          border: 2px solid #c5a065;
        }

        [data-theme="dark"] .modal-content {
          background: #1a1a1a;
          border-color: #c5a065;
        }

        .modal-content h3 { margin: 0; font-size: 22px; color: var(--text-bold); }
        .modal-room { margin: 4px 0 24px; font-size: 14px; color: var(--gilpin-gold); font-weight: 600; }

        .form-group { margin-bottom: 18px; }
        .form-group label {
          display: block;
          font-weight: 600;
          font-size: 12px;
          margin-bottom: 8px;
          text-transform: uppercase;
          color: var(--text-main);
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 14px;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-color);
          color: var(--text-main);
          font-size: 14px;
          box-sizing: border-box;
        }

        .type-buttons { display: flex; gap: 10px; }

        .type-btn {
          flex: 1;
          padding: 14px;
          border: 2px solid var(--border-color);
          background: var(--bg-color);
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          transition: all 0.2s;
        }

        .type-btn.happy.active { background: #dcfce7; border-color: #22c55e; color: #166534; }
        .type-btn.neutral.active { background: #f1f5f9; border-color: #94a3b8; color: #475569; }
        .type-btn.issue.active { background: #fef2f2; border-color: #ef4444; color: #dc2626; }

        .modal-actions { display: flex; gap: 12px; margin-top: 24px; }

        .btn-cancel, .btn-submit {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }

        .btn-cancel {
          border: 2px solid var(--border-color);
          background: transparent;
          color: var(--text-main);
        }

        .btn-submit {
          border: none;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
        }

        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .sort-toggle-btn {
          padding: 8px 16px;
          border-radius: 20px;
          border: 2px solid var(--gilpin-gold, #c5a065);
          background: rgba(197, 160, 101, 0.08);
          color: var(--gilpin-gold, #c5a065);
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .sort-toggle-btn:hover { background: rgba(197, 160, 101, 0.18); }

        @media (max-width: 768px) {
          .rx-header { flex-direction: column; gap: 16px; text-align: center; }
          .header-stats { flex-wrap: wrap; justify-content: center; gap: 8px; }
          .stat-item { min-width: 55px; padding: 8px 12px; }
          .stat-number { font-size: 22px; }
          .stat-label { font-size: 9px; }
          .filter-tabs {
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            gap: 8px;
            padding: 10px 12px;
          }
          .filter-tabs::-webkit-scrollbar { display: none; }
          .filter-tabs .tab { white-space: nowrap; flex-shrink: 0; padding: 8px 14px; font-size: 12px; }
          .filter-tabs .property-toggles { flex-shrink: 0; }
          .card-header { flex-direction: column; gap: 12px; }
          .guest-identity { flex-direction: column; text-align: center; }
          .readiness-progress { flex-wrap: wrap; justify-content: center; }
          .card-actions { flex-direction: column; }
          .status-select { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(ReceptionDashboard);
