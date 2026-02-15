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
import { ArrivalSession, Guest, GuestIssue } from '../types';
import { getRoomNumber, GILPIN_LOGO_URL, getRoomType } from '../constants';
import { useStayoverCalculator } from '../hooks/useStayoverCalculator';
import { DEFAULT_FLAGS } from '../constants';
import { useGuestData } from '../contexts/GuestDataProvider';
import { GeminiService } from '../services/geminiService';
import ActivityLogPanel from './ActivityLogPanel';

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
    'Thirlmere', 'Buttermere', 'Cat Bells', 'Crinkle Crags', 'Dollywagon Pike',
    'Haystacks', 'St Sunday Crag', 'Sergeant Man', 'Birdoswald', 'Maglona',
    'Glannoventa', 'Voreda', 'Hardknott', 'Brathay', 'Crake',
    'Duddon', /* Room 29 'Mint' excluded — not yet built */ 'Lowther', 'Lyvennet',
  ].map((name, i) => {
    /* Shift numbers: 1–28 normal, then skip 29 so Lowther=30, Lyvennet=31 */
    const num = i < 28 ? i + 1 : i + 2;
    return { name, number: num, property: 'main' as const };
  }),
  ...[
    'Harriet', 'Ethel', 'Adgie', 'Gertie', 'Maud', 'Beatrice', 'Knipe Suite', 'Tarn Suite',
  ].map((name, i) => ({ name, number: 51 + i, property: 'lake' as const })),
];

/** Match flags from guest raw data — uses word-boundary regex for flagged keywords to prevent false positives */
const matchFlags = (guest: Guest): { emoji: string; name: string }[] => {
  const matched: { emoji: string; name: string }[] = [];
  // Build two haystacks: full (includes rawHtml) and curated (excludes rawHtml to prevent PMS noise)
  const curatedHaystack = [
    guest.prefillNotes, guest.preferences, guest.hkNotes,
    guest.facilities, guest.rateCode, guest.inRoomItems,
  ].filter(Boolean).join(' ').toLowerCase();
  const fullHaystack = [curatedHaystack, (guest.rawHtml || '').toLowerCase()].join(' ');

  for (const flag of DEFAULT_FLAGS) {
    // For pet/issue flags, only scan curated fields (not raw PMS dump) to avoid false positives
    const searchText = flag.wordBoundary ? curatedHaystack : fullHaystack;
    if (flag.wordBoundary) {
      // Word-boundary regex matching — prevents 'dog' matching 'Dogwood', 'issue' matching 'tissue'
      if (flag.keys.some(k => {
        // Emoji keys don't need word boundaries
        if (/^[\u{1F000}-\u{1FFFF}]/u.test(k)) return searchText.includes(k);
        const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return re.test(searchText);
      })) {
        matched.push({ emoji: flag.emoji, name: flag.name });
      }
    } else {
      if (flag.keys.some(k => searchText.includes(k.toLowerCase()))) {
        matched.push({ emoji: flag.emoji, name: flag.name });
      }
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
  const { updateGuest, handleAddGuestIssue, handleUpdateGuestIssue } = useGuestData();
  const [propertyFilter, setPropertyFilter] = useState<'all' | 'main' | 'lake'>('all');
  const [expandedRoom, setExpandedRoom] = useState<number | null>(null);
  const [moveGuest, setMoveGuest] = useState<{ guest: Guest; roomNum: number } | null>(null);
  const [upgradeSuggestions, setUpgradeSuggestions] = useState<any[]>([]);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [showUpgradePanel, setShowUpgradePanel] = useState(false);
  const [activityLogGuest, setActivityLogGuest] = useState<Guest | null>(null);

  // Guest Issue state
  const [issueModal, setIssueModal] = useState<{ guest: Guest } | null>(null);
  const [issueText, setIssueText] = useState('');
  const [issueCompensation, setIssueCompensation] = useState('');
  const [issueResolved, setIssueResolved] = useState(false);
  const [issueNeedsManager, setIssueNeedsManager] = useState(false);
  const [issueReporter, setIssueReporter] = useState('');
  const [showIssueLog, setShowIssueLog] = useState(false);
  const [issueLogFilter, setIssueLogFilter] = useState<'all' | 'open' | 'manager'>('all');

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

  // ── Dogs In House (Robust Detection) ──
  // Only scans curated fields (not rawHtml) using word-boundary + breed-specific matching
  // to eliminate false positives from words like 'Dogwood', 'catalog', 'Peter', etc.
  const DOG_PATTERNS = [
    /\bdog\s*(bed|bowl|in room|friendly|walk|food|treat|cage|crate)\b/i,
    /\b(pet|pets)\s+(in room|friendly|fee|charge|supplement|welcome)\b/i,
    /\b(bringing|has|have|with|traveling with|travelling with)\s+(a\s+)?dog\b/i,
    /\b(puppy|canine|greyhound|cockapoo|labrador|retriever|spaniel|terrier|poodle|dachshund|collie|whippet|lurcher|staffie|beagle|cocker|springer)\b/i,
    /🐕|🐶|🐾/,
  ];
  const DOG_NEGATIONS = /\b(no dogs?|no pets?|not? (pet|dog))\b/i;

  const dogsInHouse = useMemo(() => {
    const dogs: { roomNum: number; guest: Guest; detail: string }[] = [];
    occupancyMap.forEach(({ guest }, roomNum) => {
      // Only scan curated fields — NOT rawHtml (PMS dump causes false positives)
      const haystack = [guest.prefillNotes, guest.hkNotes, guest.preferences, guest.inRoomItems].filter(Boolean).join(' ');
      const haystackLower = haystack.toLowerCase();

      // Check for negations first
      if (DOG_NEGATIONS.test(haystackLower)) return;

      // Must match at least one specific dog/pet pattern
      const hasDog = DOG_PATTERNS.some(p => p.test(haystack));
      if (hasDog) {
        const detail = haystack.match(/🐕[^•]*/i)?.[0]?.trim()
          || haystack.match(/dog\s*(bed|bowl|in room)[^•]*/i)?.[0]?.trim()
          || haystack.match(/\b(puppy|greyhound|cockapoo|labrador|retriever|spaniel|terrier|poodle|collie|whippet|lurcher|staffie|beagle|cocker|springer)[^•]*/i)?.[0]?.trim()
          || 'Dog in room';
        dogs.push({ roomNum, guest, detail });
      }
    });
    dogs.sort((a, b) => a.roomNum - b.roomNum);
    return dogs;
  }, [occupancyMap]);
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build occupied rooms for Main Hotel and Lake House
    const mainPrintRooms = mainRooms.map(room => {
      const occ = occupancyMap.get(room.number);
      const flags = occ ? matchFlags(occ.guest) : [];
      return { room, occ, flags };
    });
    const lakePrintRooms = lakeRooms.map(room => {
      const occ = occupancyMap.get(room.number);
      const flags = occ ? matchFlags(occ.guest) : [];
      return { room, occ, flags };
    });

    // Detect dogs — same robust logic as on-screen, no rawHtml scanning
    const printDogPatterns = [
      /\bdog\s*(bed|bowl|in room|friendly|walk|food|treat|cage|crate)\b/i,
      /\b(pet|pets)\s+(in room|friendly|fee|charge|supplement|welcome)\b/i,
      /\b(bringing|has|have|with|traveling with|travelling with)\s+(a\s+)?dog\b/i,
      /\b(puppy|canine|greyhound|cockapoo|labrador|retriever|spaniel|terrier|poodle|dachshund|collie|whippet|lurcher|staffie|beagle|cocker|springer)\b/i,
      /🐕|🐶|🐾/,
    ];
    const printDogNegation = /\b(no dogs?|no pets?|not? (pet|dog))\b/i;
    const dogsInHouse = Array.from(occupancyMap.entries())
      .filter(([_, occ]) => {
        const haystack = [occ.guest.prefillNotes, occ.guest.hkNotes, occ.guest.preferences, occ.guest.inRoomItems].filter(Boolean).join(' ');
        if (printDogNegation.test(haystack)) return false;
        return printDogPatterns.some(p => p.test(haystack));
      })
      .map(([roomNum, occ]) => ({ roomNum, guest: occ.guest }));

    const renderRow = (entry: typeof mainPrintRooms[0]) => {
      const { room, occ, flags } = entry;
      if (!occ) return `<tr class="empty-row"><td class="room">${room.number}</td><td>${room.name}</td><td colspan="7" class="empty-cell">—</td></tr>`;

      const pax = parseInt(occ.guest.ll || '0', 10) || '';
      const car = occ.guest.car || '';
      const type = occ.type === 'stayover' ? `S ${occ.nightNum}/${occ.totalNights}` : 'ARR';
      const dinner = occ.guest.dinnerTime && occ.guest.dinnerTime !== 'none'
        ? `${occ.guest.dinnerTime}${occ.guest.dinnerVenue ? ` (${occ.guest.dinnerVenue})` : ''}`
        : '';
      const bkfst = occ.guest.packageName && occ.guest.packageName !== 'RO' && occ.guest.packageName !== 'Room Only' ? '✓' : '';
      const notes = occ.guest.prefillNotes || '';
      const flagStr = flags.map(f => f.emoji).join(' ');

      return `<tr>
        <td class="room">${room.number}</td>
        <td>${room.name}</td>
        <td class="guest-name">${occ.guest.name}</td>
        <td class="type">${type}</td>
        <td class="plate">${car}</td>
        <td>${pax}</td>
        <td>${bkfst}</td>
        <td>${dinner}</td>
        <td class="notes">${notes}</td>
        <td>${flagStr}</td>
      </tr>`;
    };

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>In House Report — ${dateStr}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; font-size: 11px; }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 3px solid #c5a065; padding-bottom: 12px; }
  .header h1 { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #0f172a; }
  .header .date { font-size: 13px; color: #64748b; margin-top: 4px; }
  .header .stats { font-size: 11px; color: #94a3b8; margin-top: 6px; }
  .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #0f172a; margin: 16px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #0f172a; color: white; padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) { background: #f8fafc; }
  .room { font-weight: 800; color: #c5a065; font-size: 13px; width: 40px; }
  .guest-name { font-weight: 600; }
  .type { font-weight: 700; font-size: 10px; }
  .plate { font-family: monospace; font-size: 10px; }
  .notes { font-size: 10px; max-width: 250px; word-wrap: break-word; color: #475569; }
  .empty-row { opacity: 0.4; }
  .empty-cell { text-align: center; color: #94a3b8; }
  .dogs-section { margin-top: 16px; page-break-inside: avoid; }
  .dogs-section h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #b45309; margin-bottom: 8px; border-bottom: 2px solid #fbbf24; padding-bottom: 4px; }
  .dogs-table th { background: #b45309; }
  .footer { text-align: center; margin-top: 20px; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
  <h1>🏠 In House Report</h1>
  <div class="date">${dateStr}</div>
  <div class="stats">${mainOccupied + lakeOccupied} Occupied • ${ALL_ROOMS.length - (mainOccupied + lakeOccupied)} Empty • ${Math.round(((mainOccupied + lakeOccupied) / ALL_ROOMS.length) * 100)}% Occupancy • ${mainPax + lakePax} Guests • ${mainCars + lakeCars} Cars • ${mainBreakfast + lakeBreakfast} Breakfast</div>
</div>

<h2 class="section-title">Main Hotel (${mainOccupied}/${mainRooms.length})</h2>
<table>
  <thead><tr>
    <th>Rm</th><th>Name</th><th>Guest</th><th>Type</th><th>Car</th><th>Pax</th><th>Bkfst</th><th>Dinner</th><th>Notes</th><th>🏷️</th>
  </tr></thead>
  <tbody>${mainPrintRooms.map(renderRow).join('')}</tbody>
</table>

<h2 class="section-title">Lake House (${lakeOccupied}/${lakeRooms.length})</h2>
<table>
  <thead><tr>
    <th>Rm</th><th>Name</th><th>Guest</th><th>Type</th><th>Car</th><th>Pax</th><th>Bkfst</th><th>Dinner</th><th>Notes</th><th>🏷️</th>
  </tr></thead>
  <tbody>${lakePrintRooms.map(renderRow).join('')}</tbody>
</table>

${dogsInHouse.length > 0 ? `
<div class="dogs-section">
  <h2>🐕 Dogs In House (${dogsInHouse.length})</h2>
  <table class="dogs-table">
    <thead><tr><th>Room</th><th>Guest</th><th>Details</th></tr></thead>
    <tbody>${dogsInHouse.map(d => {
      const haystack = [d.guest.prefillNotes, d.guest.hkNotes, d.guest.preferences].filter(Boolean).join(' ');
      const dogDetail = haystack.match(/🐕[^•]*/i)?.[0]?.trim() || haystack.match(/dog[^•]*/i)?.[0]?.trim() || 'Dog in room';
      return `<tr><td class="room">${d.roomNum}</td><td class="guest-name">${d.guest.name}</td><td>${dogDetail}</td></tr>`;
    }).join('')}</tbody>
  </table>
</div>` : ''}

<div class="footer">Gilpin Hotel & Lake House • In House Report • Printed ${new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
</body>
</html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }, [occupancyMap, mainRooms, lakeRooms, mainOccupied, lakeOccupied, mainPax, lakePax, mainCars, lakeCars, mainBreakfast, lakeBreakfast, dateStr]);

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
                  {/* Room Move & Activity Log Buttons */}
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
                    {occ.guest.activityLog && occ.guest.activityLog.length > 0 && (
                      <button
                        className="nm-move-btn"
                        style={{ marginLeft: 8 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivityLogGuest(occ.guest);
                        }}
                      >
                        📋 Activity Log ({occ.guest.activityLog.length})
                      </button>
                    )}
                    {/* Report Issue Button */}
                    <button
                      className="nm-move-btn nm-issue-btn"
                      style={{ marginLeft: 8 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIssueModal({ guest: occ.guest });
                      }}
                    >
                      ⚠️ Report Issue {(occ.guest.guestIssues || []).filter(i => !i.resolved).length > 0 && (
                        <span className="issue-count-badge">{(occ.guest.guestIssues || []).filter(i => !i.resolved).length}</span>
                      )}
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
        <button className="nm-print-btn nm-issue-log-btn" onClick={() => setShowIssueLog(true)} style={{ marginLeft: 8 }}>
          ⚠️ Guest Issues
          {(() => {
            let count = 0;
            occupancyMap.forEach(({ guest }) => { count += (guest.guestIssues || []).filter(i => !i.resolved).length; });
            return count > 0 ? <span className="issue-count-badge">{count}</span> : null;
          })()}
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

      {/* ═══ Dogs In House Section ═══ */}
      {dogsInHouse.length > 0 && (
        <motion.div
          className="nm-dogs-section no-print"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="nm-section-title" style={{ color: '#b45309', borderBottomColor: '#fbbf24' }}>🐕 Dogs In House ({dogsInHouse.length})</h2>
          <div className="nm-dogs-grid">
            {dogsInHouse.map(d => (
              <div key={d.roomNum} className="nm-dog-card">
                <span className="nm-dog-room">{d.roomNum}</span>
                <div className="nm-dog-info">
                  <span className="nm-dog-guest">{d.guest.name}</span>
                  <span className="nm-dog-detail">{d.detail}</span>
                </div>
              </div>
            ))}
          </div>
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

      {/* Activity Log Panel Overlay */}
      {activityLogGuest && (
        <ActivityLogPanel
          guestName={activityLogGuest.name}
          activityLog={activityLogGuest.activityLog || []}
          roomMoves={activityLogGuest.roomMoves}
          onClose={() => setActivityLogGuest(null)}
        />
      )}

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

      {/* ── Guest Issue Modal ── */}
      <AnimatePresence>
        {issueModal && (
          <motion.div
            className="gi-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIssueModal(null)}
          >
            <motion.div
              className="gi-modal"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>⚠️ Report Guest Issue — Room {issueModal.guest.room}</h3>
              <p className="gi-guest-name">{issueModal.guest.name}</p>

              <label>What was the issue?</label>
              <textarea
                className="gi-input"
                placeholder="Describe the issue..."
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                rows={3}
              />

              <label>What did we do to compensate?</label>
              <textarea
                className="gi-input"
                placeholder="e.g. Room upgrade, complimentary dessert, bottle of wine..."
                value={issueCompensation}
                onChange={(e) => setIssueCompensation(e.target.value)}
                rows={2}
              />

              <div className="gi-toggles">
                <div className="gi-toggle-row">
                  <span>Is the issue resolved?</span>
                  <button
                    className={`gi-toggle ${issueResolved ? 'active' : ''}`}
                    onClick={() => setIssueResolved(!issueResolved)}
                  >
                    {issueResolved ? '✅ Yes' : '❌ No'}
                  </button>
                </div>
                <div className="gi-toggle-row">
                  <span>Does guest need a talk with a manager?</span>
                  <button
                    className={`gi-toggle ${issueNeedsManager ? 'active manager' : ''}`}
                    onClick={() => setIssueNeedsManager(!issueNeedsManager)}
                  >
                    {issueNeedsManager ? '🔴 Yes' : 'No'}
                  </button>
                </div>
              </div>

              <label>Reported by</label>
              <input
                className="gi-input"
                placeholder="Your name"
                value={issueReporter}
                onChange={(e) => setIssueReporter(e.target.value)}
              />

              <div className="gi-actions">
                <button className="gi-cancel" onClick={() => { setIssueModal(null); setIssueText(''); setIssueCompensation(''); setIssueResolved(false); setIssueNeedsManager(false); }}>Cancel</button>
                <button
                  className="gi-submit"
                  disabled={!issueText.trim()}
                  onClick={() => {
                    if (!issueModal || !issueText.trim()) return;
                    handleAddGuestIssue(issueModal.guest.id, {
                      room: issueModal.guest.room,
                      guestName: issueModal.guest.name,
                      reportedBy: issueReporter || 'Staff',
                      issue: issueText.trim(),
                      compensation: issueCompensation.trim(),
                      resolved: issueResolved,
                      resolvedAt: issueResolved ? Date.now() : undefined,
                      needsManager: issueNeedsManager,
                    });
                    setIssueModal(null);
                    setIssueText('');
                    setIssueCompensation('');
                    setIssueResolved(false);
                    setIssueNeedsManager(false);
                  }}
                >
                  Submit Issue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Guest Issue Log Panel ── */}
      <AnimatePresence>
        {showIssueLog && (() => {
          // Collect all issues across all occupied rooms
          const allIssues: { guest: Guest; issue: GuestIssue }[] = [];
          occupancyMap.forEach(({ guest }) => {
            (guest.guestIssues || []).forEach(issue => {
              allIssues.push({ guest, issue });
            });
          });
          let filteredIssues = allIssues;
          if (issueLogFilter === 'open') filteredIssues = allIssues.filter(i => !i.issue.resolved);
          if (issueLogFilter === 'manager') filteredIssues = allIssues.filter(i => i.issue.needsManager && !i.issue.managerHandledAt);
          filteredIssues.sort((a, b) => b.issue.timestamp - a.issue.timestamp);

          const printGuestIssueLog = () => {
            const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const rows = filteredIssues.map(({ guest, issue }) => {
              const status = issue.resolved ? '✅ Yes' : '❌ No';
              const mgr = issue.needsManager ? (issue.managerHandledAt ? `Yes — ${issue.managerHandledBy}` : '🔴 Awaiting') : 'No';
              return `<tr>
                <td>${guest.room}</td>
                <td>${guest.name}</td>
                <td>${issue.issue}</td>
                <td>${issue.compensation || '—'}</td>
                <td>${status}</td>
                <td>${mgr}</td>
                <td>${issue.reportedBy}</td>
              </tr>`;
            }).join('');
            const html = `<!DOCTYPE html><html><head><title>Guest Issue Log</title>
            <style>
              body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1e293b}
              h1{font-size:22px;margin:0 0 4px}h2{font-size:14px;font-weight:400;color:#64748b;margin:0 0 24px}
              table{width:100%;border-collapse:collapse;font-size:12px}
              th{background:#1e3a5f;color:#fff;padding:10px 12px;text-align:left;font-weight:600}
              td{padding:10px 12px;border-bottom:1px solid #e2e8f0}
              tr:nth-child(even){background:#f8fafc}
              @media print{body{padding:20px}}
            </style></head><body>
            <h1>Gilpin Hotel — Guest Issue Log</h1>
            <h2>${dateStr} • ${filteredIssues.length} issue(s)</h2>
            <table><thead><tr><th>Room</th><th>Guest</th><th>Issue</th><th>Compensation</th><th>Resolved</th><th>Manager</th><th>Reported By</th></tr></thead>
            <tbody>${rows}</tbody></table>
            </body></html>`;
            const w = window.open('', '_blank');
            if (w) { w.document.write(html); w.document.close(); w.print(); }
          };

          return (
            <motion.div
              className="gi-log-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIssueLog(false)}
            >
              <motion.div
                className="gi-log-panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="gi-log-header">
                  <h3>📋 Guest Issue Log</h3>
                  <div className="gi-log-actions">
                    <button className="gi-print-btn" onClick={printGuestIssueLog}>🖨️ Print</button>
                    <button className="gi-close-btn" onClick={() => setShowIssueLog(false)}>✕</button>
                  </div>
                </div>

                <div className="gi-log-filters">
                  <button className={`gi-filter ${issueLogFilter === 'all' ? 'active' : ''}`} onClick={() => setIssueLogFilter('all')}>All ({allIssues.length})</button>
                  <button className={`gi-filter ${issueLogFilter === 'open' ? 'active' : ''}`} onClick={() => setIssueLogFilter('open')}>⏳ Open</button>
                  <button className={`gi-filter ${issueLogFilter === 'manager' ? 'active' : ''}`} onClick={() => setIssueLogFilter('manager')}>🔴 Needs Manager</button>
                </div>

                {filteredIssues.length === 0 ? (
                  <div className="gi-empty">
                    <span>📋</span>
                    <p>No guest issues to display</p>
                  </div>
                ) : (
                  <div className="gi-log-list">
                    {filteredIssues.map(({ guest, issue }) => (
                      <div key={issue.id} className={`gi-log-row ${issue.resolved ? 'resolved' : ''} ${issue.needsManager && !issue.managerHandledAt ? 'needs-manager' : ''}`}>
                        <div className="gi-log-room">
                          <span className="room-num">{guest.room}</span>
                          <span className="guest-nm">{guest.name}</span>
                        </div>
                        <div className="gi-log-body">
                          <p className="gi-log-issue">{issue.issue}</p>
                          {issue.compensation && <p className="gi-log-comp">💰 {issue.compensation}</p>}
                          <div className="gi-log-meta">
                            <span>{issue.resolved ? '✅ Resolved' : '⏳ Open'}</span>
                            {issue.needsManager && <span className="manager-flag">{issue.managerHandledAt ? `✅ Manager: ${issue.managerHandledBy}` : '🔴 Needs Manager'}</span>}
                            <span className="gi-log-time">{new Date(issue.timestamp).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="gi-log-reporter">by {issue.reportedBy}</span>
                          </div>
                          <div className="gi-log-actions-row">
                            {!issue.resolved && (
                              <button className="gi-resolve-btn" onClick={() => handleUpdateGuestIssue(guest.id, issue.id, { resolved: true, resolvedAt: Date.now() })}>
                                ✓ Resolve
                              </button>
                            )}
                            {issue.needsManager && !issue.managerHandledAt && (
                              <button className="gi-manager-btn" onClick={() => {
                                const name = prompt('Manager name:');
                                if (name) handleUpdateGuestIssue(guest.id, issue.id, { managerHandledBy: name, managerHandledAt: Date.now() });
                              }}>
                                👔 Mark Manager Handled
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Styles in styles/in-room.css */}
    </div>
  );
};

export default React.memo(InHouseDashboard);
