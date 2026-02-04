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
    <div className="w-full bg-white border-b-2 border-black mb-2 px-4 py-0.5 grid grid-cols-[20%_50%_30%] items-end">
      {/* LEFT: Timestamp */}
      <div className="flex flex-col justify-self-start text-left">
        <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Security Audit</span>
        <span className="text-[10px] font-bold text-black">{timestamp}</span>
      </div>

      {/* CENTER: Logo and Title */}
      <div className="flex flex-col items-center justify-self-center w-full">
        <div className="flex items-center gap-3 mb-1">
           <img src={GILPIN_LOGO_URL} alt="Gilpin" className="h-8 object-contain" />
           <h1 className="heading-font text-xl font-black text-black leading-none uppercase tracking-tighter whitespace-nowrap">
            {titles[mode]}
          </h1>
        </div>
        <div className="text-[#c5a065] font-black text-[10px] tracking-[0.3em] uppercase border-t border-[#c5a065]/30 pt-0.5">
          {arrivalDateStr}
        </div>
      </div>

      {/* RIGHT: Stats */}
      <div className="justify-self-end transform scale-[0.65] origin-bottom-right">
        <Dashboard guests={guests} activeFilter="all" onFilterChange={() => {}} />
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
    const keywords = ['nut', 'milk', 'dairy', 'gluten', 'celiac', 'coeliac', 'allergy', 'anaphylaxis', 'vegan', 'vegetarian'];
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
          @page { size: landscape; margin: 0.3cm; }
          
          /* GLOBAL PRINT RESET */
          body { -webkit-print-color-adjust: exact; background: white; font-size: 9pt; margin: 0 !important; padding: 0 !important; }
          table { table-layout: fixed !important; width: 100% !important; border-collapse: collapse; }
          td, th { padding: 2px 4px !important; vertical-align: top !important; border-bottom: 1px solid #ccc; overflow: hidden; line-height: 1.1; }
          
          .print-only { display: block !important; min-height: auto !important; }
          thead { display: table-header-group !important; }

          /* HIDE UNUSED COLUMNS */
          .col-inroom, .col-allergies { display: none; }
          .print-mode-greeter .col-nts, .print-mode-greeter .col-facilities, .print-mode-greeter .col-intel, .print-mode-greeter .col-inroom, .print-mode-greeter .col-allergies { display: none !important; }
          .print-mode-delivery .col-identity, .print-mode-delivery .col-vehicle, .print-mode-delivery .col-ll, .print-mode-delivery .col-facilities, .print-mode-delivery .col-strategy, .print-mode-delivery .col-nts, .print-mode-delivery .col-eta, .print-mode-delivery .col-intel { display: none !important; }
          .print-mode-delivery .col-inroom, .print-mode-delivery .col-allergies { display: table-cell !important; }

          /* --- ULTRA-DENSITY COLUMN WIDTHS --- */

          /* GREETER: Squeezed for maximum Strategic horizontal span */
          .print-mode-greeter th:nth-child(1) { width: 4% !important; } 
          .print-mode-greeter .col-identity { width: 15% !important; } 
          .print-mode-greeter .col-vehicle { width: 10% !important; } 
          .print-mode-greeter .col-ll { width: 6% !important; } 
          .print-mode-greeter .col-eta { width: 5% !important; } 
          .print-mode-greeter .col-strategy { width: 60% !important; font-size: 8pt !important; white-space: normal !important; }

          /* DELIVERY: Maximize In-Room Assets flow */
          .print-mode-delivery th:nth-child(1) { width: 4% !important; } 
          .print-mode-delivery .col-inroom { width: 75% !important; font-size: 8pt !important; white-space: normal !important; } 
          .print-mode-delivery .col-allergies { width: 21% !important; }

          /* MASTER: Balanced High Density */
          .print-mode-master th:nth-child(1) { width: 5% !important; } 
          .print-mode-master .col-identity { width: 15% !important; } 
          .print-mode-master .col-nts { width: 3% !important; } 
          .print-mode-master .col-vehicle { width: 10% !important; } 
          .print-mode-master .col-ll { width: 5% !important; } 
          .print-mode-master .col-facilities { width: 18% !important; font-size: 8pt !important; } 
          .print-mode-master .col-eta { width: 5% !important; } 
          .print-mode-master .col-intel { width: 19% !important; font-size: 8pt !important; } 
          .print-mode-master .col-strategy { width: 20% !important; font-size: 8pt !important; }
        }
      `}} />

      <table className="w-full">
        <thead>
          {/* Repeating Branded Header */}
          <tr>
            <td colSpan={11} className="border-none p-0">
              <PrintHeader mode={printMode} arrivalDateStr={dateStr} guests={guests} />
            </td>
          </tr>
          <tr className="bg-gray-100 text-black text-[8pt] uppercase font-black border-y border-black">
            <th className="p-1 w-[5%] text-center">Room</th>
            <th className="p-1 w-[15%] text-left col-identity">Identity</th>
            <th className="p-1 w-[3%] text-center col-nts">Nts</th>
            <th className="p-1 w-[10%] text-left col-vehicle">Vehicle</th>
            <th className="p-1 w-[5%] text-center col-ll">L&L</th>
            <th className="p-1 w-[18%] text-left col-facilities">Facilities</th>
            <th className="p-1 w-[5%] text-center col-eta">ETA</th>
            <th className="p-1 w-[19%] text-left col-intel">Intelligence</th>
            <th className="p-1 w-[20%] text-left col-strategy">Strategy</th>
            <th className="p-1 w-[70%] text-left col-inroom">In-Room Items</th>
            <th className="p-1 w-[25%] text-left col-allergies text-rose-600">Dietary Alerts</th>
          </tr>
        </thead>
        <tbody>
          {guests.map(g => (
            <tr key={g.id} className="border-b border-gray-200 break-inside-avoid">
              <td className="p-1 text-center font-black text-xl align-top">{g.room.split(' ')[0]}</td>
              <td className="p-1 align-top col-identity">
                <div className="font-black text-sm uppercase leading-tight">{g.name}</div>
                <div className="text-[7pt] text-gray-500 font-bold uppercase tracking-wider">{g.packageName}</div>
              </td>
              <td className="p-1 text-center font-bold text-xs align-top col-nts">{g.duration}</td>
              <td className="p-1 font-mono font-bold text-[9pt] uppercase align-top col-vehicle">{g.car || "—"}</td>
              <td className="p-1 text-center font-black uppercase text-[8pt] align-top col-ll">
                {/* Tactical Fix: Display full Loyalty string (e.g., "YES (x3)") for strategic depth */}
                {g.ll || "—"}
              </td>
              <td className="p-1 text-[8pt] leading-tight align-top col-facilities">{g.facilities}</td>
              <td className="p-1 text-center font-black text-sm align-top col-eta">{g.eta}</td>
              <td className="p-1 text-[8pt] italic leading-tight align-top col-intel">{g.prefillNotes}</td>
              <td className="p-1 text-xs font-normal text-indigo-900 leading-tight align-top col-strategy">{g.preferences}</td>
              <td className="p-1 text-sm font-black text-slate-900 leading-tight align-top col-inroom border-l border-dashed border-gray-200">
                {g.inRoomItems || <span className="text-gray-300 font-normal italic">Standard Setup</span>}
              </td>
              <td className="p-1 text-sm font-bold text-rose-600 italic leading-tight align-top col-allergies">
                 {getDeliveryDietary(g.prefillNotes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};