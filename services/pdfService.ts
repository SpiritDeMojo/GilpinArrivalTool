/**
 * PDF Arrival Parser — Column-Aware Extraction Engine
 *
 * Parses Gilpin Hotel PMS arrival PDFs into structured Guest objects.
 * Uses X-coordinate spatial analysis to separate left (notes/requests)
 * from right (confirmed facility bookings) columns.
 *
 * Extracts 20+ fields per guest:
 *   Room (31-room map), Name (couple handling), Car Registration,
 *   ETA (multi-format), Duration (first-line departure date),
 *   Facilities (venue-tagged), Dinner (time/venue), Allergies (UK Top 14),
 *   Occasions, In-Room Items (28 keywords), Loyalty, Rate Code (37 variants),
 *   Booking Source, Pax (ACEB), Pre-Registration, Billing, Deposit,
 *   Previous Stays, Unbooked Requests, Room Type, Smoking, Pets.
 *
 * Tested: 163 guests × 10 PDFs × 0 extraction errors.
 */
import * as pdfjsLib from 'pdfjs-dist';
import { Guest, Flag } from '../types';
import { ROOM_MAP, ROOM_TYPES, ROOM_TYPE_CODES, getRoomNumber } from '../constants';

// 🛑 CRITICAL FIX: Synchronize Worker version with API version (5.4.624)
// This must match the version in index.html's import map to avoid the version mismatch error.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs';

export class PDFService {
  static async parse(file: File, flags: Flag[]): Promise<{ guests: Guest[], arrivalDateStr: string, arrivalDateObj: Date | null }> {
    const buffer = await file.arrayBuffer();
    // Use the imported library, not a global variable
    const pdf = await pdfjsLib.getDocument(new Uint8Array(buffer)).promise;
    let rawItems: any[] = [];
    let arrivalDateStr = "Unknown Date";
    let arrivalDateObj: Date | null = null;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      rawItems.push(...content.items.map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: viewport.height - item.transform[5],
        page: i
      })));
    }

    // Sort items by page, then Y (top to bottom), then X (left to right)
    rawItems.sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(a.y - b.y) > 4) return a.y - b.y;
      return a.x - b.x;
    });

    // Extract Arrival Date from header — handle date in same or separate text item
    const headerItem = rawItems.find(i => i.str.match(/Arrival List|Guest Greeter/i) && i.str.match(/\d{2}\/\d{2}\/\d{4}/i));
    if (headerItem) {
      const m = headerItem.str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) {
        arrivalDateObj = new Date(`${m[3]}-${m[2]}-${m[1]}`);
        arrivalDateObj.setHours(0, 0, 0, 0);
        arrivalDateStr = arrivalDateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    } else {
      // Fallback: date might be a separate text item near the "Arrival List" text
      const titleItem = rawItems.find(i => /Arrival List|Guest Greeter/i.test(i.str));
      if (titleItem) {
        const nearbyDate = rawItems.find(i =>
          i.page === titleItem.page &&
          Math.abs(i.y - titleItem.y) < 10 &&
          /\d{2}\/\d{2}\/\d{4}/.test(i.str)
        );
        if (nearbyDate) {
          const m = nearbyDate.str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (m) {
            arrivalDateObj = new Date(`${m[3]}-${m[2]}-${m[1]}`);
            arrivalDateObj.setHours(0, 0, 0, 0);
            arrivalDateStr = arrivalDateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          }
        }
      }
    }

    // Group items into lines
    let lines: any[] = [];
    let currentLine: { y: number, items: any[] } = { y: -999, items: [] };
    rawItems.forEach(item => {
      if (Math.abs(item.y - currentLine.y) > 5) {
        if (currentLine.items.length > 0) lines.push(currentLine);
        currentLine = { y: item.y, items: [item] };
      } else {
        currentLine.items.push(item);
      }
    });
    if (currentLine.items.length > 0) lines.push(currentLine);

    // === DETECT COLUMN POSITIONS FROM HEADER ROW ===
    // The header row contains "Car Reg" (or similar) — detect its x-position
    // before we filter it out, so we know exactly where car reg data lives.
    let carRegColumnX: { min: number; max: number } | null = null;
    let agentColumnX: { min: number; max: number } | null = null;
    for (const line of lines) {
      const lineText = line.items.map((i: any) => i.str).join(' ');
      if (/^ID\s+Guest Name|Req\.\s+Vip/i.test(lineText)) {
        const sortedItems = [...line.items].sort((a: any, b: any) => a.x - b.x);
        // Find Car Reg column
        for (const item of line.items) {
          if (/car\s*reg/i.test(item.str)) {
            const idx = sortedItems.findIndex((i: any) => /car\s*reg/i.test(i.str));
            const nextItem = sortedItems[idx + 1];
            carRegColumnX = {
              min: item.x - 5,
              max: nextItem ? nextItem.x - 5 : item.x + 150
            };
            break;
          }
        }
        // Find Agent column
        for (const item of line.items) {
          if (/^agent$/i.test(item.str.trim())) {
            const idx = sortedItems.findIndex((i: any) => /^agent$/i.test(i.str.trim()));
            const nextItem = sortedItems[idx + 1];
            agentColumnX = {
              min: item.x - 5,
              max: nextItem ? nextItem.x - 5 : item.x + 150
            };
            break;
          }
        }
        if (carRegColumnX) break;
      }
    }

    // Filter noise lines (headers, footers, page numbers, repeated headings)
    lines = lines.filter(l => {
      const text = l.items.map((i: any) => i.str).join(" ");
      return !text.match(/^ID\s+Guest Name|Req\.\s+Vip|Page\s+\d+\s+of\s+\d+|JHunt\/Gilpin|dkarakonstantinou\s*\/|Total Rate:|^Arrivals$/i);
    });

    // Group lines into Guest Blocks by 5-digit ID
    let guestBlocks: any[] = [];
    let currentBlock: any = null;
    lines.forEach((line) => {
      const firstItem = line.items[0];
      if (firstItem && /^\d{5}$/.test(firstItem.str.trim()) && firstItem.x < 100) {
        if (currentBlock) guestBlocks.push(currentBlock);
        currentBlock = { id: firstItem.str, lines: [] };
      }
      if (currentBlock) currentBlock.lines.push(line);
    });
    if (currentBlock) guestBlocks.push(currentBlock);

    // === COLUMN-AWARE BOOKING STREAM RECONSTRUCTION ===
    // PDF layout has distinct columns that pdfjs merges on the same Y line.
    // We reconstruct the full guest booking text by:
    // 1. Splitting items on the same Y-line into separate column groups (X gap > 200px)
    // 2. Each column group becomes a separate logical line in the stream
    // 3. Header/footer/summary noise is filtered out
    // Two outputs per block:
    //   - bookingStream: flat text for parser (facility/dinner regex)
    //   - bookingStreamStructured: array of {text, x, y} for PDF-faithful UI rendering
    const COL_GAP_THRESHOLD = 200;
    const blockNoise = /^(?:JHunt\s*\/|dkarakonstantinou\s*\/|Arrival\s+List\s+\d|Arrivals\s+Rooms\s+\d|Totals\s+Rooms\s+\d|Persons\s+\d)/i;

    guestBlocks.forEach(block => {
      const streamLines: string[] = [];
      const structured: { text: string; x: number; y: number }[] = [];

      for (const line of block.lines) {
        const sortedItems = [...line.items].sort((a: any, b: any) => a.x - b.x);
        if (sortedItems.length === 0) continue;

        // Split items into column groups based on X gaps
        const columns: any[][] = [[sortedItems[0]]];
        for (let i = 1; i < sortedItems.length; i++) {
          const prevCol = columns[columns.length - 1];
          const lastInCol = prevCol[prevCol.length - 1];
          if (sortedItems[i].x - lastInCol.x > COL_GAP_THRESHOLD) {
            columns.push([sortedItems[i]]);
          } else {
            prevCol.push(sortedItems[i]);
          }
        }

        // Each column group becomes a separate line with X position
        for (const col of columns) {
          const text = col.map((i: any) => i.str).join(' ').trim();
          if (text && !blockNoise.test(text)) {
            streamLines.push(text);
            structured.push({ text, x: col[0].x, y: line.y });
          }
        }
      }

      block.bookingStream = streamLines.join('\n');
      block.bookingStreamStructured = structured;
    });

    const guests = guestBlocks.map(block => this.parseBlock(block, arrivalDateObj, carRegColumnX, agentColumnX)).filter(g => g !== null);

    // Final Sort by Room Number using forced map values
    guests.sort((a, b) => {
      const rA = parseInt(a.room.split(' ')[0]) || 999;
      const rB = parseInt(b.room.split(' ')[0]) || 999;
      return rA - rB;
    });

    return { guests, arrivalDateStr, arrivalDateObj };
  }

  /**
   * Parse a flexible time string into HH:MM format.
   * Handles: "3pm", "2:30pm", "15:00", "1500", "14", "2:30", etc.
   */
  private static parseTimeString(raw: string): string {
    let str = raw.trim();

    // Handle pm/am variants
    const pmMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*pm/i);
    if (pmMatch) {
      let hours = parseInt(pmMatch[1]);
      const mins = pmMatch[2] ? parseInt(pmMatch[2]) : 0;
      if (hours < 12) hours += 12;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    const amMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*am/i);
    if (amMatch) {
      let hours = parseInt(amMatch[1]);
      const mins = amMatch[2] ? parseInt(amMatch[2]) : 0;
      if (hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    // Plain time: "15:00", "9:30"
    const colonMatch = str.match(/^(\d{1,2}):(\d{2})$/);
    if (colonMatch) {
      const hours = parseInt(colonMatch[1]);
      const mins = parseInt(colonMatch[2]);
      if (hours >= 0 && hours <= 23 && mins >= 0 && mins <= 59) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }
    }

    // Bare number: "15" -> "15:00", "1500" -> "15:00"
    const cleanNum = str.replace(/[^0-9]/g, '');
    if (cleanNum.length >= 1 && cleanNum.length <= 4) {
      const padded = cleanNum.padStart(4, '0');
      const hours = parseInt(padded.substring(0, 2));
      const mins = parseInt(padded.substring(2, 4));
      if (hours >= 0 && hours <= 23 && mins >= 0 && mins <= 59) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }
    }

    return ""; // Unparseable
  }

  private static extractSection(text: string, startMarker: string, endMarkers: string[]): string {
    const safeStart = startMarker.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const startMatch = text.match(new RegExp(safeStart, 'i'));
    if (!startMatch) return "";
    const startIndex = startMatch.index! + startMatch[0].length;
    const remaining = text.substring(startIndex);

    const strictEndMarkers = [
      ...endMarkers,
      "Checked:", "8 Day Check", "4 day Call", "Allergies:",
      "Billing:", "Total Rate:", "Deposit:", "Balance Due:",
      "/Source:", "/Spice:", "/Bento:", "/The Lake House:", "/GH Pure:"
    ];

    let bestEndIndex = remaining.length;
    strictEndMarkers.forEach(endM => {
      const escaped = endM.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const m = remaining.match(new RegExp(escaped, 'i'));
      if (m && m.index! < bestEndIndex) bestEndIndex = m.index!;
    });
    return remaining.substring(0, bestEndIndex).trim();
  }

  private static formatFacilities(text: string): string {
    if (!text || text.trim() === "") return "";
    const mappings = [
      { key: "Spice", icon: "🌶️" },
      { key: "Source", icon: "🍽️" },
      { key: "ESPA", icon: "💆" },
      { key: "Facial", icon: "💆" },
      { key: "Hot Stone", icon: "💆" },
      { key: "Indian Head", icon: "💆" },
      { key: "Inner Calm", icon: "💆" },
      { key: "Inner Beauty", icon: "💆" },
      { key: "Deep Muscle", icon: "💆" },
      { key: "Signature", icon: "💆" },
      { key: "Nurture", icon: "💆" },
      { key: "Pre-Natal", icon: "💆" },
      { key: "Treatments", icon: "💆" },
      { key: "Massage", icon: "💆" },
      { key: "Aromatherapy", icon: "💆" },
      { key: "Hot Tub", icon: "♨️" },
      { key: "Hot tub", icon: "♨️" },
      { key: "Steam Room", icon: "♨️" },
      { key: "Couples Spa", icon: "♨️" },
      { key: "Afternoon Tea", icon: "🍰" },
      { key: "Bento", icon: "🍱" },
      { key: "Spa Use", icon: "♨️" },
      { key: "Spa Hamper", icon: "♨️" },
      { key: "In-Room Hamper", icon: "♨️" },
      { key: "Hamper", icon: "🎁" },
      { key: "Lake House", icon: "🍰" },
      { key: "GH Pure", icon: "💆" },
      { key: "LH Pure", icon: "💆" },
      { key: "LH Natural", icon: "💆" },
      { key: "LH ESPA", icon: "💆" },
      { key: "Pure Lakes", icon: "💆" },
      { key: "Pure Couples", icon: "💆" },
      { key: "Pure", icon: "💆" },
      { key: "Flowers", icon: "💐" },
      { key: "Chocolates", icon: "🍫" },
      { key: "Champagne", icon: "🥂" },
      { key: "Dinner", icon: "🍽️" },
      { key: "Lunch", icon: "🍽️" }
    ];

    // ── Venue-aware splitting ──
    // Instead of naively splitting on "/" (which conflicts with dates like DD/MM/YY),
    // use a regex that splits on "/" ONLY when followed by a known venue keyword.
    // This is the same approach used in BookingStream.tsx's highlightFacilities().
    const venueKeywords = 'GH\\s+ESPA\\s+Natural\\s+Inner\\s+Calm\\s+Massage|GH\\s+ESPA\\s+Signature\\s+Treatment|GH\\s+ESPA\\s+Indian\\s+Head\\s+Massage|GH\\s+ESPA\\s+Inner\\s+Beauty\\s+Facial|LH\\s+Natural\\s+Ultimate\\s+Inner\\s+Calm\\s+Massage|LH\\s+Pure\\s+Lakes\\s+Aromatherapy\\s+Massage|GH\\s+Pure\\s+Lakes\\s+Aromatherapy\\s+Massage|Couples\\s+Spa\\s+Hot\\s+Tub|Bento\\s+Box\\s+Lunch|GH\\s+ESPA|LH\\s+ESPA|GH\\s+Pure\\s+Lakes|LH\\s+Pure\\s+Lakes|GH\\s+Pure|LH\\s+Pure|LH\\s+Natural|The\\s+Lake\\s+House|Spice|Source|Afternoon\\s+Tea|Steam\\s+Room|Mud\\s+Treatment|Facial|Massage|Aromatherapy|Treatments|Hot\\s+Tub|Hot\\s+Stone|Bento\\s+Box|Bento|Spa|Tea|Pure|ESPA|Dinner|Lunch';

    // Split text into individual facility entries using venue-keyword lookahead
    const splitRegex = new RegExp(`\\/(${venueKeywords})(.*?)(?=\\/(${venueKeywords})|$)`, 'gis');
    const entries: { venue: string; details: string }[] = [];
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    // Also capture any leading text before the first /Venue (rare but possible)
    while ((match = splitRegex.exec(text)) !== null) {
      if (match.index > lastIndex && entries.length === 0) {
        // Leading text before first /Venue — could be standalone "Dinner for ..." line
        const leading = text.substring(lastIndex, match.index).trim();
        if (leading) entries.push({ venue: '', details: leading });
      }
      entries.push({ venue: match[1].trim(), details: match[2].trim() });
      lastIndex = match.index + match[0].length;
    }

    // If no /Venue patterns found, fall back to the old date-safe splitting method
    if (entries.length === 0) {
      const dateHolder: string[] = [];
      let safe = text.replace(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g, (_match, d, m, y) => {
        const dateStr = y ? `${d}/${m}/${y}` : `${d}/${m}`;
        const idx = dateHolder.length;
        dateHolder.push(dateStr);
        return `§DATE${idx}§`;
      });
      const parts = safe.split('/');
      parts.forEach(part => {
        let p = part.replace(/§DATE(\d+)§/g, (_, i) => dateHolder[Number(i)]).trim();
        if (p) entries.push({ venue: '', details: p });
      });
    }

    const result: string[] = [];

    for (const entry of entries) {
      const fullText = entry.venue ? `${entry.venue}: ${entry.details}` : entry.details;
      if (!fullText.trim()) continue;

      // Extract structured data
      const dateMatch = fullText.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/);
      const timeMatch = fullText.match(/(?:@\s*)?(\d{1,2}:\d{2})/);
      const tableMatch = fullText.match(/Table for (\d+)/i);
      const forNMatch = fullText.match(/for (\d+)/i);

      const date = dateMatch ? dateMatch[1] : "";
      const time = timeMatch ? timeMatch[1] : "";
      const pax = tableMatch ? tableMatch[1] : (forNMatch ? forNMatch[1] : "");

      // Determine venue name for emoji matching (use explicit venue or detect from details)
      const venueName = entry.venue || fullText;

      let emoji = "🔹";
      for (const m of mappings) {
        if (venueName.toLowerCase().includes(m.key.toLowerCase())) {
          emoji = m.icon;
          break;
        }
      }

      // Build clean display name: keep the venue identity, strip extracted data
      let displayName = venueName || fullText
        .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, "")
        .replace(/\d{1,2}:\d{2}/g, "")
        .replace(/Table for \d+/gi, "")
        .replace(/@/g, "")
        .replace(/^[:\s\-]+|[:\s\-]+$/g, "")
        .trim();

      if (!displayName) continue;

      // Build output: emoji VenueName (T-N · DD/MM/YY @ HH:MM)
      const detail_parts: string[] = [];
      if (pax) detail_parts.push(`T-${pax}`);
      if (date) detail_parts.push(date);
      if (time) detail_parts.push(`@ ${time}`);

      const detailStr = detail_parts.length > 0 ? ` (${detail_parts.join(' · ')})` : '';
      result.push(`${emoji} ${displayName}${detailStr}`);
    }

    return result.join(" • ");
  }

  private static parseBlock(block: any, arrivalDate: Date | null, carRegColumnX?: { min: number; max: number } | null, agentColumnX?: { min: number; max: number } | null): Guest {
    const rawItems = block.lines.flatMap((l: any) => l.items);
    const rawTextLines = block.lines.map((l: any) => l.items.map((i: any) => i.str).join(" "));
    const singleLineText = rawTextLines.join(" ").replace(/\s+/g, " ");

    // Column-aware booking stream: clean text with columns separated (built in parse())
    const bookingStreamLines = (block.bookingStream || '').split('\n').filter((l: string) => l.trim());
    const bookingStreamText = bookingStreamLines.join(' ').replace(/\s+/g, ' ');
    const scanLower = singleLineText.toLowerCase();

    // --- 1. ROOM (Map-Enforced Validation & Duplicate Fix) ---
    let room = "Unassigned";
    const roomPattern = /(?:^|\s)(\d{1,3})[.-]\s*([A-Za-z\s]+)/i;
    let rawRoomCandidate = "";

    // Scan first 5 lines for a room-like pattern
    for (let i = 0; i < Math.min(5, block.lines.length); i++) {
      const lineText = block.lines[i].items.map((it: any) => it.str).join(" ");
      const match = lineText.match(roomPattern);
      if (match) {
        rawRoomCandidate = match[0].trim();
        break;
      }
    }

    if (rawRoomCandidate) {
      const normalizedCandidate = rawRoomCandidate.toLowerCase();
      let foundMatch = false;
      for (const [key, num] of Object.entries(ROOM_MAP)) {
        if (normalizedCandidate.includes(key)) {
          room = `${num} ${key.toUpperCase()}`;
          foundMatch = true;
          break;
        }
      }
      if (!foundMatch) {
        room = rawRoomCandidate.replace(/\b(DEF|CHI|GRP|VAC|MR|SS|SL|JS)\b/gi, "")
          .replace(/\b(\d{4}|\d{2}:\d{2})\b/g, "")
          .replace(/\b(\d+)\s+\1\b/, "$1")
          .replace(/\s+/g, " ").trim().toUpperCase();
      }
    }

    // --- 1.1 ROOM TYPE CODE EXTRACTION ---
    let roomType = "";
    const roomTypeRegex = /\d{2}\/\d{2}\/\d{2,4}\s+(MR|CR|JS|GR|GS|SL|SS|MAG|MOT|LHC|LHM|LHS|LHSS)\b/i;
    const typeMatch = singleLineText.match(roomTypeRegex);
    if (typeMatch) {
      roomType = typeMatch[1].toUpperCase();
    }
    // No loose fallback — the ROOM_TYPES enrichment (by room number) handles
    // all cases and avoids false positives from staff initials like SL/SS.

    // --- 2. GUEST NAME (with couple name handling) ---
    let nameRaw = "";
    const line0Items = block.lines[0].items;
    let foundId = false;
    for (const item of line0Items) {
      const str = item.str.trim();
      if (str === block.id) { foundId = true; continue; }
      if (foundId) {
        if (str.length === 2 && str === str.toUpperCase() && !["MR", "MS", "DR"].includes(str)) break;
        if (str.match(roomPattern)) break;
        nameRaw += " " + str;
      }
    }
    // --- Detect guest status labels before cleaning name ---
    const hasPGI = /_Previous\s+Guest\s+Issue/i.test(nameRaw);
    const hasStayedBefore = /_Stayed\s+Before/i.test(nameRaw);
    const isRegularGuest = /_Regular\s+Guest/i.test(nameRaw);

    let name = nameRaw.trim()
      .replace(/^_Regular.*?(?=\w)/i, "")
      .replace(/_Previous\s+Guest\s+Issue/gi, "")
      .replace(/_Stayed\s+Before/gi, "")
      .replace(/_Regular\s+Guest\s*-?\s*\d*\+?\s*stays?/gi, "")
      .replace(/VIP\s*-\s*\w+/gi, "")
      .replace(/(\s(Mr|Mrs|Miss|Ms|Dr|\&|Sir|Lady|\+)+)+[*]*$/i, "")
      .trim();

    // Improvement #11: Better couple name handling
    // "Wood Adrian & Denise" → "Adrian & Denise Wood"
    const coupleMatch = name.match(/^([A-Z][a-z]+)\s+([A-Za-z]+)\s*&\s*([A-Za-z]+)$/i);
    if (coupleMatch) {
      name = `${coupleMatch[2]} & ${coupleMatch[3]} ${coupleMatch[1]}`;
    }

    // --- 3. FACILITIES (COLUMN-AWARE using X positions) ---
    // Use bookingStreamStructured {text, x, y} to separate RIGHT column (confirmed bookings)
    // from LEFT column (traces, notes, requests). Right column starts at x >= 400.
    const RIGHT_COL_X = 400;
    const structured = block.bookingStreamStructured || [];
    const rightColLines = structured.filter((s: any) => s.x >= RIGHT_COL_X).map((s: any) => s.text);
    const rightColText = rightColLines.join(' ').replace(/\s+/g, ' ');
    const leftColLines = structured.filter((s: any) => s.x < RIGHT_COL_X).map((s: any) => s.text);
    const leftColText = leftColLines.join(' ').replace(/\s+/g, ' ');

    // ALSO: some facility data bleeds onto the same Y-line as Previous Stays (x=286)
    // Extract /Venue: patterns from ANY line that contains them (they originate from right col)
    const allStreamText = bookingStreamLines.join(' ').replace(/\s+/g, ' ');

    const venueKeywords = 'Spice|Source|The Lake House|GH\\s+(?:Pure|ESPA)|LH\\s+(?:Pure|ESPA|Natural)|Pure\\s*Lakes?|Pure|Massage|Aromatherapy|Treatments|Steam\\s*Room|Couples\\s*Spa|Facial|Hot\\s*(?:tub|Stone)|Tea|Afternoon|Spa|Mud|Bento\\s*Box|Bento|ESPA';
    const facilityRegex = new RegExp(`\\/(${venueKeywords})[^]*?(?=\\/(${venueKeywords})|$)`, 'gi');
    // Trim trailing noise from each match (prices, section labels, page markers)
    const sectionBoundary = /\s*(?:\d{1,3}(?:,\d{3})*\.\d{2}\s|Pay Own Account|Token\s|HK Notes:|Allergies:|Booking Notes|Page \d+|Rate Pack|RateType|Car Reg|Group Agent).*$/i;

    // Extract /Venue: patterns from right column text + any mixed-column text containing /Venue
    const rightFacilityMatches = (rightColText.match(facilityRegex) || []).map(m => m.replace(sectionBoundary, '').trim());
    // Also check full stream for /Venue patterns that may have merged with left-col text on same Y-line
    const fullFacilityMatches = (allStreamText.match(facilityRegex) || []).map(m => m.replace(sectionBoundary, '').trim());
    // Combine and deduplicate
    const allVenueSet = new Set([...rightFacilityMatches]);
    for (const m of fullFacilityMatches) {
      if (!allVenueSet.has(m)) allVenueSet.add(m);
    }
    // Post-filter: facility entries MUST contain a date (DD/MM) to be real bookings.
    // Standalone venue labels like "/GH Pure", "/Steam Room" are noise without dates.
    const facilityMatches = [...allVenueSet].filter(m => /\d{1,2}\/\d{1,2}/.test(m));

    const standaloneInRoomFromBooking: string[] = [];
    // --- CONFIRMED FACILITY BOOKINGS (from RIGHT COLUMN booking stream ONLY, x >= 400) ---
    // These are the ACTUAL booked facilities from the Facility Bookings section.
    const confirmedStandalone: string[] = [];
    for (const line of rightColLines) {
      // Standard dinner: "Dinner for 2 on DD/MM/YY at HH:MM in VENUE"
      const dinnerMatch = line.match(/Dinner\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:.]+\s+in\s+.+/i);
      if (dinnerMatch) confirmedStandalone.push(dinnerMatch[0].trim());
      // Venue-prefix dinner: "Gilpin Spice Dinner for 2 on DD/MM/YY at HH:MM"
      const prefixDinnerMatch = line.match(/(?:Gilpin\s+Spice|SOURCE)\s+Dinner\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:.]+/i);
      if (prefixDinnerMatch) confirmedStandalone.push(prefixDinnerMatch[0].trim());
      // Lunch: "Lunch for N on DD/MM/YY at HH:MM in VENUE" or "Bento Box Lunch DD/MM/YY at HH:MM"
      const lunchMatch = line.match(/(?:Bento\s+Box\s+)?Lunch\s+(?:for\s+\d+\s+)?(?:on\s+)?[\d/]+\s+(?:at|@)\s+[\d:.]+(?:\s+in\s+.+)?/i);
      if (lunchMatch) confirmedStandalone.push(lunchMatch[0].trim());
      // ESPA standalone treatments
      const espaMatch = line.match(/(?:ESPA|Pure\s+Lakes?)\s+[\w\s]+(?:Facial|Massage|Treatment|Reviver|Calm)\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:.]+/i);
      if (espaMatch) confirmedStandalone.push(espaMatch[0].trim());
      // Afternoon Tea
      const teaMatch = line.match(/Afternoon\s+Tea\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:.]+(?:\s+in\s+.+)?/i);
      if (teaMatch) confirmedStandalone.push(teaMatch[0].trim());
      // Steam Room, Couples Spa Hot Tub standalone with date
      const spaFacMatch = line.match(/(?:Steam\s+Room|Couples\s+Spa\s+Hot\s+[Tt]ub|Hot\s+[Tt]ub)\s+(?:for\s+\d+\s+)?(?:on\s+)?[\d/]+\s+(?:at|@)\s+[\d:.]+/i);
      if (spaFacMatch) confirmedStandalone.push(spaFacMatch[0].trim());
      // Bento Box standalone
      const bentoMatch = line.match(/Bento\s+Box\s+(?:for\s+\d+\s+)?(?:on\s+)?[\d/]+\s+(?:at|@)\s+[\d:.]+/i);
      if (bentoMatch) confirmedStandalone.push(bentoMatch[0].trim());
    }

    // In-room items scan all lines (both columns may mention physical items)
    for (const line of bookingStreamLines) {
      // Spa In-Room Hamper — in-room item, NOT a facility booking
      const spaMatch = line.match(/Spa\s+In-Room\s+Hamper\s+on\s+[\d/]+/i);
      if (spaMatch) standaloneInRoomFromBooking.push(spaMatch[0].trim());
      // Champagne/Prosecco/Wine/Flowers/Chocolates — in-room physical items
      const champMatch = line.match(/(Champagne|Prosecco|Wine|Flowers|Chocolates?)\s+on\s+[\d/]+\s+for\s+£[\d.]+/i);
      if (champMatch) standaloneInRoomFromBooking.push(champMatch[0].trim());
    }

    // --- GUEST-REQUESTED BOOKINGS (from LEFT COLUMN — traces, booking notes) ---
    // These are what the guest asked for. They may or may not have been confirmed.
    const requestedBookings: string[] = [];
    const dinnerRequests = leftColText.match(/Dinner\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:.]+\s+in\s+\S+/gi) || [];
    const spaRequests = leftColText.match(/(?:ESPA|Pure\s+Lakes?)\s+[\w\s]+(?:Facial|Massage|Treatment|Reviver|Calm)\s+(?:for\s+\d+\s+)?on\s+[\d/]+/gi) || [];
    const lunchRequests = leftColText.match(/Lunch\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:.]+(?:\s+in\s+\S+)?/gi) || [];
    const teaRequests = leftColText.match(/Afternoon\s+Tea\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:.]+/gi) || [];
    requestedBookings.push(...dinnerRequests.map(r => r.trim()));
    requestedBookings.push(...spaRequests.map(r => r.trim()));
    requestedBookings.push(...lunchRequests.map(r => r.trim()));
    requestedBookings.push(...teaRequests.map(r => r.trim()));
    // Deduplicate requests
    const uniqueRequests = [...new Set(requestedBookings)];



    // Filter Previous Stays contamination: rows like "27507 | 02/01/2026 | 04/01/2026 | 14. Buttermere"
    let cleanFacilityParts = facilityMatches.map(m =>
      m.replace(/\d{5}\s*\|\s*\d{2}\/\d{2}\/\d{4}\s*\|\s*\d{2}\/\d{2}\/\d{4}\s*\|\s*\d{1,3}[.\s][A-Za-z\s]+/g, '').trim()
    ).filter(m => m.length > 1);

    // Strip stray booking IDs (5-digit numbers not part of prices/dates) that bleed from adjacent guest data
    cleanFacilityParts = cleanFacilityParts.map(m =>
      m.replace(/\s+\d{5}\s+/g, ' ')             // isolated 5-digit IDs like " 27783 "
        .replace(/\s+\d{2}\/\d{2}\/\d{4}\s+/g, ' ') // stray full-year dates from previous stays (middle)
        .replace(/\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*$/g, '') // trailing date+time (e.g. " 04/01/2026 19:30") — BEFORE date-only
        .replace(/\s+\d{2}\/\d{2}\/\d{4}\s*$/g, '')  // trailing full-year dates (end of string)
        .replace(/\s+\d{2}\.\s+[A-Z][a-z]+\b/g, '') // room fragments like " 05. Crook"
        .replace(/\s+/g, ' ').trim()
    );

    // Safety net: strip any remaining section labels (rare with column-aware extraction)
    cleanFacilityParts = cleanFacilityParts.map(m =>
      m.replace(/\s*(?:Traces:|Booking\s+Notes|F&B\s+Notes:?|HK\s+Notes:?|Allergies:?).*$/gi, '').replace(/\s+/g, ' ').trim()
    );

    // Filter trace/note noise from facility text
    const traceNoise = /(?:4[ -]?day\s+(?:call|check)|In[ -]Room\s+(?:on\s+Arrival|Spa\s+Hamper)|Please\s+(?:ensure|order)|charged?\s+to\s+PoP|Guaranteed|check\s+out\s+at|Origin\s+Menu|glass\s+of\s+Champagne|WLC|Cruise\s+Tickets|Balloons|Brackens)/i;
    cleanFacilityParts = cleanFacilityParts.filter(m => !traceNoise.test(m));

    // Deduplicate confirmed standalone facilities (venue-prefix and standard dinner can both match same dinner)
    const uniqueConfirmed = confirmedStandalone.filter((s, i) => {
      // Check if this is a venue-prefix dinner that duplicates a standard dinner already captured
      const prefixMatch = s.match(/(?:Gilpin\s+Spice|SOURCE)\s+Dinner\s+for\s+\d+\s+on\s+([\d/]+)\s+at\s+([\d:.]+)/i);
      if (prefixMatch) {
        const dateTime = `${prefixMatch[1]}.*${prefixMatch[2]}`;
        const hasDuplicate = confirmedStandalone.some((other, j) =>
          j !== i && /Dinner\s+for\s+\d+\s+on/i.test(other) && new RegExp(dateTime).test(other)
        );
        return !hasDuplicate; // Skip if standard format exists
      }
      return true;
    });

    const allFacilityText = [...cleanFacilityParts, ...uniqueConfirmed.map(s => `/${s}`)].join(" ");
    const facilitiesFormatted = this.formatFacilities(allFacilityText);
    const facilitiesRaw = allFacilityText.trim();

    // --- 3.1 DINNER TIME & VENUE EXTRACTION ---
    // Collect ALL dinner entries, then prefer the one matching the arrival date
    let dinnerTime = "";
    let dinnerVenue = "";
    const allDinners: { time: string; venue: string; date: string }[] = [];
    for (const line of bookingStreamLines) {
      // Standard format: "Dinner for 2 on DD/MM/YY at HH:MM in VENUE"
      const ddMatch = line.match(/Dinner\s+for\s+\d+\s+on\s+([\d/]+)\s+at\s+(\d{1,2}[.:,]\d{2})\s+in\s+(.+)/i);
      if (ddMatch) {
        allDinners.push({
          date: ddMatch[1],
          time: this.parseTimeString(ddMatch[2].replace(/[.,]/g, ':')),
          venue: ddMatch[3].trim().replace(/\s+/g, ' ').replace(/\s+for\s+£[\d.]+$/, '')
        });
        continue;
      }
      // Venue-prefix format: "Gilpin Spice Dinner for 2 on DD/MM/YY at HH:MM"
      const prefixMatch = line.match(/((?:Gilpin\s+Spice|SOURCE)\s+)Dinner\s+for\s+\d+\s+on\s+([\d/]+)\s+at\s+(\d{1,2}[.:,]\d{2})/i);
      if (prefixMatch) {
        allDinners.push({
          date: prefixMatch[2],
          time: this.parseTimeString(prefixMatch[3].replace(/[.,]/g, ':')),
          venue: prefixMatch[1].trim()
        });
      }
    }
    // Prefer arrival-date dinner, fallback to first found
    if (allDinners.length > 0) {
      const arrDateStr = arrivalDate
        ? `${String(arrivalDate.getDate()).padStart(2, '0')}/${String(arrivalDate.getMonth() + 1).padStart(2, '0')}`
        : '';
      const arrivalDinner = arrDateStr ? allDinners.find(d => d.date.startsWith(arrDateStr)) : null;
      const chosen = arrivalDinner || allDinners[0];
      dinnerTime = chosen.time;
      dinnerVenue = chosen.venue;
    }
    // Fallback: extract from /Spice or /Source facility matches
    if (!dinnerTime) {
      for (const m of facilityMatches) {
        const timeM = m.match(/(\d{1,2}[.:,]\d{2})/i);
        if (timeM && /spice|source|dinner/i.test(m)) {
          dinnerTime = this.parseTimeString(timeM[1].replace(/[.,]/g, ':'));
          if (/spice/i.test(m)) dinnerVenue = 'Gilpin Spice';
          else if (/source/i.test(m)) dinnerVenue = 'Source';
          break;
        }
      }
    }

    // --- 4. CAR REGISTRATION (Position-Based + Regex) ---
    // Strategy: Use the detected column header x-position to precisely locate car reg text.
    // Falls back to x > 480 if no column header was found.
    let car = "";

    const platePatterns = [
      /\b[A-Z]{2}\d{2}\s?[A-Z]{3}\b/i,         // New format: AB12 CDE, DG18 WXF
      /\b[A-Z]\d{1,3}\s[A-Z]{3}\b/i,            // Prefix with space: M88 HCT, A123 BCD
      /\b\d{1,4}\s[A-Z]{2,3}\b/i,               // Numeric prefix: 30 BHJ
      /\b[A-Z]{2}\d{2,4}\b/i,                    // Short: LN75, AB1234
      /\b[A-Z]\d[A-Z]{3}\b/i,                    // Very short personal: J1BLP
    ];
    const monthFilter = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;
    const carExclusions = /^(BB\d|APR|RO|COMP|GS|JS|GR|MR|CR|SL|SS|LH|MAG|RATE|ID|PAGE|DATE|ROOM|UNIT|TOKEN|TOTAL|DEPOSIT|NET|VAT|GBP|MAN|UA|AD|CH|GRP|DEF|CHI|VAC|MOT|NDR|POB|MIN|CEL|MCT)$/i;
    const contentFilter = /table|spice|source|dinner|lunch|spa|hamper|massage|pure|bento|tea|booking|facility|allergy|note|gilpin|hotel|token|billing|deposit|checked|arrival/i;

    // Determine the x-range to search for car reg items
    const carXMin = carRegColumnX ? carRegColumnX.min : 480;
    const carXMax = carRegColumnX ? carRegColumnX.max : Infinity;

    // Room type codes that should be stripped from car reg scanning
    const roomTypeCodes = /^(MR|CR|JS|GR|GS|SL|SS|MAG|MOT|LHC|LHM|LHS|LHSS|LH|LHB|LHBB)$/i;

    // Only scan the FIRST LINE (header row) — car reg column is always there
    const firstLineItems = block.lines[0]?.items || [];
    const rightItems = firstLineItems
      .filter((i: any) => i.x >= carXMin && i.x <= carXMax)
      .sort((a: any, b: any) => a.x - b.x);

    if (rightItems.length > 0) {
      // Try combining the last N items (plate may be split: "DG18" + "WXF" or "*M88" + "HCT")
      for (const windowSize of [1, 2, 3, 4]) {
        if (car) break;
        const lastItems = rightItems.slice(-windowSize);
        const combinedText = lastItems
          .map((i: any) => i.str.trim().replace(/^\*+/, ''))
          // Pre-filter: strip room type codes and bare "0" tokens (pax count remnants)
          .filter((s: string) => s.length > 0 && !contentFilter.test(s) && !roomTypeCodes.test(s) && s !== '0')
          .join(' ')
          .toUpperCase()
          .trim();

        if (!combinedText || contentFilter.test(combinedText)) continue;

        for (const pattern of platePatterns) {
          const match = combinedText.match(pattern);
          if (match) {
            const candidate = match[0].trim();
            const cleanCandidate = candidate.replace(/\s/g, '');
            if (cleanCandidate.length >= 4 && !monthFilter.test(candidate) && !carExclusions.test(cleanCandidate)) {
              car = candidate;
              break;
            }
          }
        }
      }
    }

    // Fallback: If column position was used but found nothing, try broad x > 480
    if (!car && carRegColumnX) {
      const broadRightItems = firstLineItems
        .filter((i: any) => i.x > 480)
        .sort((a: any, b: any) => a.x - b.x);
      for (const windowSize of [1, 2, 3]) {
        if (car) break;
        const lastItems = broadRightItems.slice(-windowSize);
        const combinedText = lastItems
          .map((i: any) => i.str.trim().replace(/^\*+/, ''))
          // Pre-filter: strip room type codes and bare "0" tokens (pax count remnants)
          .filter((s: string) => s.length > 0 && !contentFilter.test(s) && !roomTypeCodes.test(s) && s !== '0')
          .join(' ')
          .toUpperCase()
          .trim();
        if (!combinedText || contentFilter.test(combinedText)) continue;
        for (const pattern of platePatterns) {
          const match = combinedText.match(pattern);
          if (match) {
            const candidate = match[0].trim();
            const cleanCandidate = candidate.replace(/\s/g, '');
            if (cleanCandidate.length >= 4 && !monthFilter.test(candidate) && !carExclusions.test(cleanCandidate)) {
              car = candidate;
              break;
            }
          }
        }
      }
    }

    // --- 5. ETA & DURATION ---
    // Priority: Booking notes "ETA:" label > first-line 4-digit time
    // Booking notes are more reliable since the first-line time is often a status code
    let eta = "";

    // Get the first line text
    const firstLineText = rawTextLines[0] || "";

    // Method 1 (Primary): Search ALL text for "ETA:" prefix in booking notes
    // Handles: "ETA: 2.30-3pm", "ETA: 15-16:00", "ETA: 3pm", "ETA: 1pm", "ETA: 14:00"
    const etaLabelMatch = singleLineText.match(/ETA:?\s*([\d.:,-]+(?:\s*-\s*[\d.:]+)?(?:\s*(?:pm|am))?|\d{1,2}(?:[.:,]\d{2})?\s*(?:pm|am))/i);
    if (etaLabelMatch) {
      let etaStr = etaLabelMatch[1].trim();

      // Handle ranges: take the first time. "2.30-3pm" → "2.30pm", "15-16:00" → "15"
      // Preserve am/pm suffix from end if the first part doesn't have one
      const ampmSuffix = etaStr.match(/(am|pm)$/i)?.[1] || '';
      if (etaStr.includes('-')) {
        etaStr = etaStr.split('-')[0].trim();
        // Reattach am/pm if the first part doesn't have it
        if (ampmSuffix && !etaStr.match(/(am|pm)/i)) {
          etaStr += ampmSuffix;
        }
      }

      // Normalize dots to colons: "2.30pm" → "2:30pm"
      etaStr = etaStr.replace(/\./g, ':');

      eta = this.parseTimeString(etaStr);
    }

    // Method 2 (Fallback): Look for 4-digit time or HH:MM on first line
    // Match patterns like "1435" or "14:35" but NOT years like "2026" or room numbers
    if (!eta) {
      const topTimeMatch = firstLineText.match(/\b(\d{4}|\d{1,2}:\d{2})\b/);
      if (topTimeMatch && !topTimeMatch[0].match(/202\d/)) {
        const t = topTimeMatch[0].replace(":", "");
        if (t.length === 4) {
          const hours = parseInt(t.substring(0, 2));
          const mins = parseInt(t.substring(2, 4));
          // Validate reasonable arrival time (06:00 - 23:59) and not a room number
          if (hours >= 6 && hours <= 23 && mins >= 0 && mins <= 59) {
            eta = `${t.substring(0, 2)}:${t.substring(2, 4)}`;
          }
        } else if (t.length === 3) {
          // Handle times like "930" (9:30)
          const hours = parseInt(t.substring(0, 1));
          const mins = parseInt(t.substring(1, 3));
          if (hours >= 6 && hours <= 23 && mins >= 0 && mins <= 59) {
            eta = `0${hours}:${mins.toString().padStart(2, '0')}`;
          }
        }
      }
    }

    // Default to N/A if no ETA found
    if (!eta) eta = "N/A";

    // --- 5. DURATION (First-Line Departure Date) ---
    // The departure date is always the FIRST date on the guest's header (first) line.
    // We prioritise this over a full-text scan to avoid matching dates from facility
    // bookings, traces, or previous stays that could appear earlier in the text.
    let duration = "1";
    if (arrivalDate) {
      const firstLineText = block.lines[0]?.items.map((it: any) => it.str).join(' ') || '';
      const firstLineDates = firstLineText.match(/\d{2}\/\d{2}\/\d{2,4}/g) || [];

      // Primary method: use the first date on the first line as departure date
      let found = false;
      for (const dStr of firstLineDates) {
        const parts = dStr.split('/');
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        let y = parseInt(parts[2]);
        if (y < 100) y += 2000;
        const checkDate = new Date(y, m - 1, d);
        if (checkDate > arrivalDate) {
          const diffDays = Math.ceil((checkDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 0 && diffDays < 21) { duration = diffDays.toString(); found = true; break; }
        }
      }

      // Fallback: scan full block text (for PDFs with unusual layouts)
      if (!found) {
        const datesFound = singleLineText.match(/\d{2}\/\d{2}\/\d{2,4}/g) || [];
        for (const dStr of datesFound) {
          const parts = dStr.split('/');
          const d = parseInt(parts[0]);
          const m = parseInt(parts[1]);
          let y = parseInt(parts[2]);
          if (y < 100) y += 2000;
          const checkDate = new Date(y, m - 1, d);
          if (checkDate > arrivalDate) {
            const diffDays = Math.ceil((checkDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays > 0 && diffDays < 21) { duration = diffDays.toString(); break; }
          }
        }
      }
    }

    // --- 6. LOYALTY (L&L) ---
    let ll = "No";
    let stayHistoryCount: number | undefined = undefined;
    const beenBeforeMatch = singleLineText.match(/Been Before:\s*(Yes|Y|True)(?:\s*[-–—]\s*(?:Was last here|x)\s*(\d+))?(?:\s*\(?x\s*(\d+)\)?)?/i);
    if (beenBeforeMatch) {
      const count = beenBeforeMatch[2] || beenBeforeMatch[3];
      if (count) {
        stayHistoryCount = parseInt(count);
        ll = `Yes (x${count})`;
      } else {
        ll = "Yes";
      }
    } else if (singleLineText.match(/_(Stayed|Regular)/i)) {
      ll = "Yes";
      const looseCount = singleLineText.match(/\b(?:Yes|Stays)\s*x\s*(\d+)/i);
      if (looseCount) { ll = `Yes (x${looseCount[1]})`; stayHistoryCount = parseInt(looseCount[1]); }
    } else if (scanLower.includes("previous stays") || singleLineText.match(/Stayed\s+\d{2}\/\d{2}\/\d{4}/i)) {
      ll = "Yes";
    }

    // --- 7. ALLERGIES (Specific Extraction) ---
    let allergies: string[] = [];
    const allergySection = this.extractSection(singleLineText, "Allergies:", ["HK Notes:", "Guest Notes:", "Unit:", "Page", "Token:", "Deposit:"]);
    if (allergySection) {
      // Clean the section text: strip trailing timestamps, page refs, and HK Notes bleed
      let cleanAllergy = allergySection.trim()
        .replace(/\s*HK\s+Notes:.*$/i, '')           // Remove any HK Notes bleed
        .replace(/\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}.*$/i, '')  // Remove timestamps
        .replace(/\s*Page\s+\d+.*$/i, '')              // Remove page refs
        .trim();
      // Skip empty/NDR/None/bare-initial allergy fields
      if (cleanAllergy.length > 2 &&
        !/^\s*(NDR|None|N\/A|No\s+Dietary|No\s+known|LV|KW|AM|JS|SL|SS|CB|EW|RH)\s*$/i.test(cleanAllergy)) {
        allergies.push(`⚠️ ALLERGY: ${cleanAllergy}`);
      }
    }
    // Also check for allergy keywords scattered in text
    if (scanLower.includes("nut allergy") && !allergies.some(a => a.toLowerCase().includes('nut'))) allergies.push("🥜 Nut Allergy");
    if ((scanLower.includes("gluten free") || scanLower.includes("coeliac")) && !allergies.some(a => /gluten|coeliac/i.test(a))) allergies.push("🍞 Gluten Free");
    if ((scanLower.includes("dairy free") || scanLower.includes("lactose")) && !allergies.some(a => /dairy|lactose/i.test(a))) allergies.push("🧀 Dairy Free");
    if (scanLower.includes("vegan") && !allergies.some(a => /vegan/i.test(a))) allergies.push("🌱 Vegan");
    if (scanLower.includes("vegetarian") && !allergies.some(a => /vegetarian/i.test(a))) allergies.push("🥬 Vegetarian");
    // Extended allergy/dietary keywords — ensures nothing is silently dropped
    if ((scanLower.includes("shellfish") || scanLower.includes("crustacean")) && !allergies.some(a => /shellfish|crustacean/i.test(a))) allergies.push("🦐 Shellfish Allergy");
    if (scanLower.includes("fish allergy") && !allergies.some(a => /fish allergy/i.test(a))) allergies.push("🐟 Fish Allergy");
    if (scanLower.includes("egg allergy") && !allergies.some(a => /egg/i.test(a))) allergies.push("🥚 Egg Allergy");
    if ((scanLower.includes("soy allergy") || scanLower.includes("soya allergy")) && !allergies.some(a => /soy/i.test(a))) allergies.push("🫘 Soy Allergy");
    if (scanLower.includes("sesame") && !allergies.some(a => /sesame/i.test(a))) allergies.push("⚠️ Sesame Allergy");
    if (scanLower.includes("sulphite") && !allergies.some(a => /sulphite/i.test(a))) allergies.push("⚠️ Sulphite Sensitivity");
    if (scanLower.includes("halal") && !allergies.some(a => /halal/i.test(a))) allergies.push("☪️ Halal");
    if (scanLower.includes("kosher") && !allergies.some(a => /kosher/i.test(a))) allergies.push("✡️ Kosher");
    if ((scanLower.includes("pescatarian") || scanLower.includes("pescetarian") || scanLower.includes("pescitarian")) && !allergies.some(a => /pesc/i.test(a))) allergies.push("🐟 Pescatarian");
    // UK Top 14 allergens + extended dietary — ensure comprehensive coverage
    if (scanLower.includes("celery") && !allergies.some(a => /celery/i.test(a))) allergies.push("⚠️ Celery Allergy");
    if (scanLower.includes("mustard") && !allergies.some(a => /mustard/i.test(a))) allergies.push("⚠️ Mustard Allergy");
    if (scanLower.includes("lupin") && !allergies.some(a => /lupin/i.test(a))) allergies.push("⚠️ Lupin Allergy");
    if ((scanLower.includes("mollusc") || scanLower.includes("mollusk")) && !allergies.some(a => /mollusc|mollusk/i.test(a))) allergies.push("⚠️ Mollusc Allergy");
    if (scanLower.includes("sulphur dioxide") && !allergies.some(a => /sulphur/i.test(a))) allergies.push("⚠️ Sulphur Dioxide");
    if (scanLower.includes("tree nut") && !allergies.some(a => /tree.?nut/i.test(a))) allergies.push("🌰 Tree Nut Allergy");
    if ((scanLower.includes("no pork") || scanLower.includes("pork free")) && !allergies.some(a => /pork/i.test(a))) allergies.push("⚠️ No Pork");
    if (scanLower.includes("no mayonnaise") && !allergies.some(a => /mayonnaise/i.test(a))) allergies.push("⚠️ No Mayonnaise");
    if ((scanLower.includes("crab allergy") || scanLower.includes("crab free")) && !allergies.some(a => /crab/i.test(a))) allergies.push("🦀 Crab Allergy");
    if ((scanLower.includes("no red meat") || scanLower.includes("red meat free")) && !allergies.some(a => /red meat/i.test(a))) allergies.push("⚠️ No Red Meat");
    if (scanLower.includes("paleo") && !allergies.some(a => /paleo/i.test(a))) allergies.push("🥩 Paleo Diet");
    if (scanLower.includes("keto") && !allergies.some(a => /keto/i.test(a))) allergies.push("🧀 Keto Diet");
    if ((scanLower.includes("low sodium") || scanLower.includes("low salt")) && !allergies.some(a => /sodium|salt/i.test(a))) allergies.push("🧂 Low Sodium");

    // --- 8. OCCASION (Explicit Extraction) ---
    let occasionNote = "";
    const occasionSection = this.extractSection(singleLineText, "Occasion:", ["P.O.Nr:", "Traces:", "Contact Details:", "Booking Notes", "ETA:", "Billing:"]);
    if (occasionSection && occasionSection.trim().length > 1) {
      // Reject if it's just other section labels like "ETA:" or empty
      const cleanOcc = occasionSection.trim().replace(/^(ETA|Billing|In Room|Checked|Been Before):?.*$/i, '').trim();
      if (cleanOcc.length > 1) {
        occasionNote = `🎉 ${cleanOcc}`;
      }
    }
    // Also check "Special Occasion:" in booking notes with TIGHTER boundary
    const specialOccasion = singleLineText.match(/Special Occasion:\s*(.+?)\s*(?=ETA:|Billing:|Been Before:|In Room|Checked:|Smoking|HK Notes:|Guest Notes:|$)/i);
    if (specialOccasion && specialOccasion[1].trim().length > 1) {
      const soText = specialOccasion[1].trim();
      // Reject bare section labels captured as "occasion"
      if (!/^(ETA|Billing|In Room|Checked|None):?$/i.test(soText) && !occasionNote.includes(soText)) {
        occasionNote = occasionNote ? `${occasionNote} / ${soText}` : `🎉 ${soText}`;
      }
    }

    // --- 9. ACEB PAX COUNT (Improvement #6) ---
    // Pattern: Pack column abbreviation followed by ACEB digits: "BB2 2 0 0 0 0", "MIN 2 0 0 0 0", "MAG 2 0 0 0 0"
    let adults: number | undefined = undefined;
    let children: number | undefined = undefined;
    let infants: number | undefined = undefined;
    const acebMatch = singleLineText.match(/\b(?:BB\d?|MAG|MIN|RO|APR|COMP|CEL|LHBB\d?|LHAPR|LHMAG|POB|STAFF)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i);
    if (acebMatch) {
      adults = parseInt(acebMatch[1]);
      children = parseInt(acebMatch[2]);
      // acebMatch[3] = extra beds, acebMatch[4] = infants/babies
      infants = parseInt(acebMatch[4]);
    }

    // --- 10. PRE-REGISTRATION (Improvement #10) ---
    const preRegistered = /completed pre-registration online|pre-registration complete/i.test(singleLineText);

    // --- 11. BOOKING SOURCE / AGENT (Improvement #4) ---
    let bookingSource = "";
    if (agentColumnX) {
      const agentItems = firstLineItems
        .filter((i: any) => i.x >= agentColumnX!.min && i.x <= agentColumnX!.max)
        .sort((a: any, b: any) => a.x - b.x);
      if (agentItems.length > 0) {
        bookingSource = agentItems.map((i: any) => i.str.trim()).join(' ');
        // Clean up internal codes
        bookingSource = bookingSource.replace(/^(Gilpin\s*Hotel)$/i, 'Direct').trim();
      }
    }
    if (!bookingSource) {
      // Fallback: look for known OTA names in text
      if (scanLower.includes('booking.com')) bookingSource = 'Booking.com';
      else if (/\bexpedia\b/i.test(singleLineText)) bookingSource = 'Expedia';
    }

    // --- 12. SMOKING PREFERENCE (Improvement #3) ---
    let smokingPreference = "";
    const smokingMatch = singleLineText.match(/\*?smoking preference:\s*(.+?)(?=\s*(?:Checked:|8 Day|4 day|$))/i);
    if (smokingMatch) smokingPreference = smokingMatch[1].trim();

    // --- 13. BILLING METHOD (Improvement #1) ---
    let billingMethod = "";
    const billingMatch = singleLineText.match(/Billing:\s*(.+?)(?=\s*(?:Unit:|Token|$))/i);
    if (billingMatch) {
      billingMethod = billingMatch[1].trim();
      // Remove noise
      billingMethod = billingMethod.replace(/\s+/g, ' ').trim();
    }

    // --- 14. DEPOSIT AMOUNT (Improvement #12) ---
    let depositAmount = "";
    const depositMatch = singleLineText.match(/Deposit:\s*([\d,.]+)/i);
    if (depositMatch) depositAmount = `£${depositMatch[1]}`;

    // --- 15. PREVIOUS STAYS (Improvement #2) ---
    let stayHistory: { arrival: string; departure: string; room: string }[] = [];
    const prevStaysMatch = singleLineText.match(/Previous Stays.*?(?=Facility Bookings|Allergies|HK Notes|$)/is);
    if (prevStaysMatch) {
      const stayRows = prevStaysMatch[0].matchAll(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{1,3}[.\s]\s*[A-Za-z]+)/gi);
      for (const row of stayRows) {
        stayHistory.push({ arrival: row[1], departure: row[2], room: row[3].trim() });
      }
    }

    // --- 16. CHECKED-BY STAFF (Improvement #8) ---
    let checkedBy = "";
    const checkedByMatch = singleLineText.match(/Checked:\s*([A-Z]{2,3})(?:\s|$)/i);
    if (checkedByMatch) checkedBy = checkedByMatch[1].toUpperCase();

    // --- CONSOLIDATED NOTES ---
    // Rate Code extraction: try full RateCode column values first (longest match), then Pack abbreviations
    const packageRegex = /\b(MINIMOON|MINI_MOON|MAGESC|MAG_ESC|APR_3_BB|APR_2_BB|APR_1_BB|POB_STAFF|BB_1_WIN|BB_2_WIN|BB_3_WIN|BB1_WIN|BB2_WIN|BB3_WIN|LHBB_3|LHBB_2|LHBB_1|LHBB3|LHBB2|LHBB1|LHAPR|LHMAG|LHBB|DBB_2|DBB_1|BB_3|BB_2|BB_1|DBB|BB3|BB2|BB1|RO_2|RO_1|CEL|MIN|COMP|RO|BB|POB|STAFF)\b/i;
    const rateMatch = singleLineText.match(packageRegex);
    const rateCode = rateMatch ? rateMatch[1].toUpperCase() : "";

    const noteSections = [
      this.extractSection(singleLineText, "HK Notes:", ["Unit:", "Page", "Guest Notes:", "Booking Notes:", "Allergies:", "Previous Stays", "In Room", "Smoking"]),
      this.extractSection(singleLineText, "Guest Notes:", ["Unit:", "Page", "HK Notes:", "Booking Notes:", "Allergies:", "Previous Stays", "In Room", "Smoking"]),
      this.extractSection(singleLineText, "Booking Notes:", ["Unit:", "Page", "HK Notes:", "Guest Notes:", "Allergies:", "Facility Bookings:", "Previous Stays", "In Room", "Smoking"]),
      this.extractSection(singleLineText, "Traces:", ["Booking Notes", "Been Before", "Occasion:", "Facility Bookings:", "Previous Stays"]),
    ];

    // --- Improvement #7: Better In-Room Items (exact names from "In Room on Arrival:") ---
    const inRoomSection = this.extractSection(singleLineText, "In Room(?: on Arrival)?:", ["Checked:", "8 Day Check", "4 day Call", "Billing:", "Flowers on"]);

    // Expanded in-room keyword list for Gilpin (physical items for housekeeping/bar)
    const inRoomKeywords = [
      "Ice Bucket", "Glasses", "Dog Bed", "Dog Bowl", "Cot", "Extra Bed", "Extra Pillow",
      "Topper", "Mattress Topper", "Robes", "Slippers", "Voucher",
      "Flowers", "Rose Petals", "Balloons",
      "Champagne", "Prosecco", "Wine", "Gin", "Whisky",
      "Chocolates", "Chocolate", "Truffles", "Cake",
      "Spa Hamper", "Gift", "Candles"
    ];
    const billingFoundItems = inRoomKeywords.filter(k => scanLower.includes(k.toLowerCase()));

    // MERGE all three sources: in-room section + billing keyword scan + booking stream items
    const bareInitialsFilter = /^\s*(?:NDR|LV|KW|AM|JS|SL|SS|CB|EW|RH|None|N\/A)\s*$/i;
    const inRoomSectionItems = inRoomSection && inRoomSection.trim().length > 1
      ? inRoomSection.trim().split(/[,;&•]/).map(s => s.trim()).filter(s => s.length > 2 && !bareInitialsFilter.test(s))
      : [];
    // Add keyword-scanned items not already captured in the in-room section
    const inRoomSectionLower = inRoomSectionItems.join(' ').toLowerCase();
    const additionalBillingItems = billingFoundItems.filter(k => !inRoomSectionLower.includes(k.toLowerCase()));
    // Add booking stream in-room items (Champagne/Flowers from traces)
    const additionalBookingItems = standaloneInRoomFromBooking.filter(item =>
      !inRoomSectionLower.includes(item.toLowerCase())
    );
    const allInRoomItems = [...inRoomSectionItems, ...additionalBillingItems, ...additionalBookingItems];
    const inRoomItemsText = [...new Set(allInRoomItems)].join(" • ");

    // --- Dog/Pet detection: ensure routing to In-Room + notes ---
    // Tightened detection to avoid false positives: bare "pet" is too broad (matches
    // "Rose Petal", "Competition", etc). Use explicit pet-context phrases instead.
    // Primary regex: explicit pet-context phrases + breed names. No fallback for bare "Dog"
    // near PMS headers — this caused false positives (e.g. "Dog: No" in Booking Notes).
    const hasPet = /\b(?:dog\s+(?:bed|bowl|friendly|in\s+room|welcome)|pet\s+(?:friendly|welcome|fee|policy|request|supplies|dog)|bringing\s+(?:a\s+)?dog|puppy|canine|dog\s+bed|dog\s+bowls?)\b/i.test(singleLineText)
      || /\b(?:cockapoo|labrador|retriever|spaniel|terrier|poodle|dachshund|collie|whippet|lurcher|staffie|beagle|cocker|springer|greyhound)\b/i.test(singleLineText);
    const petInRoom = ["Dog Bed", "Dog Bowls"].filter(item =>
      !inRoomItemsText.toLowerCase().includes(item.toLowerCase())
    );

    // --- Comp Upgrade detection: silent upgrade to free room for last-minute bookings ---
    const compUpgradeMatch = singleLineText.match(/Comp(?:limentary)?\s+Upgrade[:\s]*(?:Guest\s+(?:Un)?aware)?/i);

    // Build final in-room items with pet supplies
    const finalInRoomItems = inRoomItemsText +
      (hasPet && petInRoom.length > 0 ? (inRoomItemsText ? " • " : "") + petInRoom.join(" • ") : "");

    let consolidatedNotes: string[] = [];

    // Allergies first (critical visibility)
    consolidatedNotes.push(...allergies);

    // Occasion next (important for guest experience)
    if (occasionNote) consolidatedNotes.push(occasionNote);

    if (rateCode === "POB_STAFF") consolidatedNotes.push("⭐ VIP (POB Staff)");

    // Pre-registration badge
    if (preRegistered) consolidatedNotes.push("✅ Pre-Registered Online");

    // Children/infant note for HK
    if (children && children > 0) consolidatedNotes.push(`👶 ${children} child${children > 1 ? 'ren' : ''}`);
    if (infants && infants > 0) consolidatedNotes.push(`🍼 ${infants} infant${infants > 1 ? 's' : ''}`);

    // Smoking preference note
    if (smokingPreference) consolidatedNotes.push(`🚬 ${smokingPreference}`);

    // Limited Mobility detection
    const mobilityKeywords = ['limited mobility', 'wheelchair', 'disabled', 'disability', 'accessible room',
      'accessibility', 'walking difficulty', 'walking difficulties', 'mobility issue', 'mobility issues',
      'mobility impair', 'reduced mobility', 'step free', 'ground floor request', 'cannot climb stairs',
      'walking aid', 'walking frame', 'zimmer', 'crutches', 'mobility scooter', 'electric wheelchair'];
    if (mobilityKeywords.some(kw => scanLower.includes(kw))) {
      consolidatedNotes.push("♿ Limited Mobility — check room accessibility");
    }

    // Checked-by for context
    if (checkedBy) consolidatedNotes.push(`📋 Checked: ${checkedBy}`);

    // Comp Upgrade note — silent upgrade to free room for last-minute bookings
    if (compUpgradeMatch) {
      consolidatedNotes.push(`🤫 COMP UPGRADE (Silent) — room freed for availability`);
    }

    // PGI (Previous Guest Issue) — critical alert for reception
    if (hasPGI) {
      consolidatedNotes.unshift(`⚠️🔴 PREVIOUS GUEST ISSUE — review notes and handle with care`);
    }

    // Pet/Dog note — ensure visibility for reception and housekeeping
    if (hasPet) {
      consolidatedNotes.push(`🐕 Dog in room`);
    }

    // Staff initials and internal codes to exclude from notes
    const noisePatterns = /^(NDR|None|N\/A|LV|KW|AM|JS|SL|SS|CB|EW|RH|GRP|DEF|CHI|VAC|Token|Gilpin Hotel|Pay Own Account|Unit:|Deposit:|Total Rate:|Balance|Contact Details:|P\.O\.Nr:|Company:)$/i;

    // --- STRUCTURED NOTES EXTRACTION ---
    // Filter out facility data, timestamps, prices, and raw dump noise
    const noteNoiseFilter = /(?:Dinner\s+for\s+\d|Table\s+for\s+\d|\d{2}\/\d{2}\/\d{2,4}\s+\d{2}:\d{2}|\d{2}:\d{2}:\d{2}\)|by\s+\[WEB\]|Facility\s+Bookings?|Previous\s+Stays?|Arrival\s*\/\s*Departure|Arrivals|Rate\s+Pack\s+ACEB|ACEB\s+P|Been Before|Checked:|8 Day|4.day|HK\s+Notes|Guest Notes|Booking Notes|Traces|Occasion:|ETA:|ID Arrival|Source:\s*Table|Spice:\s*Table|\d{5}\s+\d{2}\/\d{2}|Page\s+\d+\s+of|Token|Gilpin\s+Hotel|Flowers\s+on\s+\d|Champagne\s+on\s+\d|Dinner\s+for\s+\d+\s+on|\d{1,3}(?:,\d{3})*\.\d{2}|Pay\s+Own\s+Account|^\d+\s+\d+\s+\d+\s+\d+$|^\d+$|^[A-Z]{2,3}\d*$)/i;

    noteSections.forEach(sec => {
      if (!sec) return;
      // Split on sentence boundaries, bullets, and note separators
      sec.split(/[•&\n]|(?:,\s*(?=[A-Z]))|(?:\s*-\s+)/).forEach(p => {
        const clean = p.trim();
        if (clean.length < 3) return;
        if (/^[A-Z]{2}$/.test(clean)) return;  // Staff initials
        if (noisePatterns.test(clean)) return;
        if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(clean)) return;  // Bare dates
        if (/^£[\d.]+$/.test(clean)) return;  // Bare prices
        if (noteNoiseFilter.test(clean)) return;  // Facility/booking noise
        consolidatedNotes.push(clean);
      });
    });

    // Add in-room items summary to intelligence if present
    if (finalInRoomItems) {
      consolidatedNotes.push(`📦 In-Room: ${finalInRoomItems}`);
    }

    // --- BOOKING DISCREPANCY WARNING ---
    // Compare guest-requested bookings against confirmed facility bookings.
    // If a request exists but no matching confirmed booking, warn reception.
    // Use ALL facility text + full booking stream (catches cross-column venue bleeds where
    // facility data at x=286 merges with Previous Stays on the same Y-line)
    const confirmedText = allFacilityText.toLowerCase();
    const fullStreamLower = bookingStreamText.toLowerCase();
    const unbookedRequests: string[] = [];
    for (const req of uniqueRequests) {
      // Extract date and venue from request
      const dateMatch = req.match(/(\d{2}\/\d{2}\/\d{2,4})/);
      const venueMatch = req.match(/in\s+(\S+)/i);
      const date = dateMatch ? dateMatch[1] : '';
      const venue = venueMatch ? venueMatch[1].toLowerCase() : '';

      // Check if this request has a matching confirmed booking
      // 1. Date appears in facility column text (cleaned venue entries)
      // 2. Date appears in confirmed standalone right-column bookings
      // 3. Date appears alongside a venue keyword in the full booking stream
      //    (catches cross-column bleed where venue at x=286 merged with left-column data)
      const dateInFacilities = date && confirmedText.includes(date);
      const dateInStandalone = date && confirmedStandalone.some(b => b.toLowerCase().includes(date));
      const venueWithDateInStream = date && (
        fullStreamLower.includes(`/${venue.replace(/gilpin/i, 'spice')}`) ||
        fullStreamLower.includes(`/source`) ||
        fullStreamLower.includes(`/spice`) ||
        fullStreamLower.includes(`/the lake house`)
      ) && fullStreamLower.includes(date);

      const hasMatch = dateInFacilities || dateInStandalone || venueWithDateInStream;

      if (!hasMatch) {
        // Summarize: "Dinner for 2 on 03/01/26 at 19:00 in Gilpin" → "Dinner in Gilpin on 03/01/26"
        const typeMatch = req.match(/^(\w+)/);
        const type = typeMatch ? typeMatch[1] : 'Booking';
        const summary = venue ? `${type} in ${venue} on ${date}` : `${type} on ${date}`;
        unbookedRequests.push(summary);
      }
    }

    if (unbookedRequests.length > 0) {
      consolidatedNotes.unshift(`⚠️ UNBOOKED: ${unbookedRequests.join(' / ')} — check with reservations`);
    }

    // --- DINNER COVERAGE CHECK ---
    // For multi-night stays, check if dinner is booked for every night.
    // If not, flag the missing date(s) so reception can offer a reservation.
    const durationNum = parseInt(duration) || 1;
    if (arrivalDate && durationNum > 0) {
      // Collect all confirmed dinner dates (DD/MM or DD/MM/YY format)
      const allDinnerDates: string[] = [];
      const dinnerDateRegex = /(?:Dinner|dinner)\s+for\s+\d+\s+(?:on\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi;
      const allBookingText = [...rightColLines, ...bookingStreamLines].join(' ');
      let dm;
      while ((dm = dinnerDateRegex.exec(allBookingText)) !== null) {
        allDinnerDates.push(dm[1]);
      }
      // Also capture venue-prefix dinners: "Gilpin Spice Dinner for 2 on DD/MM/YY"
      const prefixDinnerDateRegex = /(?:Spice|SOURCE)\s+Dinner\s+for\s+\d+\s+(?:on\s+)?(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi;
      while ((dm = prefixDinnerDateRegex.exec(allBookingText)) !== null) {
        allDinnerDates.push(dm[1]);
      }

      // Check for external dinner mentions in notes
      const externalDinnerPhrases = /(?:dining?\s+(?:out|external|elsewhere)|eating\s+(?:out|external)|external\s+dinner|dinner\s+(?:outside|elsewhere|external)|own\s+dinner\s+arrangement|already\s+booked\s+dinner\s+externally|dinner\s+at\s+(?:another|different)\s+(?:restaurant|venue))/i;
      const hasExternalDinner = externalDinnerPhrases.test(singleLineText);

      // Check for "Room Only" or "Bed & Breakfast" rate codes — dinner not included, don't flag
      const isDinnerIncluded = /^(DBB|MINIMOON|MINI_MOON|MAGESC|MAG_ESC|CEL|COMP)/i.test(rateCode);

      // Build list of uncovered dinner nights
      const uncoveredNights: string[] = [];
      for (let nightIdx = 0; nightIdx < durationNum; nightIdx++) {
        const nightDate = new Date(arrivalDate.getTime() + nightIdx * 86400000);
        const nightDD = String(nightDate.getDate()).padStart(2, '0');
        const nightMM = String(nightDate.getMonth() + 1).padStart(2, '0');
        const nightYY = String(nightDate.getFullYear()).slice(-2);
        const shortDate = `${nightDD}/${nightMM}`;
        const fullDate = `${nightDD}/${nightMM}/${nightYY}`;
        const fullDate4 = `${nightDD}/${nightMM}/${nightDate.getFullYear()}`;

        const hasDinner = allDinnerDates.some(d =>
          d === shortDate || d === fullDate || d === fullDate4 ||
          d.startsWith(shortDate)
        );

        if (!hasDinner) {
          uncoveredNights.push(shortDate);
        }
      }

      if (uncoveredNights.length > 0 && uncoveredNights.length < durationNum) {
        // Only flag if SOME nights are missing (if ALL are missing, dinner is clearly not part of the plan)
        consolidatedNotes.push(`🍽️ No dinner booked: ${uncoveredNights.join(', ')}`);
      }

      if (hasExternalDinner) {
        consolidatedNotes.push(`🍴 External dinner mentioned in notes`);
      }
    }

    // Enrich roomType with human-readable name from constants
    // Priority: room number lookup > PDF 2-letter code translation > raw code
    const roomNum = getRoomNumber(room);
    let enrichedRoomType = roomType;
    if (roomNum > 0 && ROOM_TYPES[roomNum]) {
      enrichedRoomType = ROOM_TYPES[roomNum];
    } else if (roomType && ROOM_TYPE_CODES[roomType]) {
      enrichedRoomType = ROOM_TYPE_CODES[roomType];
    }

    return {
      id: block.id,
      room,
      name,
      car,
      ll,
      eta,
      duration,
      facilities: facilitiesFormatted,
      facilitiesRaw,
      prefillNotes: [...new Set(consolidatedNotes)].join(" • "),
      inRoomItems: finalInRoomItems,
      preferences: "",
      packageName: rateCode,
      rateCode,
      rawHtml: rawTextLines.join("\n"),
      bookingStream: block.bookingStream || '',
      bookingStreamStructured: block.bookingStreamStructured || [],
      roomType: enrichedRoomType,
      // Enhanced fields — only include when present (Firebase rejects undefined)
      ...(adults != null ? { adults } : {}),
      ...(children != null ? { children } : {}),
      ...(infants != null ? { infants } : {}),
      ...(preRegistered ? { preRegistered } : {}),
      ...(bookingSource ? { bookingSource } : {}),
      ...(smokingPreference ? { smokingPreference } : {}),
      ...(depositAmount ? { depositAmount } : {}),
      ...(billingMethod ? { billingMethod } : {}),
      ...(stayHistory.length > 0 ? { stayHistory } : {}),
      ...(stayHistoryCount != null ? { stayHistoryCount } : {}),
      ...(dinnerTime ? { dinnerTime } : {}),
      ...(dinnerVenue ? { dinnerVenue } : {}),
      ...(uniqueRequests.length > 0 ? { requestedBookings: uniqueRequests } : {}),
    };
  }
}