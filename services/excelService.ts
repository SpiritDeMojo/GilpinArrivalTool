import { Guest } from '../types';
import { ROOM_MAP } from '../constants';

declare const XLSX: any;

export class ExcelService {
  private static getRoomNumber(roomString: string): number {
    if (!roomString) return 0;
    const clean = roomString.toLowerCase().replace(/[^a-z]/g, '');
    for (const key in ROOM_MAP) {
      if (clean.includes(key)) return ROOM_MAP[key];
    }
    const m = roomString.match(/^(\d+)/);
    return m ? parseInt(m[1]) : 0;
  }

  static export(guests: Guest[]) {
    // Headers mapped precisely to Rec Host Sheet: A, B, C, D, E, F, G, H, I, J, K, L
    const headers = [
      "Room", 
      "Guest Name", 
      "Car Reg", 
      "Car Type", 
      "L & L", 
      "ETA", 
      "Arrival Time", 
      "Location", 
      "Notes", 
      "Status",
      "Initial",
      "Time"
    ];
    
    // Aligned to visual structure of the Rec Host Sheet screenshot
    const masterRooms: ({ n: number, l: string, gap?: boolean, header?: string })[] = [
      { n: 1, l: "1 LYTH" }, { n: 2, l: "2 WINSTER" }, { n: 3, l: "3 CLEABARROW" },
      { n: 4, l: "4 CROSTHWAITE" }, { n: 5, l: "5 CROOK" }, { n: 6, l: "6 WETHERLAM" },
      { n: 0, l: "", gap: true },
      { n: 7, l: "7 HEATHWAITE" }, { n: 8, l: "8 TROUTBECK" }, { n: 9, l: "9 KENTMERE" },
      { n: 10, l: "10 RYDAL" }, { n: 11, l: "11 GRASMERE" }, { n: 12, l: "12 PATTERDALE" },
      { n: 13, l: "13 THIRLMERE" }, { n: 14, l: "14 BUTTERMERE" },
      { n: 0, l: "", gap: true },
      { n: 15, l: "15 CATBELLS" }, { n: 16, l: "16 CRINKLE CRAGS" }, { n: 17, l: "17 DOLLYWAGON" },
      { n: 18, l: "18 HAYSTACKS" }, { n: 19, l: "19 ST SUNDAY" }, { n: 20, l: "20 SERGEANT MAN" },
      { n: 0, l: "", gap: true },
      { n: 21, l: "21 BIRDOSWALD" }, { n: 22, l: "22 MAGLONA" }, { n: 23, l: "23 GLANNOVENTA" },
      { n: 24, l: "24 VOREDA" }, { n: 25, l: "25 HARDKNOTT" }, { n: 26, l: "26 BRATHAY" },
      { n: 27, l: "27 CRAKE" }, { n: 28, l: "28 DUDDON" }, { n: 30, l: "30 LOWTHER" }, { n: 31, l: "31 LYVENNET" },
      { n: 0, l: "Lakehouse rooms", header: "Lakehouse rooms" }, // Match the orange banner in screenshot
      { n: 51, l: "51 HARRIET" }, 
      { n: 52, l: "52 ETHEL" }, 
      { n: 53, l: "53 ADGIE" }, 
      { n: 54, l: "54 GERTIE" }, 
      { n: 55, l: "55 MAUD" }, // Room 55 Included as requested
      { n: 56, l: "56 BEATRICE" }, 
      { n: 57, l: "57 TARN SUITE" }, // Corrected labels to match screenshot
      { n: 58, l: "58 KNIPE SUITE" }
    ];

    const guestMap = new Map<number, Guest>();
    guests.forEach(g => {
      const rNum = this.getRoomNumber(g.room);
      if (rNum > 0) guestMap.set(rNum, g);
    });

    const wsData: any[][] = [headers];

    masterRooms.forEach(item => {
      if (item.header) {
        wsData.push([item.header, "", "", "", "", "", "", "", "", "", "", ""]);
      } else if (item.gap) {
        wsData.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
      } else {
        const g = guestMap.get(item.n);
        if (g) {
          wsData.push([
            item.l, 
            g.name, 
            g.car, 
            "", // Car Type
            g.ll, 
            g.eta, 
            "", // Arrival Time
            "", // Location
            g.prefillNotes.replace(/\n/g, ' • '), 
            "", // Status
            "", // Initial
            ""  // Time
          ]);
        } else {
          wsData.push([item.l, "", "", "", "", "", "", "", "", "", "", ""]);
        }
      }
    });

    const extraGuests = guests.filter(g => {
      const rNum = this.getRoomNumber(g.room);
      return !masterRooms.find(m => m.n === rNum) || rNum === 0;
    });

    if (extraGuests.length > 0) {
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", ""]);
      wsData.push(["Extra / Unassigned", "", "", "", "", "", "", "", "", "", "", ""]);
      extraGuests.forEach(g => {
        wsData.push([g.room, g.name, g.car, "", g.ll, g.eta, "", "", g.prefillNotes.replace(/\n/g, ' • '), "", "", ""]);
      });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply some basic column width formatting
    ws['!cols'] = [
      { wch: 18 }, // Room
      { wch: 30 }, // Guest Name
      { wch: 12 }, // Car Reg
      { wch: 10 }, // Car Type
      { wch: 8 },  // L & L
      { wch: 8 },  // ETA
      { wch: 12 }, // Arrival Time
      { wch: 15 }, // Location
      { wch: 50 }, // Notes
      { wch: 10 }, // Status
      { wch: 8 },  // Initial
      { wch: 8 }   // Time
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Master Copy");
    XLSX.writeFile(wb, `Gilpin_Arrivals_Rec_Host_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
