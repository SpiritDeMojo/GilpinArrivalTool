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
      { day: 'Day 1', label: 'Arrival', events: [['On Arrival', 'Bottle of Champagne in room.'], ['8.00pm', 'Dinner at Gilpin Spice.']] },
      { day: 'Day 2', label: 'Relax', events: [['Morning', 'Breakfast.'], ['11.00am', 'Spa Treatment.'], ['12.30pm', 'Bento Box lunch.']] },
    ],
    right: [
      { day: 'Day 3', label: 'Departure', events: [['Morning', 'Breakfast & Check out.']] },
    ],
  },
  moon: {
    name: 'The Gilpinmoon Package',
    left: [
      { day: 'Day 1', label: 'Arrival', events: [['On Arrival', 'Champagne served in your room.'], ['6.00pm', 'Dinner at Gilpin Spice.']] },
      { day: 'Day 2', label: 'Relax', events: [['Morning', 'Leisurely breakfast.'], ['11.15am', 'Spa Experience begins.'], ['1.30pm', 'Bento box served in Spa.']] },
    ],
    right: [
      { day: 'Day 3', label: 'Explore', events: [['Morning', 'Breakfast.'], ['Daytime', 'Windermere Lake Cruise.'], ['6.00pm', 'Dinner at Source.']] },
      { day: 'Day 4', label: 'Departure', events: [['Morning', 'Breakfast before departure.']] },
    ],
  },
  blank: {
    name: 'Your Custom Itinerary',
    left: [{ day: 'Day 1', label: 'Start', events: [['14:00', 'Check-in']] }],
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
  /** Callback when print is complete */
  onComplete?: () => void;
  /** Hide emojis in print output */
  stripEmojis?: boolean;
}

/* ────────────── Venue Description Mappings ────────────── */
const VENUE_DESCRIPTIONS: Record<string, string> = {
  'Source': 'Dinner in our Michelin-starred restaurant, Source.',
  'Spice': 'Dinner in our Pan-Asian fusion restaurant, Gilpin Spice.',
  'Gilpin Spice': 'Dinner in our Pan-Asian fusion restaurant, Gilpin Spice.',
  'Lake House': 'Afternoon Tea at The Lake House.',
  'Afternoon Tea': 'Afternoon Tea served in the Drawing Room.',
  'Bento': 'Bento Box lunch delivered to your room.',
  'Spa': 'Relaxation time at the Jetty Spa.',
  'Spa Use': 'Complimentary use of the Jetty Spa facilities.',
  'Massage': 'Your spa massage treatment.',
  'Aromatherapy': 'Aromatherapy massage at the Jetty Spa.',
  'Treatments': 'Spa treatment at the Jetty Spa.',
  'GH Pure': 'GH Pure facial treatment at the Jetty Spa.',
  'Pure Lakes': 'Pure Lakes treatment at the Jetty Spa.',
  'Pure Couples': 'Couples\' Pure treatment at the Jetty Spa.',
  'Spa Hamper': 'In-room Spa Hamper awaits your arrival.',
  'In-Room Hamper': 'In-room Spa Hamper awaits your arrival.',
  'Hamper': 'Complimentary hamper in your room.',
  'Dinner': 'Dinner at Gilpin Hotel.',
  'Lunch': 'Lunch at Gilpin Hotel.',
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

    // Extract date: (DD/MM @ HH:MM) or (DD/MM/YY @ HH:MM) or (DD/MM)
    const dateTimeMatch = rest.match(/\((\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*(?:@\s*(\d{1,2}:\d{2}))?\)/);
    const dateStr = dateTimeMatch ? dateTimeMatch[1] : '';
    const time = dateTimeMatch ? (dateTimeMatch[2] || null) : null;

    // Remove the date portion from rest to get the type
    let typePart = rest.replace(/\(.*?\)/, '').trim();

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
    if (item.count > 1 && /spa|massage|aromatherapy|treatment|pure/i.test(item.type)) {
      desc = `Your spa experience begins with ${item.count} ${item.type} treatments.`;
    }
    return desc;
  }
  // Fallback: use raw type with emoji
  return `${item.emoji} ${item.type}${item.count > 1 ? ` (x${item.count})` : ''}.`;
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

  // Assign each facility to the correct day
  for (const item of items) {
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
      /dinner|spice|source|supper/i.test(item.type) ? '7:00pm' :
        /lunch|bento/i.test(item.type) ? '12:30pm' :
          /tea|lake house/i.test(item.type) ? '3:00pm' :
            /spa|massage|aromatherapy|treatment|pure/i.test(item.type) ? '10:00am' :
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
      events.unshift({ time: 'Morning', activity: 'Full English or Continental breakfast.' });
    }

    // Add check-in on arrival day
    if (d === 0) {
      events.unshift({ time: '3:00pm', activity: 'Check-in and welcome to Gilpin.' });
      // Add champagne for special packages
      if (/moon|magic/i.test(presetKey)) {
        events.splice(1, 0, { time: 'On Arrival', activity: 'Bottle of Champagne awaiting you in your room.' });
      }
    }

    // Add departure on last day
    if (d === totalDays - 1) {
      events.unshift({ time: 'Morning', activity: 'Full English or Continental breakfast.' });
      events.push({ time: '11:00am', activity: 'Check-out. We look forward to welcoming you back.' });
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
        .frame, .pkg-frame { border: 2px solid #222; height: 100%; width: 100%; position: relative; padding: 10mm; box-sizing: border-box; display: flex; flex-direction: column; }
        .frame::after, .pkg-frame::after { content: ""; position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 1px solid ${accentColor}; pointer-events: none; }
        /* Hide edit-only UI */
        .add-item, .del-row, .del-day, .pkg-add-item, .pkg-del-day, .pkg-toggle-sidebar, .pkg-toolbar, button { display: none !important; }
        .day-block, .pkg-day-block { border: none !important; background: none !important; padding: 0 !important; }
        /* Normalize contentEditable for print */
        [contenteditable] { outline: none !important; cursor: default !important; }
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
            The Package Generator is designed for landscape view.<br />
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
          <h3>📦 Package Manager</h3>
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
                  {rightDays.map(d => renderDayBlock(d, 'right'))}
                  {closingMsg}
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
