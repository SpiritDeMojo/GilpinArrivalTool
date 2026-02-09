import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guest } from '../types';

interface ETATimelineProps {
    guests: Guest[];
    onGuestClick?: (guestId: string) => void;
}

interface TimeSlot {
    hour: number;
    label: string;
    guests: Guest[];
}

const ETATimeline: React.FC<ETATimelineProps> = ({ guests, onGuestClick }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const timeSlots = useMemo(() => {
        // Create time slots from 10:00 to 20:00
        const slots: TimeSlot[] = [];
        for (let hour = 10; hour <= 20; hour++) {
            slots.push({
                hour,
                label: `${hour.toString().padStart(2, '0')}:00`,
                guests: []
            });
        }

        // Bucket guests into time slots
        guests.forEach(guest => {
            const eta = guest.eta;
            if (eta && eta !== 'N/A') {
                const match = eta.match(/^(\d{1,2})/);
                if (match) {
                    const hour = parseInt(match[1]);
                    const slot = slots.find(s => s.hour === hour);
                    if (slot) {
                        slot.guests.push(guest);
                    } else if (hour < 10) {
                        slots[0].guests.push(guest); // Early arrivals bucket
                    } else if (hour > 20) {
                        slots[slots.length - 1].guests.push(guest); // Late arrivals bucket
                    }
                }
            }
        });

        return slots;
    }, [guests]);

    const totalArrivals = timeSlots.reduce((sum, slot) => sum + slot.guests.length, 0);

    const getGuestColor = (guest: Guest) => {
        const notes = guest.prefillNotes.toLowerCase();
        if (notes.includes('⭐') || notes.includes('vip')) return 'bg-purple-500';
        if (notes.includes('🥜') || notes.includes('⚠️')) return 'bg-red-500';
        if (guest.ll.toLowerCase().includes('yes')) return 'bg-blue-500';

        const rNum = parseInt(guest.room.split(' ')[0]);
        if (rNum >= 51 && rNum <= 58) return 'bg-emerald-500';
        return 'bg-slate-700';
    };

    const getRoomNumber = (guest: Guest) => {
        const match = guest.room.match(/^(\d+)/);
        return match ? match[1] : guest.room;
    };

    if (guests.length === 0) return null;

    return (
        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 dark:border-white/5 shadow-xl mb-6">
            {/* Header - Always visible, clickable to toggle */}
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

            {/* Collapsible Content — Framer Motion for reliable height animation */}
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
                        <div className="mt-6 relative">
                            {/* Time axis */}
                            <div className="flex justify-between mb-2">
                                {timeSlots.map(slot => (
                                    <div
                                        key={slot.hour}
                                        className="flex-1 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider"
                                    >
                                        {slot.label}
                                    </div>
                                ))}
                            </div>

                            {/* Timeline track */}
                            <div className="h-2 bg-slate-200 dark:bg-stone-700 rounded-full mb-4 relative">
                                <div className="absolute inset-0 flex">
                                    {timeSlots.map((slot, i) => (
                                        <div
                                            key={slot.hour}
                                            className="flex-1 border-r border-white/20 dark:border-stone-600 last:border-r-0"
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Guest bubbles */}
                            <div className="flex">
                                {timeSlots.map(slot => (
                                    <div key={slot.hour} className="flex-1 flex flex-col items-center gap-1 min-h-[60px]">
                                        {slot.guests.slice(0, 4).map((guest, idx) => (
                                            <div
                                                key={guest.id}
                                                onClick={(e) => { e.stopPropagation(); onGuestClick?.(guest.id); }}
                                                className={`group relative w-8 h-8 rounded-full ${getGuestColor(guest)} flex items-center justify-center text-white text-[10px] font-black cursor-pointer hover:scale-125 transition-transform shadow-lg`}
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                {getRoomNumber(guest)}

                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                    <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-2xl whitespace-nowrap text-[10px]">
                                                        <div className="font-black">{guest.name}</div>
                                                        <div className="text-slate-400">Room {guest.room} • ETA {guest.eta}</div>
                                                        {guest.prefillNotes && (
                                                            <div className="text-[9px] text-[#c5a065] mt-1 max-w-[200px] truncate">
                                                                {guest.prefillNotes}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 -bottom-1" />
                                                </div>
                                            </div>
                                        ))}

                                        {/* Overflow indicator */}
                                        {slot.guests.length > 4 && (
                                            <div className="text-[9px] font-bold text-slate-400">
                                                +{slot.guests.length - 4}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-200 dark:border-stone-700">
                                {[
                                    { color: 'bg-purple-500', label: 'VIP' },
                                    { color: 'bg-red-500', label: 'Allergy' },
                                    { color: 'bg-blue-500', label: 'Return' },
                                    { color: 'bg-emerald-500', label: 'Lake House' },
                                    { color: 'bg-slate-700', label: 'Standard' },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
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

export default ETATimeline;
