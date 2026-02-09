import React, { useMemo, useState } from 'react';
import {
  Guest,
  HKStatus,
  RoomNote,
  HK_STATUS_INFO,
  NOTE_PRIORITY_INFO,
  GUEST_STATUS_INFO,
  getRoomReadinessInfo
} from '../types';
import { getRoomNumber } from '../constants';
import { GeminiService } from '../services/geminiService';

interface HousekeepingDashboardProps {
  guests: Guest[];
  onUpdateHKStatus: (guestId: string, status: HKStatus) => void;
  onAddRoomNote: (guestId: string, note: Omit<RoomNote, 'id' | 'timestamp'>) => void;
  onResolveNote: (guestId: string, noteId: string, resolvedBy: string) => void;
  onViewAuditLog?: (guest: Guest) => void;
}

const HousekeepingDashboard: React.FC<HousekeepingDashboardProps> = ({
  guests,
  onUpdateHKStatus,
  onAddRoomNote,
  onResolveNote,
  onViewAuditLog
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | HKStatus>('all');
  const [showMainHotel, setShowMainHotel] = useState(true);
  const [showLakeHouse, setShowLakeHouse] = useState(true);
  const [noteModal, setNoteModal] = useState<{ guestId: string; room: string } | null>(null);
  const [noteMessage, setNoteMessage] = useState('');
  const [notePriority, setNotePriority] = useState<RoomNote['priority']>('medium');
  const [noteCategory, setNoteCategory] = useState<RoomNote['category']>('issue');
  const [authorName, setAuthorName] = useState('');
  const [aiPriorityRooms, setAiPriorityRooms] = useState<string[]>([]);
  const [aiReasoning, setAiReasoning] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [sortMode, setSortMode] = useState<'eta' | 'room'>('eta');

  // Filter and sort guests
  const filteredGuests = useMemo(() => {
    let result = [...guests];

    result = result.filter(g => {
      const roomNum = getRoomNumber(g.room);
      const isLakeHouse = roomNum >= 51 && roomNum <= 58;
      if (isLakeHouse) return showLakeHouse;
      return showMainHotel;
    });

    if (statusFilter !== 'all') {
      result = result.filter(g => (g.hkStatus || 'pending') === statusFilter);
    }

    return result.sort((a, b) => {
      if (sortMode === 'eta') {
        const etaA = a.eta || '23:59';
        const etaB = b.eta || '23:59';
        return etaA.localeCompare(etaB);
      }
      return getRoomNumber(a.room) - getRoomNumber(b.room);
    });
  }, [guests, statusFilter, showMainHotel, showLakeHouse, sortMode]);

  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<HKStatus, number> = {
      pending: 0,
      in_progress: 0,
      cleaned: 0,
      inspected: 0,
      complete: 0,
    };
    guests.forEach(g => {
      const status = g.hkStatus || 'pending';
      counts[status]++;
    });
    return counts;
  }, [guests]);

  // Get unresolved notes count for a guest
  const getUnresolvedNotesCount = (guest: Guest): number => {
    return (guest.roomNotes || []).filter(n => !n.resolved).length;
  };

  // Handle note submission
  const handleNoteSubmit = () => {
    if (!noteModal || !noteMessage.trim()) return;

    onAddRoomNote(noteModal.guestId, {
      author: authorName || 'Housekeeping',
      department: 'housekeeping',
      priority: notePriority,
      category: noteCategory,
      message: noteMessage.trim(),
    });

    setNoteModal(null);
    setNoteMessage('');
    setNotePriority('medium');
    setNoteCategory('issue');
  };

  // Get next status in workflow
  const getNextStatus = (current: HKStatus): HKStatus | null => {
    const flow: Record<HKStatus, HKStatus | null> = {
      pending: 'in_progress',
      in_progress: 'cleaned',
      cleaned: 'inspected',
      inspected: 'complete',
      complete: null,
    };
    return flow[current];
  };

  return (
    <div className="hk-dashboard">
      {/* Header */}
      <header className="hk-header">
        <div className="header-content">
          <div className="header-icon">🧹</div>
          <div>
            <h1>Housekeeping</h1>
            <p>Room preparation, cleaning workflow & inspection tracking</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item pending">
            <span className="stat-number">{statusCounts.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-item progress">
            <span className="stat-number">{statusCounts.in_progress + statusCounts.cleaned}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-item complete">
            <span className="stat-number">{statusCounts.complete}</span>
            <span className="stat-label">Complete</span>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="status-filters">
          {Object.entries(HK_STATUS_INFO).map(([status, info]) => (
            <button
              key={status}
              className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status as HKStatus)}
              style={{ '--chip-color': info.color } as React.CSSProperties}
            >
              <span>{info.emoji}</span>
              <span>{statusCounts[status as HKStatus]}</span>
            </button>
          ))}
        </div>
        <div className="property-toggles">
          <button
            className={`sort-toggle-btn`}
            onClick={() => setSortMode(sortMode === 'eta' ? 'room' : 'eta')}
            title={`Currently sorted by ${sortMode === 'eta' ? 'ETA' : 'Room Number'}`}
          >
            {sortMode === 'eta' ? '🕐 ETA Order' : '🚪 Room Order'}
          </button>
          <button
            className={`ai-priority-btn ${isLoadingAI ? 'loading' : ''} ${aiPriorityRooms.length > 0 ? 'active' : ''}`}
            disabled={isLoadingAI}
            onClick={async () => {
              if (aiPriorityRooms.length > 0) {
                setAiPriorityRooms([]);
                setAiReasoning('');
                return;
              }
              setIsLoadingAI(true);
              const result = await GeminiService.suggestCleaningOrder(guests);
              setIsLoadingAI(false);
              if (result) {
                setAiPriorityRooms(result.roomOrder);
                setAiReasoning(result.reasoning);
              }
            }}
          >
            {isLoadingAI ? '⏳' : '🤖'} {isLoadingAI ? 'Thinking...' : aiPriorityRooms.length > 0 ? 'Clear AI' : 'AI Priority'}
          </button>
          <label className="toggle-label">
            <input type="checkbox" checked={showMainHotel} onChange={e => setShowMainHotel(e.target.checked)} />
            <span>🏨 Main (1-31)</span>
          </label>
          <label className="toggle-label">
            <input type="checkbox" checked={showLakeHouse} onChange={e => setShowLakeHouse(e.target.checked)} />
            <span>🏡 Lake (51-58)</span>
          </label>
        </div>
      </div>

      {/* AI Reasoning Banner */}
      {aiPriorityRooms.length > 0 && aiReasoning && (
        <div className="ai-reasoning-banner">
          <span className="ai-icon">🤖</span>
          <div>
            <div className="ai-reasoning-title">AI Cleaning Priority</div>
            <p className="ai-reasoning-text">{aiReasoning}</p>
          </div>
        </div>
      )}

      {/* Room Grid */}
      <div className="room-grid">
        {filteredGuests.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✨</span>
            <h3>All Clear!</h3>
            <p>No rooms match your current filter</p>
          </div>
        ) : (
          filteredGuests.map(guest => {
            const hkStatus = guest.hkStatus || 'pending';
            const hkInfo = HK_STATUS_INFO[hkStatus];
            const readiness = getRoomReadinessInfo(guest);
            const nextStatus = getNextStatus(hkStatus);
            const unresolvedNotes = getUnresolvedNotesCount(guest);
            const roomNotes = (guest.roomNotes || []).filter(n => !n.resolved);

            const aiPriorityIndex = aiPriorityRooms.findIndex(r => r.toLowerCase() === guest.room.toLowerCase());

            return (
              <div
                key={guest.id}
                className={`room-card ${aiPriorityIndex >= 0 ? 'ai-highlighted' : ''}`}
                style={{ '--card-accent': hkInfo.color } as React.CSSProperties}
              >
                {/* AI Priority Badge */}
                {aiPriorityIndex >= 0 && (
                  <div className="ai-priority-badge">
                    #{aiPriorityIndex + 1}
                  </div>
                )}

                {/* Card Header */}
                <div className="card-header">
                  <div className="room-info">
                    <span className="room-number">{guest.room}</span>
                    {unresolvedNotes > 0 && (
                      <span className="note-badge" title={`${unresolvedNotes} unresolved note(s)`}>
                        📝 {unresolvedNotes}
                      </span>
                    )}
                    {onViewAuditLog && (guest.activityLog?.length || 0) > 0 && (
                      <button
                        className="audit-btn"
                        onClick={() => onViewAuditLog(guest)}
                        title="View activity log"
                      >
                        📜 {guest.activityLog!.length}
                      </button>
                    )}
                  </div>
                  <span
                    className="status-badge"
                    style={{ background: hkInfo.bgColor, color: hkInfo.color }}
                  >
                    {hkInfo.emoji} {hkInfo.label}
                  </span>
                </div>

                {/* Guest Presence Indicator — any status beyond pre_arrival shows presence */}
                {guest.guestStatus && guest.guestStatus !== 'pre_arrival' && (
                  <div className={`guest-presence-badge ${guest.guestStatus === 'off_site' ? 'off-site' : 'on-site'}`}>
                    <span className="presence-dot"></span>
                    <span className="presence-text">
                      {guest.guestStatus === 'off_site'
                        ? '🔴 Guest Off Site'
                        : '🟢 Guest On Site'}
                    </span>
                  </div>
                )}

                {/* Guest Info */}
                <div className="guest-info">
                  <p className="guest-name">{guest.name}</p>
                  <p className="guest-eta">ETA: {guest.eta || 'N/A'}</p>
                </div>

                {/* Room Readiness Indicator */}
                <div className="readiness-bar">
                  <div className="readiness-item" data-done={readiness.hkDone}>
                    <span>🧹 HK</span>
                    <span>{readiness.hkDone ? '✓' : '○'}</span>
                  </div>
                  <div className="readiness-item" data-done={readiness.maintDone}>
                    <span>🔧 Maint</span>
                    <span>{readiness.maintDone ? '✓' : '○'}</span>
                  </div>
                  {readiness.ready && (
                    <div className="readiness-complete">✅ READY</div>
                  )}
                </div>

                {/* Room Notes Preview */}
                {roomNotes.length > 0 && (
                  <div className="notes-preview">
                    {roomNotes.slice(0, 2).map(note => (
                      <div
                        key={note.id}
                        className="note-item"
                        style={{ background: NOTE_PRIORITY_INFO[note.priority].bgColor }}
                      >
                        <span className="note-priority">{NOTE_PRIORITY_INFO[note.priority].emoji}</span>
                        <span className="note-text">{note.message}</span>
                        <button
                          className="resolve-btn"
                          onClick={() => onResolveNote(guest.id, note.id, 'Housekeeping')}
                          title="Mark as resolved"
                        >
                          ✓
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="card-actions">
                  {nextStatus && (
                    <button
                      className="action-btn primary"
                      onClick={() => onUpdateHKStatus(guest.id, nextStatus)}
                    >
                      {HK_STATUS_INFO[nextStatus].emoji} {HK_STATUS_INFO[nextStatus].label}
                    </button>
                  )}
                  <button
                    className="action-btn secondary"
                    onClick={() => setNoteModal({ guestId: guest.id, room: guest.room })}
                  >
                    📝 Add Note
                  </button>
                </div>

                {/* Status Dropdown */}
                <select
                  className="status-select"
                  value={hkStatus}
                  onChange={(e) => onUpdateHKStatus(guest.id, e.target.value as HKStatus)}
                >
                  {Object.entries(HK_STATUS_INFO).map(([key, info]) => (
                    <option key={key} value={key}>{info.emoji} {info.label}</option>
                  ))}
                </select>
              </div>
            );
          })
        )}
      </div>

      {/* Add Note Modal */}
      {noteModal && (
        <div className="modal-overlay" onClick={() => setNoteModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>📝 Add Room Note - {noteModal.room}</h3>
            <p className="modal-subtitle">This note will be visible to all departments</p>

            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <div className="priority-buttons">
                {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                  <button
                    key={p}
                    className={`priority-btn ${notePriority === p ? 'active' : ''}`}
                    onClick={() => setNotePriority(p)}
                    style={{ '--btn-color': NOTE_PRIORITY_INFO[p].color } as React.CSSProperties}
                  >
                    {NOTE_PRIORITY_INFO[p].emoji} {NOTE_PRIORITY_INFO[p].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Category</label>
              <div className="category-buttons">
                <button
                  className={`cat-btn ${noteCategory === 'issue' ? 'active' : ''}`}
                  onClick={() => setNoteCategory('issue')}
                >⚠️ Issue</button>
                <button
                  className={`cat-btn ${noteCategory === 'request' ? 'active' : ''}`}
                  onClick={() => setNoteCategory('request')}
                >📋 Request</button>
                <button
                  className={`cat-btn ${noteCategory === 'info' ? 'active' : ''}`}
                  onClick={() => setNoteCategory('info')}
                >ℹ️ Info</button>
              </div>
            </div>

            <div className="form-group">
              <label>Note</label>
              <textarea
                value={noteMessage}
                onChange={(e) => setNoteMessage(e.target.value)}
                placeholder="Describe the issue or note (e.g., 'Broken lamp in bathroom needs replacement')"
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setNoteModal(null)}>Cancel</button>
              <button
                className="btn-submit"
                onClick={handleNoteSubmit}
                disabled={!noteMessage.trim()}
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hk-dashboard {
          padding: 20px;
          max-width: 1600px;
          margin: 0 auto;
        }

        /* Header */
        .hk-header {
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

        .header-content h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
        }

        .header-content p {
          margin: 4px 0 0;
          opacity: 0.7;
          font-size: 14px;
        }

        .header-stats {
          display: flex;
          gap: 24px;
        }

        .stat-item {
          text-align: center;
          padding: 12px 20px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          min-width: 80px;
        }

        .stat-number {
          display: block;
          font-size: 28px;
          font-weight: 800;
        }

        .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.8;
        }

        .stat-item.pending .stat-number { color: #f87171; }
        .stat-item.progress .stat-number { color: #fbbf24; }
        .stat-item.complete .stat-number { color: #4ade80; }

        /* Filter Bar */
        .filter-bar {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          background: var(--bg-container);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 20px;
          gap: 12px;
        }

        @media (min-width: 900px) {
          .filter-bar {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 16px;
          }
        }

        .status-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-chip {
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

        .filter-chip:hover {
          border-color: var(--chip-color);
        }

        .filter-chip.active {
          border-color: var(--chip-color);
          background: var(--chip-color);
          color: white;
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

        .toggle-label:hover {
          border-color: var(--gilpin-gold, #c5a065);
        }

        /* Room Grid */
        .room-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
          background: var(--bg-container);
          border-radius: 20px;
          border: 2px dashed var(--border-color);
        }

        .empty-icon {
          font-size: 64px;
          display: block;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0;
          color: var(--text-bold);
        }

        .empty-state p {
          margin: 8px 0 0;
          color: var(--text-sub);
        }

        /* Room Card */
        .room-card {
          background: var(--bg-container);
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--card-accent);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.2s;
        }

        /* Guest Presence Badge */
        .guest-presence-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .guest-presence-badge.on-site {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }

        .guest-presence-badge.off-site {
          background: rgba(100, 116, 139, 0.1);
          color: #64748b;
          border: 1px solid rgba(100, 116, 139, 0.25);
        }

        .presence-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .guest-presence-badge.on-site .presence-dot {
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
        }

        .guest-presence-badge.off-site .presence-dot {
          background: #94a3b8;
        }

        .room-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .room-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .room-number {
          font-size: 18px;
          font-weight: 800;
          color: var(--gilpin-gold);
          text-transform: uppercase;
        }

        .note-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .guest-info {
          margin-bottom: 12px;
        }

        .guest-name {
          margin: 0;
          font-weight: 600;
          color: var(--text-bold);
          font-size: 15px;
        }

        .guest-eta {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--text-sub);
        }

        /* Readiness Bar */
        .readiness-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
          padding: 10px;
          background: rgba(0,0,0,0.03);
          border-radius: 10px;
        }

        [data-theme="dark"] .readiness-bar {
          background: rgba(255,255,255,0.05);
        }

        .readiness-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          padding: 4px 10px;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 12px;
          font-weight: 600;
        }

        .readiness-item[data-done="true"] {
          background: #dcfce7;
          color: #166534;
        }

        .readiness-complete {
          margin-left: auto;
          background: #22c55e;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }

        /* Notes Preview */
        .notes-preview {
          margin-bottom: 12px;
        }

        .note-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          margin-bottom: 6px;
          font-size: 12px;
        }

        .note-priority {
          flex-shrink: 0;
        }

        .note-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text-main);
        }

        .resolve-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1px solid #22c55e;
          background: #dcfce7;
          color: #166534;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .resolve-btn:hover {
          background: #22c55e;
          color: white;
        }

        /* Card Actions */
        .card-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .action-btn {
          flex: 1;
          padding: 10px 12px;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #c5a065 0%, #a08050 100%);
          color: #0f172a;
        }

        .action-btn.secondary {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .action-btn:hover {
          transform: translateY(-1px);
          filter: brightness(110%);
        }

        .status-select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-color);
          color: var(--text-main);
          font-size: 12px;
          cursor: pointer;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
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

        .modal-content h3 {
          margin: 0 0 4px;
          color: #0f172a;
          font-size: 22px;
          font-weight: 800;
        }
        
        [data-theme="dark"] .modal-content h3 {
          color: #ffffff;
        }

        .modal-subtitle {
          margin: 0 0 24px;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
        
        [data-theme="dark"] .modal-subtitle {
          color: #94a3b8;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-weight: 700;
          font-size: 11px;
          color: #374151;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        [data-theme="dark"] .form-group label {
          color: #e5e7eb;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 14px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          color: #0f172a;
          font-size: 14px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #c5a065;
        }
        
        [data-theme="dark"] .form-group input,
        [data-theme="dark"] .form-group textarea {
          background: #262626;
          border-color: #404040;
          color: #f5f5f5;
        }

        .priority-buttons,
        .category-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .priority-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid var(--border-color);
          background: var(--bg-color);
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          transition: all 0.2s;
        }

        .priority-btn.active {
          border-color: var(--btn-color);
          background: var(--btn-color);
          color: white;
        }

        .cat-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid var(--border-color);
          background: var(--bg-color);
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          transition: all 0.2s;
        }

        .cat-btn.active {
          border-color: #c5a065;
          background: rgba(197, 160, 101, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .btn-cancel {
          flex: 1;
          padding: 14px;
          border: 2px solid var(--border-color);
          background: transparent;
          border-radius: 10px;
          cursor: pointer;
          color: var(--text-main);
          font-weight: 600;
          font-size: 14px;
        }

        .btn-submit {
          flex: 1;
          padding: 14px;
          border: none;
          background: linear-gradient(135deg, #c5a065 0%, #a08050 100%);
          color: #0f172a;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 700;
          font-size: 14px;
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

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

        .ai-priority-btn {
          padding: 8px 16px;
          border-radius: 20px;
          border: 2px solid #8b5cf6;
          background: rgba(139, 92, 246, 0.08);
          color: #8b5cf6;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ai-priority-btn:hover { background: rgba(139, 92, 246, 0.15); }
        .ai-priority-btn.loading { opacity: 0.6; cursor: wait; }
        .ai-priority-btn.active {
          background: #8b5cf6;
          color: white;
        }

        .ai-reasoning-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 20px;
          margin-bottom: 16px;
          background: rgba(139, 92, 246, 0.06);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 16px;
        }
        .ai-icon { font-size: 20px; margin-top: 2px; }
        .ai-reasoning-title {
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #8b5cf6;
          margin-bottom: 4px;
        }
        .ai-reasoning-text {
          font-size: 12px;
          color: var(--text-main);
          line-height: 1.5;
          margin: 0;
        }

        .room-card.ai-highlighted {
          border: 2px solid #8b5cf6 !important;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.15);
          position: relative;
        }

        .ai-priority-badge {
          position: absolute;
          top: -10px;
          right: -6px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          color: white;
          font-weight: 900;
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 20px;
          z-index: 1;
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
        }

        .audit-btn {
          padding: 2px 8px;
          border-radius: 12px;
          border: 1px solid rgba(197, 160, 101, 0.2);
          background: rgba(197, 160, 101, 0.06);
          color: #c5a065;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .audit-btn:hover {
          background: rgba(197, 160, 101, 0.15);
        }

        @media (max-width: 768px) {
          .hk-header {
            flex-direction: column;
            gap: 20px;
            text-align: center;
          }

          .header-stats {
            width: 100%;
            justify-content: center;
          }

          .filter-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .status-filters {
            justify-content: center;
          }

          .property-toggles {
            justify-content: center;
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .ai-priority-btn {
            width: 100%;
            justify-content: center;
          }
          
          .ai-reasoning-banner {
            flex-direction: column;
            gap: 8px;
          }

          .room-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default HousekeepingDashboard;
