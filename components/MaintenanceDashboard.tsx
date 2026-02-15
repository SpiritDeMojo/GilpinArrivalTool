import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Guest,
  MaintenanceStatus,
  RoomNote,
  MAINTENANCE_STATUS_INFO,
  NOTE_PRIORITY_INFO,
  GUEST_STATUS_INFO,
  getRoomReadinessInfo
} from '../types';
import { getRoomNumber } from '../constants';
import { GeminiService } from '../services/geminiService';

interface MaintenanceDashboardProps {
  guests: Guest[];
  onUpdateMaintenanceStatus: (guestId: string, status: MaintenanceStatus) => void;
  onAddRoomNote: (guestId: string, note: Omit<RoomNote, 'id' | 'timestamp'>) => void;
  onResolveNote: (guestId: string, noteId: string, resolvedBy: string) => void;
  onViewAuditLog?: (guest: Guest) => void;
}

const MaintenanceDashboard: React.FC<MaintenanceDashboardProps> = ({
  guests,
  onUpdateMaintenanceStatus,
  onAddRoomNote,
  onResolveNote,
  onViewAuditLog
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceStatus>('all');
  const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(false);
  const [showMainHotel, setShowMainHotel] = useState(true);
  const [showLakeHouse, setShowLakeHouse] = useState(true);
  const [noteModal, setNoteModal] = useState<{ guestId: string; room: string } | null>(null);
  const [noteMessage, setNoteMessage] = useState('');
  const [notePriority, setNotePriority] = useState<RoomNote['priority']>('medium');
  const [noteCategory, setNoteCategory] = useState<RoomNote['category']>('info');
  const [authorName, setAuthorName] = useState('');
  const [sortMode, setSortMode] = useState<'eta' | 'room'>('eta');
  const [aiPriorityRooms, setAiPriorityRooms] = useState<string[]>([]);
  const [aiReasoning, setAiReasoning] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [maintTab, setMaintTab] = useState<'rooms' | 'issueLog'>('rooms');
  const [logFilter, setLogFilter] = useState<'all' | 'open' | 'resolved'>('all');

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

    if (statusFilter !== 'all') {
      result = result.filter(g => (g.maintenanceStatus || 'pending') === statusFilter);
    }

    if (showOnlyWithNotes) {
      result = result.filter(g => (g.roomNotes || []).some(n => !n.resolved));
    }

    return result.sort((a, b) => {
      // Prioritize rooms with urgent notes
      const aUrgent = (a.roomNotes || []).some(n => !n.resolved && n.priority === 'urgent');
      const bUrgent = (b.roomNotes || []).some(n => !n.resolved && n.priority === 'urgent');
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      if (sortMode === 'eta') {
        const etaA = a.eta || '23:59';
        const etaB = b.eta || '23:59';
        return etaA.localeCompare(etaB);
      }
      return getRoomNumber(a.room) - getRoomNumber(b.room);
    });
  }, [guests, statusFilter, showOnlyWithNotes, showMainHotel, showLakeHouse, sortMode]);

  // Counts
  const pendingCount = guests.filter(g => (g.maintenanceStatus || 'pending') === 'pending').length;
  const inProgressCount = guests.filter(g => g.maintenanceStatus === 'in_progress').length;
  const completeCount = guests.filter(g => g.maintenanceStatus === 'complete').length;
  const roomsWithNotes = guests.filter(g => (g.roomNotes || []).some(n => !n.resolved)).length;

  // Handle note submission
  const handleNoteSubmit = () => {
    if (!noteModal || !noteMessage.trim()) return;

    onAddRoomNote(noteModal.guestId, {
      author: authorName || 'Maintenance',
      department: 'maintenance',
      priority: notePriority,
      category: noteCategory,
      message: noteMessage.trim(),
    });

    setNoteModal(null);
    setNoteMessage('');
    setNotePriority('medium');
    setNoteCategory('info');
  };

  // ── All room notes for the issue log ──────────────────────────────────────
  const allNotes = useMemo(() => {
    const notes: { guest: Guest; note: RoomNote }[] = [];
    guests.forEach(g => {
      (g.roomNotes || []).forEach(n => {
        notes.push({ guest: g, note: n });
      });
    });
    // Filter
    let filtered = notes;
    if (logFilter === 'open') filtered = notes.filter(n => !n.note.resolved);
    if (logFilter === 'resolved') filtered = notes.filter(n => n.note.resolved);
    // Sort newest first
    filtered.sort((a, b) => b.note.timestamp - a.note.timestamp);
    return filtered;
  }, [guests, logFilter]);

  // ── Print issue log ──────────────────────────────────────────────────────
  const printIssueLog = () => {
    const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const rows = allNotes.map(({ guest, note }) => {
      const priority = NOTE_PRIORITY_INFO[note.priority];
      const status = note.resolved ? `Resolved by ${note.resolvedBy || '—'}` : 'Open';
      const time = new Date(note.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      return `<tr>
        <td>${guest.room}</td>
        <td>${priority.emoji} ${priority.label}</td>
        <td>${note.message}</td>
        <td>${note.author} (${note.department})</td>
        <td>${time}</td>
        <td>${status}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>Maintenance Issue Log</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1e293b}
      h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;font-weight:400;color:#64748b;margin:0 0 24px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#1e3a5f;color:#fff;padding:10px 12px;text-align:left;font-weight:600}
      td{padding:10px 12px;border-bottom:1px solid #e2e8f0}
      tr:nth-child(even){background:#f8fafc}
      .logo{text-align:center;margin-bottom:24px}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="logo">🔧</div>
    <h1>Gilpin Hotel — Maintenance Issue Log</h1>
    <h2>${dateStr} • ${allNotes.length} issue(s)</h2>
    <table><thead><tr><th>Room</th><th>Priority</th><th>Issue</th><th>Reported By</th><th>Date</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  return (
    <div className="mt-dashboard">
      {/* Header — animated entrance */}
      <motion.header
        className="mt-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="header-content">
          <div className="header-icon">🔧</div>
          <div>
            <h1>Maintenance</h1>
            <p>Pre-arrival room checks, issue logging & resolution tracking</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item pending">
            <span className="stat-number">{pendingCount}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-item progress">
            <span className="stat-number">{inProgressCount}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-item complete">
            <span className="stat-number">{completeCount}</span>
            <span className="stat-label">Complete</span>
          </div>
          {roomsWithNotes > 0 && (
            <div className="stat-item notes">
              <span className="stat-number">{roomsWithNotes}</span>
              <span className="stat-label">With Issues</span>
            </div>
          )}
        </div>
      </motion.header>

      {/* Tab Bar */}
      <div className="mt-tab-bar">
        <button
          className={`mt-tab ${maintTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setMaintTab('rooms')}
        >
          🔧 Active Rooms
        </button>
        <button
          className={`mt-tab ${maintTab === 'issueLog' ? 'active' : ''}`}
          onClick={() => setMaintTab('issueLog')}
        >
          📋 Issue Log ({allNotes.length})
        </button>
      </div>

      {maintTab === 'rooms' ? (
        <>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="status-filters">
              <button
                className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All Rooms
              </button>
              {Object.entries(MAINTENANCE_STATUS_INFO).map(([status, info]) => (
                <button
                  key={status}
                  className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status as MaintenanceStatus)}
                  style={{ '--chip-color': info.color } as React.CSSProperties}
                >
                  {info.emoji} {info.label}
                </button>
              ))}
            </div>
            <label className="toggle-label highlight" htmlFor="mt-show-notes-only">
              <input
                id="mt-show-notes-only"
                name="showOnlyWithNotes"
                type="checkbox"
                checked={showOnlyWithNotes}
                onChange={e => setShowOnlyWithNotes(e.target.checked)}
              />
              <span>🚨 Show only rooms with issues</span>
            </label>
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
              <label className="toggle-label" htmlFor="mt-show-main">
                <input id="mt-show-main" name="showMainHotel" type="checkbox" checked={showMainHotel} onChange={e => setShowMainHotel(e.target.checked)} />
                <span>🏨 Main (1-31)</span>
              </label>
              <label className="toggle-label" htmlFor="mt-show-lake">
                <input id="mt-show-lake" name="showLakeHouse" type="checkbox" checked={showLakeHouse} onChange={e => setShowLakeHouse(e.target.checked)} />
                <span>🏡 Lake (51-58)</span>
              </label>
            </div>
          </div>

          {/* AI Reasoning Banner */}
          {aiPriorityRooms.length > 0 && aiReasoning && (
            <div className="ai-reasoning-banner">
              <span className="ai-icon">🤖</span>
              <div>
                <div className="ai-reasoning-title">AI Maintenance Priority</div>
                <p className="ai-reasoning-text">{aiReasoning}</p>
              </div>
            </div>
          )}

          {/* Room List — staggered entrance */}
          <motion.div
            className="room-list"
            initial="hidden"
            animate="show"
            key={statusFilter + sortMode + String(showMainHotel) + String(showLakeHouse) + String(showOnlyWithNotes)}
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.04 } },
            }}
          >
            {filteredGuests.length === 0 ? (
              <motion.div
                className="empty-state"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <span className="empty-icon">✅</span>
                <h3>All Clear!</h3>
                <p>No rooms need attention</p>
              </motion.div>
            ) : (
              filteredGuests.map(guest => {
                const maintStatus = guest.maintenanceStatus || 'pending';
                const maintInfo = MAINTENANCE_STATUS_INFO[maintStatus];
                const readiness = getRoomReadinessInfo(guest);
                const roomNotes = (guest.roomNotes || []).filter(n => !n.resolved);
                const hasUrgentNote = roomNotes.some(n => n.priority === 'urgent' || n.priority === 'high');
                const aiPriorityIndex = aiPriorityRooms.findIndex(r => r.toLowerCase() === guest.room.toLowerCase());

                return (
                  <motion.div
                    key={guest.id}
                    className={`room-row ${hasUrgentNote ? 'urgent' : ''} ${aiPriorityIndex >= 0 ? 'ai-highlighted' : ''}`}
                    variants={{
                      hidden: { opacity: 0, y: 24, scale: 0.94, filter: 'blur(5px)', rotateX: 6 },
                      show: {
                        opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', rotateX: 0,
                        transition: { type: 'spring', stiffness: 300, damping: 24 },
                      },
                    }}
                    whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(197, 160, 101, 0.18), 0 0 0 1px rgba(197, 160, 101, 0.08)' }}
                    style={{ perspective: 800 }}
                  >
                    {/* AI Priority Badge */}
                    {aiPriorityIndex >= 0 && (
                      <div className="ai-priority-badge">
                        #{aiPriorityIndex + 1}
                      </div>
                    )}
                    {/* Room Info */}
                    <div className="row-main">
                      <div className="room-header">
                        <span className="room-number">{guest.room}</span>
                        <span className="guest-name">{guest.name}</span>
                        <span className="eta-badge">ETA {guest.eta || 'N/A'}</span>
                        {guest.guestStatus && guest.guestStatus !== 'pre_arrival' && (
                          <span className={`guest-presence-chip ${guest.guestStatus === 'off_site' ? 'off-site' : 'on-site'}`}>
                            {guest.guestStatus === 'off_site'
                              ? '🔴 Off Site'
                              : '🟢 On Site'}
                          </span>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div className="status-badges">
                        <span
                          className="status-badge"
                          style={{ background: maintInfo.bgColor, color: maintInfo.color }}
                        >
                          {maintInfo.emoji} {maintInfo.label}
                        </span>
                        <div className="readiness-chips">
                          <span className={`ready-chip ${readiness.hkDone ? 'done' : ''}`}>
                            🧹 HK {readiness.hkDone ? '✓' : '○'}
                          </span>
                          <span className={`ready-chip ${readiness.maintDone ? 'done' : ''}`}>
                            🔧 Maint {readiness.maintDone ? '✓' : '○'}
                          </span>
                        </div>
                        {readiness.ready && (
                          <span className="ready-badge">✅ READY FOR GUEST</span>
                        )}
                      </div>
                    </div>

                    {/* Notes Section */}
                    {roomNotes.length > 0 && (
                      <div className="notes-section">
                        <h4>📝 Room Notes ({roomNotes.length})</h4>
                        <div className="notes-list">
                          {roomNotes.map(note => (
                            <div
                              key={note.id}
                              className="note-card"
                              style={{ borderLeftColor: NOTE_PRIORITY_INFO[note.priority].color }}
                            >
                              <div className="note-header">
                                <span
                                  className="note-priority"
                                  style={{
                                    background: NOTE_PRIORITY_INFO[note.priority].bgColor,
                                    color: NOTE_PRIORITY_INFO[note.priority].color
                                  }}
                                >
                                  {NOTE_PRIORITY_INFO[note.priority].emoji} {NOTE_PRIORITY_INFO[note.priority].label}
                                </span>
                                <span className="note-dept">{note.department}</span>
                                <span className="note-time">
                                  {new Date(note.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="note-message">{note.message}</p>
                              <div className="note-footer">
                                <span className="note-author">— {note.author}</span>
                                <button
                                  className="resolve-btn"
                                  onClick={() => onResolveNote(guest.id, note.id, 'Maintenance')}
                                >
                                  ✓ Mark Resolved
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="row-actions">
                      <select
                        id={`mt-status-${guest.id}`}
                        name="maintenanceStatus"
                        aria-label={`Maintenance status for room ${guest.room}`}
                        className="status-select"
                        value={maintStatus}
                        onChange={(e) => onUpdateMaintenanceStatus(guest.id, e.target.value as MaintenanceStatus)}
                      >
                        {Object.entries(MAINTENANCE_STATUS_INFO).map(([key, info]) => (
                          <option key={key} value={key}>{info.emoji} {info.label}</option>
                        ))}
                      </select>

                      {maintStatus === 'pending' && (
                        <motion.button
                          className="action-btn start"
                          onClick={() => onUpdateMaintenanceStatus(guest.id, 'in_progress')}
                          whileTap={{ scale: 0.92 }}
                          whileHover={{ scale: 1.03 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        >
                          ⚙️ Start Check
                        </motion.button>
                      )}
                      {maintStatus === 'in_progress' && (
                        <motion.button
                          className="action-btn complete"
                          onClick={() => onUpdateMaintenanceStatus(guest.id, 'complete')}
                          whileTap={{ scale: 0.92 }}
                          whileHover={{ scale: 1.03 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        >
                          ✅ Mark Complete
                        </motion.button>
                      )}
                      <motion.button
                        className="action-btn note"
                        onClick={() => setNoteModal({ guestId: guest.id, room: guest.room })}
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ scale: 1.03 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      >
                        📝 Add Note
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </>
      ) : (
        /* ─── ISSUE LOG TAB ─── */
        <div className="issue-log-section">
          <div className="issue-log-controls">
            <div className="log-filters">
              <button className={`filter-chip ${logFilter === 'all' ? 'active' : ''}`} onClick={() => setLogFilter('all')}>All ({allNotes.length})</button>
              <button className={`filter-chip ${logFilter === 'open' ? 'active' : ''}`} onClick={() => setLogFilter('open')} style={{ '--chip-color': '#f59e0b' } as React.CSSProperties}>⏳ Open</button>
              <button className={`filter-chip ${logFilter === 'resolved' ? 'active' : ''}`} onClick={() => setLogFilter('resolved')} style={{ '--chip-color': '#22c55e' } as React.CSSProperties}>✅ Resolved</button>
            </div>
            <button className="print-log-btn" onClick={printIssueLog}>
              🖨️ Print Log
            </button>
          </div>

          {allNotes.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <h3>No Issues Logged</h3>
              <p>Room notes will appear here once reported</p>
            </div>
          ) : (
            <div className="issue-log-list">
              {allNotes.map(({ guest, note }) => (
                <div key={note.id} className={`issue-log-row ${note.resolved ? 'resolved' : ''}`}>
                  <div className="issue-log-room">
                    <span className="room-number">{guest.room}</span>
                    <span className="guest-name">{guest.name}</span>
                  </div>
                  <div className="issue-log-body">
                    <div className="issue-log-meta">
                      <span className="note-priority" style={{ background: NOTE_PRIORITY_INFO[note.priority].bgColor, color: NOTE_PRIORITY_INFO[note.priority].color }}>
                        {NOTE_PRIORITY_INFO[note.priority].emoji} {NOTE_PRIORITY_INFO[note.priority].label}
                      </span>
                      <span className="note-dept">{note.department}</span>
                      <span className="note-time">{new Date(note.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="issue-log-message">{note.message}</p>
                    <div className="issue-log-footer">
                      <span className="note-author">Reported by {note.author}</span>
                      {note.resolved ? (
                        <span className="resolved-badge">✅ Resolved by {note.resolvedBy} • {note.resolvedAt ? new Date(note.resolvedAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      ) : (
                        <button className="resolve-btn" onClick={() => onResolveNote(guest.id, note.id, 'Maintenance')}>✓ Mark Resolved</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Note Modal — rendered via Portal to escape transform containment */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {noteModal && (
            <motion.div
              className="modal-overlay"
              onClick={() => setNoteModal(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              >
                <h3>📝 Add Room Note - {noteModal.room}</h3>
                <p className="modal-subtitle">This note will be visible to all departments</p>

                <div className="form-group">
                  <label htmlFor="mt-note-author">Your Name</label>
                  <input
                    id="mt-note-author"
                    name="authorName"
                    autoComplete="name"
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
                    >⚠️ Issue Found</button>
                    <button
                      className={`cat-btn ${noteCategory === 'resolved' ? 'active' : ''}`}
                      onClick={() => setNoteCategory('resolved')}
                    >✅ Fixed</button>
                    <button
                      className={`cat-btn ${noteCategory === 'info' ? 'active' : ''}`}
                      onClick={() => setNoteCategory('info')}
                    >ℹ️ Info</button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="mt-note-msg">Note</label>
                  <textarea
                    id="mt-note-msg"
                    name="noteMessage"
                    autoComplete="off"
                    value={noteMessage}
                    onChange={(e) => setNoteMessage(e.target.value)}
                    placeholder="Describe the issue or work completed..."
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <style>{`
        .mt-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Header */
        .mt-header {
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
          gap: 16px;
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

        .stat-item.pending .stat-number { color: #fbbf24; }
        .stat-item.progress .stat-number { color: #60a5fa; }
        .stat-item.complete .stat-number { color: #4ade80; }
        .stat-item.notes .stat-number { color: #f87171; }

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
          padding: 8px 16px;
          border: 2px solid var(--border-color);
          background: var(--bg-color);
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }

        .filter-chip:hover {
          border-color: var(--chip-color, #c5a065);
        }

        .filter-chip.active {
          background: var(--chip-color, #c5a065);
          border-color: var(--chip-color, #c5a065);
          color: white;
        }

        .toggle-label.highlight {
          background: #fef2f2;
          padding: 8px 16px;
          border-radius: 20px;
          border: 2px solid #fecaca;
          color: #dc2626;
          font-weight: 600;
          font-size: 13px;
        }

        [data-theme="dark"] .toggle-label.highlight {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
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
        }

        .toggle-label:hover {
          border-color: var(--gilpin-gold);
        }

        .toggle-label input {
          width: 16px;
          height: 16px;
          accent-color: #c5a065;
        }

        .toggle-label input {
          margin-right: 8px;
          accent-color: #dc2626;
        }

        /* Room List */
        .room-list {
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

        .empty-icon {
          font-size: 64px;
          display: block;
          margin-bottom: 16px;
        }

        .empty-state h3 { margin: 0; color: var(--text-bold); }
        .empty-state p { margin: 8px 0 0; color: var(--text-sub); }

        /* Room Row */
        .room-row {
          background: var(--bg-container);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.2s;
        }

        /* Guest Presence Chip */
        .guest-presence-chip {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .guest-presence-chip.on-site {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }

        .guest-presence-chip.off-site {
          background: rgba(100, 116, 139, 0.12);
          color: #64748b;
          border: 1px solid rgba(100, 116, 139, 0.25);
        }

        .room-row.urgent {
          border-left: 4px solid #dc2626;
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, var(--bg-container) 100%);
        }

        .room-row:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .row-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .room-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .room-number {
          font-size: 18px;
          font-weight: 800;
          color: var(--gilpin-gold);
          text-transform: uppercase;
        }

        .guest-name {
          font-weight: 600;
          color: var(--text-bold);
        }

        .eta-badge {
          background: #f1f5f9;
          color: #475569;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        [data-theme="dark"] .eta-badge {
          background: rgba(255,255,255,0.1);
          color: var(--text-sub);
        }

        .status-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .readiness-chips {
          display: flex;
          gap: 6px;
        }

        .ready-chip {
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 10px;
          background: #fee2e2;
          color: #991b1b;
          font-weight: 600;
        }

        .ready-chip.done {
          background: #dcfce7;
          color: #166534;
        }

        .ready-badge {
          background: #22c55e;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }

        /* Notes Section */
        .notes-section {
          border-top: 1px dashed var(--border-color);
          padding-top: 16px;
          margin-bottom: 16px;
        }

        .notes-section h4 {
          margin: 0 0 12px;
          font-size: 13px;
          color: var(--text-main);
        }

        .notes-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .note-card {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-left: 4px solid;
          border-radius: 10px;
          padding: 12px;
        }

        .note-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .note-priority {
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .note-dept {
          font-size: 10px;
          color: var(--text-sub);
          text-transform: capitalize;
        }

        .note-time {
          font-size: 10px;
          color: var(--text-sub);
          margin-left: auto;
        }

        .note-message {
          margin: 0;
          font-size: 13px;
          color: var(--text-bold);
          line-height: 1.5;
        }

        .note-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .note-author {
          font-size: 11px;
          color: var(--text-sub);
          font-style: italic;
        }

        .resolve-btn {
          padding: 6px 12px;
          border: 1px solid #22c55e;
          background: #dcfce7;
          color: #166534;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .resolve-btn:hover {
          background: #22c55e;
          color: white;
        }

        /* ── Dark mode fixes for notes & badges ── */
        [data-theme="dark"] .note-card {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.08);
        }

        [data-theme="dark"] .note-priority {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #e2e8f0 !important;
        }

        [data-theme="dark"] .note-message {
          color: #e2e8f0 !important;
        }

        [data-theme="dark"] .note-dept,
        [data-theme="dark"] .note-time,
        [data-theme="dark"] .note-author {
          color: #94a3b8 !important;
        }

        [data-theme="dark"] .notes-section h4 {
          color: #e2e8f0;
        }

        [data-theme="dark"] .resolve-btn {
          background: rgba(34, 197, 94, 0.15);
          color: #4ade80;
          border-color: rgba(34, 197, 94, 0.3);
        }

        [data-theme="dark"] .resolve-btn:hover {
          background: rgba(34, 197, 94, 0.3);
          color: #fff;
        }

        [data-theme="dark"] .room-number {
          color: #c5a065;
        }

        [data-theme="dark"] .guest-name {
          color: #e2e8f0;
        }

        [data-theme="dark"] .eta-badge {
          color: #94a3b8;
        }

        [data-theme="dark"] .guest-presence-chip.on-site {
          color: #4ade80;
        }

        [data-theme="dark"] .guest-presence-chip.off-site {
          color: #94a3b8;
        }

        /* Actions */
        .row-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          padding-top: 12px;
          border-top: 1px dashed var(--border-color);
          margin-top: 12px;
        }

        .status-select {
          padding: 10px 14px;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          background: var(--bg-color);
          color: var(--text-main);
          font-size: 13px;
        }

        .action-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.start {
          background: #3b82f6;
          color: white;
        }

        .action-btn.complete {
          background: #22c55e;
          color: white;
        }

        .action-btn.note {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          color: var(--text-main);
        }

        .action-btn:hover {
          transform: translateY(-1px);
          filter: brightness(110%);
        }

        /* Modal (same as HK) */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(8px);
          padding: 0;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 24px 24px 0 0;
          padding: 28px 24px calc(24px + env(safe-area-inset-bottom, 0px));
          width: 100%;
          max-width: 520px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(197, 160, 101, 0.3);
          border-top: 2px solid #c5a065;
        }

        [data-theme="dark"] .modal-content {
          background: #1a1a1a;
          border-color: #c5a065;
        }

        .modal-content h3 { 
          margin: 0 0 4px; 
          font-size: 22px; 
          color: #0f172a;
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

        .form-group { margin-bottom: 20px; }
        .form-group label {
          display: block;
          font-weight: 700;
          font-size: 11px;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #374151;
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

        .priority-buttons, .category-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .priority-btn, .cat-btn {
          flex: 1;
          min-width: 70px;
          padding: 12px 8px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          color: #374151;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          font-size: 11px;
          transition: all 0.2s;
        }
        
        [data-theme="dark"] .priority-btn,
        [data-theme="dark"] .cat-btn {
          background: #262626;
          border-color: #404040;
          color: #e5e7eb;
        }

        .priority-btn.active {
          border-color: var(--btn-color);
          background: var(--btn-color);
          color: white;
        }

        .cat-btn.active {
          border-color: #c5a065;
          background: rgba(197, 160, 101, 0.2);
          color: #c5a065;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .btn-cancel, .btn-submit {
          flex: 1;
          padding: 14px;
          border-radius: 10px;
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
          background: linear-gradient(135deg, #c5a065 0%, #a08050 100%);
          color: #0f172a;
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

        .room-row.ai-highlighted {
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

        @media (max-width: 768px) {
          .mt-header {
            flex-direction: column;
            gap: 20px;
            text-align: center;
          }
          .header-stats { flex-wrap: wrap; justify-content: center; }
          .filter-bar { flex-direction: column; }
          .row-main { flex-direction: column; }
          .row-actions { flex-direction: column; }

          .priority-btn,
          .cat-btn {
            min-height: 44px;
            padding: 12px 8px;
            font-size: 13px;
          }

          .btn-submit,
          .btn-cancel {
            min-height: 44px;
            font-size: 14px;
          }
        }

        /* ── Tab Bar ──────────────────────────── */
        .mt-tab-bar {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: rgba(0,0,0,0.04);
          border-radius: 14px;
          margin-bottom: 20px;
        }
        [data-theme="dark"] .mt-tab-bar { background: rgba(255,255,255,0.06); }

        .mt-tab {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 11px;
          background: transparent;
          color: var(--text-sub);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mt-tab:hover { background: rgba(0,0,0,0.04); }
        [data-theme="dark"] .mt-tab:hover { background: rgba(255,255,255,0.06); }
        .mt-tab.active {
          background: white;
          color: var(--text-main);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        [data-theme="dark"] .mt-tab.active {
          background: rgba(255,255,255,0.1);
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        /* ── Issue Log ────────────────────────── */
        .issue-log-section { padding: 0 4px; }

        .issue-log-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .log-filters { display: flex; gap: 6px; flex-wrap: wrap; }

        .filter-chip {
          padding: 6px 14px;
          border: 1.5px solid var(--chip-color, #64748b);
          border-radius: 20px;
          background: transparent;
          color: var(--chip-color, #64748b);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-chip.active {
          background: var(--chip-color, #64748b);
          color: white;
        }
        .filter-chip:hover { opacity: 0.8; }

        .print-log-btn {
          padding: 8px 18px;
          border: 1.5px solid #3b82f6;
          border-radius: 20px;
          background: rgba(59, 130, 246, 0.08);
          color: #3b82f6;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .print-log-btn:hover { background: rgba(59, 130, 246, 0.15); }

        .issue-log-list { display: flex; flex-direction: column; gap: 8px; }

        .issue-log-row {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: var(--card-bg, #fff);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 14px;
          transition: all 0.2s;
        }
        .issue-log-row:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .issue-log-row.resolved { opacity: 0.65; }
        [data-theme="dark"] .issue-log-row { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }

        .issue-log-room {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
          gap: 4px;
        }
        .issue-log-room .room-number {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-main);
        }
        .issue-log-room .guest-name {
          font-size: 10px;
          color: var(--text-sub);
          text-align: center;
          max-width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .issue-log-body { flex: 1; min-width: 0; }

        .issue-log-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .issue-log-meta .note-priority {
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
        }
        .issue-log-meta .note-dept {
          font-size: 11px;
          color: var(--text-sub);
          text-transform: capitalize;
        }
        .issue-log-meta .note-time {
          font-size: 11px;
          color: var(--text-sub);
        }

        .issue-log-message {
          margin: 0 0 8px;
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-main);
        }

        .issue-log-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .issue-log-footer .note-author {
          font-size: 11px;
          color: var(--text-sub);
        }
        .issue-log-footer .resolved-badge {
          font-size: 11px;
          color: #22c55e;
          font-weight: 600;
        }
        .issue-log-footer .resolve-btn {
          padding: 4px 12px;
          border: 1.5px solid #22c55e;
          border-radius: 16px;
          background: transparent;
          color: #22c55e;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .issue-log-footer .resolve-btn:hover { background: #22c55e; color: white; }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          color: var(--text-sub);
        }
        .empty-state .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .empty-state h3 { margin: 0 0 8px; font-size: 18px; color: var(--text-main); }
        .empty-state p { margin: 0; font-size: 14px; }

      `}</style>
    </div>
  );
};

export default React.memo(MaintenanceDashboard);
