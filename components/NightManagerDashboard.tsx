/**
 * InHouseDashboard (formerly Night Manager Dashboard)
 *
 * Real-time overview of all hotel rooms with occupancy data, guest details,
 * and operational tools (room moves, print reports, property filtering).
 *
 * Key concepts:
 *  - `ALL_ROOMS`: Static registry of every letting room (Main Hotel + Lake House).
 *  - `occupancyMap`: Map<roomNumber → guest+type> built from today's arrivals + stayovers.
 *  - Stayovers come from `useStayoverCalculator` hook (arrived before target, departs after).
 *  - Arrivals take priority over stayovers when the same room number appears in both.
 *  - Stats (occupied, empty, pax, cars, occupancy%) are derived from occupancyMap.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrivalSession, Guest } from '../types';
import { getRoomNumber, GILPIN_LOGO_URL } from '../constants';
import { useStayoverCalculator } from '../hooks/useStayoverCalculator';
import { DEFAULT_FLAGS } from '../constants';
import { useGuestData } from '../contexts/GuestDataProvider';

interface NightManagerDashboardProps {
  sessions: ArrivalSession[];
  activeSessionDate: string | null;
  todayGuests: Guest[];
}

/**
 * Room registry — every letting room at Gilpin Hotel & Lake House.
 * Room 29 (Mint) is excluded as it is not yet built / in use.
 * Main Hotel: rooms 1–28, 30–31. Lake House: rooms 51–58.
 */
const ALL_ROOMS: { name: string; number: number; property: 'main' | 'lake' }[] = [
  ...[
    'Lyth', 'Winster', 'Cleabarrow', 'Crosthwaite', 'Crook', 'Wetherlam',
    'Heathwaite', 'Troutbeck', 'Kentmere', 'Rydal', 'Grasmere', 'Patterdale',
    'Thirlmere', 'Buttermere', 'Catbells', 'Crinkle', 'Dollywagon',
    'Haystacks', 'St Sunday', 'Sergeant', 'Birdoswald', 'Maglona',
    'Glannoventa', 'Voreda', 'Hardknott', 'Brathay', 'Crake',
    'Duddon', /* Room 29 'Mint' excluded — not yet built */ 'Lowther', 'Lyvennet',
  ].map((name, i) => {
    /* Shift numbers: 1–28 normal, then skip 29 so Lowther=30, Lyvennet=31 */
    const num = i < 28 ? i + 1 : i + 2;
    return { name, number: num, property: 'main' as const };
  }),
  ...[
    'Harriet', 'Ethel', 'Adgie', 'Gertie', 'Maud', 'Beatrice', 'Tarn', 'Knipe',
  ].map((name, i) => ({ name, number: 51 + i, property: 'lake' as const })),
];

/** Match flags from guest raw data */
const matchFlags = (guest: Guest): { emoji: string; name: string }[] => {
  const matched: { emoji: string; name: string }[] = [];
  const haystack = [
    guest.prefillNotes, guest.preferences, guest.hkNotes,
    guest.facilities, guest.rawHtml, guest.rateCode,
  ].filter(Boolean).join(' ').toLowerCase();
  for (const flag of DEFAULT_FLAGS) {
    if (flag.keys.some(k => haystack.includes(k.toLowerCase()))) {
      matched.push({ emoji: flag.emoji, name: flag.name });
    }
  }
  return matched;
};

/** Room Move Modal */
const RoomMoveModal: React.FC<{
  guest: Guest;
  currentRoomNum: number;
  occupancyMap: Map<number, any>;
  onMove: (guestId: string, newRoom: string) => void;
  onClose: () => void;
}> = ({ guest, currentRoomNum, occupancyMap, onMove, onClose }) => {
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const availableRooms = ALL_ROOMS.filter(r => r.number !== currentRoomNum && !occupancyMap.has(r.number));

  return (
    <motion.div
      className="nm-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="nm-modal"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="nm-modal-header">
          <h3>🔄 Room Move</h3>
          <button className="nm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="nm-modal-body">
          <p className="nm-modal-info">
            Moving <strong>{guest.name}</strong> from Room {currentRoomNum}
          </p>
          <p className="nm-modal-label">Select empty room:</p>
          <div className="nm-room-picker">
            {availableRooms.length === 0 ? (
              <p className="nm-no-rooms">No empty rooms available</p>
            ) : (
              availableRooms.map(r => (
                <button
                  key={r.number}
                  className={`nm-pick-btn ${selectedRoom === r.number ? 'selected' : ''}`}
                  onClick={() => setSelectedRoom(r.number)}
                >
                  <span className="nm-pick-num">{r.number}</span>
                  <span className="nm-pick-name">{r.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="nm-modal-footer">
          <button className="nm-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="nm-btn-confirm"
            disabled={!selectedRoom}
            onClick={() => {
              if (selectedRoom) {
                const target = ALL_ROOMS.find(r => r.number === selectedRoom)!;
                onMove(guest.id, `${target.number} ${target.name}`);
                onClose();
              }
            }}
          >
            Move to Room {selectedRoom ?? '—'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};


const NightManagerDashboard: React.FC<NightManagerDashboardProps> = ({
  sessions,
  activeSessionDate,
  todayGuests,
}) => {
  const { updateGuest } = useGuestData();
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'main' | 'lake'>('all');
  const [expandedRoom, setExpandedRoom] = useState<number | null>(null);
  const [moveGuest, setMoveGuest] = useState<{ guest: Guest; roomNum: number } | null>(null);

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

  const { stayovers } = useStayoverCalculator(sessions, targetDate);

  /**
   * occupancyMap: Map<roomNumber → { guest, type, nightNum, totalNights }>
   *
   * Built in two passes:
   *  1. Today's arrivals are added first (keyed by parsed room number).
   *  2. Stayovers are added ONLY if the room isn't already occupied by an arrival.
   * This ensures arrivals always take priority over stayovers for the same room.
   */
  const occupancyMap = useMemo(() => {
    const map = new Map<number, { guest: Guest; type: 'arrival' | 'stayover'; nightNum?: number; totalNights?: number }>();
    /* Pass 1: arrivals (take priority) */
    todayGuests.forEach(g => {
      const roomNum = getRoomNumber(g.room);
      if (roomNum > 0) map.set(roomNum, { guest: g, type: 'arrival' });
    });
    /* Pass 2: stayovers (only if room not already occupied) */
    stayovers.forEach(s => {
      const roomNum = getRoomNumber(s.guest.room);
      if (roomNum > 0 && !map.has(roomNum)) {
        map.set(roomNum, { guest: s.guest, type: 'stayover', nightNum: s.nightNumber, totalNights: s.totalNights });
      }
    });
    return map;
  }, [todayGuests, stayovers]);

  // Stats
  const mainRooms = ALL_ROOMS.filter(r => r.property === 'main');
  const lakeRooms = ALL_ROOMS.filter(r => r.property === 'lake');
  const mainOccupied = mainRooms.filter(r => occupancyMap.has(r.number)).length;
  const lakeOccupied = lakeRooms.filter(r => occupancyMap.has(r.number)).length;
  const totalOccupied = mainOccupied + lakeOccupied;
  const totalRooms = ALL_ROOMS.length;
  const totalEmpty = totalRooms - totalOccupied;
  const occupancyPct = Math.round((totalOccupied / totalRooms) * 100);

  const totalPax = useMemo(() => {
    let count = 0;
    occupancyMap.forEach(({ guest }) => {
      const ll = parseInt(guest.ll || '0', 10);
      count += ll > 0 ? ll : 1;
    });
    return count;
  }, [occupancyMap]);

  const carCount = useMemo(() => {
    let count = 0;
    occupancyMap.forEach(({ guest }) => { if (guest.car?.trim()) count++; });
    return count;
  }, [occupancyMap]);

  const filteredRooms = useMemo(() =>
    propertyFilter === 'all' ? ALL_ROOMS : ALL_ROOMS.filter(r => r.property === propertyFilter),
    [propertyFilter]
  );
  const mainFilteredRooms = filteredRooms.filter(r => r.property === 'main');
  const lakeFilteredRooms = filteredRooms.filter(r => r.property === 'lake');

  const handleToggle = useCallback((roomNum: number) => {
    setExpandedRoom(prev => prev === roomNum ? null : roomNum);
  }, []);

  const handleRoomMove = useCallback((guestId: string, newRoom: string) => {
    updateGuest(guestId, { room: newRoom });
  }, [updateGuest]);

  const dateStr = targetDate.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /** Render a single room card */
  const renderRoomCard = (room: { name: string; number: number; property: 'main' | 'lake' }) => {
    const occ = occupancyMap.get(room.number);
    const isExpanded = expandedRoom === room.number && !!occ;
    const flags = occ ? matchFlags(occ.guest) : [];
    const hasCar = occ?.guest.car?.trim();
    const hasDinner = occ?.guest.dinnerTime && occ.guest.dinnerTime !== 'none';
    const pax = occ ? parseInt(occ.guest.ll || '0', 10) : 0;

    return (
      <motion.div
        key={room.number}
        className={`nm-room ${occ ? 'occupied' : 'empty'} ${occ?.type === 'stayover' ? 'stayover' : ''} ${isExpanded ? 'expanded' : ''}`}
        variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
        layout
        onClick={() => occ && handleToggle(room.number)}
        style={{ cursor: occ ? 'pointer' : 'default' }}
      >
        <div className="nm-room-top">
          <div className="nm-room-id">
            <div className="nm-room-number">{room.number}</div>
            <div className="nm-room-name">{room.name}</div>
          </div>
          {occ && flags.length > 0 && (
            <div className="nm-flags">
              {flags.slice(0, 3).map((f, i) => (
                <span key={i} className="nm-flag" title={f.name}>{f.emoji}</span>
              ))}
            </div>
          )}
        </div>

        {occ ? (
          <div className="nm-room-guest">
            <span className="nm-guest-name">{occ.guest.name}</span>
            <div className="nm-guest-meta">
              <span className="nm-guest-type">
                {occ.type === 'stayover' ? `Night ${occ.nightNum}/${occ.totalNights}` : 'Arriving today'}
              </span>
              {pax > 0 && <span className="nm-pax">👤 {pax}</span>}
            </div>

            {hasCar && (
              <div className="nm-car">
                <span className="nm-car-plate">🚗 {occ.guest.car}</span>
              </div>
            )}

            {hasDinner && (
              <div className="nm-dinner">
                🍽️ {occ.guest.dinnerTime}
                {occ.guest.dinnerVenue && <span className="nm-venue"> • {occ.guest.dinnerVenue}</span>}
              </div>
            )}

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  className="nm-expanded-detail"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  {flags.length > 0 && (
                    <div className="nm-detail-row">
                      <span className="nm-detail-label">Flags</span>
                      <div className="nm-detail-flags">
                        {flags.map((f, i) => (
                          <span key={i} className="nm-flag-pill">{f.emoji} {f.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {occ.guest.preferences && (
                    <div className="nm-detail-row">
                      <span className="nm-detail-label">Preferences</span>
                      <span className="nm-detail-value">{occ.guest.preferences}</span>
                    </div>
                  )}
                  {occ.guest.hkNotes && (
                    <div className="nm-detail-row">
                      <span className="nm-detail-label">HK Notes</span>
                      <span className="nm-detail-value">{occ.guest.hkNotes}</span>
                    </div>
                  )}
                  {occ.guest.inRoomItems && (
                    <div className="nm-detail-row">
                      <span className="nm-detail-label">In-Room</span>
                      <span className="nm-detail-value">{occ.guest.inRoomItems}</span>
                    </div>
                  )}
                  {occ.guest.duration && (
                    <div className="nm-detail-row">
                      <span className="nm-detail-label">Stay</span>
                      <span className="nm-detail-value">{occ.guest.duration}</span>
                    </div>
                  )}
                  {/* Room Move Button */}
                  <button
                    className="nm-move-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoveGuest({ guest: occ.guest, roomNum: room.number });
                    }}
                  >
                    🔄 Move Room
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="nm-room-empty-label">Empty</div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="nm-dashboard">
      {/* Header */}
      <motion.header
        className="nm-header no-print"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="nm-header-content">
          <div className="nm-header-icon">IH</div>
          <div>
            <h1>In House</h1>
            <p>{dateStr}</p>
          </div>
        </div>
        <div className="nm-header-stats">
          <div className="nm-stat occupied"><span className="nm-stat-number">{totalOccupied}</span><span className="nm-stat-label">Occupied</span></div>
          <div className="nm-stat empty"><span className="nm-stat-number">{totalEmpty}</span><span className="nm-stat-label">Empty</span></div>
          <div className="nm-stat pct"><span className="nm-stat-number">{occupancyPct}%</span><span className="nm-stat-label">Occupancy</span></div>
          <div className="nm-stat pax"><span className="nm-stat-number">{totalPax}</span><span className="nm-stat-label">Guests</span></div>
          <div className="nm-stat cars"><span className="nm-stat-number">{carCount}</span><span className="nm-stat-label">Cars</span></div>
        </div>
      </motion.header>

      {/* Controls Row — Filters + Print */}
      <div className="nm-controls-bar no-print">
        <div className="nm-filter-bar">
          {(['all', 'main', 'lake'] as const).map(key => (
            <button
              key={key}
              className={`nm-filter-btn ${propertyFilter === key ? 'active' : ''}`}
              onClick={() => setPropertyFilter(key)}
            >
              {key === 'all' ? '🏨 All Rooms' : key === 'main' ? '🏛️ Main Hotel' : '🏡 Lake House'}
            </button>
          ))}
        </div>
        <button className="nm-print-btn" onClick={handlePrint}>🖨️ Print Report</button>
      </div>

      {/* Property Breakdown */}
      <div className="nm-property-row no-print">
        {(propertyFilter === 'all' || propertyFilter === 'main') && (
          <div className="nm-property-card">
            <span className="nm-property-label">Main Hotel</span>
            <span className="nm-property-count">{mainOccupied} / {mainRooms.length}</span>
            <div className="nm-property-bar">
              <div className="nm-property-fill" style={{ width: `${(mainOccupied / mainRooms.length) * 100}%` }} />
            </div>
          </div>
        )}
        {(propertyFilter === 'all' || propertyFilter === 'lake') && (
          <div className="nm-property-card lake">
            <span className="nm-property-label">Lake House</span>
            <span className="nm-property-count">{lakeOccupied} / {lakeRooms.length}</span>
            <div className="nm-property-bar">
              <div className="nm-property-fill" style={{ width: `${(lakeOccupied / lakeRooms.length) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ═══ Screen Room Grid ═══ */}
      {mainFilteredRooms.length > 0 && (
        <>
          <h2 className="nm-section-title no-print">Main Hotel</h2>
          <motion.div className="nm-room-grid desktop-grid no-print"
            initial="hidden" animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.02 } } }}
          >
            {mainFilteredRooms.map(room => renderRoomCard(room))}
          </motion.div>
          <div className="nm-room-slider mobile-slider no-print">
            {mainFilteredRooms.map(room => renderRoomCard(room))}
          </div>
        </>
      )}
      {lakeFilteredRooms.length > 0 && (
        <>
          <h2 className="nm-section-title lake no-print">Lake House</h2>
          <motion.div className="nm-room-grid lake desktop-grid no-print"
            initial="hidden" animate="show"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
          >
            {lakeFilteredRooms.map(room => renderRoomCard(room))}
          </motion.div>
          <div className="nm-room-slider mobile-slider no-print">
            {lakeFilteredRooms.map(room => renderRoomCard(room))}
          </div>
        </>
      )}

      {/* ═══ Print-Only In House Report ═══ */}
      <div className="print-only nm-print-report">
        <div className="nm-print-header">
          <img src={GILPIN_LOGO_URL} alt="Gilpin" className="nm-print-logo" />
          <div>
            <h1 className="nm-print-title">IN HOUSE REPORT</h1>
            <p className="nm-print-date">{dateStr}</p>
          </div>
          <div className="nm-print-stats">
            <span>{totalOccupied} Occupied</span> • <span>{totalEmpty} Empty</span> • <span>{occupancyPct}% Occ</span> • <span>{totalPax} Guests</span> • <span>{carCount} Cars</span>
          </div>
        </div>

        {/* Main Hotel Print Table */}
        {mainFilteredRooms.length > 0 && (
          <>
            <h2 className="nm-print-section">MAIN HOTEL ({mainOccupied}/{mainRooms.length})</h2>
            <table className="nm-print-table">
              <thead>
                <tr>
                  <th>Room</th><th>Name</th><th>Guest</th><th>Type</th>
                  <th>Car</th><th>Pax</th><th>Dinner</th><th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {mainFilteredRooms.map(room => {
                  const occ = occupancyMap.get(room.number);
                  const flags = occ ? matchFlags(occ.guest) : [];
                  return (
                    <tr key={room.number} className={occ ? '' : 'nm-print-empty'}>
                      <td className="nm-print-room">{room.number}</td>
                      <td className="nm-print-roomname">{room.name}</td>
                      <td>{occ?.guest.name || '—'}</td>
                      <td>{occ ? (occ.type === 'stayover' ? `S ${occ.nightNum}/${occ.totalNights}` : 'ARR') : ''}</td>
                      <td className="nm-print-plate">{occ?.guest.car || ''}</td>
                      <td>{occ ? (parseInt(occ.guest.ll || '0', 10) || '') : ''}</td>
                      <td>{occ?.guest.dinnerTime && occ.guest.dinnerTime !== 'none' ? `${occ.guest.dinnerTime}${occ.guest.dinnerVenue ? ` (${occ.guest.dinnerVenue})` : ''}` : ''}</td>
                      <td>{flags.map(f => f.emoji).join(' ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* Lake House Print Table */}
        {lakeFilteredRooms.length > 0 && (
          <>
            <h2 className="nm-print-section">LAKE HOUSE ({lakeOccupied}/{lakeRooms.length})</h2>
            <table className="nm-print-table">
              <thead>
                <tr>
                  <th>Room</th><th>Name</th><th>Guest</th><th>Type</th>
                  <th>Car</th><th>Pax</th><th>Dinner</th><th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {lakeFilteredRooms.map(room => {
                  const occ = occupancyMap.get(room.number);
                  const flags = occ ? matchFlags(occ.guest) : [];
                  return (
                    <tr key={room.number} className={occ ? '' : 'nm-print-empty'}>
                      <td className="nm-print-room">{room.number}</td>
                      <td className="nm-print-roomname">{room.name}</td>
                      <td>{occ?.guest.name || '—'}</td>
                      <td>{occ ? (occ.type === 'stayover' ? `S ${occ.nightNum}/${occ.totalNights}` : 'ARR') : ''}</td>
                      <td className="nm-print-plate">{occ?.guest.car || ''}</td>
                      <td>{occ ? (parseInt(occ.guest.ll || '0', 10) || '') : ''}</td>
                      <td>{occ?.guest.dinnerTime && occ.guest.dinnerTime !== 'none' ? `${occ.guest.dinnerTime}${occ.guest.dinnerVenue ? ` (${occ.guest.dinnerVenue})` : ''}` : ''}</td>
                      <td>{flags.map(f => f.emoji).join(' ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        <div className="nm-print-footer">
          Printed {new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Room Move Modal */}
      <AnimatePresence>
        {moveGuest && (
          <RoomMoveModal
            guest={moveGuest.guest}
            currentRoomNum={moveGuest.roomNum}
            occupancyMap={occupancyMap}
            onMove={handleRoomMove}
            onClose={() => setMoveGuest(null)}
          />
        )}
      </AnimatePresence>

      {/* Styles now in styles/night-manager.css */}
    </div>
  );
};

export default React.memo(NightManagerDashboard);
