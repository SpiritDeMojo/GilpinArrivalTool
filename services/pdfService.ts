import { Guest, Flag } from '../types';
import { ROOM_MAP } from '../constants';

declare const pdfjsLib: any;

export class PDFService {
  static async parse(file: File, flags: Flag[]): Promise<{ guests: Guest[], arrivalDateStr: string, arrivalDateObj: Date | null }> {
    const buffer = await file.arrayBuffer();
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

    rawItems.sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(a.y - b.y) > 4) return a.y - b.y;
      return a.x - b.x;
    });

    const headerItem = rawItems.find(i => i.str.match(/Arrival List|Guest Greeter/i) && i.str.match(/\d{2}\/\d{2}\/\d{4}/i));
    if (headerItem) {
      const m = headerItem.str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) {
        arrivalDateObj = new Date(`${m[3]}-${m[2]}-${m[1]}`);
        arrivalDateObj.setHours(0, 0, 0, 0);
        arrivalDateStr = arrivalDateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    }

    let lines: any[] = [];
    let currentLine: { y: number, items: any[] } = { y: -999, items: [] };
    rawItems.forEach(item => {
      if (Math.abs(item.y - currentLine.y) > 5) {
        lines.push(currentLine);
        currentLine = { y: item.y, items: [item] };
      } else {
        currentLine.items.push(item);
      }
    });
    lines.push(currentLine);

    lines = lines.filter(l => {
      const text = l.items.map((i: any) => i.str).join(" ");
      return !text.match(/^ID\s+Guest Name|Req\.\s+Vip|Page\s+\d+|JHunt\/Gilpin|Total Rate:/i);
    });

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

    const guests = guestBlocks.map(block => this.parseBlock(block, arrivalDateObj, flags)).filter(g => g !== null);
    
    guests.sort((a, b) => {
      const rA = this.getRoomSortValue(a.room);
      const rB = this.getRoomSortValue(b.room);
      return rA - rB;
    });

    return { guests, arrivalDateStr, arrivalDateObj };
  }

  private static getRoomSortValue(roomString: string): number {
    if (!roomString) return 999;
    const clean = roomString.toLowerCase().replace(/[^a-z]/g, '');
    for (const key in ROOM_MAP) {
      if (clean.includes(key)) return ROOM_MAP[key];
    }
    const m = roomString.match(/^(\d+)/);
    return m ? parseInt(m[1]) : 999;
  }

  private static extractSection(text: string, startMarker: string, endMarkers: string[]): string {
    const safeStart = startMarker.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const startMatch = text.match(new RegExp(safeStart, 'i'));
    if (!startMatch) return "";
    const startIndex = startMatch.index! + startMatch[0].length;
    const remaining = text.substring(startIndex);
    let bestEndIndex = remaining.length;
    endMarkers.forEach(endM => {
      const m = remaining.match(new RegExp(endM.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'));
      if (m && m.index! < bestEndIndex) bestEndIndex = m.index!;
    });
    return remaining.substring(0, bestEndIndex).trim();
  }

  private static parseBlock(block: any, arrivalDate: Date | null, flags: Flag[]): Guest {
    const rawText = block.lines.map((l: any) => l.items.map((i: any) => i.str).join(" ")).join("\n");
    const singleLineText = rawText.replace(/\s+/g, " ");
    const scanLower = singleLineText.toLowerCase();
    const headerLineItems = block.lines[0].items;
    
    let room = "Unassigned";
    const roomItemIndex = headerLineItems.findIndex((i: any) => (i.str.match(/^\d{1,3}\.\s+[A-Za-z]+/) || i.str.match(/Lake House|Lodge|House/i)));
    let roomItem = null;
    if (roomItemIndex !== -1) {
      roomItem = headerLineItems[roomItemIndex];
      room = roomItem.str.trim();
      const m = room.match(/(\d{1,3})\.\s*(.*)/);
      if (m) room = `${m[1]} ${m[2].toUpperCase()}`;
      else room = room.toUpperCase();
    }

    let eta = "N/A";
    if (roomItemIndex !== -1) {
        for (let i = roomItemIndex + 1; i < Math.min(roomItemIndex + 5, headerLineItems.length); i++) {
            const str = headerLineItems[i].str.trim();
            if (str.match(/^\d{4}$/) || str.match(/^\d{2}:\d{2}$/)) {
                eta = str.length === 4 ? `${str.substring(0,2)}:${str.substring(2,4)}` : str;
                break;
            }
        }
    }
    if (eta === "N/A" || eta === "00:00") {
        const noteEta = singleLineText.match(/ETA:?\s*(\d{2}:?\d{2})/i);
        if (noteEta) eta = noteEta[1].includes(':') ? noteEta[1] : `${noteEta[1].substring(0,2)}:${noteEta[1].substring(2,4)}`;
    }

    let nameRaw = "";
    let foundId = false;
    for (const item of headerLineItems) {
      if (item.str === block.id) { foundId = true; continue; }
      if (foundId) {
        if (item.str === roomItem?.str) break;
        nameRaw += " " + item.str;
      }
    }
    
    let name = nameRaw.trim()
      .replace(/^_Regular.*?(?=\w)/i, "")
      .replace(/^_Stayed Before|_Stayed/gi, "")
      .replace(/VIP\s*-\s*\w+/gi, "")
      .replace(/(\s(Mr|Mrs|Miss|Ms|Dr|&|Sir|Lady|\+)+)+[*]*$/i, "")
      .replace(/\s+/g, ' ')
      .trim();

    const packageRegex = /\b(MIN|MAGESC|BB_1|BB_2|BB_3|BB_|APR_1_BB|APR_2_BB|APR_3_BB|COMP|LHAPR|LHMAG|LHBB1|LHBB2|LHBB3|LHBB|LHAPR1|LHAPR2|LHAPR3|RO|CEL_DBB_1)\b/i;
    const rateCodeMatch = singleLineText.match(packageRegex);
    const rateCode = rateCodeMatch ? rateCodeMatch[1].toUpperCase() : "";

    // Duration extraction
    let duration = "1";
    if (arrivalDate) {
        const firstLineRaw = block.lines[0].items.map((i: any) => i.str).join(" ");
        const firstLineDates = firstLineRaw.match(/\d{2}\/\d{2}\/\d{2,4}/g) || [];
        for (const dStr of firstLineDates) {
            const parts = dStr.split('/');
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            let y = parseInt(parts[2]);
            if (y < 100) y += 2000;
            const checkDate = new Date(y, m - 1, d);
            checkDate.setHours(0,0,0,0);
            if (checkDate > arrivalDate) {
                const diffTime = checkDate.getTime() - arrivalDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 0 && diffDays < 21) {
                    duration = diffDays.toString();
                    break;
                }
            }
        }
    }

    let car = "";
    const plateRegex = /\b([A-Z]{2}\d{2}\s?[A-Z]{3}|[A-Z]{1,2}\d{1,4}\s?[A-Z]{0,3}|[A-Z]{1,3}\s?\d{1,4}[A-Z]?)\b/i;
    const carBlacklist = /^(BB\d?|APR\d?|MIN|RO|MAG|LH|FOC|COMP|UNSURE|TBD|202\d|P\.O\.NR)$/i;
    for (let i = headerLineItems.length - 1; i >= 0; i--) {
      const str = headerLineItems[i].str.trim();
      if (str.length >= 3 && str.match(plateRegex) && !str.match(carBlacklist)) {
        car = str.toUpperCase();
        break;
      }
    }

    // 4. LOYALTY TRUTH
    let ll = "No";
    const historyMatch = singleLineText.match(/Stayed\s*(\d+)\s*times/i) || singleLineText.match(/Been Before:\s*Yes\s*\(?x\s*(\d+)\)?/i);
    if (historyMatch) {
      ll = `Yes (x${historyMatch[1]})`;
    } else if (singleLineText.match(/Stayed Before|_Regular/i)) {
      ll = "Yes";
    }

    // --- AUDIT PROTOCOLS ---
    let auditAlerts: string[] = [];
    let inRoomItemsList: string[] = [];

    // 1. SILENT CHECK
    if (scanLower.includes("guest unaware") || scanLower.includes("comp upgrade") || scanLower.includes("secret")) {
        auditAlerts.push("🤫 SILENT UPGRADE");
    }

    // 2. CELEBRATION AUDIT
    const celebrationPkgs = ["CEL_DBB_1", "MAGESC", "CEL_DBB"];
    const hasCelebrationPkg = celebrationPkgs.includes(rateCode) || scanLower.includes("minimoon") || scanLower.includes("magical escape");
    
    // Whitelist for Physical Items
    const inRoomWhitelist = ["champagne", "champ", "flowers", "hamper", "bollinger", "prosecco", "card", "chocolates", "itinerary", "balloons", "rose", "hamper"];
    const inRoomMarkers = ["In Room on Arrival:", "In-Room:", "IN ROOM:", "Billing:", "Traces:"];

    inRoomMarkers.forEach(marker => {
      const extracted = this.extractSection(singleLineText, marker, ["HK Notes:", "Guest Notes:", "Unit:", "Billing:", "Facility Bookings:", "Req. Vip", "Page", "P.O.Nr"]);
      if (extracted && extracted.length > 2) {
        extracted.split(/,|•|\/|\||&/).forEach(part => {
            const p = part.trim();
            if (inRoomWhitelist.some(w => p.toLowerCase().includes(w))) {
                inRoomItemsList.push(p.replace(/🎁|IN ROOM:/g, "").trim());
            }
        });
      }
    });

    if (hasCelebrationPkg) {
        const needsAudit = !inRoomItemsList.some(item => item.toLowerCase().includes("champagne")) || 
                           (rateCode === "CEL_DBB_1" && !inRoomItemsList.some(item => item.toLowerCase().includes("balloons")));
        
        if (needsAudit) {
            if (rateCode === "CEL_DBB_1") {
                inRoomItemsList.push("Champagne", "Balloons [AUDIT ADDED]");
            } else {
                inRoomItemsList.push("Champagne", "Itinerary [AUDIT ADDED]");
            }
        }
    }

    // 3. BILLING PROTECTION
    if (scanLower.includes("voucher") || scanLower.includes("mother paying") || scanLower.includes("daughter paying") || scanLower.includes("gift")) {
        auditAlerts.push("💳 BILLING ALERT (Voucher/Gift)");
    }

    // --- FIELD-SPECIFIC FORMATTING ---

    // A. `notes` Master String
    let noteParts: string[] = [];
    
    // 🎉 [Occasion]
    const occSection = this.extractSection(singleLineText, "Occasion:", ["P.O.Nr:", "Traces:", "Booking Notes:", "Facility Bookings:"]).replace(/None|NDR|^\d+$/i, "").trim();
    if (occSection.length > 2) noteParts.push(`🎉 ${occSection}`);

    // 🏠 [Clean Booking Notes]
    const cleanNotes = this.extractSection(singleLineText, "HK Notes:", ["Unit:", "Page", "Guest Notes:", "Billing:", "Booking Notes:"])
                       .replace(/8 Day Check|Deposit Paid|Auth Taken|@[a-zA-Z.]+/gi, "")
                       .trim();
    if (cleanNotes.length > 2) noteParts.push(`🏠 ${cleanNotes}`);

    // 🎁 IN ROOM
    if (inRoomItemsList.length > 0) {
        noteParts.push(`🎁 IN ROOM: ${Array.from(new Set(inRoomItemsList)).join(", ")}`);
    }

    // 👤 [Personal Details]
    const personal = this.extractSection(singleLineText, "Guest Notes:", ["HK Notes:", "Billing:", "Unit:", "Booking Notes:"]).trim();
    if (personal.length > 2) noteParts.push(`👤 ${personal}`);

    // [Audit / Billing Alerts]
    auditAlerts.forEach(a => noteParts.push(a));

    // Flags mapping (Maintain previous features)
    flags.forEach(f => {
      const match = f.keys.some(k => {
        const keyLower = k.toLowerCase();
        const regex = new RegExp(`\\b${keyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if ((keyLower === "cat" || keyLower === "pet" || keyLower === "dog") && (room.toLowerCase().includes("catbells") || scanLower.includes("category"))) return false;
        return regex.test(scanLower);
      });
      if (match) noteParts.push(`${f.emoji} ${f.name}`);
    });

    // C. `facilities` Formatting
    const facilitiesRaw = this.extractSection(singleLineText, "Facility Bookings:", ["HK Notes:", "Guest Notes:", "Unit:", "Billing:", "Booking Notes:", "P.O.Nr"]);
    const facilities = facilitiesRaw.split('/').map(f => f.trim()).filter(f => f.length > 5).map(f => {
        const fl = f.toLowerCase();
        if (fl.includes("spice")) return "🌶️ Spice (" + f.replace(/Spice:?\s*/i, "").trim() + ")";
        if (fl.includes("source")) return "🍴 Source (" + f.replace(/Source:?\s*/i, "").trim() + ")";
        if (fl.includes("spa") || fl.includes("massage") || fl.includes("facial") || fl.includes("espresso")) return "💆 Spa (" + f.replace(/Spa:?\s*|Massage:?\s*|Facial:?\s*/i, "").trim() + ")";
        if (fl.includes("tea")) return "🍵 Tea (" + f.replace(/Afternoon Tea:?\s*/i, "").trim() + ")";
        return f;
    }).join("\n");

    return {
      id: block.id,
      room,
      name,
      car,
      ll,
      eta,
      duration,
      facilities,
      prefillNotes: noteParts.join(" • "),
      inRoomItems: Array.from(new Set(inRoomItemsList)).join(" • "),
      preferences: "",
      packageName: rateCode,
      rateCode,
      rawHtml: rawText
    };
  }
}
