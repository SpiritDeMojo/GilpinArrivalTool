import * as pdfjsLib from 'pdfjs-dist';
import { Guest, Flag } from '../types';
import { ROOM_MAP } from '../constants';

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
    for (const line of lines) {
      const lineText = line.items.map((i: any) => i.str).join(' ');
      if (/^ID\s+Guest Name|Req\.\s+Vip/i.test(lineText)) {
        // This is a header row — find the Car Reg column
        for (const item of line.items) {
          if (/car\s*reg/i.test(item.str)) {
            // The column spans from this item's x to the next column header's x
            // Find items to the right to determine column width
            const sortedItems = [...line.items].sort((a: any, b: any) => a.x - b.x);
            const idx = sortedItems.findIndex((i: any) => /car\s*reg/i.test(i.str));
            const nextItem = sortedItems[idx + 1];
            carRegColumnX = {
              min: item.x - 5,  // small tolerance
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

    const guests = guestBlocks.map(block => this.parseBlock(block, arrivalDateObj, carRegColumnX)).filter(g => g !== null);

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
      { key: "Treatments", icon: "💆" },
      { key: "Massage", icon: "💆" },
      { key: "Aromatherapy", icon: "💆" },
      { key: "Afternoon Tea", icon: "🍰" },
      { key: "Bento", icon: "🍱" },
      { key: "Spa Use", icon: "♨️" },
      { key: "Spa Hamper", icon: "♨️" },
      { key: "Lake House", icon: "🍰" },
      { key: "GH Pure", icon: "💆" },
      { key: "Pure Lakes", icon: "💆" },
      { key: "Pure Couples", icon: "💆" },
      { key: "Pure", icon: "💆" },
      { key: "Dinner", icon: "🍽️" },
      { key: "Lunch", icon: "🍽️" }
    ];

    const parts = text.split('/');
    let result: string[] = [];

    parts.forEach(part => {
      const p = part.trim();
      if (!p) return;

      const dateMatch = p.match(/(\d{2}\/\d{2})/);
      const timeMatch = p.match(/(\d{1,2}:\d{2})/);
      const tableMatch = p.match(/Table for (\d+)/i);

      const date = dateMatch ? dateMatch[1] : "";
      const time = timeMatch ? `@ ${timeMatch[1]}` : "";
      const pax = tableMatch ? `(T-${tableMatch[1]})` : "";

      let cleanDetails = p.replace(/\d{2}\/\d{2}(?:\/\d{2,4})?/, "")
        .replace(/\d{1,2}:\d{2}/, "")
        .replace(/Table for \d+/i, "")
        .replace(/^[:\s\-@]+|[:\s\-@]+$/g, "")
        .trim();

      let emoji = "🔹";
      for (const m of mappings) {
        if (cleanDetails.toLowerCase().includes(m.key.toLowerCase())) {
          emoji = m.icon;
          break;
        }
      }

      if (cleanDetails) {
        result.push(`${emoji} ${cleanDetails} ${pax} ${date ? `(${date}${time})` : time}`.replace(/\s+/g, " ").trim());
      }
    });

    return result.join(" • ");
  }

  private static parseBlock(block: any, arrivalDate: Date | null, carRegColumnX?: { min: number; max: number } | null): Guest {
    const rawItems = block.lines.flatMap((l: any) => l.items);
    const rawTextLines = block.lines.map((l: any) => l.items.map((i: any) => i.str).join(" "));
    const singleLineText = rawTextLines.join(" ").replace(/\s+/g, " ");
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
    const roomTypeRegex = /\d{2}\/\d{2}\/\d{2,4}\s+(MR|CR|JS|GR|SL|SS|LHC|LHM|LHS|LHSS)\b/i;
    const typeMatch = singleLineText.match(roomTypeRegex);
    if (typeMatch) {
      roomType = typeMatch[1].toUpperCase();
    } else {
      const looseTypeMatch = singleLineText.match(/\b(MR|CR|JS|GR|SL|SS|LHC|LHM|LHS|LHSS)\b/);
      if (looseTypeMatch) roomType = looseTypeMatch[1].toUpperCase();
    }

    // --- 2. GUEST NAME ---
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
    let name = nameRaw.trim()
      .replace(/^_Regular.*?(?=\w)/i, "")
      .replace(/VIP\s*-\s*\w+/gi, "")
      .replace(/(\s(Mr|Mrs|Miss|Ms|Dr|\&|Sir|Lady|\+)+)+[*]*$/i, "")
      .trim();

    // --- 3. FACILITIES ---
    const facilityMatches = singleLineText.match(/\/(Spice|Source|The Lake House|GH\s+Pure|GH\s+ESPA|Pure\s*Lakes?|Pure|Massage|Aromatherapy|Treatments|Steam|Couples|Tea|Afternoon|Spa|Mud|Bento)[^/]+/gi) || [];
    const standaloneFacilities: string[] = [];
    for (const line of rawTextLines) {
      const dinnerMatch = line.match(/Dinner\s+for\s+\d+\s+on\s+[\d/]+\s+at\s+[\d:]+\s+in\s+.+/i);
      if (dinnerMatch) standaloneFacilities.push(dinnerMatch[0].trim());
      const spaMatch = line.match(/Spa\s+In-Room\s+Hamper\s+on\s+[\d/]+/i);
      if (spaMatch) standaloneFacilities.push(spaMatch[0].trim());
      const champMatch = line.match(/(Champagne|Prosecco|Wine|Flowers)\s+on\s+[\d/]+\s+for\s+£[\d.]+/i);
      if (champMatch) standaloneFacilities.push(champMatch[0].trim());
    }
    const allFacilityText = [...facilityMatches, ...standaloneFacilities.map(s => `/${s}`)].join(" ");
    const facilitiesFormatted = this.formatFacilities(allFacilityText);

    // --- 4. CAR REGISTRATION (Position-Based + Regex) ---
    // Strategy: Use the detected column header x-position to precisely locate car reg text.
    // Falls back to x > 480 if no column header was found.
    let car = "";

    const platePatterns = [
      /\b[A-Z]{2}\d{2}\s?[A-Z]{3}\b/i,         // New format: AB12 CDE, DG18 WXF
      /\b[A-Z]\d{1,3}\s[A-Z]{3}\b/i,            // Prefix with space: M88 HCT, A123 BCD
      /\b\d{1,4}\s[A-Z]{2,3}\b/i,               // Numeric prefix: 30 BHJ
      /\b[A-Z]{2}\d{2,4}\b/i,                    // Short: LN75, AB1234
    ];
    const monthFilter = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i;
    const carExclusions = /^(BB\d|APR|RO|COMP|GS|JS|GR|MR|CR|SL|SS|LH|MAG|RATE|ID|PAGE|DATE|ROOM|UNIT|TOKEN|TOTAL|DEPOSIT|NET|VAT|GBP|MAN|UA|AD|CH|GRP|DEF|CHI|VAC|MOT|NDR|POB|MIN|CEL|MCT)$/i;
    const contentFilter = /table|spice|source|dinner|lunch|spa|hamper|massage|pure|bento|tea|booking|facility|allergy|note|gilpin|hotel|token|billing|deposit|checked|arrival/i;

    // Determine the x-range to search for car reg items
    const carXMin = carRegColumnX ? carRegColumnX.min : 480;
    const carXMax = carRegColumnX ? carRegColumnX.max : Infinity;

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
          .filter((s: string) => s.length > 0 && !contentFilter.test(s))
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
          .filter((s: string) => s.length > 0 && !contentFilter.test(s))
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

    let duration = "1";
    if (arrivalDate) {
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

    // --- 6. LOYALTY (L&L) ---
    let ll = "No";
    const beenBeforeMatch = singleLineText.match(/Been Before:\s*(Yes|Y|True)(?:\s*\(?x\s*(\d+)\)?)?/i);
    if (beenBeforeMatch) {
      const count = beenBeforeMatch[2];
      ll = count ? `Yes (x${count})` : "Yes";
    } else if (singleLineText.match(/_(Stayed|Regular)/i)) {
      ll = "Yes";
      const looseCount = singleLineText.match(/\b(?:Yes|Stays)\s*x\s*(\d+)/i);
      if (looseCount) ll = `Yes (x${looseCount[1]})`;
    } else if (scanLower.includes("previous stays") || singleLineText.match(/Stayed\s+\d{2}\/\d{2}\/\d{4}/i)) {
      ll = "Yes";
    }

    // --- 7. ALLERGIES (Specific Extraction) ---
    let allergies: string[] = [];
    const allergySection = this.extractSection(singleLineText, "Allergies:", ["HK Notes:", "Guest Notes:", "Unit:", "Page"]);
    if (allergySection && !/^\s*(NDR|None|N\/A|No\s+Dietary|No\s+known)\s*$/i.test(allergySection.trim())) {
      // Real allergies found (not just NDR/None)
      allergies.push(`⚠️ ALLERGY: ${allergySection.trim()}`);
    }
    // Also check for allergy keywords scattered in text
    if (scanLower.includes("nut allergy") && !allergies.some(a => a.toLowerCase().includes('nut'))) allergies.push("🥜 Nut Allergy");
    if ((scanLower.includes("gluten free") || scanLower.includes("coeliac")) && !allergies.some(a => /gluten|coeliac/i.test(a))) allergies.push("🍞 Gluten Free");
    if ((scanLower.includes("dairy free") || scanLower.includes("lactose")) && !allergies.some(a => /dairy|lactose/i.test(a))) allergies.push("🧀 Dairy Free");
    if (scanLower.includes("vegan") && !allergies.some(a => /vegan/i.test(a))) allergies.push("🌱 Vegan");
    if (scanLower.includes("vegetarian") && !allergies.some(a => /vegetarian/i.test(a))) allergies.push("🥬 Vegetarian");

    // --- 8. OCCASION (Explicit Extraction) ---
    let occasionNote = "";
    const occasionSection = this.extractSection(singleLineText, "Occasion:", ["P.O.Nr:", "Traces:", "Contact Details:", "Booking Notes"]);
    if (occasionSection && occasionSection.trim().length > 1) {
      occasionNote = `🎉 ${occasionSection.trim()}`;
    }
    // Also check "Special Occasion:" in booking notes
    const specialOccasion = singleLineText.match(/Special Occasion:\s*([^\n]+?)(?=\s*(?:ETA:|Billing:|Been Before:|In Room|Checked:|$))/i);
    if (specialOccasion && specialOccasion[1].trim().length > 1) {
      const soText = specialOccasion[1].trim();
      if (!occasionNote.includes(soText)) {
        occasionNote = occasionNote ? `${occasionNote} / ${soText}` : `🎉 ${soText}`;
      }
    }

    // --- 9. CONSOLIDATED NOTES ---
    const packageRegex = /\b(MIN|MAGESC|BB1|BB2|BB3|BB|APR_1_BB|APR_2_BB|APR_3_BB|COMP|LHAPR|LHMAG|LHBB|LHBB1|LHBB2|RO|CEL|POB_STAFF)\b/i;
    const rateMatch = singleLineText.match(packageRegex);
    const rateCode = rateMatch ? rateMatch[1].toUpperCase() : "";

    const noteSections = [
      this.extractSection(singleLineText, "HK Notes:", ["Unit:", "Page", "Guest Notes:", "Booking Notes:", "Allergies:"]),
      this.extractSection(singleLineText, "Guest Notes:", ["Unit:", "Page", "HK Notes:", "Booking Notes:", "Allergies:"]),
      this.extractSection(singleLineText, "Booking Notes:", ["Unit:", "Page", "HK Notes:", "Guest Notes:", "Allergies:", "Facility Bookings:"]),
      this.extractSection(singleLineText, "Traces:", ["Booking Notes", "Been Before", "Occasion:", "Facility Bookings:"]),
      this.extractSection(singleLineText, "In Room(?: on Arrival)?:", ["Checked:", "8 Day Check", "4 day Call", "Billing:", "Flowers"])
    ];

    // Expanded in-room keyword list for Gilpin
    const keywords = [
      "Ice Bucket", "Glasses", "Dog Bed", "Dog Bowl", "Cot", "Extra Bed", "Extra Pillow",
      "Topper", "Mattress Topper", "Robes", "Slippers", "Voucher",
      "Flowers", "Rose Petals", "Balloons",
      "Birthday", "Anniversary", "Celebration",
      "Champagne", "Prosecco", "Wine", "Gin", "Whisky",
      "Chocolates", "Chocolate", "Truffles", "Cake",
      "Spa Hamper", "Gift", "Candles"
    ];
    const foundKeywords = keywords.filter(k => scanLower.includes(k.toLowerCase()));

    let consolidatedNotes: string[] = [];

    // Allergies first (critical visibility)
    consolidatedNotes.push(...allergies);

    // Occasion next (important for guest experience)
    if (occasionNote) consolidatedNotes.push(occasionNote);

    if (rateCode === "POB_STAFF") consolidatedNotes.push("⭐ VIP (POB Staff)");

    // Staff initials and internal codes to exclude from notes
    const noisePatterns = /^(NDR|None|N\/A|LV|KW|AM|JS|SL|SS|CB|EW|RH|GRP|DEF|CHI|VAC|Token|Gilpin Hotel|Pay Own Account|Unit:|Deposit:|Total Rate:|Balance|Contact Details:|P\.O\.Nr:|Company:)$/i;

    noteSections.forEach(sec => {
      if (!sec) return;
      sec.split(/,|•|&|\n/).forEach(p => {
        const clean = p.trim();
        if (clean.length > 2 && !/^[A-Z]{2}$/.test(clean) && !noisePatterns.test(clean)) {
          // Skip if it's just a date like "02/01/26" or a price like "£95.00"
          if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(clean)) return;
          if (/^£[\d.]+$/.test(clean)) return;
          consolidatedNotes.push(clean);
        }
      });
    });

    return {
      id: block.id,
      room,
      name,
      car,
      ll,
      eta,
      duration,
      facilities: facilitiesFormatted,
      prefillNotes: [...new Set(consolidatedNotes)].join(" • "),
      inRoomItems: [...new Set(foundKeywords)].join(" • "),
      preferences: "",
      packageName: rateCode,
      rateCode,
      rawHtml: rawTextLines.join("\n"),
      roomType
    };
  }
}