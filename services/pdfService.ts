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

    // Extract Arrival Date from header
    const headerItem = rawItems.find(i => i.str.match(/Arrival List|Guest Greeter/i) && i.str.match(/\d{2}\/\d{2}\/\d{4}/i));
    if (headerItem) {
      const m = headerItem.str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) {
        arrivalDateObj = new Date(`${m[3]}-${m[2]}-${m[1]}`);
        arrivalDateObj.setHours(0, 0, 0, 0);
        arrivalDateStr = arrivalDateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

    // Filter noise lines
    lines = lines.filter(l => {
      const text = l.items.map((i: any) => i.str).join(" ");
      return !text.match(/^ID\s+Guest Name|Req\.\s+Vip|Page\s+\d+|JHunt\/Gilpin|Total Rate:/i);
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

    const guests = guestBlocks.map(block => this.parseBlock(block, arrivalDateObj)).filter(g => g !== null);
    
    // Final Sort by Room Number using forced map values
    guests.sort((a, b) => {
      const rA = parseInt(a.room.split(' ')[0]) || 999;
      const rB = parseInt(b.room.split(' ')[0]) || 999;
      return rA - rB;
    });

    return { guests, arrivalDateStr, arrivalDateObj };
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
      { key: "Afternoon Tea", icon: "🍰" },
      { key: "Bento", icon: "🍱" },
      { key: "Spa Use", icon: "♨️" },
      { key: "Lake House", icon: "🍰" },
      { key: "GH Pure", icon: "💆" },
      { key: "Pure", icon: "💆" },
      { key: "Pure Couples", icon: "💆" }
    ];

    const parts = text.split('/');
    let result: string[] = [];

    parts.forEach(part => {
      const p = part.trim();
      if (!p) return;
      
      const dateMatch = p.match(/(\d{2}\/\d{2})/);
      const timeMatch = p.match(/(\d{2}:\d{2})/);
      const tableMatch = p.match(/Table for (\d+)/i);
      
      const date = dateMatch ? dateMatch[1] : "";
      const time = timeMatch ? `@ ${timeMatch[1]}` : "";
      const pax = tableMatch ? `(T-${tableMatch[1]})` : "";
      
      let cleanDetails = p.replace(/\d{2}\/\d{2}/, "")
                          .replace(/\d{2}:\d{2}/, "")
                          .replace(/Table for \d+/i, "")
                          .replace(/^[:\s\-]+|[:\s\-]+$/g, "")
                          .trim();

      let emoji = "🔹";
      for (const m of mappings) {
        if (cleanDetails.toLowerCase().includes(m.key.toLowerCase())) {
          emoji = m.icon;
          break;
        }
      }

      if (cleanDetails) {
        result.push(`${emoji} ${cleanDetails} ${pax} (${date}${time})`.replace(/\s+/g, " ").trim());
      }
    });

    return result.join(" • ");
  }

  private static parseBlock(block: any, arrivalDate: Date | null): Guest {
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
          // FORCE the exact number and name from our master ROOM_MAP
          room = `${num} ${key.toUpperCase()}`;
          foundMatch = true;
          break;
        }
      }
      if (!foundMatch) {
        // Fallback for custom rooms or cases where map fails: cleanup noise
        room = rawRoomCandidate.replace(/\b(DEF|CHI|GRP|VAC|MR|SS|SL|JS)\b/gi, "")
                               .replace(/\b(\d{4}|\d{2}:\d{2})\b/g, "")
                               .replace(/\b(\d+)\s+\1\b/, "$1") // Fix "26 26" duplicate
                               .replace(/\s+/g, " ").trim().toUpperCase();
      }
    }

    // --- 2. GUEST NAME ---
    let nameRaw = "";
    const line0Items = block.lines[0].items;
    let foundId = false;
    for (const item of line0Items) {
      const str = item.str.trim();
      if (str === block.id) { foundId = true; continue; }
      if (foundId) {
        // Break if we hit staff initials, a room pattern, or a rate code
        if (str.length === 2 && str === str.toUpperCase() && !["MR", "MS", "DR"].includes(str)) break;
        if (str.match(roomPattern)) break;
        nameRaw += " " + str;
      }
    }
    let name = nameRaw.trim()
      .replace(/^_Regular.*?(?=\w)/i, "")
      .replace(/VIP\s*-\s*\w+/gi, "")
      .replace(/(\s(Mr|Mrs|Miss|Ms|Dr|&|Sir|Lady|\+)+)+[*]*$/i, "")
      .trim();

    // --- 3. FACILITIES (Slash-Based Deep Scan) ---
    const facilityMatches = singleLineText.match(/\/(Spice|Source|The Lake House|GH\s+Pure|GH\s+ESPA|Pure|Massage|Treatments|Steam|Couples|Tea|Afternoon|Spa|Mud|Bento)[^/]+/gi) || [];
    const facilitiesFormatted = this.formatFacilities(facilityMatches.join(" "));

    // --- 4. CAR REGISTRATION ---
    let car = "";
    const plateRegex = /\b([A-Z]{2}\d{2}\s?[A-Z]{3}|[A-Z]{1,2}\d{1,4}\s?[A-Z]{0,3})\b/gi;
    const monthFilter = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i;
    const carExclusions = /^(BB[\s_]?\d|APR|RO|COMP|GS|JS|MR|SL|SS|MAG|RATE|ID|PAGE|DATE|ROOM|UNIT|TOKEN|TOTAL|DEPOSIT|NET|VAT|GBP|MAN|UA|AD|CH|GRP)/i;
    
    const possiblePlates = rawItems.filter(i => i.x > 450 && i.str.match(plateRegex));
    for (const item of possiblePlates) {
        const str = item.str.trim().toUpperCase();
        const cleanStr = str.replace(/\s/g, ''); 
        if (cleanStr.length < 4) continue;
        if (str.match(monthFilter)) continue;
        if (!str.match(carExclusions)) {
            car = str;
            break; 
        }
    }

    // --- 5. ETA & DURATION ---
    let eta = "N/A";
    const etaPrefixMatch = singleLineText.match(/ETA:\s*(\d{2}:?\d{2}|\d{4})/i);
    if (etaPrefixMatch) {
      const e = etaPrefixMatch[1].replace(':', '');
      if (e.length === 4) eta = `${e.substring(0,2)}:${e.substring(2,4)}`;
    } else {
      const fallbackEtaMatch = singleLineText.match(/\b(\d{2}:?\d{2})\b/);
      if (fallbackEtaMatch) {
        const e = fallbackEtaMatch[1].replace(':', '');
        if (e.length === 4) eta = `${e.substring(0,2)}:${e.substring(2,4)}`;
      }
    }

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

    // --- 7. CONSOLIDATED NOTES ---
    const packageRegex = /\b(MIN|MAGESC|BB_1|BB_2|BB_3|BB_|APR_1_BB|APR_2_BB|APR_3_BB|COMP|LHAPR|LHMAG|LHBB|RO|CEL|POB_STAFF)\b/i;
    const rateMatch = singleLineText.match(packageRegex);
    const rateCode = rateMatch ? rateMatch[1].toUpperCase() : "";

    const noteSections = [
      this.extractSection(singleLineText, "HK Notes:", ["Unit:", "Page", "Guest Notes:", "Booking Notes:"]),
      this.extractSection(singleLineText, "Guest Notes:", ["Unit:", "Page", "HK Notes:", "Booking Notes:"]),
      this.extractSection(singleLineText, "Booking Notes:", ["Unit:", "Page", "HK Notes:", "Guest Notes:"]),
      this.extractSection(singleLineText, "Traces:", ["Booking Notes", "Been Before", "Occasion:"]),
      this.extractSection(singleLineText, "In Room(?: on Arrival)?:", ["Checked:", "8 Day Check", "Billing:"])
    ];

    const keywords = ["Ice Bucket", "Glasses", "Dog Bed", "Cot", "Extra Bed", "Topper", "Robes", "Voucher", "Flowers", "Birthday", "Anniversary", "Champage", "Chocolates", "Balloons"];
    const foundKeywords = keywords.filter(k => scanLower.includes(k.toLowerCase()));

    let consolidatedNotes: string[] = [];
    if (scanLower.includes("nut allergy")) consolidatedNotes.push("🥜 Nut Allergy");
    if (scanLower.includes("gluten free") || scanLower.includes("coeliac")) consolidatedNotes.push("🍞 Gluten Free");
    if (scanLower.includes("dairy free") || scanLower.includes("lactose")) consolidatedNotes.push("🧀 Dairy Free");
    if (rateCode === "POB_STAFF") consolidatedNotes.push("⭐ VIP (POB Staff)");
    
    noteSections.forEach(sec => {
      if (!sec) return;
      sec.split(/,|•|&|\n/).forEach(p => {
        const clean = p.trim();
        if (clean.length > 2 && !/^[A-Z]{2}$/.test(clean) && !/^(NDR|None|N\/A|LV|KW|AM|JS|SL|SS)$/i.test(clean)) {
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
      rawHtml: rawTextLines.join("\n")
    };
  }
}