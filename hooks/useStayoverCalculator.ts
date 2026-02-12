import { useMemo } from 'react';
import { Guest, ArrivalSession } from '../types';

// ==========================================
// STAYOVER CALCULATOR HOOK
// ==========================================
// Computes which guests are still occupying rooms on a target date
// by scanning across all loaded sessions.

export interface StayoverGuest {
    /** The original guest record from their arrival session */
    guest: Guest;
    /** Which session they arrived in */
    originSessionId: string;
    /** Session label for display */
    originSessionLabel: string;
    /** Arrival date */
    arrivalDate: Date;
    /** Departure date (arrival + duration) */
    departureDate: Date;
    /** Which night of the stay (1-indexed) */
    nightNumber: number;
    /** Total nights in stay */
    totalNights: number;
    /** Parsed dinner time for the target date (HH:MM), or null = no dinner */
    dinnerTime: string | null;
    /** Parsed dinner venue for the target date */
    dinnerVenue: string | null;
    /** Number of diners */
    dinnerCovers: number | null;
}

/**
 * Parse dinner information from the facilities string for a specific date.
 *
 * The facilities field contains entries like:
 *   - "🍽️ Dinner for 2 (07/02 @ 19:00)"
 *   - "🍽️ Source (08/02 @ 20:30)"
 *   - "🌶️ Spice (09/02 @ 18:30)"
 *   - "🍽️ Dinner (07/02)"
 *
 * We also check the rawHtml for the more structured format:
 *   - "Dinner for 2 on 07/02/26 at 19:00 in Source"
 */
function parseDinnerForDate(
    guest: Guest,
    targetDate: Date
): { time: string | null; venue: string | null; covers: number | null } {
    const targetDay = targetDate.getDate().toString().padStart(2, '0');
    const targetMonth = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const targetDateStr = `${targetDay}/${targetMonth}`;

    // Strategy 1: Parse from rawHtml — most structured
    // Pattern: "Dinner for N on DD/MM/YY at HH:MM in Venue"
    if (guest.rawHtml) {
        const rawMatches = guest.rawHtml.matchAll(
            /Dinner\s+for\s+(\d+)\s+on\s+(\d{2}\/\d{2})(?:\/\d{2,4})?\s+at\s+(\d{1,2}:\d{2})\s+in\s+(.+?)(?:\n|$)/gi
        );
        for (const match of rawMatches) {
            if (match[2] === targetDateStr) {
                return {
                    covers: parseInt(match[1]),
                    time: match[3].padStart(5, '0'),
                    venue: match[4].trim(),
                };
            }
        }
    }

    // Strategy 2: Parse from facilities string — formatted version
    // Pattern: "🍽️ Venue (DD/MM @ HH:MM)" or "🍽️ Dinner for N (DD/MM @ HH:MM)"
    if (guest.facilities) {
        const parts = guest.facilities.split(' • ');
        for (const part of parts) {
            // Check if this part contains our target date
            if (!part.includes(targetDateStr)) continue;

            // Extract time: look for @ HH:MM or (DD/MM @ HH:MM)
            const timeMatch = part.match(/@\s*(\d{1,2}:\d{2})/);
            const time = timeMatch ? timeMatch[1].padStart(5, '0') : null;

            // Extract venue: known Gilpin venues
            let venue: string | null = null;
            if (/spice/i.test(part)) venue = 'Gilpin Spice';
            else if (/source/i.test(part)) venue = 'Source';
            else if (/bento/i.test(part)) venue = 'Bento';
            else if (/lake\s*house/i.test(part)) venue = 'The Lake House';
            else if (/dinner/i.test(part)) venue = 'Restaurant';

            // Extract covers: "for N" or "(T-N)"
            const coversMatch = part.match(/for\s+(\d+)|\(T-(\d+)\)/i);
            const covers = coversMatch
                ? parseInt(coversMatch[1] || coversMatch[2])
                : null;

            if (time || venue) {
                return { time, venue, covers };
            }
        }
    }

    return { time: null, venue: null, covers: null };
}

/**
 * Normalize a date to midnight for comparison purposes.
 */
function normalizeDate(d: Date): Date {
    const result = new Date(d);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Hook: computes stayover guests for a target date across all loaded sessions.
 *
 * A stayover guest is one who:
 *   - Arrived BEFORE the target date
 *   - Departs ON or AFTER the target date (i.e., they sleep there the night of targetDate)
 *
 * @param sessions  All loaded ArrivalSessions
 * @param targetDate The date to compute stayovers for (typically today)
 * @returns { stayovers, sessionCoverage, hasEnoughSessions }
 */
export function useStayoverCalculator(
    sessions: ArrivalSession[],
    targetDate: Date
) {
    return useMemo(() => {
        const target = normalizeDate(targetDate);

        // Track unique session dates for coverage calculation
        const sessionDates = new Set<string>();
        const stayovers: StayoverGuest[] = [];
        // Track rooms we've already seen (from later sessions) to avoid duplicates
        // after room moves
        const seenRooms = new Set<string>();

        // Sort sessions by date descending so latest data takes priority
        const sortedSessions = [...sessions]
            .filter(s => s.dateObj && s.guests.length > 0)
            .sort((a, b) => new Date(b.dateObj).getTime() - new Date(a.dateObj).getTime());

        for (const session of sortedSessions) {
            const arrivalDate = normalizeDate(new Date(session.dateObj));
            sessionDates.add(arrivalDate.toISOString().split('T')[0]);

            for (const guest of session.guests) {
                const totalNights = parseInt(guest.duration) || 1;
                const departureDate = new Date(arrivalDate);
                departureDate.setDate(departureDate.getDate() + totalNights);

                // Stayover check:
                // - Arrived STRICTLY BEFORE target date (not on target date — those are arrivals)
                // - Departs AFTER target date (still sleeping there tonight)
                const arrivedBefore = arrivalDate.getTime() < target.getTime();
                const departsAfter = departureDate.getTime() > target.getTime();

                if (arrivedBefore && departsAfter) {
                    // Calculate night number (1-indexed)
                    const daysDiff = Math.ceil(
                        (target.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const nightNumber = daysDiff + 1; // Night 1 is arrival night

                    // Skip if we already have a more recent record for this room
                    const roomKey = guest.room.toLowerCase().trim();
                    if (seenRooms.has(roomKey)) continue;
                    seenRooms.add(roomKey);

                    // Parse dinner info for target date — use manual override if set
                    let dinnerTime = guest.dinnerTime || null;
                    let dinnerVenue = guest.dinnerVenue || null;
                    let dinnerCovers: number | null = null;

                    if (!dinnerTime || dinnerTime === '') {
                        // No manual override — try to parse from facilities
                        const parsed = parseDinnerForDate(guest, target);
                        dinnerTime = parsed.time;
                        dinnerVenue = parsed.venue;
                        dinnerCovers = parsed.covers;
                    } else if (dinnerTime === 'none') {
                        // Explicitly marked as no dinner
                        dinnerTime = null;
                        dinnerVenue = null;
                    }

                    stayovers.push({
                        guest,
                        originSessionId: session.id,
                        originSessionLabel: session.label,
                        arrivalDate,
                        departureDate,
                        nightNumber,
                        totalNights,
                        dinnerTime,
                        dinnerVenue,
                        dinnerCovers,
                    });
                }
            }
        }

        // Sort stayovers: no dinner first, then by dinner time ascending
        stayovers.sort((a, b) => {
            if (!a.dinnerTime && !b.dinnerTime) {
                // Both no dinner — sort by room number
                const roomA = parseInt(a.guest.room) || 999;
                const roomB = parseInt(b.guest.room) || 999;
                return roomA - roomB;
            }
            if (!a.dinnerTime) return -1; // No dinner goes first
            if (!b.dinnerTime) return 1;
            return a.dinnerTime.localeCompare(b.dinnerTime);
        });

        return {
            stayovers,
            /** Number of unique session dates loaded */
            sessionCoverage: sessionDates.size,
            /** Whether we have enough sessions for reliable stayover data */
            hasEnoughSessions: sessionDates.size >= 7,
            /** Total rooms occupied tonight (stayovers only, not including today's arrivals) */
            totalStayovers: stayovers.length,
        };
    }, [sessions, targetDate]);
}
