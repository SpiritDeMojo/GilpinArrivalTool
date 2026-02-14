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
    facilities: string;    // from AI audit (e.g. "Spa 2pm, Pool")
    dinnerTime: string;    // e.g. "7:30pm" or "19:30"
    dinnerVenue: string;   // e.g. "Gilpin Spice"
    preferences: string;   // e.g. "vegetarian, late checkout"
    duration: string;      // e.g. "3 night(s)"
    occasions: string;     // e.g. "🎂 Birthday, 🥂 Anniversary"
    champagne: boolean;
    petals: boolean;
    history: string;       // e.g. "Yes (x3)"
    pax: number;
    specialCard: string;   // AI-generated welcome/celebration card
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
        .map(g => {
            // Extract occasions from notes (birthday, anniversary, honeymoon, etc.)
            const notes = g.prefillNotes || '';
            const occasionPatterns: string[] = [];
            if (/birthday|🎂/i.test(notes)) occasionPatterns.push('🎂 Birthday');
            if (/anniversary|🥂/i.test(notes)) occasionPatterns.push('🥂 Anniversary');
            if (/honeymoon|💒/i.test(notes)) occasionPatterns.push('💒 Honeymoon');
            if (/valentine/i.test(notes)) occasionPatterns.push('💝 Valentine\'s');
            if (/wedding/i.test(notes)) occasionPatterns.push('💍 Wedding');
            if (/celebration|🎉/i.test(notes)) occasionPatterns.push('🎉 Celebration');

            // Extract champagne/petals from inRoomItems or notes
            const inRoom = (g.inRoomItems || '').toLowerCase();
            const hasChampagne = /champagne/i.test(inRoom) || /champagne/i.test(notes);
            const hasPetals = /petal/i.test(inRoom) || /petal/i.test(notes);

            return {
                guestId: g.id,
                name: g.name,
                room: g.room?.replace(/^\d+\s*/, '') || '',
                rateCode: g.rateCode || '',
                presetKey: rateCodeToPreset(g.rateCode || '') || 'magic',
                arrivalDate,
                facilities: g.facilities || '',
                dinnerTime: g.dinnerTime || '',
                dinnerVenue: g.dinnerVenue || '',
                preferences: g.preferences || '',
                duration: g.duration || '',
                occasions: occasionPatterns.join(', '),
                champagne: hasChampagne,
                petals: hasPetals,
                history: g.ll || '',
                pax: (g.adults || 2),
                specialCard: g.specialCard || '',
            };
        });
};

/* ────────────── Parse facility lines for display ────────────── */
const parseFacilityLines = (facilities: string): { icon: string; text: string }[] => {
    if (!facilities.trim()) return [];

    // Split on bullet separators, commas, or newlines
    const parts = facilities
        .split(/[•·\n]/)
        .map(s => s.trim())
        .filter(Boolean);

    return parts.map(part => {
        const lower = part.toLowerCase();
        let icon = '📌';
        if (/spa|espa|massage|facial|aromatherapy|hot\s*stone|treatment|body\s*wrap|reflexology|manicure|pedicure|scrub/i.test(lower)) icon = '💆';
        else if (/source|dinner|supper|lunch/i.test(lower)) icon = '🍽️';
        else if (/spice/i.test(lower)) icon = '🌶️';
        else if (/lake\s*house/i.test(lower)) icon = '🏡';
        else if (/pool|swim/i.test(lower)) icon = '🏊';
        else if (/hamper|picnic|afternoon\s*tea|bento/i.test(lower)) icon = '🧺';
        else if (/champagne|prosecco|wine/i.test(lower)) icon = '🥂';
        else if (/walk|hike|outdoor/i.test(lower)) icon = '🥾';
        else if (/breakfast/i.test(lower)) icon = '☕';
        else if (/pure\s*lake|gym|fitness/i.test(lower)) icon = '🏋️';
        return { icon, text: part };
    });
};

/* ────────────── Component ────────────── */
const ItineraryQueue: React.FC<ItineraryQueueProps> = ({ guests, session, onClose }) => {
    const itineraryGuests = useMemo(() => getItineraryGuests(guests, session), [guests, session]);
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [activeIndex, setActiveIndex] = useState(0);
    const [showGenerator, setShowGenerator] = useState(false);

    const remaining = useMemo(
        () => itineraryGuests.filter(g => !completedIds.has(g.guestId)),
        [itineraryGuests, completedIds]
    );

    const activeGuest = remaining[activeIndex] || remaining[0] || null;

    const handleComplete = useCallback(() => {
        if (!activeGuest) return;
        setCompletedIds(prev => new Set([...prev, activeGuest.guestId]));
        setShowGenerator(false);
        setActiveIndex(0);
    }, [activeGuest]);

    const handleDismiss = useCallback(() => {
        if (!activeGuest) return;
        setCompletedIds(prev => new Set([...prev, activeGuest.guestId]));
        setShowGenerator(false);
        setActiveIndex(0);
    }, [activeGuest]);

    const handleOpenGenerator = useCallback(() => {
        setShowGenerator(true);
    }, []);

    if (itineraryGuests.length === 0) return null;

    const packageLabel = activeGuest?.presetKey === 'moon' ? 'Gilpinmoon' : 'Magical Escapes';
    const facilityLines = activeGuest ? parseFacilityLines(activeGuest.facilities) : [];
    const allDone = remaining.length === 0;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* ── Queue Header ── */}
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
                        {allDone
                            ? `All ${itineraryGuests.length} guests processed ✓`
                            : `${remaining.length} remaining of ${itineraryGuests.length} package guests`
                        }
                    </div>
                </div>

                {/* Tab pills for remaining guests */}
                {!allDone && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: '60%' }}>
                        {remaining.map((g, i) => (
                            <button
                                key={g.guestId}
                                onClick={() => { setActiveIndex(i); setShowGenerator(false); }}
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
                )}

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

            {/* ── Main Area ── */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex' }}>
                {allDone ? (
                    /* ── All Done Summary ── */
                    <div style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(180deg, #1e1b4b 0%, #0a0a1a 100%)',
                        gap: 16,
                    }}>
                        <div style={{ fontSize: 56 }}>✅</div>
                        <div style={{ color: 'white', fontSize: 22, fontWeight: 800 }}>
                            All Itineraries Processed
                        </div>
                        <div style={{ color: 'rgba(199,210,254,0.6)', fontSize: 14 }}>
                            {itineraryGuests.length} package guest{itineraryGuests.length !== 1 ? 's' : ''} completed
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                marginTop: 16, padding: '12px 32px', borderRadius: 10,
                                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: 'white',
                            }}
                        >
                            Return to Dashboard
                        </button>
                    </div>
                ) : showGenerator && activeGuest ? (
                    /* ── Generator View ── */
                    <div style={{ flex: 1, background: 'white' }}>
                        <PackageGenerator
                            key={activeGuest.guestId}
                            initialGuestName={activeGuest.name}
                            initialRoomName={activeGuest.room}
                            initialPreset={activeGuest.presetKey}
                            initialStartDate={activeGuest.arrivalDate}
                            initialFacilities={activeGuest.facilities}
                            initialDinnerTime={activeGuest.dinnerTime}
                            initialDinnerVenue={activeGuest.dinnerVenue}
                            initialPreferences={activeGuest.preferences}
                            initialDuration={activeGuest.duration}
                            initialOccasions={activeGuest.occasions}
                            initialChampagne={activeGuest.champagne}
                            initialPetals={activeGuest.petals}
                            initialHistory={activeGuest.history}
                            initialPax={activeGuest.pax}
                            initialSpecialCard={activeGuest.specialCard}
                            onComplete={handleComplete}
                            stripEmojis
                        />
                    </div>
                ) : activeGuest ? (
                    /* ── Facility Summary View ── */
                    <div style={{
                        flex: 1, display: 'flex',
                        background: 'linear-gradient(180deg, #1e1b4b 0%, #0f0e2a 100%)',
                    }}>
                        {/* Left Panel — Facility Summary */}
                        <div style={{
                            width: 380, flexShrink: 0, padding: '28px 24px',
                            borderRight: '1px solid rgba(99,102,241,0.15)',
                            overflowY: 'auto',
                            display: 'flex', flexDirection: 'column', gap: 20,
                        }}>
                            {/* Guest Header Card */}
                            <div style={{
                                background: 'rgba(99,102,241,0.08)',
                                border: '1px solid rgba(99,102,241,0.2)',
                                borderRadius: 16, padding: '20px 18px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <span style={{
                                        background: activeGuest.presetKey === 'moon' ? '#6366f1' : '#8b5cf6',
                                        color: 'white', padding: '4px 12px', borderRadius: 6, fontSize: 10,
                                        fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                    }}>
                                        {packageLabel}
                                    </span>
                                    {activeGuest.specialCard && (
                                        <span style={{
                                            background: 'rgba(197,160,101,0.2)', color: '#f5d89a',
                                            padding: '3px 10px', borderRadius: 6, fontSize: 9,
                                            fontWeight: 800, letterSpacing: '0.05em',
                                        }}>
                                            📝 Card
                                        </span>
                                    )}
                                </div>
                                <div style={{ color: 'white', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>
                                    {activeGuest.name}
                                </div>
                                <div style={{
                                    display: 'flex', gap: 16, marginTop: 10, fontSize: 12,
                                    color: 'rgba(199,210,254,0.7)',
                                }}>
                                    <span>🏠 Room {activeGuest.room}</span>
                                    {activeGuest.duration && <span>📅 {activeGuest.duration}</span>}
                                    {activeGuest.pax > 0 && <span>👥 {activeGuest.pax} pax</span>}
                                </div>
                                {activeGuest.history && /yes/i.test(activeGuest.history) && (
                                    <div style={{
                                        marginTop: 8, fontSize: 11, color: '#86efac',
                                        fontWeight: 700,
                                    }}>
                                        ⭐ Returning Guest — {activeGuest.history}
                                    </div>
                                )}
                            </div>

                            {/* Facilities Card */}
                            <div style={{
                                background: 'rgba(16,185,129,0.06)',
                                border: '1px solid rgba(16,185,129,0.15)',
                                borderRadius: 16, padding: '18px 16px',
                            }}>
                                <div style={{
                                    fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                    letterSpacing: '0.1em', color: '#6ee7b7', marginBottom: 12,
                                }}>
                                    🎯 Booked Facilities
                                </div>
                                {facilityLines.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {facilityLines.map((f, i) => (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'flex-start', gap: 10,
                                                padding: '8px 12px',
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: 10,
                                                border: '1px solid rgba(255,255,255,0.05)',
                                            }}>
                                                <span style={{ fontSize: 16, flexShrink: 0 }}>{f.icon}</span>
                                                <span style={{
                                                    color: 'rgba(255,255,255,0.85)', fontSize: 13,
                                                    fontWeight: 500, lineHeight: 1.5,
                                                }}>
                                                    {f.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontStyle: 'italic' }}>
                                        No specific facilities recorded
                                    </div>
                                )}
                            </div>

                            {/* Dinner Card */}
                            {(activeGuest.dinnerTime || activeGuest.dinnerVenue) && (
                                <div style={{
                                    background: 'rgba(245,158,11,0.06)',
                                    border: '1px solid rgba(245,158,11,0.15)',
                                    borderRadius: 16, padding: '14px 16px',
                                }}>
                                    <div style={{
                                        fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.1em', color: '#fbbf24', marginBottom: 8,
                                    }}>
                                        🍽️ Dinner Reservation
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>
                                        {activeGuest.dinnerVenue || 'TBC'}
                                        {activeGuest.dinnerTime && (
                                            <span style={{ opacity: 0.6, fontWeight: 400 }}> · {activeGuest.dinnerTime}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Occasions Card */}
                            {activeGuest.occasions && (
                                <div style={{
                                    background: 'rgba(236,72,153,0.06)',
                                    border: '1px solid rgba(236,72,153,0.15)',
                                    borderRadius: 16, padding: '14px 16px',
                                }}>
                                    <div style={{
                                        fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.1em', color: '#f9a8d4', marginBottom: 8,
                                    }}>
                                        🎉 Occasions
                                    </div>
                                    <div style={{
                                        display: 'flex', flexWrap: 'wrap', gap: 6,
                                    }}>
                                        {activeGuest.occasions.split(', ').map((occ, i) => (
                                            <span key={i} style={{
                                                background: 'rgba(236,72,153,0.12)',
                                                border: '1px solid rgba(236,72,153,0.2)',
                                                color: '#fbcfe8', padding: '5px 12px',
                                                borderRadius: 8, fontSize: 12, fontWeight: 700,
                                            }}>
                                                {occ}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* In-Room Items Card */}
                            {(activeGuest.champagne || activeGuest.petals) && (
                                <div style={{
                                    background: 'rgba(197,160,101,0.06)',
                                    border: '1px solid rgba(197,160,101,0.15)',
                                    borderRadius: 16, padding: '14px 16px',
                                }}>
                                    <div style={{
                                        fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.1em', color: '#c5a065', marginBottom: 8,
                                    }}>
                                        🛎️ In-Room Preparations
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {activeGuest.champagne && (
                                            <span style={{
                                                background: 'rgba(197,160,101,0.12)',
                                                border: '1px solid rgba(197,160,101,0.2)',
                                                color: '#f5d89a', padding: '5px 12px',
                                                borderRadius: 8, fontSize: 12, fontWeight: 700,
                                            }}>
                                                🍾 Champagne
                                            </span>
                                        )}
                                        {activeGuest.petals && (
                                            <span style={{
                                                background: 'rgba(197,160,101,0.12)',
                                                border: '1px solid rgba(197,160,101,0.2)',
                                                color: '#f5d89a', padding: '5px 12px',
                                                borderRadius: 8, fontSize: 12, fontWeight: 700,
                                            }}>
                                                🌹 Rose Petals
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Preferences Card */}
                            {activeGuest.preferences && (
                                <div style={{
                                    background: 'rgba(139,92,246,0.06)',
                                    border: '1px solid rgba(139,92,246,0.15)',
                                    borderRadius: 16, padding: '14px 16px',
                                }}>
                                    <div style={{
                                        fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.1em', color: '#c4b5fd', marginBottom: 8,
                                    }}>
                                        ✨ Preferences
                                    </div>
                                    <div style={{
                                        color: 'rgba(255,255,255,0.75)', fontSize: 12,
                                        lineHeight: 1.7, fontWeight: 500,
                                    }}>
                                        {activeGuest.preferences}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Panel — Action Zone */}
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: 20, padding: 40,
                        }}>
                            <div style={{
                                fontSize: 64, lineHeight: 1,
                                filter: 'drop-shadow(0 4px 20px rgba(99,102,241,0.3))',
                            }}>
                                📋
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    color: 'white', fontSize: 24, fontWeight: 800,
                                    letterSpacing: '-0.02em', marginBottom: 8,
                                }}>
                                    {activeGuest.name}
                                </div>
                                <div style={{ color: 'rgba(199,210,254,0.6)', fontSize: 14 }}>
                                    Room {activeGuest.room} · {packageLabel} · {activeGuest.duration || 'Duration TBC'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                <button
                                    onClick={handleDismiss}
                                    style={{
                                        padding: '14px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        background: 'rgba(239,68,68,0.08)',
                                        color: '#fca5a5',
                                    }}
                                >
                                    🗑️ Dismiss
                                </button>
                                <button
                                    onClick={handleOpenGenerator}
                                    style={{
                                        padding: '14px 32px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                        cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                        color: 'white',
                                        boxShadow: '0 6px 24px rgba(99,102,241,0.4)',
                                    }}
                                >
                                    📋 Open Itinerary Generator
                                </button>
                            </div>

                            {remaining.length > 1 && (
                                <button
                                    onClick={() => {
                                        setActiveIndex(prev => (prev + 1) % remaining.length);
                                    }}
                                    style={{
                                        marginTop: 8, padding: '8px 20px', borderRadius: 8,
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        background: 'transparent', color: 'rgba(199,210,254,0.6)',
                                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    }}
                                >
                                    ⏭️ Skip to Next Guest
                                </button>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ItineraryQueue;
