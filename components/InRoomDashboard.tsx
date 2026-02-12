/**
 * InHouseDashboard
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
import { getRoomNumber, GILPIN_LOGO_URL, getRoomType } from '../constants';
import { useStayoverCalculator } from '../hooks/useStayoverCalculator';
import { DEFAULT_FLAGS } from '../constants';
import { useGuestData } from '../contexts/GuestDataProvider';
import { GeminiService } from '../services/geminiService';

interface InHouseDashboardProps {
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


const InHouseDashboard: React.FC<InHouseDashboardProps> = ({
  sessions,
  activeSessionDate,
  todayGuests,
}) => {
  const { updateGuest } = useGuestData();
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'main' | 'lake'>('all');
  const [expandedRoom, setExpandedRoom] = useState<number | null>(null);
  const [moveGuest, setMoveGuest] = useState<{ guest: Guest; roomNum: number } | null>(null);
  const [upgradeSuggestions, setUpgradeSuggestions] = useState<any[]>([]);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);

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
  /**
   * Helper: does this guest's package include breakfast?
   * Room Only = no breakfast. Everything else (BB, DBB, Minimoon, etc.) = yes.
   * Unknown/missing package is treated as breakfast (hotel default is B&B).
   */
  const includesBreakfast = useCallback((guest: Guest): boolean => {
    const pkg = (guest.packageName || '').toLowerCase();
    if (pkg.includes('room only')) return false;
    return true; // B&B is the default
  }, []);

  // ── Per-property base stats ──
  const mainRooms = ALL_ROOMS.filter(r => r.property === 'main');
  const lakeRooms = ALL_ROOMS.filter(r => r.property === 'lake');
  const mainOccupied = mainRooms.filter(r => occupancyMap.has(r.number)).length;
  const lakeOccupied = lakeRooms.filter(r => occupancyMap.has(r.number)).length;

  /** Breakfast pax per property */
  const { mainBreakfast, lakeBreakfast } = useMemo(() => {
    let mainBf = 0, lakeBf = 0;
    occupancyMap.forEach(({ guest }, roomNum) => {
      if (!includesBreakfast(guest)) return;
      const pax = parseInt(guest.ll || '0', 10) || 1;
      const room = ALL_ROOMS.find(r => r.number === roomNum);
      if (room?.property === 'lake') lakeBf += pax;
      else mainBf += pax;
    });
    return { mainBreakfast: mainBf, lakeBreakfast: lakeBf };
  }, [occupancyMap, includesBreakfast]);

  /** Per-property pax, car, and EV charging counts */
  const { mainPax, lakePax, mainCars, lakeCars, mainEV, lakeEV } = useMemo(() => {
    let mPax = 0, lPax = 0, mCars = 0, lCars = 0, mEV = 0, lEV = 0;
    occupancyMap.forEach(({ guest }, roomNum) => {
      const pax = parseInt(guest.ll || '0', 10) || 1;
      const room = ALL_ROOMS.find(r => r.number === roomNum);
      if (room?.property === 'lake') {
        lPax += pax;
        if (guest.car?.trim()) lCars++;
        if (guest.carOnCharge) lEV++;
      } else {
        mPax += pax;
        if (guest.car?.trim()) mCars++;
        if (guest.carOnCharge) mEV++;
      }
    });
    return { mainPax: mPax, lakePax: lPax, mainCars: mCars, lakeCars: lCars, mainEV: mEV, lakeEV: lEV };
  }, [occupancyMap]);

  /**
   * Dynamic header stats — reactive to the property filter.
   * When a specific property is selected, stats show only that property.
   */
  const displayStats = useMemo(() => {
    if (propertyFilter === 'main') {
      const rooms = mainRooms.length;
      return { occupied: mainOccupied, empty: rooms - mainOccupied, pct: Math.round((mainOccupied / rooms) * 100), pax: mainPax, cars: mainCars, evCharging: mainEV, breakfast: mainBreakfast, total: rooms };
    }
    if (propertyFilter === 'lake') {
      const rooms = lakeRooms.length;
      return { occupied: lakeOccupied, empty: rooms - lakeOccupied, pct: Math.round((lakeOccupied / rooms) * 100), pax: lakePax, cars: lakeCars, evCharging: lakeEV, breakfast: lakeBreakfast, total: rooms };
    }
    const allRooms = ALL_ROOMS.length;
    const totalOcc = mainOccupied + lakeOccupied;
    return { occupied: totalOcc, empty: allRooms - totalOcc, pct: Math.round((totalOcc / allRooms) * 100), pax: mainPax + lakePax, cars: mainCars + lakeCars, evCharging: mainEV + lakeEV, breakfast: mainBreakfast + lakeBreakfast, total: allRooms };
  }, [propertyFilter, mainOccupied, lakeOccupied, mainRooms.length, lakeRooms.length, mainPax, lakePax, mainCars, lakeCars, mainEV, lakeEV, mainBreakfast, lakeBreakfast]);

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

  /** Request AI upgrade suggestions */
  const handleSuggestUpgrades = useCallback(async () => {
    setUpgradeLoading(true);
    setShowUpgradePanel(true);
    try {
      // Find empty rooms
      const emptyRoomsList = ALL_ROOMS.filter(r => !occupancyMap.has(r.number)).map(r => ({
        ...r,
        roomType: getRoomType(r.number) || 'Unknown',
      }));
      // Build guest list for AI with room type context
      const guestList = Array.from(occupancyMap.entries()).map(([_, occ]) => {
        const roomNum = parseInt(occ.guest.room.split(' ')[0]) || 0;
        return {
          room: occ.guest.room,
          name: occ.guest.name,
          ll: occ.guest.ll || '',
          duration: occ.guest.duration || '',
          notes: occ.guest.prefillNotes || occ.guest.hkNotes || '',
          preferences: occ.guest.preferences || '',
          roomType: getRoomType(roomNum) || 'Unknown',
        };
      });
      const result = await GeminiService.suggestUpgrades(guestList, emptyRoomsList);
      setUpgradeSuggestions(result || []);
    } catch (e) {
      console.error('[AI Upgrade] Error:', e);
      setUpgradeSuggestions([]);
    } finally {
      setUpgradeLoading(false);
    }
  }, [occupancyMap]);

  /** Accept an upgrade — move guest to new room */
  const handleAcceptUpgrade = useCallback((suggestion: any) => {
    const entry = Array.from(occupancyMap.entries()).find(
      ([_, occ]) => occ.guest.name === suggestion.guestName
    );
    if (entry) {
      const roomName = ALL_ROOMS.find(r => r.number === suggestion.suggestedRoom)?.name || '';
      updateGuest(entry[1].guest.id, { room: `${suggestion.suggestedRoom} ${roomName}`.trim() });
      setUpgradeSuggestions(prev => prev.filter(s => s.guestName !== suggestion.guestName));
    }
  }, [occupancyMap, updateGuest]);

  /** Reject a suggestion — remove from list */
  const handleRejectUpgrade = useCallback((guestName: string) => {
    setUpgradeSuggestions(prev => prev.filter(s => s.guestName !== guestName));
  }, []);

  /** Render a single room card */
  const renderRoomCard = (room: { name: string; number: number; property: 'main' | 'lake' }) => {
    const occ = occupancyMap.get(room.number);
    const isExpanded = expandedRoom === room.number && !!occ;
    const flags = occ ? matchFlags(occ.guest) : [];
    const hasCar = occ?.guest.car?.trim();
    const hasDinner = occ?.guest.dinnerTime && occ.guest.dinnerTime !== 'none';
    const pax = occ ? parseInt(occ.guest.ll || '0', 10) : 0;

    const guestStatusClass = occ?.guest.guestStatus === 'on_site' || occ?.guest.guestStatus === 'checked_in' ? 'arrived' : occ?.guest.guestStatus === 'checked_out' ? 'checked-out' : '';

    return (
      <motion.div
        key={room.number}
        className={`nm-room ${occ ? 'occupied' : 'empty'} ${occ?.type === 'stayover' ? 'stayover' : ''} ${isExpanded ? 'expanded' : ''} ${guestStatusClass}`}
        variants={{ hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } }}
        layout
        onClick={() => occ && handleToggle(room.number)}
        style={{ cursor: occ ? 'pointer' : 'default' }}
      >
        <div className="nm-room-top">
          <div className="nm-room-id">
            <div className="nm-room-number">{room.number}</div>
            <div className="nm-room-name">{room.name}</div>
            {getRoomType(room.number) && <div className="nm-room-type">{getRoomType(room.number)}</div>}
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
              {occ.guest.guestStatus && occ.guest.guestStatus !== 'pre_arrival' && (
                <span className={`nm-status-badge nm-status-${occ.guest.guestStatus}`}>
                  {occ.guest.guestStatus === 'on_site' ? '✓ On Site' :
                    occ.guest.guestStatus === 'checked_in' ? '🔑 Checked In' :
                      occ.guest.guestStatus === 'checked_out' ? '🚪 Out' :
                        occ.guest.guestStatus === 'off_site' ? '📤 Away' :
                          occ.guest.guestStatus === 'no_show' ? '❌ No Show' :
                            occ.guest.guestStatus === 'cancelled' ? '⊘ Cancelled' :
                              occ.guest.guestStatus === 'awaiting_room' ? '⏳ Awaiting Room' :
                                occ.guest.guestStatus === 'room_ready_notified' ? '📱 Room Ready' :
                                  occ.guest.guestStatus === 'courtesy_call_due' ? '📞 Call Due' :
                                    occ.guest.guestStatus === 'call_complete' ? '✅ Call Done' : ''}
                </span>
              )}
              {pax > 0 && <span className="nm-pax">👤 {pax}</span>}
            </div>

            {hasCar && (
              <div className="nm-car">
                <span className="nm-car-plate">🚗 {occ.guest.car}</span>
                {occ.guest.carOnCharge && <span className="nm-ev-badge" title="EV Charging">⚡</span>}
                {occ.guest.chargeRequested && !occ.guest.carOnCharge && <span className="nm-charge-badge" title="Charging Requested">🔔</span>}
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
                  {occ.guest.facilities && (
                    <div className="nm-detail-row">
                      <span className="nm-detail-label">Facilities</span>
                      <span className="nm-detail-value">{occ.guest.facilities}</span>
                    </div>
                  )}
                  {occ.guest.duration && (
                    <div className="nm-detail-row">
                      <span className="nm-detail-label">Stay</span>
                      <span className="nm-detail-value">{occ.guest.duration}</span>
                    </div>
                  )}
                  {/* EV Charging & Request */}
                  {hasCar && (
                    <div className="nm-ev-section">
                      <div className="nm-action-row">
                        <button
                          className={`nm-ev-toggle ${occ.guest.carOnCharge ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const goingOnCharge = !occ.guest.carOnCharge;
                            updateGuest(occ.guest.id, {
                              carOnCharge: goingOnCharge,
                              carOnChargeAt: goingOnCharge ? Date.now() : undefined,
                              // Clear request when plugging in or unplugging
                              chargeRequested: goingOnCharge ? false : occ.guest.chargeRequested,
                              chargeRequestedAt: goingOnCharge ? undefined : occ.guest.chargeRequestedAt,
                            });
                          }}
                        >
                          ⚡ {occ.guest.carOnCharge ? 'Unplug' : 'Plug In'}
                        </button>
                        {!occ.guest.carOnCharge && (
                          <button
                            className={`nm-ev-request ${occ.guest.chargeRequested ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const requesting = !occ.guest.chargeRequested;
                              updateGuest(occ.guest.id, {
                                chargeRequested: requesting,
                                chargeRequestedAt: requesting ? Date.now() : undefined,
                              });
                            }}
                          >
                            {occ.guest.chargeRequested ? '🔔 Requested' : '🔋 Request Charging'}
                          </button>
                        )}
                      </div>
                      {occ.guest.chargeRequested && !occ.guest.carOnCharge && (() => {
                        // Calculate queue position (FCFS by chargeRequestedAt)
                        const queueEntries: { name: string; requestedAt: number }[] = [];
                        occupancyMap.forEach(({ guest: g }) => {
                          if (g.chargeRequested && !g.carOnCharge && g.chargeRequestedAt) {
                            queueEntries.push({ name: g.name, requestedAt: g.chargeRequestedAt });
                          }
                        });
                        queueEntries.sort((a, b) => a.requestedAt - b.requestedAt);
                        const pos = queueEntries.findIndex(q => q.name === occ.guest.name) + 1;
                        return (
                          <div className="nm-ev-queue-pos">
                            🔢 Queue position: <strong>#{pos}</strong> of {queueEntries.length}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {/* Room Move Button */}
                  <div className="nm-action-row">
                    <button
                      className="nm-move-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveGuest({ guest: occ.guest, roomNum: room.number });
                      }}
                    >
                      🔄 Move Room
                    </button>
                  </div>
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
          <div className="nm-header-icon">🏠</div>
          <div>
            <h1>In House</h1>
            <p>{dateStr}</p>
          </div>
        </div>
        <div className="nm-header-stats">
          <div className="nm-stat occupied"><span className="nm-stat-number">{displayStats.occupied}</span><span className="nm-stat-label">Occupied</span></div>
          <div className="nm-stat empty"><span className="nm-stat-number">{displayStats.empty}</span><span className="nm-stat-label">Empty</span></div>
          <div className="nm-stat pct"><span className="nm-stat-number">{displayStats.pct}%</span><span className="nm-stat-label">Occupancy</span></div>
          <div className="nm-stat pax"><span className="nm-stat-number">{displayStats.pax}</span><span className="nm-stat-label">Guests</span></div>
          <div className="nm-stat cars"><span className="nm-stat-number">{displayStats.cars}</span><span className="nm-stat-label">Cars</span></div>
          {displayStats.evCharging > 0 && (
            <div className="nm-stat ev"><span className="nm-stat-number">⚡ {displayStats.evCharging}</span><span className="nm-stat-label">Charging</span></div>
          )}
          <div className="nm-stat breakfast"><span className="nm-stat-number">{displayStats.breakfast}</span><span className="nm-stat-label">Breakfast</span></div>
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
        <button className="nm-print-btn" onClick={handleSuggestUpgrades} disabled={upgradeLoading} style={{ marginLeft: 8 }}>
          {upgradeLoading ? '⏳ Analysing...' : '✨ AI Upgrades'}
        </button>
      </div>

      {/* Property Breakdown — with breakfast badge */}
      <div className="nm-property-row no-print">
        {(propertyFilter === 'all' || propertyFilter === 'main') && (
          <div className="nm-property-card">
            <span className="nm-property-label">Main Hotel</span>
            <span className="nm-property-count">{mainOccupied} / {mainRooms.length}</span>
            <div className="nm-property-bar">
              <div className="nm-property-fill" style={{ width: `${(mainOccupied / mainRooms.length) * 100}%` }} />
            </div>
            <span className="nm-breakfast-badge">🍳 {mainBreakfast} for breakfast</span>
          </div>
        )}
        {(propertyFilter === 'all' || propertyFilter === 'lake') && (
          <div className="nm-property-card lake">
            <span className="nm-property-label">Lake House</span>
            <span className="nm-property-count">{lakeOccupied} / {lakeRooms.length}</span>
            <div className="nm-property-bar">
              <div className="nm-property-fill" style={{ width: `${(lakeOccupied / lakeRooms.length) * 100}%` }} />
            </div>
            <span className="nm-breakfast-badge">🍳 {lakeBreakfast} for breakfast</span>
          </div>
        )}
      </div>

      {/* ═══ AI Upgrade Suggestion Panel ═══ */}
      {showUpgradePanel && (
        <motion.div
          className="nm-upgrade-panel no-print"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="nm-upgrade-header">
            <h3>✨ AI Room Upgrade Suggestions</h3>
            <button className="nm-upgrade-close" onClick={() => setShowUpgradePanel(false)}>✕</button>
          </div>
          {upgradeLoading ? (
            <div className="nm-upgrade-loading">
              <span className="nm-upgrade-spinner" /> Analysing guests, availability & special occasions...
            </div>
          ) : upgradeSuggestions.length === 0 ? (
            <div className="nm-upgrade-empty">No upgrade opportunities found for today's guests.</div>
          ) : (
            <div className="nm-upgrade-list">
              {upgradeSuggestions.map((s, i) => (
                <div key={i} className="nm-upgrade-card">
                  <div className="nm-upgrade-guest">
                    <strong>{s.guestName}</strong>
                    <span className="nm-upgrade-move">Room {s.currentRoom} → Room {s.suggestedRoom} ({s.suggestedRoomName})</span>
                  </div>
                  <div className="nm-upgrade-reason">{s.reason}</div>
                  <span className={`nm-upgrade-priority nm-priority-${s.priority?.toLowerCase()}`}>{s.priority}</span>
                  <div className="nm-upgrade-actions">
                    <button className="nm-upgrade-accept" onClick={() => handleAcceptUpgrade(s)}>✓ Accept</button>
                    <button className="nm-upgrade-reject" onClick={() => handleRejectUpgrade(s.guestName)}>✕ Skip</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

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
            <span>{mainOccupied + lakeOccupied} Occupied</span> • <span>{ALL_ROOMS.length - (mainOccupied + lakeOccupied)} Empty</span> • <span>{Math.round(((mainOccupied + lakeOccupied) / ALL_ROOMS.length) * 100)}% Occ</span> • <span>{mainPax + lakePax} Guests</span> • <span>{mainCars + lakeCars} Cars</span> • <span>{mainBreakfast + lakeBreakfast} Breakfast</span>
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
                  <th>Car</th><th>Pax</th><th>Bkfst</th><th>Dinner</th><th>Flags</th>
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
                      <td>{occ ? (occ.guest.packageName && occ.guest.packageName !== 'RO' && occ.guest.packageName !== 'Room Only' ? '✓' : '') : ''}</td>
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
                  <th>Car</th><th>Pax</th><th>Bkfst</th><th>Dinner</th><th>Flags</th>
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
                      <td>{occ ? (occ.guest.packageName && occ.guest.packageName !== 'RO' && occ.guest.packageName !== 'Room Only' ? '✓' : '') : ''}</td>
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

      {/* Styles in styles/in-room.css */}
    </div>
  );
};

export default React.memo(InHouseDashboard);
