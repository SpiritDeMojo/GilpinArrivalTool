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

    const packageRegex = /\b(MIN|MAGESC|BB_1|BB_2|BB_3|BB_|APR_1_BB|APR_2_BB|APR_3_BB|COMP|LHAPR|LHMAG|LHBB1|LHBB2|LHBB|RO)\b/i;
    const rateCodeMatch = singleLineText.match(packageRegex);
    const rateCode = rateCodeMatch ? rateCodeMatch[1].toUpperCase() : "";

    // ULTIMATE STAY DURATION LOGIC: Date delta calculation
    let duration = "1";
    if (arrivalDate) {
        const firstLineRaw = block.lines[0].items.map((i: any) => i.str).join(" ");
        const firstLineDates = firstLineRaw.match(/\d{2}\/\d{2}\/\d{2,4}/g) || [];
        
        if (firstLineDates.length > 0) {
            // Find a date that is clearly after the arrival date
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
                    if (diffDays > 0 && diffDays < 15) {
                        duration = diffDays.toString();
                        break;
                    }
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

    let ll = "No";
    const historyMatch = singleLineText.match(/Stayed\s*(\d+)\s*times/i) || singleLineText.match(/Been Before:\s*Yes\s*\(?x\s*(\d+)\)?/i);
    if (historyMatch) {
      ll = `Yes (x${historyMatch[1]})`;
    } else if (singleLineText.match(/Stayed Before|_Regular/i)) {
      ll = "Yes";
    }

    // STRICT WHITELISTED IN ROOM ITEMS
    const inRoomWhitelist = [
      "champagne", "champ", "flowers", "spa hamper", "bollinger", 
      "prosecco", "card with a specific message", "card", 
      "minimoon", "magical escape", "chocolates", "itinerary"
    ];
    const inRoomMarkers = ["In Room on Arrival:", "In-Room:", "IN ROOM:", "In Room Spa Hamper:", "Billing:", "Traces:"];
    let rawInRoomItems: string[] = [];
    
    if (rateCode === "MIN" || rateCode === "MAGESC" || scanLower.includes("minimoon") || scanLower.includes("magical escape")) {
        rawInRoomItems.push("Champagne", "Itinerary");
    }

    inRoomMarkers.forEach(marker => {
      const extracted = this.extractSection(singleLineText, marker, ["HK Notes:", "Guest Notes:", "Unit:", "Billing:", "Facility Bookings:", "Req. Vip", "Page", "P.O.Nr"]);
      if (extracted && extracted.length > 2) {
        const parts = extracted.split(/,|•|\/|\||&/).map(p => p.trim()).filter(p => p.length > 2);
        parts.forEach(part => {
            if (inRoomWhitelist.some(w => part.toLowerCase().includes(w))) {
                rawInRoomItems.push(part.replace(/🎁|IN ROOM:/g, "").trim());
            }
        });
      }
    });

    let notesList: string[] = [];
    const occSection = this.extractSection(singleLineText, "Occasion:", ["P.O.Nr:", "Traces:", "Booking Notes:", "Facility Bookings:"]);
    const combinedOcc = occSection.replace(/None|NDR|^\d+$/i, "").trim();
    if(combinedOcc.length > 2) notesList.push(`🎉 ${combinedOcc}`);

    const hkRaw = this.extractSection(singleLineText, "HK Notes:", ["Unit:", "Page", "Guest Notes:", "Billing:", "Booking Notes:", "P.O.Nr"]);
    if(hkRaw && !hkRaw.match(/Booking\.com/i)) notesList.push(`🏠 ${hkRaw}`);
    
    const guestRaw = this.extractSection(singleLineText, "Guest Notes:", ["HK Notes:", "Billing:", "Unit:", "Booking Notes:", "P.O.Nr"]);
    if(guestRaw) notesList.push(`👤 ${guestRaw}`);

    flags.forEach(f => {
      const match = f.keys.some(k => {
        const keyLower = k.toLowerCase();
        const regex = new RegExp(`\\b${keyLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if ((keyLower === "cat" || keyLower === "pet" || keyLower === "dog") && (room.toLowerCase().includes("catbells") || scanLower.includes("category"))) {
          return false;
        }
        return regex.test(scanLower);
      });
      if (match) notesList.push(`${f.emoji} ${f.name}`);
    });

    let inRoomStr = Array.from(new Set(rawInRoomItems)).join(" • ");
    if (inRoomStr) notesList.push(`🎁 IN ROOM: ${inRoomStr}`);

    const facilitiesRaw = this.extractSection(singleLineText, "Facility Bookings:", ["HK Notes:", "Guest Notes:", "Unit:", "Billing:", "Booking Notes:", "P.O.Nr"]);
    const facilities = facilitiesRaw.split('/').map(f => f.trim()).filter(f => f.length > 5).map(f => {
        let fText = f;
        if (f.toLowerCase().includes("spice")) fText = "🌶️ " + f;
        else if (f.toLowerCase().includes("source")) fText = "🍴 " + f;
        else if (f.toLowerCase().includes("spa") || f.toLowerCase().includes("massage") || f.toLowerCase().includes("facial")) fText = "💆‍♀️ " + f;
        else if (f.toLowerCase().includes("bento")) fText = "🍱 " + f;
        else if (f.toLowerCase().includes("hot-tub") || f.toLowerCase().includes("pool") || f.toLowerCase().includes("mud")) fText = "♨️ " + f;
        return fText;
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
      prefillNotes: Array.from(new Set(notesList)).join("\n"),
      inRoomItems: inRoomStr,
      preferences: "",
      packageName: rateCode,
      rateCode,
      rawHtml: rawText
    };
  }
}
