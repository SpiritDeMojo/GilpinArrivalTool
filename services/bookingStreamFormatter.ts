/**
 * Booking Stream Formatter Service
 * 
 * Runs after the PDF parser to transform raw text into structured sections
 * that mirror the original PDF layout. This makes the Booking Stream display
 * clean and readable instead of a wall of unformatted text.
 */

export interface BookingStreamData {
    /** Header row: ID, name, room, time, etc. */
    header: {
        id: string;
        name: string;
        room: string;
        time: string;
        status: string;
        departure: string;
        type: string;
        rateCode: string;
        rate: string;
        carReg: string;
    };
    /** Company line */
    company?: string;
    /** Contact Details */
    contact?: string;
    /** Occasion */
    occasion?: string;
    /** P.O.Nr */
    poNumber?: string;
    /** Traces section */
    traces?: string;
    /** Facility Bookings (restaurant reservations, spa, etc.) */
    facilityBookings: string[];
    /** Allergies section */
    allergies?: string;
    /** HK Notes section */
    hkNotes?: string;
    /** Booking Notes lines */
    bookingNotes: string[];
    /** In Room on Arrival items */
    inRoomItems: string[];
    /** Financial line items (Champagne on 02/01/26 for £95.00, etc.) */
    lineItems: string[];
    /** Billing details */
    billing?: {
        totalRate?: string;
        deposit?: string;
        billing?: string;
        unit?: string;
    };
    /** Checked / 8 Day Check / 4 day Call info */
    checks: string[];
}

/**
 * Parse raw text lines from the PDF into a structured BookingStreamData object.
 * This runs on the already-joined rawHtml string stored on each Guest.
 */
export function formatBookingStream(rawText: string, guestId?: string, guestName?: string, guestRoom?: string): BookingStreamData {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    const data: BookingStreamData = {
        header: {
            id: guestId || '',
            name: guestName || '',
            room: guestRoom || '',
            time: '',
            status: '',
            departure: '',
            type: '',
            rateCode: '',
            rate: '',
            carReg: '',
        },
        facilityBookings: [],
        bookingNotes: [],
        inRoomItems: [],
        lineItems: [],
        checks: [],
    };

    // ── PARSE HEADER from first line ──
    if (lines.length > 0) {
        const firstLine = lines[0];
        // Extract 4-digit time (e.g. "1435")
        const timeMatch = firstLine.match(/\b(\d{4})\b/);
        if (timeMatch && !timeMatch[1].startsWith('20')) {
            data.header.time = timeMatch[1];
        }
        // Extract status code (CHI, DEF, etc.)
        const statusMatch = firstLine.match(/\b(CHI|DEF|GRP|VAC|RES|INH|DUE|ARR|CXL|CAN)\b/i);
        if (statusMatch) data.header.status = statusMatch[1].toUpperCase();
        // Extract departure date (DD/MM/YY)
        const departureDates = firstLine.match(/\d{2}\/\d{2}\/\d{2,4}/g);
        if (departureDates && departureDates.length > 0) {
            data.header.departure = departureDates[departureDates.length > 1 ? 1 : 0];
        }
        // Extract room type code
        const typeMatch = firstLine.match(/\b(SL|MR|CR|JS|GR|SS|LHC|LHM|LHS|LHSS)\b/i);
        if (typeMatch) data.header.type = typeMatch[1].toUpperCase();
        // Extract rate code (BB_2, RO, MINIMOON, MAGESC, etc.) — longest match first
        const rateMatch = firstLine.match(/\b(MINIMOON|MINI_MOON|MAGESC|MAG_ESC|APR_\d_BB|POB_STAFF|BB_?\d?_?WIN|LHBB_?\d?|DBB_?\d?|BB_?\d?|RO_?\d?|MIN|CEL|COMP|LHAPR|LHMAG|POB|STAFF)\b/i);
        if (rateMatch) data.header.rateCode = rateMatch[1].toUpperCase();
        // Extract rate amount
        const rateAmountMatch = firstLine.match(/(\d{2,4}\.\d{2})\b/);
        if (rateAmountMatch) data.header.rate = `£${rateAmountMatch[1]}`;
        // Extract car reg (last thing on the line, UK plate pattern)
        const carMatch = firstLine.match(/\b([A-Z]{2}\d{2}\s?[A-Z]{3}|[A-Z]\d{1,3}\s[A-Z]{3}|\d{1,4}\s[A-Z]{2,3}|[A-Z]{2}\d{2,4})\s*$/i);
        if (carMatch) data.header.carReg = carMatch[1].toUpperCase();
    }

    // ── SECTION EXTRACTION from remaining lines ──
    const fullText = lines.join(' ');

    // Company
    const companyMatch = fullText.match(/Company:\s*([^\n]+?)(?=\s*(?:Contact Details:|Occasion:|P\.O\.Nr:|Traces:|Booking Notes|$))/i);
    if (companyMatch && companyMatch[1].trim()) data.company = companyMatch[1].trim();

    // Contact Details
    const contactMatch = fullText.match(/Contact Details:\s*([^\n]+?)(?=\s*(?:Occasion:|P\.O\.Nr:|Traces:|Total Rate:|Booking Notes|$))/i);
    if (contactMatch && contactMatch[1].trim()) data.contact = contactMatch[1].trim();

    // Occasion
    const occasionMatch = fullText.match(/Occasion:\s*([^\n]+?)(?=\s*(?:P\.O\.Nr:|Traces:|Booking Notes|Contact Details:|$))/i);
    if (occasionMatch && occasionMatch[1].trim()) data.occasion = occasionMatch[1].trim();

    // P.O.Nr
    const poMatch = fullText.match(/P\.O\.Nr:\s*([^\n]+?)(?=\s*(?:Traces:|Booking Notes|Facility Bookings:|$))/i);
    if (poMatch && poMatch[1].trim()) data.poNumber = poMatch[1].trim();

    // Traces
    const tracesMatch = fullText.match(/Traces:\s*([^\n]+?)(?=\s*(?:Booking Notes|Facility Bookings:|Allergies:|$))/i);
    if (tracesMatch && tracesMatch[1].trim()) data.traces = tracesMatch[1].trim();

    // Facility Bookings - extract individual bookings
    const facilityMatch = fullText.match(/Facility Bookings:\s*(.*?)(?=\s*(?:Allergies:|HK Notes:|Booking Notes|$))/i);
    if (facilityMatch) {
        const facilityText = facilityMatch[1].trim();
        // Split on "/" prefix (each booking starts with /Name:)
        const bookings = facilityText.split(/(?=\/)/).filter(b => b.trim());
        data.facilityBookings = bookings.map(b => b.trim());
    }

    // Allergies
    const allergyMatch = fullText.match(/Allergies:\s*(.*?)(?=\s*(?:HK Notes:|Guest Notes:|Unit:|Booking Notes|$))/i);
    if (allergyMatch && allergyMatch[1].trim()) data.allergies = allergyMatch[1].trim();

    // HK Notes
    const hkMatch = fullText.match(/HK Notes:\s*(.*?)(?=\s*(?:Unit:|Guest Notes:|Booking Notes|Allergies:|$))/i);
    if (hkMatch && hkMatch[1].trim()) data.hkNotes = hkMatch[1].trim();

    // Booking Notes section
    const bookingNotesStart = fullText.indexOf('Booking Notes');
    if (bookingNotesStart !== -1) {
        const afterBookingNotes = fullText.substring(bookingNotesStart + 'Booking Notes'.length);
        // Extract until we hit a known section marker
        const endMatch = afterBookingNotes.match(/(?:Checked:|8 Day Check:|4 day Call:|Champagne on|Spa In-Room|Dinner for|Flowers on|Prosecco on|Wine on)/i);
        const notesText = endMatch
            ? afterBookingNotes.substring(0, endMatch.index).trim()
            : afterBookingNotes.trim();

        // Parse individual note lines
        const noteLines = notesText
            .split(/(?=(?:Been Before:|Special Occasion:|ETA:|Billing:|In Room|Checked:|Pre.?Reg))/i)
            .map(n => n.trim())
            .filter(n => n.length > 2);
        data.bookingNotes = noteLines;
    }

    // In Room on Arrival
    const inRoomMatch = fullText.match(/In Room(?:\s+on Arrival)?:\s*(.*?)(?=\s*(?:Checked:|8 Day Check:|4 day Call:|$))/i);
    if (inRoomMatch && inRoomMatch[1].trim()) {
        data.inRoomItems = inRoomMatch[1].trim().split(/,|;/).map(i => i.trim()).filter(i => i.length > 1);
    }

    // Line items (purchases with dates and prices)
    const lineItemPatterns = [
        /(?:Champagne|Prosecco|Wine|Flowers|Gin|Whisky)\s+on\s+[\d/]+\s+for\s+£[\d.]+/gi,
        /Spa\s+In-Room\s+Hamper\s+on\s+[\d/]+\s+for\s+£[\d.]+/gi,
        /Dinner\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:]+\s+in\s+.+/gi,
    ];
    for (const pattern of lineItemPatterns) {
        const matches = fullText.match(pattern);
        if (matches) data.lineItems.push(...matches.map(m => m.trim()));
    }

    // Billing
    const totalRateMatch = fullText.match(/Total Rate:\s*([\d,]+\.\d{2})/);
    const depositMatch = fullText.match(/Deposit:\s*([\d,]+\.\d{2})/);
    const billingTextMatch = fullText.match(/Billing:\s*([^\n]+?)(?=\s*(?:Unit:|Total Rate:|Deposit:|$))/i);
    const unitMatch = fullText.match(/Unit:\s*([^\n]+?)(?=\s*(?:Token|$))/i);
    if (totalRateMatch || depositMatch || billingTextMatch || unitMatch) {
        data.billing = {
            totalRate: totalRateMatch ? `£${totalRateMatch[1]}` : undefined,
            deposit: depositMatch ? `£${depositMatch[1]}` : undefined,
            billing: billingTextMatch ? billingTextMatch[1].trim() : undefined,
            unit: unitMatch ? unitMatch[1].trim() : undefined,
        };
    }

    // Checked / 8 Day Check / 4 day Call
    const checkPatterns = [
        /Checked:\s*([A-Z]{2})/gi,
        /8 Day Check:\s*([A-Z]{2})/gi,
        /4 day Call:\s*([^\n]+?)(?=\s*(?:\d{2}\/|$))/gi,
    ];
    for (const pattern of checkPatterns) {
        const matches = fullText.match(pattern);
        if (matches) data.checks.push(...matches.map(m => m.trim()));
    }

    return data;
}
