import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HandoverDepartment, HandoverReport, DepartmentHandover,
    HANDOVER_DEPT_INFO, Guest
} from '../types';
import { useUser } from '../contexts/UserProvider';
import { useGuestData } from '../contexts/GuestDataProvider';
import {
    saveHandoverReport, getHandoverReport, lockHandoverAM, unlockHandoverAM
} from '../services/firebaseService';
import '../styles/handover.css';

// ═══════════════════════════════════════════════════════════════
// STRUCTURED FIELD DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface FieldDef {
    key: string;
    label: string;
    type: 'number' | 'text' | 'textarea';
    autoValue?: (guests: Guest[]) => string | number;
    placeholder?: string;
    aiReview?: boolean;
}

// ── Housekeeping AM: Check-ins & Stayovers ──
const HK_AM_FIELDS: FieldDef[] = [
    { key: 'roomsCleaned', label: 'Rooms Cleaned', type: 'number', autoValue: (g) => g.filter(x => x.hkStatus === 'complete').length },
    { key: 'roomsOutstanding', label: 'Rooms Outstanding', type: 'number', autoValue: (g) => g.filter(x => x.hkStatus && x.hkStatus !== 'complete').length },
    { key: 'roomsDND', label: 'DND Rooms (Cat Signs)', type: 'text', placeholder: 'e.g. 3, 7, 12' },
    { key: 'roomsPlantATree', label: 'Plant-a-Tree Rooms (Wooden Signs)', type: 'text', placeholder: 'e.g. 5, 14, 22 — these rooms skip turndown' },
    { key: 'linenChanges', label: 'Linen Changes', type: 'number' },
    { key: 'deepCleans', label: 'Deep Cleans', type: 'number' },
    { key: 'stayoverNotes', label: 'Stayover Notes', type: 'textarea', placeholder: 'Notes for stayover rooms...' },
    { key: 'unresolvedNotes', label: 'Unresolved Issues', type: 'textarea', placeholder: 'Any unresolved housekeeping issues...' },
];

// ── Housekeeping PM: Turndown ──
const HK_PM_FIELDS: FieldDef[] = [
    { key: 'turndownsDone', label: 'Turndowns Done', type: 'number', autoValue: (g) => g.filter(x => x.turndownStatus === 'complete').length },
    { key: 'turndownsPending', label: 'Turndowns Pending', type: 'number', autoValue: (g) => g.filter(x => x.turndownStatus && x.turndownStatus !== 'complete').length },
    { key: 'dndRooms', label: 'DND Rooms (No Turndown)', type: 'text', placeholder: 'Rooms with DND — no turndown' },
    { key: 'turndownIssues', label: 'Turndown Issues', type: 'textarea', placeholder: 'Any issues with turndown service...' },
];

// ── Source AM: Breakfast ──
const SOURCE_AM_FIELDS: FieldDef[] = [
    { key: 'breakfastCovers', label: 'Breakfast Covers', type: 'number' },
    { key: 'minibarRestocks', label: 'Minibar Restocks', type: 'number' },
    { key: 'breakfastHighlights', label: 'Breakfast Highlights', type: 'textarea', placeholder: 'Notable events, VIP guests...' },
    { key: 'breakfastIssues', label: 'Breakfast Issues', type: 'textarea', placeholder: 'Dietary incidents, stock issues...' },
];

// ── Source PM: Lunch & Dinner ──
const SOURCE_PM_FIELDS: FieldDef[] = [
    { key: 'lunchCovers', label: 'Lunch Covers', type: 'number' },
    { key: 'dinnerCovers', label: 'Dinner Covers', type: 'number' },
    { key: 'serviceNotes', label: 'Service Notes', type: 'textarea', placeholder: 'Notable service moments, feedback...' },
    { key: 'dietaryIncidents', label: 'Dietary / Allergy Incidents', type: 'textarea', placeholder: 'Details of any incidents...' },
    { key: 'stockIssues', label: 'Stock Issues / Out of Stock', type: 'textarea', placeholder: 'Items out of stock...' },
    { key: 'specialEvents', label: 'Special Events', type: 'textarea', placeholder: 'Private dining, celebrations...' },
    { key: 'sourceGoogleRating', label: 'Source — Google Rating', type: 'text', placeholder: 'e.g. 4.8 ⭐', aiReview: true },
    { key: 'latestSourceReview', label: 'Latest Source Review', type: 'textarea', placeholder: 'Paste or AI-fetch…', aiReview: true },
];

// ── Spice PM: Dinner ──
const SPICE_PM_FIELDS: FieldDef[] = [
    { key: 'dinnerCovers', label: 'Dinner Covers', type: 'number' },
    { key: 'serviceNotes', label: 'Service Notes', type: 'textarea', placeholder: 'Notable service moments, feedback...' },
    { key: 'dietaryIncidents', label: 'Dietary / Allergy Incidents', type: 'textarea', placeholder: 'Details of any incidents...' },
    { key: 'stockIssues', label: 'Stock Issues / Out of Stock', type: 'textarea', placeholder: 'Items out of stock...' },
    { key: 'specialEvents', label: 'Special Events', type: 'textarea', placeholder: 'Private dining, celebrations...' },
    { key: 'spiceGoogleRating', label: 'Spice — Google Rating', type: 'text', placeholder: 'e.g. 4.6 ⭐', aiReview: true },
    { key: 'latestSpiceReview', label: 'Latest Spice Review', type: 'textarea', placeholder: 'Paste or AI-fetch…', aiReview: true },
];

// ── Reception (single) ──
const RECEPTION_FIELDS: FieldDef[] = [
    { key: 'checkInsToday', label: 'Check-ins Today', type: 'number', autoValue: (g) => g.filter(x => x.guestStatus === 'checked_in').length },
    { key: 'checkOutsToday', label: 'Check-outs Today', type: 'number', autoValue: (g) => g.filter(x => x.guestStatus === 'checked_out').length },
    { key: 'noShows', label: 'No Shows', type: 'number' },
    { key: 'groupBookings', label: 'Group Bookings', type: 'textarea', placeholder: 'Auto-detected from surnames & notes...', autoValue: (g) => { const groups = detectGroups(g); return formatGroups(groups); } },
    { key: 'vipArrivals', label: 'VIP Arrivals', type: 'text', placeholder: 'VIP guest names...', autoValue: (g) => g.filter(x => /vip|important|celebrity/i.test(x.preferences || '')).map(x => `${x.room} ${x.name}`).join(', ') },
    { key: 'returnGuests', label: 'Return Guests', type: 'text', placeholder: 'e.g. Rooms 3, 7, 12 (3 returns)', autoValue: (g) => { const r = g.filter(x => (x.stayHistoryCount || 0) > 0); if (!r.length) return ''; return `Rooms ${r.map(x => x.room).join(', ')} (${r.length} return${r.length > 1 ? 's' : ''})`; } },
    { key: 'dogsInHouse', label: 'Dogs in House', type: 'number', autoValue: (g) => g.filter(x => /dog|pet/i.test((x.prefillNotes || '') + (x.preferences || ''))).length },
    { key: 'guestComplaints', label: 'Guest Complaints', type: 'textarea', placeholder: 'Summary of complaints...' },
    { key: 'compensationGiven', label: 'Compensation Given', type: 'textarea', placeholder: 'Details of any compensation...' },
    { key: 'managerEscalations', label: 'Manager Escalations', type: 'textarea', placeholder: 'Issues escalated to management...' },
    { key: 'fourDayCallsDone', label: '4-Day Calls Done', type: 'number' },
    { key: 'tomorrowArrivals', label: "Tomorrow's Arrivals", type: 'number' },
    { key: 'tomorrowOccupancy', label: "Tomorrow's Occupancy", type: 'text', placeholder: 'e.g. 84% — 21/25 rooms' },
    { key: 'hotelGoogleRating', label: 'Gilpin Hotel — Google Rating', type: 'text', placeholder: 'e.g. 4.7 ⭐', aiReview: true },
    { key: 'latestHotelReview', label: 'Latest Hotel Review', type: 'textarea', placeholder: 'Paste or AI-fetch…', aiReview: true },
];

// ── Spa (single) ──
const SPA_FIELDS: FieldDef[] = [
    { key: 'treatmentsCompleted', label: 'Treatments Completed', type: 'number' },
    { key: 'cancellationsNoShows', label: 'Cancellations / No-Shows', type: 'number' },
    { key: 'productSalesNotes', label: 'Product Sales Notes', type: 'textarea', placeholder: 'Notable product sales...' },
    { key: 'equipmentIssues', label: 'Equipment Issues', type: 'textarea', placeholder: 'Any equipment problems...' },
    { key: 'guestFeedback', label: 'Guest Feedback Highlights', type: 'textarea', placeholder: 'Positive or negative feedback...' },
];

// ── Maintenance (single) ──
const MAINTENANCE_FIELDS: FieldDef[] = [
    { key: 'jobsCompleted', label: 'Jobs Completed', type: 'number' },
    { key: 'jobsOutstanding', label: 'Jobs Outstanding', type: 'number' },
    { key: 'urgentIssues', label: 'Urgent Issues', type: 'textarea', placeholder: 'Describe any urgent issues...' },
    { key: 'partsOrdered', label: 'Parts Ordered / Awaited', type: 'textarea', placeholder: 'List parts on order...' },
    { key: 'unresolvedNotes', label: 'Unresolved Room Notes', type: 'textarea', placeholder: 'Any unresolved maintenance notes...' },
];

// ── Reservations (single) ──
const RESERVATIONS_FIELDS: FieldDef[] = [
    { key: 'newBookingsToday', label: 'New Bookings Today', type: 'number' },
    { key: 'cancellations', label: 'Cancellations', type: 'number' },
    { key: 'amendments', label: 'Amendments', type: 'number' },
    { key: 'futureOccupancyNotes', label: 'Future Occupancy Notes', type: 'textarea', placeholder: 'Key occupancy trends...' },
    { key: 'groupBookings', label: 'Group Bookings', type: 'textarea', placeholder: 'Group booking details...' },
    { key: 'specialRequestsFlagged', label: 'Special Requests Flagged', type: 'textarea', placeholder: 'Any special requests to relay...' },
];

// ── Night (single) ──
const NIGHT_FIELDS: FieldDef[] = [
    { key: 'lateArrivals', label: 'Late Arrivals', type: 'textarea', placeholder: 'Late check-in details...' },
    { key: 'earlyDepartures', label: 'Early Departures', type: 'textarea', placeholder: 'Early check-out details...' },
    { key: 'guestRequests', label: 'Guest Requests', type: 'textarea', placeholder: 'Overnight guest requests...' },
    { key: 'securityIssues', label: 'Security Issues', type: 'textarea', placeholder: 'Any security concerns...' },
    { key: 'noiseComplaints', label: 'Noise Complaints', type: 'textarea', placeholder: 'Noise or disturbance reports...' },
    { key: 'facilitiesIssues', label: 'Facilities Issues', type: 'textarea', placeholder: 'Heating, plumbing, power issues overnight...' },
    { key: 'morningPrep', label: 'Morning Prep Notes', type: 'textarea', placeholder: 'Anything prepared for morning team...' },
    { key: 'incidentReport', label: 'Incident Report', type: 'textarea', placeholder: 'Details of any overnight incidents...' },
];

// ── Lake House AM: Breakfast ──
const LAKEHOUSE_AM_FIELDS: FieldDef[] = [
    { key: 'breakfastCovers', label: 'LH Breakfast Covers', type: 'number' },
    { key: 'breakfastHighlights', label: 'Breakfast Highlights', type: 'textarea', placeholder: 'Notable events, VIP guests...' },
    { key: 'breakfastIssues', label: 'Breakfast Issues', type: 'textarea', placeholder: 'Any issues during breakfast service...' },
];

// ── Lake House PM: Reception & Reviews ──
const LAKEHOUSE_PM_FIELDS: FieldDef[] = [
    { key: 'lhCheckIns', label: 'LH Check-ins Today', type: 'number', autoValue: (g) => g.filter(x => x.guestStatus === 'checked_in' && Number(x.room) >= 51 && Number(x.room) <= 58).length },
    { key: 'lhCheckOuts', label: 'LH Check-outs Today', type: 'number', autoValue: (g) => g.filter(x => x.guestStatus === 'checked_out' && Number(x.room) >= 51 && Number(x.room) <= 58).length },
    { key: 'lhVipArrivals', label: 'VIP Arrivals', type: 'text', placeholder: 'VIP Lake House guests...' },
    { key: 'lhReturnGuests', label: 'Return Guests', type: 'text', placeholder: 'e.g. Rooms 51, 53 (2 returns)', autoValue: (g) => { const r = g.filter(x => (x.stayHistoryCount || 0) > 0 && Number(x.room) >= 51 && Number(x.room) <= 58); if (!r.length) return ''; return `Rooms ${r.map(x => x.room).join(', ')} (${r.length} return${r.length > 1 ? 's' : ''})`; } },
    { key: 'lhGuestComplaints', label: 'Guest Complaints', type: 'textarea', placeholder: 'Summary of complaints...' },
    { key: 'lhSpecialRequests', label: 'Special Requests', type: 'textarea', placeholder: 'Any special requests...' },
    { key: 'lhGoogleRating', label: 'Gilpin Lake House — Google Rating', type: 'text', placeholder: 'e.g. 4.9 ⭐', aiReview: true },
    { key: 'latestLHReview', label: 'Latest Lake House Review', type: 'textarea', placeholder: 'Paste or AI-fetch…', aiReview: true },
];

// ── Helper: get fields for a dept + shift ──
function getFieldsForShift(dept: HandoverDepartment, shift: 'am' | 'pm' | 'single'): FieldDef[] {
    switch (dept) {
        case 'housekeeping': return shift === 'am' ? HK_AM_FIELDS : HK_PM_FIELDS;
        case 'source': return shift === 'am' ? SOURCE_AM_FIELDS : SOURCE_PM_FIELDS;
        case 'spice': return SPICE_PM_FIELDS;
        case 'reception': return RECEPTION_FIELDS;
        case 'spa': return SPA_FIELDS;
        case 'maintenance': return MAINTENANCE_FIELDS;
        case 'reservations': return RESERVATIONS_FIELDS;
        case 'night': return NIGHT_FIELDS;
        case 'lakehouse': return shift === 'am' ? LAKEHOUSE_AM_FIELDS : LAKEHOUSE_PM_FIELDS;
    }
}

// ── Helper: check if dept has AI review fields ──
function hasAIFields(dept: HandoverDepartment): boolean {
    const allFields = [
        ...getFieldsForShift(dept, 'am'),
        ...getFieldsForShift(dept, 'pm'),
    ];
    return allFields.some(f => f.aiReview);
}

const ALL_DEPTS: HandoverDepartment[] = ['housekeeping', 'source', 'spice', 'reception', 'spa', 'maintenance', 'reservations', 'night', 'lakehouse'];

// ═══════════════════════════════════════════════════════════════
// GROUP BOOKING DETECTION
// ═══════════════════════════════════════════════════════════════

interface DetectedGroup {
    label: string;       // e.g. "Smith Party" or "Group Booking"
    rooms: string[];     // room numbers
    guestNames: string[];
    source: 'surname' | 'notes';
}

/**
 * Auto-detect group bookings from arrival data using 3 signals:
 * 1. Surname matching — 2+ rooms with same surname → group
 * 2. Notes mentioning "group booking", "group of", "X rooms"
 * 3. Room cross-references in notes ("with room 7", "see room 3")
 */
function detectGroups(guests: Guest[]): DetectedGroup[] {
    if (!guests.length) return [];
    const groups: DetectedGroup[] = [];
    const assignedRooms = new Set<string>();

    // Build a map of all room numbers for cross-referencing
    const allRoomNumbers = new Set(guests.map(g => g.room));

    // --- Signal 1: Surname matching ---
    const surnameMap = new Map<string, Guest[]>();
    for (const guest of guests) {
        const parts = guest.name.trim().split(/\s+/);
        if (parts.length < 2) continue;
        const surname = parts[parts.length - 1].toLowerCase();
        // Skip very short surnames or common prefixes
        if (surname.length < 3) continue;
        if (!surnameMap.has(surname)) surnameMap.set(surname, []);
        surnameMap.get(surname)!.push(guest);
    }
    for (const [surname, members] of surnameMap) {
        if (members.length >= 2) {
            const rooms = members.map(g => g.room);
            const names = members.map(g => g.name);
            const displaySurname = surname.charAt(0).toUpperCase() + surname.slice(1);
            groups.push({
                label: `${displaySurname} Party`,
                rooms,
                guestNames: names,
                source: 'surname',
            });
            rooms.forEach(r => assignedRooms.add(r));
        }
    }

    // --- Signal 2 & 3: Notes scanning ---
    const groupRegex = /group\s*booking|group\s*of\s*\d+|\b(\d+)\s*rooms?\b/i;
    const roomRefRegex = /(?:with|see|linked\s*(?:to|with)?|same\s*(?:as|party))\s*(?:room\s*)?(\d+)/gi;

    for (const guest of guests) {
        if (assignedRooms.has(guest.room)) continue;
        const notes = `${guest.prefillNotes || ''} ${guest.preferences || ''}`;

        // Check for "group booking" or "X rooms" mentions
        if (groupRegex.test(notes)) {
            const linkedRooms = [guest.room];
            const linkedNames = [guest.name];

            // Find room cross-references
            let match;
            const refRegex = new RegExp(roomRefRegex.source, 'gi');
            while ((match = refRegex.exec(notes)) !== null) {
                const refRoom = match[1];
                if (allRoomNumbers.has(refRoom) && !linkedRooms.includes(refRoom)) {
                    linkedRooms.push(refRoom);
                    const refGuest = guests.find(g => g.room === refRoom);
                    if (refGuest) linkedNames.push(refGuest.name);
                }
            }

            groups.push({
                label: 'Group Booking',
                rooms: linkedRooms,
                guestNames: linkedNames,
                source: 'notes',
            });
            linkedRooms.forEach(r => assignedRooms.add(r));
            continue;
        }

        // Check for room cross-references even without explicit "group" keyword
        const refMatches: string[] = [];
        let refMatch;
        const refRegex2 = new RegExp(roomRefRegex.source, 'gi');
        while ((refMatch = refRegex2.exec(notes)) !== null) {
            const refRoom = refMatch[1];
            if (allRoomNumbers.has(refRoom) && refRoom !== guest.room) {
                refMatches.push(refRoom);
            }
        }
        if (refMatches.length > 0) {
            const linkedRooms = [guest.room, ...refMatches];
            const linkedNames = linkedRooms.map(r => {
                const g = guests.find(gg => gg.room === r);
                return g ? g.name : `Room ${r}`;
            });
            const surname = guest.name.trim().split(/\s+/).pop() || 'Linked';
            groups.push({
                label: `${surname.charAt(0).toUpperCase() + surname.slice(1)} Party`,
                rooms: linkedRooms,
                guestNames: linkedNames,
                source: 'notes',
            });
            linkedRooms.forEach(r => assignedRooms.add(r));
        }
    }

    return groups;
}

/** Format detected groups into a readable string */
function formatGroups(groups: DetectedGroup[]): string {
    if (!groups.length) return '';
    return groups.map(g => {
        const roomList = g.rooms.sort((a, b) => Number(a) - Number(b)).join(', ');
        const nameList = g.guestNames.join(' · ');
        return `${g.label} — Rooms ${roomList} (${g.rooms.length} rooms)\n  ${nameList}`;
    }).join('\n\n');
}

// ═══════════════════════════════════════════════════════════════
// AUTO-SAVE CONFIG
// ═══════════════════════════════════════════════════════════════
const AUTO_SAVE_DELAY = 1500;

// ═══════════════════════════════════════════════════════════════
// HANDOVER HUB COMPONENT
// ═══════════════════════════════════════════════════════════════

interface HandoverHubProps {
    onClose: () => void;
    filterDepartment?: HandoverDepartment;
    onOpenDayReport?: () => void;
}

const HandoverHub: React.FC<HandoverHubProps> = ({ onClose, filterDepartment, onOpenDayReport }) => {
    const { userName } = useUser();
    const { guests, sessions } = useGuestData();

    // ── Date management ──
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const [currentDate, setCurrentDate] = useState(todayStr);

    // ── Department tab ──
    const availableDepts = filterDepartment ? [filterDepartment] : ALL_DEPTS;
    const [activeDept, setActiveDept] = useState<HandoverDepartment>(availableDepts[0]);
    const deptMeta = HANDOVER_DEPT_INFO[activeDept];
    const isSingle = deptMeta.shiftType === 'single';
    const hasAM = deptMeta.shiftType === 'am_pm' && !!deptMeta.amLabel;
    const hasPMShift = deptMeta.shiftType === 'am_pm';

    // ── Form state ──
    const [reports, setReports] = useState<Record<string, HandoverReport>>({});
    const [amFormData, setAmFormData] = useState<Record<string, any>>({});
    const [amFreeNotes, setAmFreeNotes] = useState('');
    const [pmFormData, setPmFormData] = useState<Record<string, any>>({});
    const [pmFreeNotes, setPmFreeNotes] = useState('');
    const [fetchingReviews, setFetchingReviews] = useState(false);

    // ── Auto-save: use refs for latest state to avoid stale closures ──
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLoadingRef = useRef(false);
    const lastSavedRef = useRef<string>('');
    const amFormRef = useRef(amFormData);
    const amNotesRef = useRef(amFreeNotes);
    const pmFormRef = useRef(pmFormData);
    const pmNotesRef = useRef(pmFreeNotes);

    // Keep refs in sync with state
    useEffect(() => { amFormRef.current = amFormData; }, [amFormData]);
    useEffect(() => { amNotesRef.current = amFreeNotes; }, [amFreeNotes]);
    useEffect(() => { pmFormRef.current = pmFormData; }, [pmFormData]);
    useEffect(() => { pmNotesRef.current = pmFreeNotes; }, [pmFreeNotes]);

    const currentReport = reports[activeDept];
    const isAMLocked = !!currentReport?.amLockedAt;
    const isToday = currentDate === todayStr;

    // ── Tomorrow's session data for Reception auto-populate ──
    const tomorrowData = useMemo(() => {
        const tomorrow = new Date(currentDate + 'T12:00:00');
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowLabel = tomorrow.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const tomorrowSession = sessions?.find(s => s.id === tomorrowLabel || s.label === tomorrowLabel);
        if (!tomorrowSession?.guests?.length) return null;
        const arrivals = tomorrowSession.guests.length;
        const occupancy = Math.round((arrivals / 25) * 100);
        return { arrivals, occupancy: `${occupancy}% — ${arrivals}/25 rooms` };
    }, [currentDate, sessions]);

    // ── Plant-a-Tree rooms from AM shift (for PM turndown awareness) ──
    const plantATreeRooms = useMemo(() => {
        return currentReport?.amData?.structured?.roomsPlantATree || '';
    }, [currentReport]);

    // ── Auto-populate helper ──
    const autoPopulate = useCallback((fields: FieldDef[], dept: HandoverDepartment): Record<string, any> => {
        const data: Record<string, any> = {};
        fields.forEach(f => {
            if (f.autoValue && guests.length > 0) {
                data[f.key] = f.autoValue(guests);
            }
        });
        // Auto-populate tomorrow's data for Reception
        if (dept === 'reception' && tomorrowData) {
            if (!data['tomorrowArrivals']) data['tomorrowArrivals'] = tomorrowData.arrivals;
            if (!data['tomorrowOccupancy']) data['tomorrowOccupancy'] = tomorrowData.occupancy;
        }
        return data;
    }, [guests, tomorrowData]);

    // ═══════════════════════════════════════════════════════════════
    // AUTO-SAVE: Uses refs to always read latest form data
    // ═══════════════════════════════════════════════════════════════
    const buildAndSave = useCallback(async () => {
        if (!isToday || isLoadingRef.current) return;

        const amData = amFormRef.current;
        const amNotes = amNotesRef.current;
        const pmData = pmFormRef.current;
        const pmNotes = pmNotesRef.current;

        const now = Date.now();
        const report: HandoverReport = {
            id: `${currentDate}_${activeDept}`,
            date: currentDate,
            department: activeDept,
            lastUpdated: now,
            lastUpdatedBy: userName || 'Unknown',
            amLockedAt: currentReport?.amLockedAt,
            amLockedBy: currentReport?.amLockedBy,
        };

        if (isSingle) {
            report.amData = { structured: amData, freeNotes: amNotes, completedBy: userName || 'Unknown', completedAt: now };
        } else {
            if (hasAM && (Object.keys(amData).length > 0 || amNotes)) {
                report.amData = { structured: amData, freeNotes: amNotes, completedBy: userName || 'Unknown', completedAt: now };
            }
            if (hasPMShift && (Object.keys(pmData).length > 0 || pmNotes)) {
                report.pmData = { structured: pmData, freeNotes: pmNotes, completedBy: userName || 'Unknown', completedAt: now };
            }
        }

        // Fingerprint to avoid redundant saves
        const fingerprint = JSON.stringify({ amData, amNotes, pmData, pmNotes, dept: activeDept });
        if (fingerprint === lastSavedRef.current) return;

        setAutoSaveStatus('saving');
        try {
            await saveHandoverReport(report);
            lastSavedRef.current = fingerprint;
            setReports(prev => ({ ...prev, [activeDept]: report }));
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 2000);
        } catch (err) {
            console.error('Auto-save failed:', err);
            setAutoSaveStatus('error');
        }
    }, [currentDate, activeDept, userName, currentReport, isSingle, hasAM, hasPMShift, isToday]);

    // ── Debounced auto-save trigger (reads from refs — no stale closure) ──
    const triggerAutoSave = useCallback(() => {
        if (isLoadingRef.current || !isToday) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            buildAndSave();
        }, AUTO_SAVE_DELAY);
    }, [buildAndSave, isToday]);

    // Cleanup timer on unmount
    useEffect(() => () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    }, []);

    // ── Load data when dept or date changes ──
    useEffect(() => {
        let cancelled = false;
        isLoadingRef.current = true;
        (async () => {
            const report = await getHandoverReport(currentDate, activeDept);
            if (cancelled) return;
            if (report) {
                setReports(prev => ({ ...prev, [activeDept]: report }));
                if (report.amData) {
                    setAmFormData(report.amData.structured || {});
                    setAmFreeNotes(report.amData.freeNotes || '');
                } else {
                    const fields = isSingle ? getFieldsForShift(activeDept, 'single') : hasAM ? getFieldsForShift(activeDept, 'am') : [];
                    setAmFormData(autoPopulate(fields, activeDept));
                    setAmFreeNotes('');
                }
                if (report.pmData) {
                    setPmFormData(report.pmData.structured || {});
                    setPmFreeNotes(report.pmData.freeNotes || '');
                } else {
                    const pmFields = hasPMShift ? getFieldsForShift(activeDept, 'pm') : [];
                    setPmFormData(autoPopulate(pmFields, activeDept));
                    setPmFreeNotes('');
                }
                lastSavedRef.current = JSON.stringify({
                    amData: report.amData?.structured || {},
                    amNotes: report.amData?.freeNotes || '',
                    pmData: report.pmData?.structured || {},
                    pmNotes: report.pmData?.freeNotes || '',
                    dept: activeDept,
                });
            } else {
                // Fresh — auto-populate
                if (isSingle) {
                    setAmFormData(autoPopulate(getFieldsForShift(activeDept, 'single'), activeDept));
                } else {
                    if (hasAM) setAmFormData(autoPopulate(getFieldsForShift(activeDept, 'am'), activeDept));
                    else setAmFormData({});
                    setPmFormData(autoPopulate(getFieldsForShift(activeDept, 'pm'), activeDept));
                }
                setAmFreeNotes('');
                setPmFreeNotes('');
                setReports(prev => { const copy = { ...prev }; delete copy[activeDept]; return copy; });
                lastSavedRef.current = '';
            }
            setTimeout(() => { isLoadingRef.current = false; }, 500);
        })();
        return () => { cancelled = true; };
    }, [currentDate, activeDept]);

    // ── Field change handlers ──
    const updateAmField = useCallback((key: string, value: any) => {
        setAmFormData(prev => ({ ...prev, [key]: value }));
        triggerAutoSave();
    }, [triggerAutoSave]);

    const updatePmField = useCallback((key: string, value: any) => {
        setPmFormData(prev => ({ ...prev, [key]: value }));
        triggerAutoSave();
    }, [triggerAutoSave]);

    const handleAmNotesChange = useCallback((val: string) => {
        setAmFreeNotes(val);
        triggerAutoSave();
    }, [triggerAutoSave]);

    const handlePmNotesChange = useCallback((val: string) => {
        setPmFreeNotes(val);
        triggerAutoSave();
    }, [triggerAutoSave]);

    // ── Lock AM ──
    const handleLockAM = useCallback(async () => {
        await buildAndSave();
        try {
            await lockHandoverAM(currentDate, activeDept, userName || 'Unknown');
            setReports(prev => ({
                ...prev,
                [activeDept]: {
                    ...prev[activeDept],
                    amLockedAt: Date.now(),
                    amLockedBy: userName || 'Unknown',
                }
            }));
        } catch (err) {
            console.error('Lock failed:', err);
        }
    }, [buildAndSave, currentDate, activeDept, userName]);

    // ── Unlock AM ──
    const handleUnlockAM = useCallback(async () => {
        try {
            await unlockHandoverAM(currentDate, activeDept, userName || 'Unknown');
            setReports(prev => ({
                ...prev,
                [activeDept]: {
                    ...prev[activeDept],
                    amLockedAt: undefined,
                    amLockedBy: undefined,
                }
            }));
        } catch (err) {
            console.error('Unlock failed:', err);
        }
    }, [currentDate, activeDept, userName]);

    // ── Fetch AI Reviews ──
    const handleFetchReviews = useCallback(async () => {
        setFetchingReviews(true);
        try {
            const res = await fetch('/api/gemini-reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department: activeDept }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.reviews) {
                    const setter = isSingle ? setAmFormData : setPmFormData;
                    setter(prev => {
                        const updated = { ...prev };
                        for (const [key, value] of Object.entries(data.reviews)) {
                            if (value) updated[key] = value as string;
                        }
                        return updated;
                    });
                    triggerAutoSave();
                }
            }
        } catch (err) {
            console.error('Failed to fetch reviews:', err);
        } finally {
            setFetchingReviews(false);
        }
    }, [activeDept, isSingle, triggerAutoSave]);

    // ── Date navigation ──
    const changeDate = useCallback((delta: number) => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + delta);
        setCurrentDate(d.toISOString().split('T')[0]);
    }, [currentDate]);

    const dateDisplay = useMemo(() => {
        const d = new Date(currentDate + 'T12:00:00');
        return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }, [currentDate]);

    // ── Dept status badge ──
    const getDeptStatus = useCallback((dept: HandoverDepartment): 'draft' | 'locked' | 'complete' => {
        const r = reports[dept];
        if (!r) return 'draft';
        const meta = HANDOVER_DEPT_INFO[dept];
        if (meta.shiftType === 'single') return r.amData ? 'complete' : 'draft';
        if (r.pmData) return 'complete';
        if (r.amLockedAt) return 'locked';
        if (r.amData) return 'draft';
        return 'draft';
    }, [reports]);

    // ── Render field ──
    const renderField = (field: FieldDef, data: Record<string, any>, onChange: (k: string, v: any) => void, disabled: boolean) => {
        const val = data[field.key] ?? '';
        if (field.type === 'number') {
            return (
                <div className="ho-field-row" key={field.key}>
                    <label>{field.label}</label>
                    <input
                        type="number"
                        value={val}
                        onChange={e => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                        disabled={disabled}
                        min={0}
                    />
                </div>
            );
        }
        if (field.type === 'textarea') {
            return (
                <div className="ho-textarea-wide" key={field.key}>
                    <label>
                        {field.label}
                        {field.aiReview && <span style={{ color: '#c5a065', fontSize: 10, marginLeft: 6 }}>✨ AI</span>}
                    </label>
                    <textarea
                        value={val}
                        onChange={e => onChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={disabled}
                        rows={typeof val === 'string' && val.length > 100 ? Math.min(8, Math.ceil(val.length / 50)) : 3}
                    />
                </div>
            );
        }
        return (
            <div className="ho-field-row" key={field.key}>
                <label>
                    {field.label}
                    {field.aiReview && <span style={{ color: '#c5a065', fontSize: 10, marginLeft: 6 }}>✨ AI</span>}
                </label>
                <input
                    type="text"
                    value={val}
                    onChange={e => onChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={disabled}
                />
            </div>
        );
    };

    // ── Render form for a shift ──
    const renderShiftForm = (shift: 'am' | 'pm' | 'single') => {
        const fields = getFieldsForShift(activeDept, shift);
        const isAm = shift === 'am';
        const isPm = shift === 'pm';
        const data = (isAm || shift === 'single') ? amFormData : pmFormData;
        const onChange = (isAm || shift === 'single') ? updateAmField : updatePmField;
        const notes = (isAm || shift === 'single') ? amFreeNotes : pmFreeNotes;
        const setNotes = (isAm || shift === 'single') ? handleAmNotesChange : handlePmNotesChange;
        const disabled = !isToday || (isAm && isAMLocked);

        const shiftLabel = shift === 'single' ? null :
            shift === 'am' ? `☀️ ${deptMeta.amLabel || 'AM Shift'}` :
                `🌙 ${deptMeta.pmLabel || 'PM Shift'}`;

        const sectionClasses = [
            'handover-section',
            isAm && isAMLocked ? 'ho-locked-overlay' : '',
        ].filter(Boolean).join(' ');

        // Plant-a-Tree skip-turndown awareness for HK PM
        const showPlantATreeAlert = isPm && activeDept === 'housekeeping' && plantATreeRooms;

        return (
            <div className={sectionClasses} key={shift}>
                {shiftLabel && (
                    <div className="handover-section-title">
                        <span>{shiftLabel}</span>
                        {isAm && isAMLocked && currentReport?.amLockedBy && (
                            <span className="ho-lock-badge">
                                🔒 Locked by {currentReport.amLockedBy}
                            </span>
                        )}
                    </div>
                )}

                {showPlantATreeAlert && (
                    <div className="ho-plant-tree-alert">
                        <strong>🌳 Plant-a-Tree Rooms (Skip Turndown):</strong> {plantATreeRooms}
                    </div>
                )}

                <div className="handover-fields">
                    {fields.map(f => renderField(f, data, onChange, disabled))}
                </div>
                <div className="ho-free-notes">
                    <label>{shift === 'pm' ? 'PM Notes' : 'Additional Notes'}</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder={`Notes for ${shiftLabel || 'this handover'}...`}
                        disabled={disabled}
                    />
                </div>
            </div>
        );
    };

    // ── Auto-save status indicator ──
    const renderAutoSaveStatus = () => {
        if (!isToday) return null;
        switch (autoSaveStatus) {
            case 'saving': return <span className="ho-autosave-status saving">💾 Saving…</span>;
            case 'saved': return <span className="ho-autosave-status saved">✅ Saved</span>;
            case 'error': return <span className="ho-autosave-status error">❌ Save failed</span>;
            default: return <span className="ho-autosave-status idle">Auto-save on</span>;
        }
    };

    return (
        <motion.div
            className="handover-overlay"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
        >
            {/* ─── Header ─── */}
            <div className="handover-header">
                <h2>
                    <span>📋</span>
                    <span>{filterDepartment ? `${deptMeta.emoji} ${deptMeta.label} Handover` : 'Handover Hub'}</span>
                </h2>
                <div className="handover-date-picker">
                    <button onClick={() => changeDate(-1)} title="Previous day">◀</button>
                    <span className="handover-date-label">{dateDisplay}</span>
                    <button onClick={() => changeDate(1)} title="Next day" disabled={currentDate >= todayStr}>▶</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {renderAutoSaveStatus()}
                    <button className="handover-close" onClick={onClose} aria-label="Close handover">✕</button>
                </div>
            </div>

            {/* ─── Quick Nav to Day Report ─── */}
            {onOpenDayReport && !filterDepartment && (
                <div style={{ padding: '0 24px' }}>
                    <button
                        className="dr-print-btn"
                        style={{ width: '100%', marginTop: 0, padding: '10px 16px', fontSize: 13 }}
                        onClick={() => { onClose(); onOpenDayReport(); }}
                    >
                        📊 View Merged Day Report
                    </button>
                </div>
            )}

            {/* ─── Department Tabs ─── */}
            {!filterDepartment && (
                <div className="handover-tabs">
                    {availableDepts.map(dept => {
                        const info = HANDOVER_DEPT_INFO[dept];
                        const status = getDeptStatus(dept);
                        return (
                            <button
                                key={dept}
                                className={`handover-tab ${activeDept === dept ? 'active' : ''}`}
                                onClick={() => setActiveDept(dept)}
                                data-dept={dept}
                            >
                                <span className={`tab-status ${status}`} />
                                <span>{info.emoji}</span>
                                <span className="tab-label">{info.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ─── Form Body ─── */}
            <div className="handover-body">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeDept}
                        className="handover-form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isSingle ? (
                            renderShiftForm('single')
                        ) : hasAM ? (
                            <>
                                {renderShiftForm('am')}
                                {renderShiftForm('pm')}
                            </>
                        ) : (
                            renderShiftForm('pm')
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ─── Action Bar ─── */}
            {isToday && (
                <div className="handover-actions">
                    {hasAIFields(activeDept) && (
                        <button
                            className="ho-fetch-reviews-btn"
                            onClick={handleFetchReviews}
                            disabled={fetchingReviews}
                        >
                            {fetchingReviews ? '⏳ Fetching...' : '✨ Fetch Latest Reviews'}
                        </button>
                    )}

                    {hasAM && (
                        isAMLocked ? (
                            <button className="ho-lock-btn locked" onClick={handleUnlockAM}>
                                🔓 Unlock {deptMeta.amLabel || 'AM'}
                            </button>
                        ) : (
                            <button className="ho-lock-btn" onClick={handleLockAM}>
                                🔒 Lock {deptMeta.amLabel || 'AM'}
                            </button>
                        )
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default HandoverHub;
