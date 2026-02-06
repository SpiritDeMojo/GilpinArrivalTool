import React from 'react';
import { Guest, PrintMode } from '../types';
import { GILPIN_LOGO_URL } from '../constants';
import Dashboard from './Dashboard';

interface PrintHeaderProps {
  mode: PrintMode;
  arrivalDateStr: string;
  guests: Guest[];
}

const PrintHeader: React.FC<PrintHeaderProps> = ({ mode, arrivalDateStr, guests }) => {
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
    <div className="w-full bg-white border-b border-black py-1 px-2 flex items-center justify-between">
      {/* LEFT: Branded Identity & Meta */}
      <div className="flex items-center gap-4">
        <img src={GILPIN_LOGO_URL} alt="Gilpin" className="h-6 object-contain" />
        <div className="flex flex-col">
          <h1 className="heading-font text-sm font-black text-black leading-none uppercase tracking-tighter">
            {titles[mode]}
          </h1>
          <div className="text-[#c5a065] font-black text-[8px] tracking-[0.2em] uppercase">
            {arrivalDateStr}
          </div>
        </div>
      </div>

      {/* RIGHT: Compact Stats Stream */}
      <div className="flex items-center gap-6">
        <div className="flex gap-2 transform scale-90 origin-right">
          <Dashboard 
            guests={guests} 
            activeFilter="all" 
            onFilterChange={() => {}} 
            propertyFilter="total" 
            onPropertyChange={() => {}} 
          />
        </div>
        <div className="text-right border-l border-gray-200 pl-4 hidden sm:block">
          <span className="text-[7px] font-black uppercase text-gray-400 block tracking-widest">Audit Sync</span>
          <span className="text-[9px] font-bold text-black">{timestamp}</span>
        </div>
      </div>
    </div>
  );
};

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

  return (
    <div className={`print-only print-mode-${printMode} bg-white font-sans`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: landscape; 
            margin: 0.15cm 0.3cm; 
          }
          
          /* GLOBAL PRINT RESET */
          body { 
            -webkit-print-color-adjust: exact; 
            background: white !important; 
            font-size: 8pt; 
            margin: 0 !important; 
            padding: 0 !important; 
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
            border-bottom: 0.5pt solid #ddd; 
            overflow: hidden; 
            line-height: 1.1; 
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

          /* --- ULTRA-DENSITY COLUMN WIDTHS --- */

          /* GREETER: Maximum horizontal strategy span */
          .print-mode-greeter th:nth-child(1) { width: 4% !important; } 
          .print-mode-greeter .col-identity { width: 14% !important; } 
          .print-mode-greeter .col-vehicle { width: 9% !important; } 
          .print-mode-greeter .col-ll { width: 5% !important; } 
          .print-mode-greeter .col-eta { width: 5% !important; } 
          .print-mode-greeter .col-strategy { width: 63% !important; font-size: 8pt !important; white-space: normal !important; }

          /* DELIVERY: Maximize HK flow */
          .print-mode-delivery th:nth-child(1) { width: 5% !important; } 
          .print-mode-delivery .col-inroom { width: 73% !important; font-size: 8.5pt !important; white-space: normal !important; } 
          .print-mode-delivery .col-allergies { width: 22% !important; }

          /* MASTER: Balanced Logic */
          .print-mode-master th:nth-child(1) { width: 5% !important; } 
          .print-mode-master .col-identity { width: 14% !important; } 
          .print-mode-master .col-nts { width: 3% !important; } 
          .print-mode-master .col-vehicle { width: 9% !important; } 
          .print-mode-master .col-ll { width: 5% !important; } 
          .print-mode-master .col-facilities { width: 17% !important; font-size: 7.5pt !important; } 
          .print-mode-master .col-eta { width: 4% !important; } 
          .print-mode-master .col-intel { width: 21% !important; font-size: 7.5pt !important; } 
          .print-mode-master .col-strategy { width: 22% !important; font-size: 7.5pt !important; }
          
          /* Optimization for single page fitting */
          tr { page-break-inside: avoid !important; }
        }
      `}} />

      <table className="w-full">
        <thead>
          {/* repeating header row */}
          <tr>
            <td colSpan={11} className="border-none p-0 pb-1">
              <PrintHeader mode={printMode} arrivalDateStr={dateStr} guests={guests} />
            </td>
          </tr>
          <tr className="bg-gray-100 text-black text-[7pt] uppercase font-black border-y border-black">
            <th className="p-1 w-[5%] text-center">Room</th>
            <th className="p-1 w-[14%] text-left col-identity">Identity</th>
            <th className="p-1 w-[3%] text-center col-nts">Nts</th>
            <th className="p-1 w-[9%] text-left col-vehicle">Vehicle</th>
            <th className="p-1 w-[5%] text-center col-ll">L&L</th>
            <th className="p-1 w-[17%] text-left col-facilities">Facilities</th>
            <th className="p-1 w-[4%] text-center col-eta">ETA</th>
            <th className="p-1 w-[21%] text-left col-intel">Intelligence</th>
            <th className="p-1 w-[22%] text-left col-strategy">Strategy</th>
            <th className="p-1 w-[70%] text-left col-inroom">In-Room Assets</th>
            <th className="p-1 w-[25%] text-left col-allergies text-rose-700">Dietary Alerts</th>
          </tr>
        </thead>
        <tbody>
          {guests.map(g => (
            <tr key={g.id} className="border-b border-gray-200">
              <td className="p-1 text-center font-black text-lg align-top">{g.room.split(' ')[0]}</td>
              <td className="p-1 align-top col-identity">
                <div className="font-black text-sm uppercase leading-tight truncate">{g.name}</div>
                <div className="text-[6pt] text-gray-500 font-bold uppercase tracking-wider">{g.packageName}</div>
              </td>
              <td className="p-1 text-center font-bold text-xs align-top col-nts">{g.duration}</td>
              <td className="p-1 font-mono font-bold text-[8pt] uppercase align-top col-vehicle">{g.car || "—"}</td>
              <td className="p-1 text-center font-black uppercase text-[7.5pt] align-top col-ll">
                {g.ll || "—"}
              </td>
              <td className="p-1 text-[7.5pt] leading-tight align-top col-facilities">{g.facilities}</td>
              <td className="p-1 text-center font-black text-[10pt] align-top col-eta">{g.eta}</td>
              <td className="p-1 text-[7.5pt] italic leading-tight align-top col-intel">{g.prefillNotes}</td>
              <td className="p-1 text-[7.5pt] font-normal text-indigo-900 leading-tight align-top col-strategy">{g.preferences}</td>
              <td className="p-1 text-[8pt] font-black text-slate-900 leading-tight align-top col-inroom border-l border-dashed border-gray-200">
                {g.inRoomItems || <span className="text-gray-300 font-normal italic">Standard Setup</span>}
              </td>
              <td className="p-1 text-[8pt] font-bold text-rose-700 italic leading-tight align-top col-allergies">
                 {getDeliveryDietary(g.prefillNotes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};