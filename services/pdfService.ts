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
    const rawItems = block.lines.flatMap((l: any) => l.items);
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
    const etaMatch = singleLineText.match(/\b(\d{2}:?\d{2})\b/);
    if (etaMatch) {
      const e = etaMatch[1].replace(':', '');
      if (e.length === 4) eta = `${e.substring(0,2)}:${e.substring(2,4)}`;
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
      .replace(/VIP\s*-\s*\w+/gi, "")
      .replace(/(\s(Mr|Mrs|Miss|Ms|Dr|&|Sir|Lady|\+)+)+[*]*$/i, "")
      .trim();

    const packageRegex = /\b(MIN|MAGESC|BB_1|BB_2|BB_3|BB_|APR_1_BB|APR_2_BB|APR_3_BB|BB_1_WIN|BB_2_WIN|BB_3_WIN|COMP|LHAPR|LHMAG|LHBB1|LHBB2|LHBB|RO|CEL_DBB_1|POB_STAFF)\b/i;
    const rateCodeMatch = singleLineText.match(packageRegex);
    const rateCode = rateCodeMatch ? rateCodeMatch[1].toUpperCase() : "";

    let duration = "1";
    if (arrivalDate) {
        const firstLineDates = singleLineText.match(/\d{2}\/\d{2}\/\d{2,4}/g) || [];
        for (const dStr of firstLineDates) {
            const parts = dStr.split('/');
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            let y = parseInt(parts[2]);
            if (y < 100) y += 2000;
            const checkDate = new Date(y, m - 1, d);
            if (checkDate > arrivalDate) {
                const diffDays = Math.ceil((checkDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > 0 && diffDays < 21) {
                    duration = diffDays.toString();
                    break;
                }
            }
        }
    }

    // v3.72+ Optimized Car Registration Logic with strict noise exclusion
    let car = "";
    const plateRegex = /\b([A-Z]{2}\d{2}\s?[A-Z]{3}|[A-Z]{1,2}\d{1,4}\s?[A-Z]{0,3})\b/gi;
    const exclusions = /^(BB\d|APR|RO|COMP|GS|JS|MR|SL|SS|MAG)/i;
    
    const possiblePlates = rawItems.filter(i => i.x > 500 && i.str.match(plateRegex));
    for (const item of possiblePlates) {
        const str = item.str.trim().toUpperCase();
        if (!str.match(exclusions)) {
            car = str;
            break;
        }
    }

    let ll = "No";
    if (scanLower.includes("stayed before") || scanLower.includes("_regular")) ll = "Yes";

    let auditAlerts: string[] = [];
    let inRoomItemsList: string[] = [];

    if (rateCode === "POB_STAFF" || scanLower.includes("pride of britain")) {
        auditAlerts.push("⭐ VIP (Pride of Britain Staff)");
    }

    if (scanLower.includes("guest unaware") || scanLower.includes("secret")) {
        auditAlerts.push("🤫 Comp Upgrade: Guest Unaware");
    }

    const inRoomMarkers = ["In Room on Arrival:", "In-Room:", "IN ROOM:"];
    inRoomMarkers.forEach(marker => {
      const extracted = this.extractSection(singleLineText, marker, ["HK Notes:", "Guest Notes:", "Unit:", "Billing:"]);
      if (extracted) extracted.split(',').forEach(p => inRoomItemsList.push(p.trim()));
    });

    const notes = auditAlerts.join(" • ") + " " + this.extractSection(singleLineText, "HK Notes:", ["Unit:", "Page", "Guest Notes:", "Billing:"]);

    return {
      id: block.id,
      room,
      name,
      car,
      ll,
      eta,
      duration,
      facilities: this.extractSection(singleLineText, "Facility Bookings:", ["HK Notes:", "Guest Notes:", "Unit:", "Billing:"]),
      prefillNotes: notes.trim(),
      inRoomItems: inRoomItemsList.join(" • "),
      preferences: "",
      packageName: rateCode,
      rateCode,
      rawHtml: rawText
    };
  }
}