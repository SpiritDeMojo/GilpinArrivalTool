import { Guest, Flag } from '../types';
import { ROOM_MAP } from '../constants';

declare const pdfjsLib: any;

export class PDFService {
  static async parse(file: File, flags: Flag[]): Promise<{ guests: Guest[], arrivalDateStr: string }> {
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

    return { guests, arrivalDateStr };
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
    const headerLine = block.lines[0].items;
    
    let room = "Unassigned";
    const roomItem = headerLine.find((i: any) => (i.str.match(/^\d{1,3}\.\s+[A-Za-z]+/) || i.str.match(/Lake House|Lodge/i)));
    if (roomItem) {
      room = roomItem.str.trim();
      const m = room.match(/(\d{1,3})\.\s*(.*)/);
      if (m) room = `${m[1]} ${m[2].toUpperCase()}`;
      else room = room.toUpperCase();
    }

    let nameRaw = "";
    let foundId = false;
    for (const item of headerLine) {
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

    const packageRegex = /\b(MIN|MAGESC|BB_1|BB_2|BB_3|BB_|APR_1_BB|APR_2_BB|APR_3_BB|COMP|LHAPR|LHMAG|LHBB1|LHBB2|LHBB|RO)\b/i;
    const rateCodeMatch = singleLineText.match(packageRegex);
    const rateCode = rateCodeMatch ? rateCodeMatch[1].toUpperCase() : "";

    let car = "";
    const plateRegex = /\b([A-Z]{2}\d{2}\s?[A-Z]{3}|[A-Z]{1,2}\d{1,4}\s?[A-Z]{0,3}|[A-Z]{1,3}\s?\d{1,4}[A-Z]?)\b/i;
    const carBlacklist = /^(BB\d?|APR\d?|MIN|RO|MAG|LH|FOC|COMP|UNSURE|TBD|202\d|P\.O\.NR)$/i;

    for (let i = headerLine.length - 1; i >= 0; i--) {
      const str = headerLine[i].str.trim();
      if (str.length >= 3 && str.match(plateRegex) && !str.match(carBlacklist)) {
        car = str.toUpperCase();
        break;
      }
    }

    let duration = "1";
    if (arrivalDate) {
      const dates = singleLineText.match(/\d{2}\/\d{2}\/\d{2,4}/g);
      if (dates) {
        for (const dStr of dates) {
          const m = dStr.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
          if (m) {
            const y = m[3].length === 2 ? '20' + m[3] : m[3];
            const depDate = new Date(parseInt(y), parseInt(m[2]) - 1, parseInt(m[1]));
            if (depDate > arrivalDate) {
              const diff = Math.ceil((depDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
              if (diff > 0 && diff < 30) { duration = diff.toString(); break; }
            }
          }
        }
      }
    }

    let ll = "No";
    const historyMatch = singleLineText.match(/Stayed\s*(\d+)\s*times/i) || singleLineText.match(/Been Before:\s*Yes\s*\(?x\s*(\d+)\)?/i);
    if (historyMatch) {
      ll = `Yes (x${historyMatch[1]})`;
    } else if (singleLineText.match(/Stayed Before|_Regular/i)) {
      ll = "Yes";
    }

    let notesList: string[] = [];
    const scanLower = singleLineText.toLowerCase();

    const occSection = this.extractSection(singleLineText, "Occasion:", ["Traces:", "Booking Notes:", "Facility Bookings:"]);
    const occ2Section = this.extractSection(singleLineText, "Special Occasion:", ["ETA:", "Billing:", "HK Notes:"]);
    const combinedOcc = [occSection, occ2Section]
      .filter(o => o && !o.match(/None|NDR|P\.O\.NR|P\.O\.|^\d+$|N\/A/i))
      .join(" / ");
    if(combinedOcc.length > 2) notesList.push(`🎉 ${combinedOcc}`);

    const hkRaw = this.extractSection(singleLineText, "HK Notes:", ["Unit:", "Page", "Guest Notes:", "Billing:", "Booking Notes:"]);
    if(hkRaw && !hkRaw.match(/Booking\.com/i)) notesList.push(`🏠 ${hkRaw}`);
    
    const guestRaw = this.extractSection(singleLineText, "Guest Notes:", ["HK Notes:", "Billing:", "Unit:", "Booking Notes:"]);
    if(guestRaw) notesList.push(`👤 ${guestRaw}`);

    const bookingRaw = this.extractSection(singleLineText, "Booking Notes:", ["HK Notes:", "Guest Notes:", "Unit:", "Billing:", "Facility Bookings:"]);
    if(bookingRaw) notesList.push(`📝 ${bookingRaw}`);

    // High Priority "In Room" capture - Improved for Room 31 Flowers
    const inRoomRegex = /(?:In Room on Arrival|In-Room|In Room Spa Hamper|IN ROOM|Billing):?\s*([^•\n\r|ID:|Req.]+)/gi;
    let match;
    let inRoomParts = [];
    const blacklist = /Paul is paying|send bill|Check:|EW|KW|Agent:|Checked:/i;
    
    while ((match = inRoomRegex.exec(singleLineText)) !== null) {
      const val = match[1].trim();
      if (val.length > 2 && !blacklist.test(val)) {
        inRoomParts.push(val);
      }
    }
    let inRoomItems = inRoomParts.join(" • ");

    flags.forEach(f => {
      const match = f.keys.some(k => {
        const keyLower = k.toLowerCase();
        const regex = new RegExp(`\\b${keyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        
        if ((keyLower === "cat" || keyLower === "pet") && (room.toLowerCase().includes("catbells") || room.toLowerCase().includes("carpet"))) {
          return false;
        }
        
        return regex.test(scanLower);
      });
      if (match) {
        notesList.push(`${f.emoji} ${f.name}`);
      }
    });

    if (rateCode === "COMP") notesList.push("⭐ OWNER/COMP");
    if (scanLower.includes("staff")) notesList.push("🔵 STAFF STAY");

    const facilitiesRaw = this.extractSection(singleLineText, "Facility Bookings:", ["HK Notes:", "Guest Notes:", "Unit:", "Billing:", "Booking Notes:"]);
    const facilities = facilitiesRaw.split('/').map(f => f.trim()).filter(f => f.length > 5).join("\n");

    return {
      id: block.id,
      room,
      name,
      car,
      ll,
      eta: singleLineText.match(/ETA:?\s*(\d{2}:\d{2})/i)?.[1] || "", 
      duration: rateCode ? `${duration}\n(${rateCode})` : duration,
      facilities,
      prefillNotes: Array.from(new Set(notesList)).join("\n"),
      inRoomItems: inRoomItems,
      preferences: "",
      packageName: rateCode,
      rateCode,
      rawHtml: rawText
    };
  }
}