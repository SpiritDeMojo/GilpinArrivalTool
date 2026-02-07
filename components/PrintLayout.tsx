import React from 'react';
import { Guest, PrintMode } from '../types';
import { GILPIN_LOGO_URL, getRoomNumber } from '../constants';
import Dashboard from './Dashboard';

interface PrintHeaderProps {
  mode: PrintMode;
  arrivalDateStr: string;
  guests: Guest[];
  sectionLabel?: string;
}

const PrintHeader: React.FC<PrintHeaderProps> = ({ mode, arrivalDateStr, guests, sectionLabel }) => {
  const timestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const titles = {
    master: 'ARRIVALS MASTER',
    greeter: 'GREETER LIST',
    delivery: 'DELIVERY MANIFEST'
  };

  return (
    <div className="w-full bg-white border-b-2 border-black py-1 px-2 flex items-center justify-between">
      {/* LEFT: Branded Identity & Meta */}
      <div className="flex items-center gap-3">
        <img src={GILPIN_LOGO_URL} alt="Gilpin" className="h-5 object-contain" />
        <div className="flex flex-col">
          <h1 className="heading-font text-xs font-black text-black leading-none uppercase tracking-tighter">
            {titles[mode]}
          </h1>
          <div className="text-[#c5a065] font-bold text-[8px] tracking-[0.2em] uppercase">
            {arrivalDateStr}{sectionLabel ? ` — ${sectionLabel}` : ''}
          </div>
        </div>
      </div>

      {/* RIGHT: Compact Stats Stream */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2 transform scale-75 origin-right">
          <Dashboard
            guests={guests}
            activeFilter="all"
            onFilterChange={() => { }}
            propertyFilter="total"
            onPropertyChange={() => { }}
          />
        </div>
        <div className="text-right border-l border-gray-200 pl-3 hidden sm:block">
          <span className="text-[6px] font-bold uppercase text-gray-400 block tracking-widest">Printed</span>
          <span className="text-[8px] text-black">{timestamp}</span>
        </div>
      </div>
    </div>
  );
};

/** Render one page-section of guests */
const GuestTable: React.FC<{
  printMode: PrintMode;
  dateStr: string;
  guests: Guest[];
  allGuests: Guest[];
  sectionLabel?: string;
  getDeliveryDietary: (notes: string) => string;
  isLastSection?: boolean;
}> = ({ printMode, dateStr, guests, allGuests, sectionLabel, getDeliveryDietary, isLastSection }) => (
  <div style={{ pageBreakAfter: isLastSection ? 'auto' : 'always' }}>
    <table className="w-full">
      <thead>
        {/* repeating header row */}
        <tr>
          <td colSpan={11} className="border-none p-0 pb-1">
            <PrintHeader mode={printMode} arrivalDateStr={dateStr} guests={allGuests} sectionLabel={sectionLabel} />
          </td>
        </tr>
        <tr className="print-col-header">
          <th className="p-1 w-[5%] text-center">Room</th>
          <th className="p-1 w-[14%] text-left col-identity">Guest</th>
          <th className="p-1 w-[3%] text-center col-nts">Nts</th>
          <th className="p-1 w-[9%] text-left col-vehicle">Vehicle</th>
          <th className="p-1 w-[5%] text-center col-ll">L&L</th>
          <th className="p-1 w-[17%] text-left col-facilities">Facilities</th>
          <th className="p-1 w-[4%] text-center col-eta">ETA</th>
          <th className="p-1 w-[21%] text-left col-intel">Notes</th>
          <th className="p-1 w-[22%] text-left col-strategy">Strategy</th>
          <th className="p-1 w-[70%] text-left col-inroom">In-Room Assets</th>
          <th className="p-1 w-[25%] text-left col-allergies">Dietary</th>
        </tr>
      </thead>
      <tbody>
        {guests.map((g, idx) => (
          <tr key={g.id} className={idx % 2 === 1 ? 'print-row-alt' : ''}>
            <td className="p-1 text-center print-room">{g.room.split(' ')[0]}</td>
            <td className="p-1 col-identity">
              <div className="print-guest-name">{g.name}</div>
              <div className="print-pkg">{g.packageName}</div>
            </td>
            <td className="p-1 text-center col-nts">{g.duration}</td>
            <td className="p-1 col-vehicle print-plate">{g.car || "—"}</td>
            <td className="p-1 text-center col-ll">{g.ll || "—"}</td>
            <td className="p-1 col-facilities print-body">{g.facilities}</td>
            <td className="p-1 text-center print-eta col-eta">{g.eta}</td>
            <td className="p-1 col-intel print-body print-notes">{g.prefillNotes}</td>
            <td className="p-1 col-strategy print-body">{g.preferences}</td>
            <td className="p-1 col-inroom print-body border-l border-dashed border-gray-200">
              {g.inRoomItems || <span className="text-gray-300 italic">Standard</span>}
            </td>
            <td className="p-1 col-allergies print-dietary">
              {getDeliveryDietary(g.prefillNotes)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);


export const PrintLayout: React.FC<{
  printMode: PrintMode;
  dateStr: string;
  guests: Guest[];
}> = ({ printMode, dateStr, guests }) => {

  const getDeliveryDietary = (notes: string) => {
    const keywords = ['nut', 'milk', 'dairy', 'gluten', 'celiac', 'celiac', 'allergy', 'anaphylaxis', 'vegan', 'vegetarian'];
    if (!notes) return "";
    const parts = notes.split(/•|\n/);
    const relevant = parts.filter(part =>
      keywords.some(k => part.toLowerCase().includes(k))
    );
    return relevant.join(" • ");
  };

  // Split guests into Main Hotel (rooms 1-31) and Lake House (rooms 51+)
  const mainHotelGuests = guests.filter(g => {
    const num = getRoomNumber(g.room);
    return num >= 1 && num <= 31;
  });
  const lakeHouseGuests = guests.filter(g => {
    const num = getRoomNumber(g.room);
    return num >= 51;
  });
  // Catch any unassigned / room 0 guests → put with main hotel
  const unassigned = guests.filter(g => {
    const num = getRoomNumber(g.room);
    return num === 0 || (num > 31 && num < 51);
  });
  const mainGuests = [...mainHotelGuests, ...unassigned];

  return (
    <div className={`print-only print-mode-${printMode} bg-white`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { 
            size: landscape; 
            margin: 0.15cm 0.25cm; 
          }
          
          /* === READABILITY-FIRST PRINT RESET === */
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }

          .print-only {
            font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif !important;
            font-size: 8.5pt !important;
            line-height: 1.25 !important;
            font-weight: 400 !important;
            color: #1a1a1a !important;
          }
          
          table { 
            table-layout: fixed !important; 
            width: 100% !important; 
            border-collapse: collapse; 
            margin-top: 2px;
          }
          
          td, th { 
            padding: 2px 3px !important; 
            vertical-align: top !important; 
            border-bottom: 0.5pt solid #d4d4d4; 
            overflow: hidden; 
            line-height: 1.25;
            font-weight: 400 !important;
          }

          /* === COLUMN HEADER ROW === */
          .print-col-header {
            background: #f0f0f0 !important;
            border-top: 1.5pt solid #333 !important;
            border-bottom: 1.5pt solid #333 !important;
          }
          .print-col-header th {
            font-size: 7pt !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.04em !important;
            color: #333 !important;
            padding: 3px !important;
          }

          /* === CELL STYLES — READABILITY FOCUSED === */
          
          /* Room: bold, prominent */
          .print-room {
            font-weight: 700 !important;
            font-size: 11pt !important;
            color: #000 !important;
          }

          /* Guest name: semibold, title case (not uppercase) */
          .print-guest-name {
            font-weight: 600 !important;
            font-size: 8.5pt !important;
            color: #111 !important;
            text-transform: capitalize !important;
            line-height: 1.15 !important;
          }

          /* Package code: subtle */
          .print-pkg {
            font-size: 6.5pt !important;
            font-weight: 500 !important;
            color: #888 !important;
            letter-spacing: 0.05em !important;
            text-transform: uppercase !important;
          }

          /* Car plate: monospace for clarity */
          .print-plate {
            font-family: 'Courier New', monospace !important;
            font-weight: 600 !important;
            font-size: 8pt !important;
            text-transform: uppercase !important;
            letter-spacing: 0.04em !important;
          }

          /* ETA: slightly larger for quick scanning */
          .print-eta {
            font-weight: 600 !important;
            font-size: 9pt !important;
          }

          /* Body text: normal weight, readable */
          .print-body {
            font-weight: 400 !important;
            font-size: 7.5pt !important;
            color: #333 !important;
            white-space: normal !important;
            word-wrap: break-word !important;
          }

          /* Notes: slightly italic for differentiation */
          .print-notes {
            font-style: italic !important;
          }

          /* Dietary alerts: coloured for visibility */
          .print-dietary {
            font-weight: 500 !important;
            font-size: 7.5pt !important;
            color: #b91c1c !important;
          }

          /* Alternating row shading */
          .print-row-alt {
            background: #fafafa !important;
          }

          /* DASHBOARD PRINT FIX: Force Row */
          .print-only .dashboard-container { 
            display: flex !important; 
            flex-direction: row !important; 
            justify-content: flex-end !important;
          }
          
          .print-only { display: block !important; min-height: auto !important; }
          thead { display: table-header-group !important; }

          /* HIDE UNUSED COLUMNS */
          .col-inroom, .col-allergies { display: none; }
          .print-mode-greeter .col-nts, .print-mode-greeter .col-facilities, .print-mode-greeter .col-intel, .print-mode-greeter .col-inroom, .print-mode-greeter .col-allergies { display: none !important; }
          .print-mode-delivery .col-identity, .print-mode-delivery .col-vehicle, .print-mode-delivery .col-ll, .print-mode-delivery .col-facilities, .print-mode-delivery .col-strategy, .print-mode-delivery .col-nts, .print-mode-delivery .col-eta, .print-mode-delivery .col-intel { display: none !important; }
          .print-mode-delivery .col-inroom, .print-mode-delivery .col-allergies { display: table-cell !important; }

          /* === COLUMN WIDTHS PER MODE === */

          /* GREETER: Room + Name prominent, Strategy wide */
          .print-mode-greeter th:nth-child(1) { width: 5% !important; } 
          .print-mode-greeter .col-identity { width: 15% !important; } 
          .print-mode-greeter .col-vehicle { width: 10% !important; } 
          .print-mode-greeter .col-ll { width: 5% !important; } 
          .print-mode-greeter .col-eta { width: 5% !important; } 
          .print-mode-greeter .col-strategy { width: 60% !important; }
          .print-mode-greeter .print-room { font-size: 14pt !important; }
          .print-mode-greeter .print-guest-name { font-size: 10pt !important; }
          .print-mode-greeter .print-body { font-size: 8.5pt !important; }

          /* DELIVERY: Maximize In-Room assets column */
          .print-mode-delivery th:nth-child(1) { width: 5% !important; } 
          .print-mode-delivery .col-inroom { width: 73% !important; } 
          .print-mode-delivery .col-allergies { width: 22% !important; }

          /* MASTER: Balanced — full width usage */
          .print-mode-master th:nth-child(1) { width: 4% !important; } 
          .print-mode-master .col-identity { width: 13% !important; } 
          .print-mode-master .col-nts { width: 3% !important; } 
          .print-mode-master .col-vehicle { width: 8% !important; } 
          .print-mode-master .col-ll { width: 4% !important; } 
          .print-mode-master .col-facilities { width: 18% !important; } 
          .print-mode-master .col-eta { width: 4% !important; } 
          .print-mode-master .col-intel { width: 22% !important; } 
          .print-mode-master .col-strategy { width: 24% !important; }
          
          /* Page break optimization */
          tr { page-break-inside: avoid !important; }
        }
      `}} />

      {/* Main Hotel Section */}
      {mainGuests.length > 0 && (
        <GuestTable
          printMode={printMode}
          dateStr={dateStr}
          guests={mainGuests}
          allGuests={guests}
          sectionLabel="Main Hotel"
          getDeliveryDietary={getDeliveryDietary}
          isLastSection={lakeHouseGuests.length === 0}
        />
      )}

      {/* Lake House Section — separate page */}
      {lakeHouseGuests.length > 0 && (
        <GuestTable
          printMode={printMode}
          dateStr={dateStr}
          guests={lakeHouseGuests}
          allGuests={guests}
          sectionLabel="The Lake House"
          getDeliveryDietary={getDeliveryDietary}
          isLastSection={true}
        />
      )}
    </div>
  );
};