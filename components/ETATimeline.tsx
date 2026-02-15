import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guest } from '../types';

interface ETATimelineProps {
    guests: Guest[];
    onGuestClick?: (guestId: string) => void;
}

/* Positioned guest with lane assignment */
interface PlacedGuest {
    guest: Guest;
    decimalHour: number;  // e.g. 14.5 = 14:30
    pctLeft: number;      // 0-100% horizontal position
    lane: number;         // vertical lane index (0, 1, 2...)
}

const RANGE_START = 10;
const RANGE_END = 20;
const RANGE_SPAN = RANGE_END - RANGE_START;
const HOUR_MARKS = Array.from({ length: RANGE_SPAN + 1 }, (_, i) => RANGE_START + i);

/* Bubble diameter + gap in percentage of track width */
const BUBBLE_CLEARANCE_PCT = 4; // two bubbles must be >4% apart to share a lane

/** Parse ETA string → decimal hours, e.g. "14:30" → 14.5
 *  Handles: "14:30", "14.30", "2pm", "3:15pm", "1430", "N/A" */
const parseETA = (eta: string): number | null => {
    if (!eta || eta === 'N/A' || /tbc|tba|unknown/i.test(eta)) return null;

    // Normalise dot-notation (PDF style "14.30") → "14:30"
    const normalised = eta.replace(/\./g, ':');
    const m = normalised.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!m) return null;

    let h = parseInt(m[1]);
    const min = parseInt(m[2] || '0');
    const ap = (m[3] || '').toLowerCase();

    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (!ap && h >= 1 && h <= 9) h += 12; // bare 2 → 14

    return h + min / 60;
};

const ETATimeline: React.FC<ETATimelineProps> = ({ guests, onGuestClick }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    /* ── Place every guest with non-overlapping lane assignment ── */
    const { placed, laneCount } = useMemo(() => {
        // 1. Parse & sort by time
        const raw: Omit<PlacedGuest, 'lane'>[] = [];
        guests.forEach(g => {
            const val = parseETA(g.eta);
            if (val === null) return;
            const clamped = Math.max(RANGE_START, Math.min(val, RANGE_END));
            const pct = ((clamped - RANGE_START) / RANGE_SPAN) * 100;
            raw.push({ guest: g, decimalHour: clamped, pctLeft: pct });
        });
        raw.sort((a, b) => a.decimalHour - b.decimalHour);

        // 2. Greedy lane packing – each lane tracks its rightmost occupied %
        const laneEnds: number[] = []; // rightmost pct used in each lane
        const placed: PlacedGuest[] = raw.map(pg => {
            // Find the first lane where this guest doesn't overlap
            let assigned = -1;
            for (let l = 0; l < laneEnds.length; l++) {
                if (pg.pctLeft - laneEnds[l] >= BUBBLE_CLEARANCE_PCT) {
                    assigned = l;
                    break;
                }
            }
            if (assigned === -1) {
                assigned = laneEnds.length;
                laneEnds.push(-999);
            }
            laneEnds[assigned] = pg.pctLeft;
            return { ...pg, lane: assigned };
        });

        return { placed, laneCount: Math.max(laneEnds.length, 1) };
    }, [guests]);

    const totalArrivals = placed.length;

    /* ── Helpers ── */
    const getGuestColor = (guest: Guest) => {
        const notes = guest.prefillNotes.toLowerCase();
        if (notes.includes('⭐') || notes.includes('vip')) return '#a855f7';
        if (notes.includes('🥜') || notes.includes('⚠️')) return '#ef4444';
        if (guest.ll.toLowerCase().includes('yes')) return '#3b82f6';
        const rNum = parseInt(guest.room.split(' ')[0]);
        if (rNum >= 51 && rNum <= 58) return '#10b981';
        return '#334155';
    };

    const getRoomNumber = (guest: Guest) => {
        const m = guest.room.match(/^(\d+)/);
        return m ? m[1] : guest.room;
    };

    if (guests.length === 0) return null;

    const ROW_H = 44; // px per lane row
    const TRACK_H = 8;
    const trackAreaHeight = laneCount * ROW_H;

    return (
        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5 shadow-xl mb-6">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between gap-4 cursor-pointer hover:opacity-80 transition-opacity"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#c5a065]/10 rounded-xl flex items-center justify-center text-xl border border-[#c5a065]/20">
                        ⏱️
                    </div>
                    <div className="text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065]">
                            Arrival Timeline
                        </h3>
                        <p className="text-[9px] text-slate-400 tracking-wide">
                            {totalArrivals} arrivals scheduled • {isExpanded ? 'Click to collapse' : 'Click to expand'}
                        </p>
                    </div>
                </div>
                <div className={`text-xl transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        key="timeline-content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="mt-6" style={{ paddingLeft: 10, paddingRight: 10 }}>
                            {/* ── Hour labels ── */}
                            <div className="relative" style={{ height: 18, marginBottom: 4 }}>
                                {HOUR_MARKS.map(hour => {
                                    const pct = ((hour - RANGE_START) / RANGE_SPAN) * 100;
                                    return (
                                        <span
                                            key={hour}
                                            className="absolute text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none"
                                            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                                        >
                                            {`${hour.toString().padStart(2, '0')}:00`}
                                        </span>
                                    );
                                })}
                            </div>

                            {/* ── Track bar ── */}
                            <div
                                className="relative rounded-full bg-slate-200 dark:bg-stone-700"
                                style={{ height: TRACK_H }}
                            >
                                {/* Hour ticks */}
                                {HOUR_MARKS.map(hour => {
                                    const pct = ((hour - RANGE_START) / RANGE_SPAN) * 100;
                                    return (
                                        <div
                                            key={hour}
                                            className="absolute top-0 bottom-0"
                                            style={{
                                                left: `${pct}%`,
                                                width: 1,
                                                background: 'rgba(255,255,255,0.15)',
                                            }}
                                        />
                                    );
                                })}
                            </div>

                            {/* ── Guest bubbles in lanes ── */}
                            <div className="relative" style={{ height: trackAreaHeight, marginTop: 8 }}>
                                {/* Vertical drop lines from track to each bubble */}
                                {placed.map(pg => (
                                    <div
                                        key={`line-${pg.guest.id}`}
                                        className="absolute"
                                        style={{
                                            left: `${pg.pctLeft}%`,
                                            top: 0,
                                            height: pg.lane * ROW_H + ROW_H / 2,
                                            width: 1,
                                            background: 'rgba(197,160,101,0.15)',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                ))}

                                {placed.map(pg => {
                                    const top = pg.lane * ROW_H;
                                    const color = getGuestColor(pg.guest);
                                    const room = getRoomNumber(pg.guest);

                                    return (
                                        <div
                                            key={pg.guest.id}
                                            className="absolute flex items-center gap-1.5 group"
                                            style={{
                                                left: `${pg.pctLeft}%`,
                                                top,
                                                transform: 'translateX(-50%)',
                                                height: ROW_H,
                                            }}
                                        >
                                            {/* Bubble */}
                                            <div
                                                onClick={(e) => { e.stopPropagation(); onGuestClick?.(pg.guest.id); }}
                                                className="relative flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-[10px] font-black cursor-pointer shadow-lg transition-transform hover:scale-110"
                                                style={{ background: color }}
                                            >
                                                {room}

                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-2xl whitespace-nowrap text-[10px]">
                                                        <div className="font-black">{pg.guest.name}</div>
                                                        <div className="text-slate-400">Room {pg.guest.room} • ETA {pg.guest.eta}</div>
                                                        {pg.guest.prefillNotes && (
                                                            <div className="text-[9px] text-[#c5a065] mt-1 max-w-[200px] truncate">
                                                                {pg.guest.prefillNotes}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 -bottom-1" />
                                                </div>
                                            </div>

                                            {/* ETA label next to bubble */}
                                            <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap select-none">
                                                {pg.guest.eta}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ── Legend ── */}
                            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-stone-700">
                                {[
                                    { color: '#a855f7', label: 'VIP' },
                                    { color: '#ef4444', label: 'Allergy' },
                                    { color: '#3b82f6', label: 'Return' },
                                    { color: '#10b981', label: 'Lake House' },
                                    { color: '#334155', label: 'Standard' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default React.memo(ETATimeline);
