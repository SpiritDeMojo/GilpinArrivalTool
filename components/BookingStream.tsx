import React, { useMemo } from 'react';
import { Guest } from '../types';

interface BookingStreamProps {
    guest: Guest;
}

interface StreamLine {
    text: string;
    x: number;
    y: number;
}

// ═══════════════════════════════════════════════════
// VENUE KEYWORDS — used for facility splitting & highlighting
// Order: specific → general (prevents "Pure" matching before "Pure Lakes")
// ═══════════════════════════════════════════════════
const VENUE_KEYWORDS = [
    'GH ESPA Natural Inner Calm Massage',
    'GH ESPA Signature Treatment',
    'GH ESPA Indian Head Massage',
    'GH ESPA Inner Beauty Facial',
    'LH Natural Ultimate Inner Calm Massage',
    'LH Pure Lakes Aromatherapy Massage',
    'GH Pure Lakes Aromatherapy Massage',
    'Couples Spa Hot Tub',
    'Bento Box Lunch',
    'GH ESPA',
    'LH ESPA',
    'GH Pure Lakes',
    'LH Pure Lakes',
    'GH Pure',
    'LH Pure',
    'LH Natural',
    'The Lake House',
    'Spice',
    'Source',
    'Afternoon Tea',
    'Steam Room',
    'Mud Treatment',
    'Facial',
    'Massage',
    'Aromatherapy',
    'Treatments',
    'Hot Tub',
    'Hot Stone',
    'Bento Box',
    'Bento',
    'Spa',
    'Tea',
    'Pure',
    'ESPA',
];

// Build the venue alternation for regex (escaped, longest first)
const venueAlt = VENUE_KEYWORDS.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

/**
 * Classify a venue keyword into a color group.
 * Groups: spice (amber), source (emerald), lakehouse (sky), spa (violet), dining (gold)
 */
function getVenueClass(venue: string): string {
    const v = venue.toLowerCase();
    if (v.includes('spice')) return 'bsh-fac-spice';
    if (v.includes('source')) return 'bsh-fac-source';
    if (v.includes('lake house') || v.startsWith('lh ')) return 'bsh-fac-lakehouse';
    if (v.includes('espa') || v.includes('massage') || v.includes('facial') ||
        v.includes('spa') || v.includes('mud') || v.includes('steam') ||
        v.includes('hot') || v.includes('treatment') || v.includes('aromatherapy') ||
        v.includes('pure')) return 'bsh-fac-spa';
    if (v.includes('bento') || v.includes('tea') || v.includes('afternoon')) return 'bsh-fac-dining';
    return 'bsh-facility';
}

// ═══════════════════════════════════════════════════
// HIGHLIGHT RULES — order matters (first match wins)
// ═══════════════════════════════════════════════════

/**
 * Custom facility highlighting — splits /Venue chains correctly.
 * Each facility booking: /VenueName: details DD/MM/YY @ HH:MM
 * Chain separator: / followed by a venue keyword
 * Problem: dates use / too (DD/MM/YY), so we can't just split on /
 * Solution: use lookahead for known venue keywords after /
 */
function highlightFacilities(text: string): { parts: React.ReactNode[]; lastIndex: number } | null {
    // Match: /VenueKeyword followed by content up to the next /VenueKeyword or end of line
    // The lookahead boundary uses the venue keyword list to distinguish separators from date slashes
    const facRegex = new RegExp(
        `\\/(${venueAlt})([^]*?)(?=\\/(${venueAlt})|$)`,
        'gi'
    );

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    let found = false;

    while ((match = facRegex.exec(text)) !== null) {
        found = true;
        // Push preceding text
        if (match.index > lastIndex) {
            parts.push(<span key={`ft${key++}`} className="bsh-text">{text.slice(lastIndex, match.index)}</span>);
        }
        const venueName = match[1];
        const details = match[2];
        const fullMatch = '/' + venueName + details;
        const venueClass = getVenueClass(venueName);

        parts.push(
            <span key={`fv${key++}`} className={venueClass}>{fullMatch}</span>
        );
        lastIndex = match.index + fullMatch.length;
    }

    if (!found) return null;

    // Trailing text
    if (lastIndex < text.length) {
        parts.push(<span key={`ft${key++}`} className="bsh-text">{text.slice(lastIndex)}</span>);
    }

    return { parts, lastIndex };
}

// Standard highlight rules (applied AFTER facility splitting)
const STREAM_HIGHLIGHTS: { pattern: RegExp; className: string; label: string }[] = [
    // Dinner — full line: "Dinner for 2 on DD/MM/YY at HH:MM in Venue"
    { pattern: /Dinner\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:.]+\s+in\s+[^\n]+/gi, label: 'Dinner', className: 'bsh-dinner' },
    // Venue-prefix dinner
    { pattern: /(?:Gilpin\s+Spice|SOURCE)\s+Dinner\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:.]+/gi, label: 'Dinner', className: 'bsh-dinner' },
    // Allergy keywords
    { pattern: /\b(?:NDR|NUT FREE|NO NUT|ANAPHYLAXIS|PEANUT|NUT ALLERGY|GLUTEN FREE|COELIAC|CELIAC|DAIRY FREE|OAT MILK|SOYA MILK|VEGAN|VEGETARIAN|PESCATARIAN|PESCETARIAN|LACTOSE|HALAL|KOSHER|SHELLFISH|NO MAYONNAISE|CRAB ALLERGY|FISH ALLERGY|EGG ALLERGY|SOY ALLERGY|SESAME|SULPHITE|COMPLAINT)\b/gi, label: 'Allergy', className: 'bsh-allergy' },
    // Individual allergy/dietary mentions (pattern: "X allergy" or "allergic to X" or "no X please")
    { pattern: /\b(?:allerg(?:y|ic|ies)\s+(?:to\s+)?[a-z\s]+|no\s+(?:mayonnaise|shellfish|nuts?|gluten|dairy|eggs?|soy|sesame)\s*(?:please)?)\b/gi, label: 'Allergy', className: 'bsh-allergy' },
    // VIP markers
    { pattern: /\b(?:VIP|DIRECTOR|CELEBRITY|OWNER|POB_STAFF|POB|PRIDE OF BRITAIN|SURPRISE)\b/gi, label: 'VIP', className: 'bsh-vip' },
    // Comp Upgrade — important operational flag
    { pattern: /Comp(?:limentary)?\s+Upgrade[:\s]*(?:Guest\s+(?:Un)?aware)?[^.\n]*/gi, label: 'Upgrade', className: 'bsh-upgrade' },
    // Pet/Dog mentions
    { pattern: /\b(?:Dog|Pet|Puppy|Canine)\s*(?:Bed|Bowl|Friendly|in room|allowed)?[^.\n]{0,20}/gi, label: 'Pet', className: 'bsh-pet' },
    // Pre-registration
    { pattern: /(?:completed pre-registration online|pre-registration complete|Guest has completed pre-registration)[^.\n]*/gi, label: 'Pre-Reg', className: 'bsh-prereg' },
    // Purchases (Champagne, Flowers, etc.)
    { pattern: /(?:Champagne|Prosecco|Wine|Flowers|Gin|Whisky|Chocolate[s]?|Spa In-Room Hamper)\s+on\s+[\d/]+[^\n]*/gi, label: 'Purchase', className: 'bsh-lineitem' },
    // Billing line
    { pattern: /Billing:\s*[^\n]+/gi, label: 'Billing', className: 'bsh-billing' },
    // ETA — handles ranges
    { pattern: /ETA:?\s*[\d.:,-]+(?:\s*-\s*[\d.:]+)?(?:\s*(?:pm|am))?/gi, label: 'ETA', className: 'bsh-eta' },
    // Special Occasion
    { pattern: /Special Occasion:\s*[^\n]+/gi, label: 'Occasion', className: 'bsh-occasion' },
    // Been Before
    { pattern: /Been Before:\s*(?:Yes[^\n]*|No)\b/gi, label: 'History', className: 'bsh-beenbefore' },
    // In Room on Arrival
    { pattern: /In Room(?:\s+on Arrival)?:\s*[^\n]+/gi, label: 'In-Room', className: 'bsh-inroom' },
    // Car reg — all UK formats
    { pattern: /\b[A-Z]{2}\d{2}\s?[A-Z]{3}\b/gi, label: 'Car', className: 'bsh-car' },
    { pattern: /\b[A-Z]\d{1,3}\s[A-Z]{3}\b/gi, label: 'Car', className: 'bsh-car' },
    { pattern: /\b\d{1,4}\s[A-Z]{2,3}\b/g, label: 'Car', className: 'bsh-car' },
    // Room numbers: "01. Lyth" or "01-Lyth" or "01- Lyth"
    { pattern: /\b(?:0[1-9]|[1-5]\d)[.\-]\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g, label: 'Room', className: 'bsh-room' },
    // Rate codes
    { pattern: /\b(?:BB_[123]|RO|COMP|MINIMOON|MAGESC|DBB_[123]|LHBB|APR_[123]_BB|POB_STAFF|STAFF|CEL_DBB_1)\b/gi, label: 'Rate', className: 'bsh-rate' },
    // Prices
    { pattern: /£\d+[.,]?\d*/g, label: 'Price', className: 'bsh-price' },
];

/**
 * Apply highlights to a line of text.
 * First tries the custom facility splitter (for /Venue chains),
 * then falls back to standard regex matching.
 */
function highlightText(text: string): React.ReactNode {
    if (!text) return null;

    // Check if this line contains facility bookings (starts with / or contains /VenueName)
    const hasFacilities = new RegExp(`\\/(${venueAlt})`, 'i').test(text);

    if (hasFacilities) {
        // Use custom facility splitter that correctly handles /venue chains
        const result = highlightFacilities(text);
        if (result) return <>{result.parts}</>;
    }

    // Standard regex highlighting for non-facility lines
    const allPatterns = STREAM_HIGHLIGHTS.map(r => `(${r.pattern.source})`).join('|');
    const combinedRegex = new RegExp(allPatterns, 'gi');

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = combinedRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<span key={key++} className="bsh-text">{text.slice(lastIndex, match.index)}</span>);
        }
        const matched = match[0];
        let className = 'bsh-text';
        for (let i = 0; i < STREAM_HIGHLIGHTS.length; i++) {
            if (match[i + 1] !== undefined) {
                className = STREAM_HIGHLIGHTS[i].className;
                break;
            }
        }
        parts.push(<span key={key++} className={className}>{matched}</span>);
        lastIndex = combinedRegex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(<span key={key++} className="bsh-text">{text.slice(lastIndex)}</span>);
    }
    return <>{parts}</>;
}

// ═══════════════════════════════════════════════════
// LINE CLASSIFICATION
// ═══════════════════════════════════════════════════

const SECTION_LABELS: [RegExp, string][] = [
    [/^Facility Bookings:/i, 'facility-label'],
    [/^Traces:/i, 'traces-label'],
    [/^Booking Notes/i, 'notes-label'],
    [/^HK Notes:/i, 'hk-label'],
    [/^Allergies:/i, 'allergy-label'],
    [/^F&B Notes:/i, 'notes-label'],
    [/^Guest Notes:/i, 'notes-label'],
    [/^Previous Stays/i, 'prev-stays'],
    [/^(Occasion:|P\.O\.Nr:|Company:|Contact Details:)/i, 'meta'],
];

function classifyLine(text: string): string {
    for (const [regex, label] of SECTION_LABELS) {
        if (regex.test(text)) return label;
    }
    return 'content';
}

function isSectionLabel(cls: string): boolean {
    return cls !== 'content' && cls !== 'meta';
}

// PDF column boundaries
const RIGHT_COL_MIN = 450;

/**
 * BookingStream — PDF-faithful layout with venue-aware facility highlighting.
 */
const BookingStream: React.FC<BookingStreamProps> = ({ guest }) => {
    const { headerLine, leftLines, rightLines } = useMemo(() => {
        const lines: StreamLine[] = guest.bookingStreamStructured || [];

        if (lines.length === 0) {
            const flat = (guest.bookingStream || guest.rawHtml || '').split('\n').filter((l: string) => l.trim());
            return {
                headerLine: flat[0] || '',
                leftLines: flat.slice(1).filter(l => {
                    const txt = l.trim();
                    // Right-column content in flat mode: check for facility/allergy/HK keywords
                    return !(/^Facility Bookings:|^Allergies:|^HK Notes:|^\/(?:Spice|Source|GH|LH|The Lake|Pure|ESPA|Spa|Bento|Afternoon|Couples|Steam|Mud|Hot|Facial|Massage|Tea)/i.test(txt));
                }),
                rightLines: flat.slice(1).filter(l => {
                    const txt = l.trim();
                    return /^Facility Bookings:|^Allergies:|^HK Notes:|^\/(?:Spice|Source|GH|LH|The Lake|Pure|ESPA|Spa|Bento|Afternoon|Couples|Steam|Mud|Hot|Facial|Massage|Tea)/i.test(txt);
                }),
            };
        }

        const header = lines[0]?.text || '';
        const left: string[] = [];
        const right: string[] = [];

        for (let i = 1; i < lines.length; i++) {
            const item = lines[i];
            if (item.x >= RIGHT_COL_MIN) {
                right.push(item.text);
            } else {
                left.push(item.text);
            }
        }

        return { headerLine: header, leftLines: left, rightLines: right };
    }, [guest.bookingStreamStructured, guest.bookingStream, guest.rawHtml]);

    if (!headerLine) return null;

    return (
        <div className="bsh-root">
            {/* ── HEADER BAR ── */}
            <div className="bsh-header">
                <div className="bsh-header-text">{highlightText(headerLine)}</div>
            </div>

            {/* ── TWO-COLUMN BODY ── */}
            {(leftLines.length > 0 || rightLines.length > 0) && (
                <div className="bsh-columns">
                    <div className="bsh-col bsh-col-left">
                        {leftLines.length === 0 && <div className="bsh-empty">No traces or notes</div>}
                        {leftLines.map((line, i) => {
                            const cls = classifyLine(line);
                            return (
                                <div key={i} className={`bsh-line ${isSectionLabel(cls) ? 'bsh-section-head' : ''}`}>
                                    {highlightText(line)}
                                </div>
                            );
                        })}
                    </div>
                    <div className="bsh-col bsh-col-right">
                        {rightLines.length === 0 && <div className="bsh-empty">No facility bookings</div>}
                        {rightLines.map((line, i) => {
                            const cls = classifyLine(line);
                            return (
                                <div key={i} className={`bsh-line ${isSectionLabel(cls) ? 'bsh-section-head' : ''}`}>
                                    {highlightText(line)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(BookingStream);

// Re-export highlightText for use in other components (Facilities column)
export { highlightText };
