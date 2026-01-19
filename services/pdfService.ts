
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

    const guests = guestBlocks.map(block => this.parseBlock(block, arrivalDateObj)).filter(g => g !== null);
    
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

  private static formatFacilities(text: string): string {
    if (!text || text.trim() === "") return "";
    
    // Legacy v3.70 Logic: Emojis and structured formatting
    let formatted = text.replace(/\s+/g, " ");
    
    // Map specific outlets to emojis
    const mappings = [
      { key: "Spice", icon: "🌶️" },
      { key: "Source", icon: "🍽️" },
      { key: "Treatments", icon: "💆" },
      { key: "Massage", icon: "💆" },
      { key: "Afternoon Tea", icon: "🍰" },
      { key: "Bento", icon: "🍱" },
      { key: "Spa Use", icon: "♨️" }
    ];

    // Split by common delimiters (e.g., date-like patterns or semicolons)
    const bookings = formatted.split(/(\d{2}\/\d{2})/);
    let result: string[] = [];
    
    for (let i = 1; i < bookings.length; i += 2) {
      const date = bookings[i];
      let details = (bookings[i+1] || "").trim();
      
      // Extract time
      const timeMatch = details.match(/(\d{2}:\d{2})/);
      const time = timeMatch ? `@ ${timeMatch[1]}` : "";
      details = details.replace(/(\d{2}:\d{2})/, "").trim();
      
      // Extract Table for X
      const tableMatch = details.match(/Table for (\d+)/i);
      const pax = tableMatch ? `(T-${tableMatch[1]})` : "";
      details = details.replace(/Table for \d+/i, "").trim();

      // Find Emoji
      let emoji = "📅";
      for (const m of mappings) {
        if (details.toLowerCase().includes(m.key.toLowerCase())) {
          emoji = m.icon;
          break;
        }
      }

      // Clean up punctuation leftovers
      details = details.replace(/^[,\-:\s]+|[,\-:\s]+$/g, "");
      
      result.push(`${emoji} ${details} ${pax} (${date}${time})`.trim());
    }

    return result.length > 0 ? result.join(" • ") : formatted;
  }

  private static parseBlock(block: any, arrivalDate: Date | null): Guest {
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

    // Legacy v3.70 Strict Car Registration: Positioning + Exclusion List
    let car = "";
    const plateRegex = /\b([A-Z]{2}\d{2}\s?[A-Z]{3}|[A-Z]{1,2}\d{1,4}\s?[A-Z]{0,3})\b/gi;
    const carExclusions = /^(BB\d|APR|RO|COMP|GS|JS|MR|SL|SS|MAG|RATE|ID|PAGE|DATE|ROOM)/i;
    
    // In legacy, we strictly look for plates at the far right of the layout
    const possiblePlates = rawItems.filter(i => i.x > 500 && i.str.match(plateRegex));
    for (const item of possiblePlates) {
        const str = item.str.trim().toUpperCase();
        if (!str.match(carExclusions)) {
            car = str;
            break;
        }
    }

    // Legacy Loyalty Logic: Extract Visit Count
    let ll = "No";
    if (scanLower.includes("stayed before") || scanLower.includes("_regular")) {
      const visitMatch = singleLineText.match(/stayed before\s*\(?x\s*(\d+)\)?/i);
      if (visitMatch) {
        ll = `Yes (x${visitMatch[1]})`;
      } else {
        ll = "Yes";
      }
    }

    // Legacy Notes/Prefill Construction with Keyword-to-Emoji Mapping
    let notesList: string[] = [];

    // Safety First: Allergies
    if (scanLower.match(/nut allergy|anaphylaxis|no nut|peanut/)) notesList.push("🥜 Nut Allergy");
    else if (scanLower.match(/nut free|nut-free/)) notesList.push("🥜 Nut Free Req");
    
    if (scanLower.match(/gluten free|gf|coeliac|celiac/)) notesList.push("🍞 Gluten Free");
    if (scanLower.match(/dairy free|no dairy|lactose/)) notesList.push("🧀 Dairy Free");
    if (scanLower.match(/oat milk/)) notesList.push("🥛 Oat Milk Req");
    if (scanLower.match(/soya milk/)) notesList.push("🥛 Soya Milk Req");

    // VIP / Package Badges
    if (rateCode === "POB_STAFF" || scanLower.includes("pride of britain")) notesList.push("⭐ VIP (POB Staff)");
    if (scanLower.match(/celebrity|director|owner|chairman/)) notesList.push("⭐ VIP High Profile");

    // Service Alerts
    if (scanLower.includes("guest unaware") || scanLower.includes("secret")) notesList.push("🤫 Comp Upgrade (Silent)");
    if (scanLower.includes("voucher") || scanLower.includes("gift")) notesList.push("🎫 Voucher Applied");
    if (scanLower.includes("comp stay") || scanLower.includes("complimentary")) notesList.push("🟢 Comp Stay");
    if (scanLower.match(/complaint|pgi|issue|dissatisfied/)) notesList.push("🚩 Previous Problem");

    // Occasions
    if (scanLower.match(/birthday/)) notesList.push("🎉 Birthday");
    if (scanLower.match(/anniversary/)) notesList.push("🎉 Anniversary");
    if (scanLower.match(/honeymoon|proposal|engagement/)) notesList.push("🎉 Special Occasion");

    // Pet logic
    if (scanLower.match(/dog|pet in room|canine/)) notesList.push("🐾 Pet In Room");

    // Merge manual notes
    const hkNotes = this.extractSection(singleLineText, "HK Notes:", ["Unit:", "Page", "Guest Notes:", "Billing:"]);
    if (hkNotes) notesList.push(hkNotes);

    const guestNotes = this.extractSection(singleLineText, "Guest Notes:", ["Unit:", "Page", "HK Notes:", "Billing:"]);
    if (guestNotes) notesList.push(guestNotes);

    // Facilities Parsing
    const rawFac = this.extractSection(singleLineText, "Facility Bookings:", ["HK Notes:", "Guest Notes:", "Unit:", "Billing:"]);
    const facilitiesFormatted = this.formatFacilities(rawFac);

    // In Room Items
    let inRoomItemsList: string[] = [];
    const inRoomMarkers = ["In Room on Arrival:", "In-Room:", "IN ROOM:"];
    inRoomMarkers.forEach(marker => {
      const extracted = this.extractSection(singleLineText, marker, ["HK Notes:", "Guest Notes:", "Unit:", "Billing:"]);
      if (extracted) extracted.split(',').forEach(p => inRoomItemsList.push(p.trim()));
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
      prefillNotes: notesList.join(" • "),
      inRoomItems: inRoomItemsList.join(" • "),
      preferences: "",
      packageName: rateCode,
      rateCode,
      rawHtml: rawText
    };
  }
}
