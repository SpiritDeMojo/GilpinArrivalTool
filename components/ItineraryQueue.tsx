import React, { useState, useMemo, useCallback } from 'react';
import PackageGenerator from './PackageGenerator';
import { Guest, ArrivalSession } from '../types';

/* ────────────── Types ────────────── */
interface ItineraryGuest {
    guestId: string;
    name: string;
    room: string;
    rateCode: string;
    presetKey: string; // 'moon' | 'magic'
    arrivalDate: string; // YYYY-MM-DD
}

interface ItineraryQueueProps {
    guests: Guest[];
    session: ArrivalSession | null;
    onClose: () => void;
}

/* ────────────── Rate Code → Preset Mapping ────────────── */
const rateCodeToPreset = (code: string): string | null => {
    const upper = (code || '').toUpperCase();
    if (upper.match(/^MIN/)) return 'moon';       // MINIMOON, MINI_MOON, MIN
    if (upper.match(/^MAG|^LHMAG/)) return 'magic'; // MAGESC, MAG_ESC, LHMAG
    return null;
};

/* ────────────── Extract Itinerary Guests ────────────── */
export const getItineraryGuests = (guests: Guest[], session: ArrivalSession | null): ItineraryGuest[] => {
    if (!session) return [];

    // Parse arrival date from session dateObj (which is a string like "2026-02-07" or date label)
    const dateStr = session.dateObj;
    const dateObj = dateStr ? new Date(dateStr) : null;
    const arrivalDate = dateObj && !isNaN(dateObj.getTime())
        ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
        : '';

    return guests
        .filter(g => {
            const preset = rateCodeToPreset(g.rateCode || '');
            return preset !== null;
        })
        .map(g => ({
            guestId: g.id,
            name: g.name,
            room: g.room?.replace(/^\d+\s*/, '') || '', // Strip room number prefix
            rateCode: g.rateCode || '',
            presetKey: rateCodeToPreset(g.rateCode || '') || 'magic',
            arrivalDate,
        }));
};

/* ────────────── Component ────────────── */
const ItineraryQueue: React.FC<ItineraryQueueProps> = ({ guests, session, onClose }) => {
    const itineraryGuests = useMemo(() => getItineraryGuests(guests, session), [guests, session]);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [activeIndex, setActiveIndex] = useState(0);

    const remaining = useMemo(
        () => itineraryGuests.filter(g => !completedIds.has(g.guestId)),
        [itineraryGuests, completedIds]
    );

    const activeGuest = remaining[activeIndex] || remaining[0] || null;

    const handleComplete = useCallback(() => {
        if (!activeGuest) return;
        setCompletedIds(prev => new Set([...prev, activeGuest.guestId]));
        // Move to next guest
        const newRemaining = remaining.filter(g => g.guestId !== activeGuest.guestId);
        if (newRemaining.length === 0) {
            // All done
            onClose();
        } else {
            setActiveIndex(0);
        }
    }, [activeGuest, remaining, onClose]);

    const handleSkip = useCallback(() => {
        if (remaining.length <= 1) {
            onClose();
        } else {
            setActiveIndex(prev => (prev + 1) % remaining.length);
        }
    }, [remaining, onClose]);

    if (itineraryGuests.length === 0 || remaining.length === 0) return null;

    const packageLabel = activeGuest?.presetKey === 'moon' ? 'Gilpinmoon' : 'Magical Escapes';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Queue Header */}
            <div style={{
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                padding: '12px 24px',
                display: 'flex', alignItems: 'center', gap: 16,
                borderBottom: '1px solid rgba(99,102,241,0.3)',
                flexShrink: 0,
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
                        Itinerary Queue
                    </div>
                    <div style={{ color: 'rgba(199,210,254,0.8)', fontSize: 12, marginTop: 2 }}>
                        {remaining.length} remaining of {itineraryGuests.length} package guests
                    </div>
                </div>

                {/* Tab pills for remaining guests */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: '60%' }}>
                    {remaining.map((g, i) => (
                        <button
                            key={g.guestId}
                            onClick={() => setActiveIndex(i)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                border: 'none',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: g.guestId === activeGuest?.guestId
                                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                                    : 'rgba(255,255,255,0.1)',
                                color: g.guestId === activeGuest?.guestId ? 'white' : 'rgba(199,210,254,0.8)',
                                boxShadow: g.guestId === activeGuest?.guestId
                                    ? '0 4px 12px rgba(99,102,241,0.4)'
                                    : 'none',
                            }}
                        >
                            {g.name.length > 20 ? g.name.substring(0, 20) + '...' : g.name}
                        </button>
                    ))}
                </div>

                {/* Skip / Close */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleSkip}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
                            background: 'transparent', color: 'rgba(199,210,254,0.8)', fontSize: 12,
                            fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        Skip
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)',
                            background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 12,
                            fontWeight: 700, cursor: 'pointer',
                        }}
                    >
                        Close All
                    </button>
                </div>
            </div>

            {/* Active guest info banner */}
            <div style={{
                background: 'rgba(99,102,241,0.1)',
                borderBottom: '1px solid rgba(99,102,241,0.2)',
                padding: '10px 24px',
                display: 'flex', alignItems: 'center', gap: 16,
                flexShrink: 0,
            }}>
                <span style={{
                    background: activeGuest?.presetKey === 'moon' ? '#6366f1' : '#8b5cf6',
                    color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: 11,
                    fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                    {packageLabel}
                </span>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>
                    {activeGuest?.name}
                </span>
                <span style={{ color: 'rgba(199,210,254,0.6)', fontSize: 12 }}>
                    Room {activeGuest?.room}
                </span>
                <span style={{ color: 'rgba(199,210,254,0.4)', fontSize: 11 }}>
                    Rate: {activeGuest?.rateCode}
                </span>
            </div>

            {/* PackageGenerator — takes up remaining space */}
            <div style={{ flex: 1, overflow: 'auto', background: 'white' }}>
                {activeGuest && (
                    <PackageGenerator
                        key={activeGuest.guestId} // Force remount for each guest
                        initialGuestName={activeGuest.name}
                        initialRoomName={activeGuest.room}
                        initialPreset={activeGuest.presetKey}
                        initialStartDate={activeGuest.arrivalDate}
                        onComplete={handleComplete}
                        stripEmojis
                    />
                )}
            </div>
        </div>
    );
};

export default ItineraryQueue;
