import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useView } from '../contexts/ViewProvider';
import { useNavigate, useParams } from 'react-router-dom';

/* ────────────── Data Structures ────────────── */
interface EventItem { time: string; activity: string; }
interface DayBlock { id: string; title: string; subtitle: string; events: EventItem[]; }

interface PackagePreset {
  name: string;
  left: { day: string; label: string; events: [string, string][] }[];
  right: { day: string; label: string; events: [string, string][] }[];
}

const PRESETS: Record<string, PackagePreset> = {
  magic: {
    name: 'Magical Escapes Package',
    left: [
      { day: 'Day 1', label: 'Arrive & Settle', events: [['On Arrival', 'A chilled bottle of Champagne awaits you in your room.'], ['7.30pm', 'Dinner at Gilpin Spice, our Pan-Asian fusion restaurant.']] },
      { day: 'Day 2', label: 'Indulge & Unwind', events: [['Morning', 'A leisurely breakfast at your table.'], ['11.00am', 'Your bespoke spa treatment at the Jetty Spa.'], ['12.30pm', 'A Bento Box lunch served to your suite.']] },
    ],
    right: [
      { day: 'Day 3', label: 'Farewell', events: [['Morning', 'Enjoy a final breakfast before departure.']] },
    ],
  },
  moon: {
    name: 'The Gilpinmoon Experience',
    left: [
      { day: 'Day 1', label: 'Arrive & Settle', events: [['On Arrival', 'Champagne and a handwritten welcome note in your room.'], ['7.30pm', 'An intimate dinner at Gilpin Spice.']] },
      { day: 'Day 2', label: 'Restore & Revive', events: [['Morning', 'A leisurely breakfast at your table.'], ['11.15am', 'Your Jetty Spa experience begins.'], ['1.30pm', 'A freshly prepared Bento Box served in the spa.']] },
    ],
    right: [
      { day: 'Day 3', label: 'Discover & Savour', events: [['Morning', 'Breakfast at your leisure.'], ['Daytime', 'A private Windermere Lake Cruise.'], ['7.30pm', 'Dinner at Source, our Michelin-starred restaurant.']] },
      { day: 'Day 4', label: 'Farewell', events: [['Morning', 'Enjoy a final breakfast before departure.']] },
    ],
  },
  blank: {
    name: 'Bespoke Guest Itinerary',
    left: [{ day: 'Day 1', label: 'Arrival', events: [['3:00pm', 'Welcome and check-in.']] }],
    right: [],
  },
};

const FONT_STYLES: Record<string, { head: string; body: string; label: string }> = {
  standard: { head: "'Cormorant Garamond', serif", body: "'Montserrat', sans-serif", label: 'Gilpin Standard (Garamond)' },
  modern: { head: "'Lato', sans-serif", body: "'Roboto', sans-serif", label: 'Modern Clean (Lato)' },
  elegant: { head: "'Playfair Display', serif", body: "'Alice', serif", label: 'Elegant Serif (Playfair)' },
};

const DEFAULT_LOGO = '/gilpin-logo-full.png';

let _idCounter = 0;
const uid = () => `pkg-${++_idCounter}-${Date.now()}`;

const presetToDays = (arr: PackagePreset['left']): DayBlock[] =>
  arr.map(d => ({
    id: uid(),
    title: d.day,
    subtitle: d.label,
    events: d.events.map(([time, activity]) => ({ time, activity })),
  }));

/* ────────────── Pre-fill Props (from Itinerary Queue) ────────────── */
export interface PackageGeneratorProps {
  /** Pre-fill guest name */
  initialGuestName?: string;
  /** Pre-fill room name */
  initialRoomName?: string;
  /** Pre-fill preset key: 'moon' | 'magic' | 'blank' */
  initialPreset?: string;
  /** Pre-fill start date (YYYY-MM-DD) */
  initialStartDate?: string;
  /** Pre-fill facilities from AI audit (comma-separated) */
  initialFacilities?: string;
  /** Pre-fill dinner time from AI audit */
  initialDinnerTime?: string;
  /** Pre-fill dinner venue from AI audit */
  initialDinnerVenue?: string;
  /** Pre-fill guest preferences from AI audit */
  initialPreferences?: string;
  /** Pre-fill stay duration (e.g. '3 night(s)') */
  initialDuration?: string;
  /** Pre-fill occasions (e.g. '🎂 Birthday', '🥂 Anniversary') */
  initialOccasions?: string;
  /** Whether champagne is in room */
  initialChampagne?: boolean;
  /** Whether petals are in room */
  initialPetals?: boolean;
  /** Pre-fill guest history (e.g. 'Yes (x3)') */
  initialHistory?: string;
  /** Number of guests */
  initialPax?: number;
  /** AI-generated special card text from audit */
  initialSpecialCard?: string;
  /** Callback when print is complete */
  onComplete?: () => void;
  /** Hide emojis in print output */
  stripEmojis?: boolean;
}

/* ────────────── Venue Description Mappings ────────────── */
const VENUE_DESCRIPTIONS: Record<string, string> = {
  'Source': 'Dinner at Source, our Michelin-starred restaurant — a celebration of Cumbrian produce and seasonal flavours.',
  'Spice': 'Dinner at Gilpin Spice, our acclaimed Pan-Asian fusion restaurant set within the heart of the Lake District.',
  'Gilpin Spice': 'Dinner at Gilpin Spice, our acclaimed Pan-Asian fusion restaurant set within the heart of the Lake District.',
  'Lake House': 'Afternoon Tea at The Lake House — delicate finger sandwiches, freshly baked scones, and artisan patisserie.',
  'Afternoon Tea': 'Afternoon Tea served in the Drawing Room — a quintessential Gilpin tradition.',
  'Bento': 'A freshly prepared Bento Box lunch served to your room or the Jetty Spa.',
  'Spa': 'Your spa experience at the Jetty Spa — our lakeside sanctuary of calm.',
  'Spa Use': 'Complimentary use of the Jetty Spa facilities, including the infinity pool, hot tub, and relaxation rooms.',
  'Massage': 'A restorative massage treatment at the Jetty Spa.',
  'Aromatherapy': 'An aromatherapy massage at the Jetty Spa — a deeply restorative experience tailored to your needs.',
  'Treatments': 'A bespoke spa treatment at the Jetty Spa.',
  'GH Pure': 'A GH Pure facial at the Jetty Spa — advanced skincare with visible results.',
  'Pure Lakes': 'A Pure Lakes treatment at the Jetty Spa — harnessing the finest Cumbrian natural botanicals.',
  'Pure Couples': 'A Pure Couples\' treatment at the Jetty Spa — a shared experience of relaxation and rejuvenation.',
  'ESPA': 'An ESPA treatment at the Jetty Spa — luxury skincare and holistic wellbeing.',
  'Facial': 'A bespoke facial treatment at the Jetty Spa, tailored to your skin.',
  'Hot Stone': 'A Hot Stone massage at the Jetty Spa — warm Cumbrian stones ease tension and restore balance.',
  'Spa Hamper': 'A curated Spa Hamper, hand-prepared and placed in your room on arrival.',
  'In-Room Hamper': 'A curated Spa Hamper, hand-prepared and placed in your room on arrival.',
  'Hamper': 'A hand-prepared hamper awaiting you in your room.',
  'Dinner': 'Dinner at Gilpin Hotel — your table has been reserved.',
  'Lunch': 'Lunch at Gilpin Hotel — a seasonal menu showcasing the best of the Lake District.',
};

/* ────────────── Parsed Facility Item ────────────── */
interface ParsedFacility {
  emoji: string;
  type: string;         // e.g. "Source", "Spice", "Aromatherapy"
  dateStr: string;      // e.g. "06/02" or "06/02/26"
  time: string | null;  // e.g. "19:30" or null
  count: number;        // e.g. 2 for "2x Aromatherapy"
  pax: number | null;   // e.g. 2 for "Dinner for 2"
  raw: string;          // original segment
}

/* ────────────── Parse Facilities String into Structured Items ────────────── */
const parseFacilitiesWithDates = (facilities: string): ParsedFacility[] => {
  if (!facilities?.trim()) return [];
  const parts = facilities.split(' • ').map(s => s.trim()).filter(Boolean);
  const results: ParsedFacility[] = [];

  for (const part of parts) {
    // Extract emoji prefix (first emoji character(s))
    const emojiMatch = part.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}♨️🌶️🍽️💆🍰🍱🎁🔹]+)\s*/u);
    const emoji = emojiMatch ? emojiMatch[1].trim() : '🔹';
    let rest = emojiMatch ? part.slice(emojiMatch[0].length) : part;

    // Extract date: (DD/MM @ HH:MM) or (DD/MM/YY @ HH:MM) or (DD/MM) — parenthesized format
    let dateTimeMatch = rest.match(/\((\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*(?:@\s*(\d{1,2}:\d{2}))?\)/);
    let dateStr = dateTimeMatch ? dateTimeMatch[1] : '';
    let time: string | null = dateTimeMatch ? (dateTimeMatch[2] || null) : null;

    // Fallback: match bare dates like "14/02" or "14-02" or "14/02/26" NOT inside parentheses
    if (!dateStr) {
      const bareDateMatch = rest.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b(?:\s*@?\s*(\d{1,2}:\d{2}))?/);
      if (bareDateMatch) {
        dateStr = `${bareDateMatch[1]}/${bareDateMatch[2]}${bareDateMatch[3] ? '/' + bareDateMatch[3] : ''}`;
        time = bareDateMatch[4] || null;
      }
    }

    // Remove the date portion from rest to get the type
    let typePart = rest
      .replace(/\(.*?\)/, '') // Remove (DD/MM) style
      .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/, '') // Remove bare DD/MM style
      .replace(/@\s*\d{1,2}:\d{2}/, '') // Remove bare @HH:MM
      .trim();

    // Extract count: "2x Aromatherapy" or "2 x Aromatherapy"
    const countMatch = typePart.match(/^(\d+)\s*x\s*/i);
    const count = countMatch ? parseInt(countMatch[1]) : 1;
    if (countMatch) typePart = typePart.slice(countMatch[0].length).trim();

    // Extract pax: "Dinner for 2"
    const paxMatch = typePart.match(/for\s+(\d+)/i);
    const pax = paxMatch ? parseInt(paxMatch[1]) : null;

    // Clean type — remove "for N", trailing/leading punctuation
    let type = typePart
      .replace(/for\s+\d+/i, '')
      .replace(/\(T-\d+\)/i, '')
      .replace(/^[\s,\-:]+|[\s,\-:]+$/g, '')
      .trim();

    // If type is empty, infer from emoji
    if (!type) {
      if (emoji.includes('🌶') || emoji.includes('🌶️')) type = 'Spice';
      else if (emoji.includes('🍽') || emoji.includes('🍽️')) type = 'Dinner';
      else if (emoji.includes('💆')) type = 'Spa';
      else if (emoji.includes('♨')) type = 'Spa Hamper';
      else if (emoji.includes('🍰')) type = 'Afternoon Tea';
      else if (emoji.includes('🍱')) type = 'Bento';
      else type = 'Activity';
    }

    results.push({ emoji, type, dateStr, time, count, pax, raw: part });
  }

  return results;
};

/* ────────────── Build Rich Description for a Facility ────────────── */
const buildDescription = (item: ParsedFacility): string => {
  // Check venue descriptions map (case-insensitive key match)
  const key = Object.keys(VENUE_DESCRIPTIONS).find(
    k => k.toLowerCase() === item.type.toLowerCase()
  );
  if (key) {
    let desc = VENUE_DESCRIPTIONS[key];
    // Personalize with count for treatments
    if (item.count > 1 && /spa|massage|aromatherapy|treatment|pure|espa|facial|hot.?stone/i.test(item.type)) {
      desc = `Your spa experience includes ${item.count} bespoke ${item.type} treatments at the Jetty Spa.`;
    }
    // Add pax context for dining
    if (item.pax && item.pax > 1 && /dinner|source|spice|lunch/i.test(item.type)) {
      desc = desc.replace(/\.$/, ` for ${item.pax} guests.`);
    }
    return desc;
  }
  // Fallback: use raw type with refined phrasing
  return `${item.type}${item.count > 1 ? ` (×${item.count})` : ''} — arranged for your enjoyment.`;
};

/* ────────────── Build Day Blocks from Guest Data ────────────── */
const buildItineraryFromGuest = (
  facilities: string,
  arrivalDateStr: string,
  duration: string,
  dinnerTime: string,
  dinnerVenue: string,
  presetKey: string,
): { left: DayBlock[]; right: DayBlock[] } => {
  const totalNights = Math.max(parseInt(duration) || 2, 1);
  const totalDays = totalNights + 1; // include departure day
  const arrivalDate = arrivalDateStr ? new Date(arrivalDateStr) : null;

  // Parse facilities into structured items
  const items = parseFacilitiesWithDates(facilities);

  // Create day-indexed buckets
  const dayBuckets: Map<number, EventItem[]> = new Map();
  for (let d = 0; d < totalDays; d++) {
    dayBuckets.set(d, []);
  }

  // Assign each facility to the correct day (with dedup)
  const seen = new Set<string>();
  for (const item of items) {
    // Dedup: skip if same type+date+time already processed
    const dedupKey = `${item.type}|${item.dateStr}|${item.time || ''}`.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    let dayOffset = 0; // default to Day 1

    if (item.dateStr && arrivalDate) {
      // Parse the facility date
      const dateParts = item.dateStr.split('/');
      const fDay = parseInt(dateParts[0]);
      const fMonth = parseInt(dateParts[1]) - 1; // 0-indexed
      const fYear = dateParts[2]
        ? (dateParts[2].length === 2 ? 2000 + parseInt(dateParts[2]) : parseInt(dateParts[2]))
        : arrivalDate.getFullYear();
      const facilityDate = new Date(fYear, fMonth, fDay);
      facilityDate.setHours(0, 0, 0, 0);
      const arrival = new Date(arrivalDate);
      arrival.setHours(0, 0, 0, 0);
      dayOffset = Math.round((facilityDate.getTime() - arrival.getTime()) / (86400000));
    }

    // Clamp to valid range
    dayOffset = Math.max(0, Math.min(dayOffset, totalDays - 1));

    const timeStr = item.time || (
      /dinner|spice|source|supper/i.test(item.type) ? '7:30pm' :
        /lunch|bento/i.test(item.type) ? '12:30pm' :
          /tea|lake house/i.test(item.type) ? '3:00pm' :
            /spa|massage|aromatherapy|treatment|pure|espa|facial|hot.?stone/i.test(item.type) ? '10:30am' :
              /hamper/i.test(item.type) ? 'On Arrival' :
                'TBC'
    );

    const description = buildDescription(item);

    dayBuckets.get(dayOffset)?.push({
      time: timeStr,
      activity: description,
    });
  }

  // If dinnerTime/dinnerVenue provided and no dinner on Day 1, add it
  const day0Events = dayBuckets.get(0) || [];
  const hasDinner0 = day0Events.some(e => /dinner|source|spice/i.test(e.activity));
  if (!hasDinner0 && (dinnerTime || dinnerVenue)) {
    const venue = dinnerVenue || 'Restaurant';
    const venueDesc = VENUE_DESCRIPTIONS[venue] || `Dinner at ${venue}.`;
    day0Events.push({
      time: dinnerTime || '7:00pm',
      activity: venueDesc,
    });
  }

  // Add standard events to each day
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const allDays: DayBlock[] = [];
  for (let d = 0; d < totalDays; d++) {
    const events = dayBuckets.get(d) || [];

    // Add breakfast (not on arrival day)
    if (d > 0 && d < totalDays - 1) {
      events.unshift({ time: 'Morning', activity: 'A leisurely breakfast at your table — Full English, Continental, or lighter options.' });
    }

    // Add check-in on arrival day
    if (d === 0) {
      events.unshift({ time: '3:00pm', activity: 'Welcome and check-in at Gilpin Hotel & Lake House.' });
      // Add champagne for special packages
      if (/moon|magic/i.test(presetKey)) {
        events.splice(1, 0, { time: 'On Arrival', activity: 'A chilled bottle of Champagne awaiting you in your room.' });
      }
    }

    // Add departure on last day
    if (d === totalDays - 1) {
      events.unshift({ time: 'Morning', activity: 'Enjoy a final breakfast before departure.' });
      events.push({ time: '11:00am', activity: 'Check-out. Thank you for staying with us — we look forward to welcoming you back.' });
    }

    // Sort events by time within the day
    events.sort((a, b) => {
      const timeOrder = (t: string): number => {
        if (/on arrival/i.test(t)) return 0;
        if (/morning/i.test(t)) return 1;
        if (t === 'TBC') return 50;
        // Parse HH:MM or HH:MMam/pm
        const match = t.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (!match) return 25;
        let h = parseInt(match[1]);
        const m = parseInt(match[2] || '0');
        const ampm = (match[3] || '').toLowerCase();
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        return h * 60 + m;
      };
      return timeOrder(a.time) - timeOrder(b.time);
    });

    // Build title
    let title = `Day ${d + 1}`;
    let subtitle = d === 0 ? 'Arrival' : d === totalDays - 1 ? 'Departure' : 'Relax & Explore';
    if (arrivalDate && !isNaN(arrivalDate.getTime())) {
      const current = new Date(arrivalDate);
      current.setDate(arrivalDate.getDate() + d);
      const suffixes = ['th', 'st', 'nd', 'rd'];
      const v = current.getDate() % 100;
      const ord = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
      title = `${dayNames[current.getDay()]}, ${current.getDate()}${ord} ${monthNames[current.getMonth()]}`;
    }

    allDays.push({
      id: uid(),
      title,
      subtitle,
      events,
    });
  }

  // Split into left/right: first half left, second half right
  const splitAt = Math.ceil(allDays.length / 2);
  return {
    left: allDays.slice(0, splitAt),
    right: allDays.slice(splitAt),
  };
};

const parseDuration = (dur: string): number => {
  const m = (dur || '').match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};

/* ────────────── Component ────────────── */
const PackageGenerator: React.FC<PackageGeneratorProps> = ({
  initialGuestName,
  initialRoomName,
  initialPreset,
  initialStartDate,
  initialFacilities,
  initialDinnerTime,
  initialDinnerVenue,
  initialPreferences,
  initialDuration,
  initialOccasions,
  initialChampagne,
  initialPetals,
  initialHistory,
  initialPax,
  initialSpecialCard,
  onComplete,
  stripEmojis,
}) => {
  const { setDashboardView } = useView();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  /* State */
  const initPreset = initialPreset && PRESETS[initialPreset] ? initialPreset : 'magic';
  const initPresetData = PRESETS[initPreset];
  const [guestName, setGuestName] = useState(initialGuestName || 'Mr & Mrs Finlay');
  const [roomName, setRoomName] = useState(initialRoomName || 'Cleabarrow');
  const [pkgName, setPkgName] = useState(initPresetData.name);
  const [leftDays, setLeftDays] = useState<DayBlock[]>(presetToDays(initPresetData.left));
  const [rightDays, setRightDays] = useState<DayBlock[]>(presetToDays(initPresetData.right));
  const [fontStyle, setFontStyle] = useState<string>('standard');
  const [accentColor, setAccentColor] = useState('#8b0000');
  const [selectedPreset, setSelectedPreset] = useState(initPreset);
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [logoSrc, setLogoSrc] = useState<string>(DEFAULT_LOGO);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 1024);
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissedRotate, setDismissedRotate] = useState(false);

  const fileLoaderRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [fmtSize, setFmtSize] = useState('3');
  const savedSelectionRef = useRef<Range | null>(null);

  /* ── AI Enhancement State ── */
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [specialCardText, setSpecialCardText] = useState(initialSpecialCard || '');

  const fonts = FONT_STYLES[fontStyle];

  /* ── Text formatting (execCommand on contentEditable) ── */
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && savedSelectionRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRef.current);
    }
  }, []);

  const formatDoc = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val ?? undefined);
  }, []);

  const handleFontSize = useCallback((size: string) => {
    setFmtSize(size);
    restoreSelection();
    document.execCommand('fontSize', false, size);
  }, [restoreSelection]);

  /* ── Detect portrait orientation on mobile ── */
  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 1024;
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(isMobile && portrait);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', () => setTimeout(checkOrientation, 100));
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  /* ── Go back to arrivals ── */
  const goBack = useCallback(() => {
    setDashboardView('arrivals');
    if (sessionId) navigate(`/session/${encodeURIComponent(sessionId)}/arrivals`, { replace: true });
  }, [setDashboardView, navigate, sessionId]);

  /* ── Preset loader ── */
  const loadPreset = useCallback((key: string) => {
    const pkg = PRESETS[key];
    if (!pkg) return;
    setSelectedPreset(key);
    setPkgName(pkg.name);
    setLeftDays(presetToDays(pkg.left));
    setRightDays(presetToDays(pkg.right));
  }, []);

  /* ── Day operations ── */
  const addDay = (side: 'left' | 'right') => {
    const day: DayBlock = { id: uid(), title: 'Day X', subtitle: '', events: [{ time: '00:00', activity: 'Details...' }] };
    if (side === 'left') setLeftDays(p => [...p, day]);
    else setRightDays(p => [...p, day]);
  };

  const removeDay = (side: 'left' | 'right', id: string) => {
    if (!window.confirm('Delete this day?')) return;
    if (side === 'left') setLeftDays(p => p.filter(d => d.id !== id));
    else setRightDays(p => p.filter(d => d.id !== id));
  };

  const updateDay = (side: 'left' | 'right', id: string, patch: Partial<DayBlock>) => {
    const setter = side === 'left' ? setLeftDays : setRightDays;
    setter(p => p.map(d => d.id === id ? { ...d, ...patch } : d));
  };

  /* ── Event operations ── */
  const addEvent = (side: 'left' | 'right', dayId: string) => {
    const setter = side === 'left' ? setLeftDays : setRightDays;
    setter(p => p.map(d => d.id === dayId ? { ...d, events: [...d.events, { time: '00:00', activity: 'Description...' }] } : d));
  };

  const removeEvent = (side: 'left' | 'right', dayId: string, eventIndex: number) => {
    const setter = side === 'left' ? setLeftDays : setRightDays;
    setter(p => p.map(d => d.id === dayId ? { ...d, events: d.events.filter((_, i) => i !== eventIndex) } : d));
  };

  const updateEvent = (side: 'left' | 'right', dayId: string, eventIndex: number, patch: Partial<EventItem>) => {
    const setter = side === 'left' ? setLeftDays : setRightDays;
    setter(p => p.map(d => d.id === dayId ? { ...d, events: d.events.map((e, i) => i === eventIndex ? { ...e, ...patch } : e) } : d));
  };

  /* ── Date automation ── */
  const applyDates = () => {
    if (!startDate) { alert('Please select a date first.'); return; }
    const dateObj = new Date(startDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let idx = 0;

    const applyToArr = (days: DayBlock[]): DayBlock[] =>
      days.map(d => {
        const current = new Date(dateObj);
        current.setDate(dateObj.getDate() + idx);
        idx++;
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = current.getDate() % 100;
        const ord = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
        return { ...d, title: `${dayNames[current.getDay()]}, ${current.getDate()}${ord} ${monthNames[current.getMonth()]}` };
      });

    setLeftDays(applyToArr(leftDays));
    setRightDays(applyToArr(rightDays));
  };

  /* ── Auto-build itinerary from guest data on mount ── */
  useEffect(() => {
    const hasFacilities = initialFacilities?.trim();
    const hasDinner = initialDinnerTime?.trim() || initialDinnerVenue?.trim();
    if (!hasFacilities && !hasDinner) {
      // No guest data — just apply dates to preset if available
      if (initialStartDate && startDate) {
        const dateObj = new Date(startDate);
        if (!isNaN(dateObj.getTime())) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          let idx = 0;
          const applyToArr = (days: DayBlock[]): DayBlock[] =>
            days.map(d => {
              const current = new Date(dateObj);
              current.setDate(dateObj.getDate() + idx);
              idx++;
              const suffixes = ['th', 'st', 'nd', 'rd'];
              const v = current.getDate() % 100;
              const ord = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
              return { ...d, title: `${dayNames[current.getDay()]}, ${current.getDate()}${ord} ${monthNames[current.getMonth()]}` };
            });
          setLeftDays(prev => applyToArr(prev));
          idx = leftDays.length;
          setRightDays(prev => applyToArr(prev));
        }
      }
      return;
    }

    // Build complete itinerary from guest data
    const result = buildItineraryFromGuest(
      initialFacilities || '',
      startDate || '',
      initialDuration || '2',
      initialDinnerTime || '',
      initialDinnerVenue || '',
      selectedPreset,
    );
    setLeftDays(result.left);
    setRightDays(result.right);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  /* ── Save / Load JSON ── */
  const saveToJSON = () => {
    const data = { guest: guestName, room: roomName, pkg: pkgName, left: leftDays, right: rightDays, style: fontStyle, color: accentColor };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Gilpin_Itinerary_${guestName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const loadFromJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setGuestName(data.guest || '');
        setRoomName(data.room || '');
        setPkgName(data.pkg || '');
        if (data.left) setLeftDays(data.left);
        if (data.right) setRightDays(data.right);
        if (data.style) setFontStyle(data.style);
        if (data.color) setAccentColor(data.color);
      } catch { alert('Error loading file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* ── Logo upload ── */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const resetLogo = () => setLogoSrc(DEFAULT_LOGO);

  /* ── Print ── */
  const handlePrint = useCallback(() => {
    const el = printRef.current;
    if (!el) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>Gilpin Itinerary — ${guestName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Alice&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Lato:wght@300;400;700&family=Montserrat:wght@200;300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
      <style>
        @page { size: A4 landscape; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; padding: 0; }
        .sheet, .pkg-sheet { width: 297mm; height: 210mm; display: flex; position: relative; page-break-after: always; background: white; }
        .panel, .pkg-panel { width: 50%; height: 100%; padding: 12mm; box-sizing: border-box; display: flex; flex-direction: column; }
        .frame, .pkg-frame { border: 2px solid #222; height: 100%; width: 100%; position: relative; padding: 10mm; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }
        .frame::after, .pkg-frame::after { content: ""; position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 1px solid ${accentColor}; pointer-events: none; }
        /* Hide edit-only UI */
        .add-item, .del-row, .del-day, .pkg-add-item, .pkg-del-day, .pkg-toggle-sidebar, .pkg-toolbar, button { display: none !important; }
        .day-block, .pkg-day-block { border: none !important; background: none !important; padding: 0 !important; }
        /* Normalize contentEditable for print */
        [contenteditable] { outline: none !important; cursor: default !important; word-break: break-word; overflow-wrap: break-word; }
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      // If part of queue, auto-apply dates on init
      if (onComplete) {
        // Give user a moment to confirm print
        setTimeout(() => {
          if (window.confirm('Did the print work correctly?')) {
            onComplete();
          }
        }, 500);
      }
    }, 600);
  }, [guestName, accentColor, onComplete]);

  /* ── AI Enhance — send to Gemini for luxury rewriting ── */
  const handleAiEnhance = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      // Build current itinerary from both sides
      const currentItinerary = [...leftDays, ...rightDays].map(d => ({
        title: d.title,
        subtitle: d.subtitle,
        events: d.events.map(e => ({ time: e.time, activity: e.activity })),
      }));

      const payload = {
        guestName,
        roomName,
        duration: initialDuration || String(leftDays.length + rightDays.length - 1),
        arrivalDate: startDate,
        pax: initialPax || 2,
        facilities: initialFacilities || '',
        occasions: initialOccasions || '',
        champagneInRoom: initialChampagne || false,
        petalsInRoom: initialPetals || false,
        preferences: initialPreferences || '',
        history: initialHistory || '',
        currentItinerary,
      };
      // 90s client-side timeout so the UI never hangs indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000);

      try {
        const resp = await fetch('/api/gemini-itinerary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || `AI service returned ${resp.status}`);
        }

        const rewritten: { title: string; subtitle: string; events: { time: string; activity: string }[] }[] = await resp.json();

        // Map back to DayBlock[] preserving IDs, with safety truncation
        const allDays = [...leftDays, ...rightDays];
        const updated = allDays.map((day, i) => {
          if (i < rewritten.length) {
            return {
              ...day,
              title: rewritten[i].title || day.title,
              subtitle: rewritten[i].subtitle || day.subtitle,
              events: rewritten[i].events?.map((ev, j) => {
                let activity = ev.activity || day.events[j]?.activity || '';
                // Safety: truncate to 140 chars to prevent border overflow on print
                if (activity.length > 140) {
                  activity = activity.slice(0, 137) + '...';
                }
                return {
                  time: ev.time || day.events[j]?.time || 'TBC',
                  activity,
                };
              }) || day.events,
            };
          }
          return day;
        });

        // Re-split into left/right
        const splitAt = leftDays.length;
        setLeftDays(updated.slice(0, splitAt));
        setRightDays(updated.slice(splitAt));
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setAiError('AI enhancement timed out — please try again.');
      } else {
        console.error('[AI Enhance] Error:', err);
        setAiError(err?.message || 'Failed to enhance itinerary');
      }
    } finally {
      setAiLoading(false);
    }
  }, [leftDays, rightDays, guestName, roomName, startDate, initialDuration, initialPax, initialFacilities, initialOccasions, initialChampagne, initialPetals, initialPreferences, initialHistory]);

  /* ── Clear all ── */
  const clearAll = () => {
    if (!window.confirm('Clear all events?')) return;
    setLeftDays([]);
    setRightDays([]);
  };

  /* ── Load Google Fonts ── */
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Alice&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=Lato:wght@300;400;700&family=Montserrat:wght@200;300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Roboto:wght@300;400;500&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  /* ── Render helpers ── */
  const renderDayBlock = (day: DayBlock, side: 'left' | 'right') => (
    <div key={day.id} className="pkg-day-block group" style={{ marginBottom: 20, position: 'relative', padding: '4px 8px', borderRadius: 4, border: '1px solid transparent', transition: '0.2s' }}>
      <div style={{ fontFamily: fonts.head, fontSize: 20, color: accentColor, borderBottom: '1px solid rgba(128,128,128,0.2)', paddingBottom: 4, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={e => updateDay(side, day.id, { title: e.currentTarget.textContent || '' })}
          style={{ fontFamily: fonts.head, fontSize: 20, color: accentColor, padding: 0, minWidth: 40, outline: 'none' }}
        >{day.title}</span>
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={e => updateDay(side, day.id, { subtitle: e.currentTarget.textContent || '' })}
          data-placeholder="Subtitle"
          style={{ fontFamily: fonts.body, fontSize: 9, textTransform: 'uppercase', color: '#999', letterSpacing: 1.5, padding: 0, textAlign: 'right', minWidth: 40, outline: 'none' }}
        >{day.subtitle}</span>
        <button onClick={() => removeDay(side, day.id)} className="pkg-del-day opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#c0392b', fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 10 }} title="Delete day">✕</button>
      </div>

      {day.events.map((ev, i) => (
        <div key={i} className="group/row flex items-baseline mb-2.5 relative" style={{ paddingLeft: 24, fontSize: 11, lineHeight: 1.5 }}>
          <button
            onClick={() => removeEvent(side, day.id, i)}
            className="absolute left-0 top-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
            style={{ color: '#c0392b', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', width: 20 }}
          >✕</button>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={e => updateEvent(side, day.id, i, { time: e.currentTarget.textContent || '' })}
            style={{ fontFamily: fonts.body, width: 75, fontWeight: 600, color: '#222', padding: 0, flexShrink: 0, outline: 'none', display: 'inline-block' }}
          >{ev.time}</span>
          <span
            contentEditable
            suppressContentEditableWarning
            onBlur={e => updateEvent(side, day.id, i, { activity: e.currentTarget.textContent || '' })}
            style={{ fontFamily: fonts.body, flex: 1, color: '#666', padding: 0, outline: 'none', display: 'inline-block' }}
          >{ev.activity}</span>
        </div>
      ))}

      <button
        onClick={() => addEvent(side, day.id)}
        className="pkg-add-item opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        style={{ fontFamily: fonts.body, fontSize: 10, textAlign: 'center', color: '#27ae60', border: '1px dashed #ccc', padding: 5, cursor: 'pointer', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginTop: 5, width: '100%', background: 'none' }}
      >+ Add Item</button>
    </div>
  );

  const closingMsg = (
    <div style={{ marginTop: 'auto', textAlign: 'center', paddingTop: 20 }}>
      <p
        contentEditable
        suppressContentEditableWarning
        style={{ fontFamily: fonts.head, fontStyle: 'italic', fontSize: 14, color: '#666', outline: 'none' }}
      >We wish you a memorable stay.</p>
    </div>
  );

  return (
    <div className="pkg-generator">
      <style>{`
        .pkg-generator {
          display: flex;
          min-height: calc(100vh - 120px);
          gap: 0;
          position: relative;
        }

        /* ── SIDEBAR ── */
        .pkg-sidebar {
          width: 360px;
          min-width: 360px;
          background: linear-gradient(180deg, #1e2327 0%, #181b1f 100%);
          color: #ecf0f1;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(197,160,101,0.12);
          box-shadow: 5px 0 30px rgba(0,0,0,0.25);
          z-index: 10;
          transition: margin-left 0.35s cubic-bezier(0.25,0.8,0.25,1), opacity 0.35s;
          overflow: hidden;
        }
        .pkg-sidebar.collapsed {
          margin-left: -360px;
          opacity: 0;
          pointer-events: none;
        }
        .pkg-sidebar-header {
          padding: 18px 24px;
          background: linear-gradient(135deg, #15181b 0%, #1a1e22 100%);
          border-bottom: 1px solid rgba(197,160,101,0.15);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .pkg-sidebar-header h3 {
          font-family: 'Cormorant Garamond', serif;
          color: #c5a065;
          margin: 0;
          font-size: 22px;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .pkg-sidebar-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }
        .pkg-sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .pkg-sidebar-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

        /* ── Control Groups ── */
        .pkg-section {
          margin-bottom: 28px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .pkg-section:last-child { border-bottom: none; }
        .pkg-section-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.8px;
          color: #8899a6;
          margin-bottom: 14px;
          font-weight: 700;
          padding-bottom: 6px;
        }
        .pkg-section-title span.icon { font-size: 14px; opacity: 0.7; }

        /* ── Inputs ── */
        .pkg-input {
          width: 100%;
          padding: 11px 14px;
          background: #2a3036;
          border: 1px solid #3d454d;
          color: #fff;
          border-radius: 6px;
          margin-bottom: 10px;
          font-family: 'Inter', 'Roboto', sans-serif;
          font-size: 13px;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .pkg-input:focus {
          outline: none;
          border-color: #c5a065;
          background: #323940;
          box-shadow: 0 0 0 3px rgba(197,160,101,0.08);
        }
        .pkg-input::placeholder { color: #5a6a7a; }

        /* ── Buttons ── */
        .pkg-btn {
          border: none;
          padding: 11px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: white;
          width: 100%;
        }
        .pkg-btn:active { transform: scale(0.97); }
        .pkg-btn-primary { background: #2980b9; }
        .pkg-btn-primary:hover { background: #1f618d; box-shadow: 0 2px 10px rgba(41,128,185,0.25); }
        .pkg-btn-success { background: #27ae60; }
        .pkg-btn-success:hover { background: #219150; box-shadow: 0 2px 10px rgba(39,174,96,0.25); }
        .pkg-btn-danger { background: rgba(192,57,43,0.85); }
        .pkg-btn-danger:hover { background: #c0392b; box-shadow: 0 2px 10px rgba(192,57,43,0.25); }
        .pkg-btn-secondary {
          background: #3a4450;
          color: #ddd;
          border: 1px solid #4a5560;
        }
        .pkg-btn-secondary:hover { background: #4a5560; border-color: #5d6a77; }
        .pkg-btn-row { display: flex; gap: 8px; margin-bottom: 10px; }



        /* ── Logo Preview ── */
        .pkg-logo-preview {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 14px;
          background: #2a3036;
          border: 1px solid #3d454d;
          border-radius: 6px;
          margin-bottom: 10px;
        }
        .pkg-logo-preview img {
          width: 50px;
          height: 50px;
          object-fit: contain;
          border-radius: 4px;
          background: #fff;
          padding: 4px;
        }
        .pkg-logo-actions {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .pkg-logo-action-btn {
          background: none;
          border: none;
          color: #8899a6;
          font-size: 11px;
          cursor: pointer;
          text-align: left;
          padding: 3px 6px;
          border-radius: 4px;
          transition: 0.15s;
        }
        .pkg-logo-action-btn:hover { color: #c5a065; background: rgba(197,160,101,0.08); }

        /* ── Color Swatches ── */
        .pkg-color-swatches {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .pkg-color-swatch {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: 0.15s;
          flex-shrink: 0;
        }
        .pkg-color-swatch:hover { transform: scale(1.15); }
        .pkg-color-swatch.active { border-color: #fff; box-shadow: 0 0 0 2px rgba(197,160,101,0.5); }

        /* ═══ WORKSPACE ═══ */
        .pkg-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-main, #f0f2f5);
          min-width: 0;
        }
        [data-theme="dark"] .pkg-workspace {
          background: #1a1a2e;
        }
        .pkg-toolbar {
          height: 52px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border-top: 1px solid rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 12px;
          z-index: 5;
          flex-shrink: 0;
          position: sticky;
          bottom: 0;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
        }
        [data-theme="dark"] .pkg-toolbar {
          background: rgba(20,20,40,0.92);
          border-top-color: rgba(255,255,255,0.06);
          box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
        }
        .pkg-tool-btn {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #555;
          transition: 0.2s;
          font-size: 13px;
          padding: 0 12px;
          gap: 6px;
          font-weight: 600;
        }
        .pkg-tool-btn:hover { background: rgba(197,160,101,0.1); color: #c5a065; border-color: rgba(197,160,101,0.2); }
        [data-theme="dark"] .pkg-tool-btn { color: #aaa; }
        .pkg-tool-btn.back { color: #c5a065; }

        /* ── Formatting toolbar buttons ── */
        .pkg-fmt-btn {
          width: 34px !important;
          padding: 0 !important;
          font-size: 14px !important;
          font-weight: 700;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s cubic-bezier(0.25,0.8,0.25,1);
        }
        .pkg-fmt-btn:hover {
          background: rgba(197,160,101,0.15) !important;
          color: #c5a065 !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(197,160,101,0.15);
        }
        .pkg-fmt-btn:active {
          transform: scale(0.92);
          box-shadow: none;
        }
        .pkg-tool-select {
          background: transparent;
          border: 1px solid rgba(128,128,128,0.2);
          border-radius: 6px;
          height: 34px;
          padding: 0 8px;
          color: #555;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          outline: none;
        }
        .pkg-tool-select:hover { border-color: rgba(197,160,101,0.3); color: #c5a065; }
        .pkg-tool-select:focus { border-color: #c5a065; box-shadow: 0 0 0 2px rgba(197,160,101,0.1); }
        [data-theme="dark"] .pkg-tool-select { color: #aaa; background: transparent; }

        /* ── ContentEditable on sheets ── */
        .pkg-sheet [contenteditable="true"] {
          outline: none;
          border-radius: 2px;
          transition: background 0.2s, box-shadow 0.2s;
          cursor: text;
        }
        .pkg-sheet [contenteditable="true"]:hover {
          background: rgba(197,160,101,0.06);
        }
        .pkg-sheet [contenteditable="true"]:focus {
          background: rgba(255,250,205,0.4);
          box-shadow: 0 1px 0 ${accentColor};
        }
        .pkg-preview-area {
          flex: 1;
          overflow-y: auto;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(180deg, #c9d1db 0%, #b5bfcc 100%);
        }
        [data-theme="dark"] .pkg-preview-area {
          background: linear-gradient(180deg, #0f0f1a 0%, #161625 100%);
        }

        /* ═══ SHEET ═══ */
        .pkg-sheet {
          background: white;
          width: 297mm;
          height: 210mm;
          display: flex;
          position: relative;
          box-shadow: 0 15px 40px rgba(0,0,0,0.15);
          margin-bottom: 40px;
          flex-shrink: 0;
        }
        .pkg-panel {
          width: 50%;
          height: 100%;
          padding: 12mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .pkg-frame {
          border: 2px solid #222;
          height: 100%;
          width: 100%;
          position: relative;
          padding: 10mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .pkg-frame::after {
          content: "";
          position: absolute;
          top: 5px; left: 5px; right: 5px; bottom: 5px;
          border: 1px solid ${accentColor};
          pointer-events: none;
        }




        /* Toggle sidebar button */
        .pkg-toggle-sidebar {
          position: absolute;
          left: 0;
          top: 8px;
          z-index: 20;
          width: 28px;
          height: 28px;
          border-radius: 0 8px 8px 0;
          background: rgba(197,160,101,0.15);
          border: 1px solid rgba(197,160,101,0.2);
          border-left: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c5a065;
          font-size: 14px;
          transition: 0.2s;
          backdrop-filter: blur(8px);
        }
        .pkg-toggle-sidebar:hover {
          background: rgba(197,160,101,0.25);
        }

        @media (max-width: 1024px) {
          .pkg-sidebar { position: absolute; left: 0; top: 0; bottom: 0; z-index: 50; }
          .pkg-sidebar.collapsed { margin-left: -360px; }
          .pkg-preview-area { padding: 20px; }
          .pkg-sheet { transform: scale(0.5); transform-origin: top center; margin-bottom: -200px; }
        }

        /* ── Landscape mobile optimization ── */
        @media (max-width: 1024px) and (orientation: landscape) {
          .pkg-sheet { transform: scale(0.65); margin-bottom: -150px; }
          .pkg-toolbar { height: 44px; padding: 0 16px; }
        }

        /* ── Sidebar backdrop (mobile overlay) ── */
        .pkg-sidebar-backdrop {
          display: none;
        }
        @media (max-width: 1024px) {
          .pkg-sidebar-backdrop {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 45;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            animation: pkgFadeIn 0.3s ease;
          }
        }
        @keyframes pkgFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ── Tablet / narrow desktop ── */
        @media (max-width: 768px) {
          .pkg-toolbar {
            flex-wrap: wrap;
            height: auto;
            min-height: 44px;
            padding: 6px 12px;
            gap: 6px;
          }
          .pkg-toolbar .pkg-tool-btn {
            min-width: 38px;
            min-height: 38px;
            font-size: 12px;
            padding: 0 8px;
          }
          .pkg-fmt-btn {
            min-width: 40px !important;
            min-height: 40px !important;
          }
          .pkg-tool-select {
            min-height: 38px;
          }
          .pkg-sidebar {
            width: 300px;
            min-width: 300px;
          }
          .pkg-sidebar.collapsed {
            margin-left: -300px;
          }
          .pkg-color-swatch {
            width: 32px;
            height: 32px;
          }
        }

        /* ── Small phone (< 640px) ── */
        @media (max-width: 640px) {
          .pkg-toolbar .pkg-editor-label {
            display: none;
          }
          .pkg-preview-area {
            padding: 12px;
          }
        }

        /* ── Thin phone (< 480px) ── */
        @media (max-width: 480px) {
          .pkg-sheet {
            transform: scale(0.35);
            transform-origin: top center;
            margin-bottom: -280px;
          }
          .pkg-toolbar {
            padding: 4px 8px;
            gap: 4px;
          }
          .pkg-toolbar .pkg-tool-btn {
            font-size: 11px;
            padding: 0 6px;
          }
          .pkg-sidebar {
            width: 85vw;
            min-width: 85vw;
          }
          .pkg-sidebar.collapsed {
            margin-left: -85vw;
          }
        }

        /* ── Rotation Prompt Overlay ── */
        .pkg-rotate-prompt {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(2, 6, 23, 0.96);
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding: 40px;
          text-align: center;
        }
        .pkg-rotate-icon {
          font-size: 64px;
          animation: pkgRotateSwing 2s ease-in-out infinite;
        }
        @keyframes pkgRotateSwing {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
        .pkg-rotate-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          color: #c5a065;
          font-weight: 600;
        }
        .pkg-rotate-text {
          font-size: 14px;
          color: #8899a6;
          line-height: 1.6;
          max-width: 340px;
        }
        .pkg-rotate-dismiss {
          margin-top: 12px;
          padding: 12px 28px;
          background: rgba(197,160,101,0.15);
          border: 1px solid rgba(197,160,101,0.3);
          border-radius: 8px;
          color: #c5a065;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: 0.2s;
        }
        .pkg-rotate-dismiss:hover {
          background: rgba(197,160,101,0.25);
        }
        .pkg-rotate-back {
          margin-top: 4px;
          padding: 10px 24px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #5a6a7a;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .pkg-rotate-back:hover {
          color: #fff;
          border-color: rgba(255,255,255,0.2);
        }

        @keyframes pkgSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media print {
          .pkg-sidebar, .pkg-toolbar, .pkg-toggle-sidebar, .pkg-rotate-prompt { display: none !important; }
          .pkg-workspace, .pkg-preview-area { padding: 0 !important; margin: 0 !important; background: white !important; }
          .pkg-sheet { margin: 0 !important; box-shadow: none !important; page-break-after: always; }
          .pkg-add-item, .pkg-del-day, .del-row { display: none !important; }
        }
      `}</style>

      {/* ── PORTRAIT ROTATION PROMPT ── */}
      {isPortrait && !dismissedRotate && (
        <div className="pkg-rotate-prompt">
          <div className="pkg-rotate-icon">📱</div>
          <div className="pkg-rotate-title">Rotate for Best Experience</div>
          <div className="pkg-rotate-text">
            The Itinerary Generator is designed for landscape view.<br />
            Please rotate your device for the best editing experience.
          </div>
          <button className="pkg-rotate-dismiss" onClick={() => setDismissedRotate(true)}>
            Continue in Portrait
          </button>
          <button className="pkg-rotate-back" onClick={goBack}>
            ← Back to Arrivals
          </button>
        </div>
      )}

      {/* ── SIDEBAR BACKDROP (mobile) ── */}
      {sidebarOpen && <div className="pkg-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* ── SIDEBAR ── */}
      <div className={`pkg-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
        <div className="pkg-sidebar-header">
          <h3>📋 Itinerary Generator</h3>
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#5a6a7a', cursor: 'pointer', fontSize: 18, transition: '0.15s' }} onMouseOver={e => (e.currentTarget.style.color = '#c5a065')} onMouseOut={e => (e.currentTarget.style.color = '#5a6a7a')}>✕</button>
        </div>

        <div className="pkg-sidebar-scroll">
          {/* Hidden file loader (triggered from toolbar) */}
          <input ref={fileLoaderRef} type="file" accept=".json" style={{ display: 'none' }} onChange={loadFromJSON} />

          {/* ── Presets ── */}
          <div className="pkg-section">
            <div className="pkg-section-title">
              <span>Presets</span>
              <span className="icon">✨</span>
            </div>
            <select className="pkg-input" value={selectedPreset} onChange={e => loadPreset(e.target.value)}>
              <option value="magic">Magical Escape (3 Day)</option>
              <option value="moon">Gilpinmoon (4 Day)</option>
              <option value="blank">Blank Template</option>
            </select>

            {/* ── AI Enhance Button ── */}
            <button
              className="pkg-btn"
              onClick={handleAiEnhance}
              disabled={aiLoading || (leftDays.length === 0 && rightDays.length === 0)}
              style={{
                marginTop: 10,
                background: aiLoading
                  ? 'linear-gradient(135deg, #4a5568, #2d3748)'
                  : 'linear-gradient(135deg, #c5a065, #b08d54)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {aiLoading ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'pkgSpin 1s linear infinite' }}>⏳</span>
                  Enhancing...
                </>
              ) : (
                <>
                  ✨ AI Enhance
                </>
              )}
            </button>
            {aiError && (
              <div style={{
                marginTop: 6,
                fontSize: 11,
                color: '#ff6b6b',
                background: 'rgba(255,107,107,0.08)',
                border: '1px solid rgba(255,107,107,0.2)',
                borderRadius: 6,
                padding: '8px 10px',
              }}>
                ⚠️ {aiError}
              </div>
            )}
          </div>

          {/* ── Guest Info ── */}
          <div className="pkg-section">
            <div className="pkg-section-title">
              <span>Guest Information</span>
              <span className="icon">👤</span>
            </div>
            <input className="pkg-input" type="text" placeholder="E.g. Mr & Mrs Smith" value={guestName} onChange={e => setGuestName(e.target.value)} />
            <input className="pkg-input" type="text" placeholder="E.g. Garden Suite" value={roomName} onChange={e => setRoomName(e.target.value)} />
          </div>

          {/* ── Date Automation ── */}
          <div className="pkg-section">
            <div className="pkg-section-title">
              <span>Date Automation</span>
              <span className="icon">📅</span>
            </div>
            <input className="pkg-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <button className="pkg-btn pkg-btn-primary" onClick={applyDates}>📅 Apply Dates</button>
          </div>

          {/* ── Visual Style ── */}
          <div className="pkg-section">
            <div className="pkg-section-title">
              <span>Visual Style</span>
              <span className="icon">🎨</span>
            </div>
            <select className="pkg-input" value={fontStyle} onChange={e => setFontStyle(e.target.value)}>
              {Object.entries(FONT_STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            <div className="pkg-section-title" style={{ marginTop: 14, marginBottom: 8 }}>
              <span>Accent Color</span>
            </div>
            <div className="pkg-color-swatches">
              {['#8b0000', '#1a3a5c', '#2c3e50', '#4a0e4e', '#0d4b3c', '#8b6914', '#333333', '#800020'].map(c => (
                <button
                  key={c}
                  className={`pkg-color-swatch${accentColor === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setAccentColor(c)}
                  title={c}
                />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ width: '100%', height: 30, border: 'none', padding: 0, background: 'none', cursor: 'pointer', borderRadius: 4 }} />
              <span style={{ fontSize: 10, color: '#5a6a7a', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{accentColor}</span>
            </div>
          </div>

          {/* ── Logo ── */}
          <div className="pkg-section">
            <div className="pkg-section-title">
              <span>Logo</span>
              <span className="icon">🏷️</span>
            </div>
            <div className="pkg-logo-preview">
              <img src={logoSrc} alt="Current logo" />
              <div className="pkg-logo-actions">
                <button className="pkg-logo-action-btn" onClick={() => logoInputRef.current?.click()}>📤 Upload new...</button>
                {logoSrc !== DEFAULT_LOGO && (
                  <button className="pkg-logo-action-btn" onClick={resetLogo}>↩ Reset to default</button>
                )}
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
          </div>

          {/* ── Structure ── */}
          <div className="pkg-section">
            <div className="pkg-section-title">
              <span>Structure</span>
              <span className="icon">🧱</span>
            </div>
            <div className="pkg-btn-row">
              <button className="pkg-btn pkg-btn-success" onClick={() => addDay('left')}>+ Left Day</button>
              <button className="pkg-btn pkg-btn-success" onClick={() => addDay('right')}>+ Right Day</button>
            </div>
            <button className="pkg-btn pkg-btn-danger" onClick={clearAll} style={{ marginTop: 5 }}>🗑️ Clear All</button>
          </div>

          {/* ── Guest Preferences (from AI Audit) ── */}
          {initialPreferences && (
            <div className="pkg-section" style={{ borderBottom: 'none' }}>
              <div className="pkg-section-title">
                <span>Guest Preferences</span>
                <span className="icon">📋</span>
              </div>
              <div style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 12,
                color: '#c4b5fd',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {initialPreferences}
              </div>
              <div style={{ fontSize: 10, color: '#5a6a7a', marginTop: 6, fontStyle: 'italic' }}>
                ℹ️ Imported from AI audit — for staff reference only
              </div>
            </div>
          )}

          {/* ── Imported Data Summary ── */}
          {(initialFacilities || initialDinnerVenue) && (
            <div className="pkg-section" style={{ borderBottom: 'none' }}>
              <div className="pkg-section-title">
                <span>Auto-Imported</span>
                <span className="icon">✨</span>
              </div>
              <div style={{
                background: 'rgba(39,174,96,0.08)',
                border: '1px solid rgba(39,174,96,0.2)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 11,
                color: '#a7f3d0',
                lineHeight: 1.8,
              }}>
                {initialDinnerVenue && <div>🍽️ Dinner: {initialDinnerTime || '7:00pm'} at {initialDinnerVenue}</div>}
                {initialFacilities && <div>🎯 Facilities: {initialFacilities}</div>}
              </div>
              <div style={{ fontSize: 10, color: '#5a6a7a', marginTop: 6, fontStyle: 'italic' }}>
                ✅ Events auto-injected into itinerary — review and adjust as needed
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── WORKSPACE ── */}
      <div className="pkg-workspace" style={{ position: 'relative' }}>
        {!sidebarOpen && (
          <button className="pkg-toggle-sidebar" onClick={() => setSidebarOpen(true)} title="Open sidebar">☰</button>
        )}

        <div className="pkg-preview-area">
          <div ref={printRef}>
            {/* SHEET 1: Cover Page */}
            <div className="pkg-sheet">
              <div className="pkg-panel">
                <div className="pkg-frame" style={{ justifyContent: 'flex-end', alignItems: 'center', textAlign: 'center' }}>
                  <img src={logoSrc} alt="Logo" style={{ maxWidth: 120, opacity: 0.85, marginBottom: 15, mixBlendMode: 'multiply' }} />
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: '#666', lineHeight: 2, outline: 'none' }}
                  >
                    Gilpin Hotel &amp; Lake House<br />Windermere, Lake District
                  </div>
                </div>
              </div>
              <div className="pkg-panel">
                <div className="pkg-frame" style={{ justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', marginBottom: 25, minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={logoSrc} alt="Main Logo" style={{ maxWidth: 200, maxHeight: 140, mixBlendMode: 'multiply', filter: 'brightness(1.05) contrast(1.1)' }} />
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    style={{ fontFamily: fonts.body, fontSize: 9, textTransform: 'uppercase', letterSpacing: 3, color: '#666', textAlign: 'center' }}
                  >Prepared Exclusively For</div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => setGuestName(e.currentTarget.textContent || '')}
                    style={{ fontFamily: fonts.head, fontSize: 40, fontStyle: 'italic', textAlign: 'center', margin: '10px 0', lineHeight: 1.1, color: '#111' }}
                  >{guestName}</div>
                  <div style={{ textAlign: 'center', borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '10px 0', margin: '0 35px', fontFamily: fonts.body }}>
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#666', display: 'block' }}
                    >Staying in</span>
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={e => setRoomName(e.currentTarget.textContent || '')}
                      style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginTop: 4, color: '#111' }}
                    >{roomName}</span>
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => setPkgName(e.currentTarget.textContent || '')}
                    style={{ fontFamily: fonts.head, fontSize: 18, fontStyle: 'italic', textAlign: 'center', marginTop: 35, color: '#111' }}
                  >{pkgName}</div>
                </div>
              </div>
            </div>

            {/* SHEET 2: Itinerary */}
            <div className="pkg-sheet">
              <div className="pkg-panel">
                <div className="pkg-frame" style={{ overflow: 'auto' }}>
                  {leftDays.map(d => renderDayBlock(d, 'left'))}
                </div>
              </div>
              <div className="pkg-panel">
                <div className="pkg-frame" style={{ overflow: 'auto' }}>
                  {/* Special Card — replaces right panel content when in blank mode */}
                  {specialCardText && rightDays.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      textAlign: 'center',
                      padding: '20mm 10mm',
                    }}>
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={e => setSpecialCardText(e.currentTarget.innerText || '')}
                        style={{
                          fontFamily: fonts.head,
                          fontSize: 16,
                          fontStyle: 'italic',
                          lineHeight: 2,
                          color: '#333',
                          maxWidth: '85%',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {specialCardText}
                      </div>
                      <div style={{
                        marginTop: 40,
                        fontFamily: fonts.body,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 2,
                        color: '#666',
                      }}>
                        Warmest Regards
                      </div>
                      <div style={{
                        fontFamily: fonts.head,
                        fontSize: 14,
                        fontWeight: 600,
                        fontStyle: 'italic',
                        color: accentColor,
                        marginTop: 6,
                      }}>
                        Team Gilpin
                      </div>
                      <div style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 48,
                        color: accentColor,
                        opacity: 0.25,
                        marginTop: 15,
                        lineHeight: 1,
                      }}>
                        𝒢
                      </div>
                    </div>
                  ) : (
                    <>
                      {rightDays.map(d => renderDayBlock(d, 'right'))}
                      {closingMsg}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── STICKY BOTTOM TOOLBAR ── */}
        <div className="pkg-toolbar">
          <button onClick={goBack} className="pkg-tool-btn back" title="Back to Arrivals">
            ← Back
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(128,128,128,0.2)', margin: '0 4px' }} />
          <span className="pkg-editor-label" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: '#999', fontWeight: 700 }}>Itinerary Editor</span>
          <div style={{ width: 1, height: 24, background: 'rgba(128,128,128,0.2)', margin: '0 8px' }} />

          {/* ── Formatting controls ── */}
          <button className="pkg-tool-btn pkg-fmt-btn" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('bold')} title="Bold">
            <strong>B</strong>
          </button>
          <button className="pkg-tool-btn pkg-fmt-btn" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('italic')} title="Italic">
            <em>I</em>
          </button>
          <button className="pkg-tool-btn pkg-fmt-btn" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('underline')} title="Underline">
            <span style={{ textDecoration: 'underline' }}>U</span>
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(128,128,128,0.2)', margin: '0 4px' }} />
          <select
            className="pkg-tool-select"
            value={fmtSize}
            onMouseDown={saveSelection}
            onChange={e => handleFontSize(e.target.value)}
            title="Font Size"
          >
            <option value="1">XS</option>
            <option value="2">S</option>
            <option value="3">M</option>
            <option value="4">L</option>
            <option value="5">XL</option>
            <option value="6">2XL</option>
            <option value="7">3XL</option>
          </select>
          <div style={{ width: 1, height: 24, background: 'rgba(128,128,128,0.2)', margin: '0 4px' }} />
          <button className="pkg-tool-btn pkg-fmt-btn" onMouseDown={e => e.preventDefault()} onClick={() => formatDoc('removeFormat')} title="Clear Formatting">
            ✕
          </button>

          <div style={{ flex: 1 }} />

          {/* ── Action buttons ── */}
          <button className="pkg-tool-btn" onClick={handlePrint} title="Print">
            🖨️ Print
          </button>
          <button className="pkg-tool-btn" onClick={saveToJSON} title="Save JSON">
            💾 Save
          </button>
          <button className="pkg-tool-btn" onClick={() => fileLoaderRef.current?.click()} title="Load JSON">
            📂 Load
          </button>
          <div style={{ width: 1, height: 24, background: 'rgba(128,128,128,0.2)', margin: '0 4px' }} />
          <button className="pkg-tool-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle sidebar">
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackageGenerator;
