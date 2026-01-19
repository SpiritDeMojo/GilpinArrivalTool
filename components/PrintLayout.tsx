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
    delivery: 'DELIVERY LIST' // Renamed from Manifest
  };

  return (
    // Grid layout forces 3 distinct zones to prevent stacking
    <div className="w-full bg-white border-b-4 border-black mb-6 px-4 py-4 grid grid-cols-[20%_60%_20%] items-end">
      
      {/* LEFT: Timestamp */}
      <div className="flex flex-col justify-self-start text-left">
        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Security Audit</span>
        <span className="text-[11px] font-bold text-black">{timestamp}</span>
      </div>

      {/* CENTER: Logo and Title */}
      <div className="flex flex-col items-center justify-self-center w-full">
        <div className="flex items-center gap-4 mb-2">
           <img src={GILPIN_LOGO_URL} alt="Gilpin" className="h-12 object-contain" />
           <h1 className="heading-font text-4xl font-black text-black leading-none uppercase tracking-tighter whitespace-nowrap">
            {titles[mode]}
          </h1>
        </div>
        <div className="text-[#c5a065] font-black text-xs tracking-[0.4em] uppercase border-t border-[#c5a065]/30 pt-1">
          {arrivalDateStr}
        </div>
      </div>

      {/* RIGHT: Stats (Scaled down to fit) */}
      <div className="justify-self-end transform scale-75 origin-bottom-right">
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
  
  // Helper to filter notes for Delivery List (Only Milk/Nut/Allergies)
  const getDeliveryDietary = (notes: string) => {
    const keywords = ['nut', 'milk', 'dairy', 'gluten', 'celiac', 'coeliac', 'allergy', 'anaphylaxis', 'vegan', 'vegetarian'];
    if (!notes) return "";
    
    // Split notes by common delimiters
    const parts = notes.split(/•|\n/);
    // Filter parts that contain relevant keywords
    const relevant = parts.filter(part => 
      keywords.some(k => part.toLowerCase().includes(k))
    );
    
    return relevant.join(" • ");
  };

  return (
    <div className={`print-only print-mode-${printMode} bg-white min-h-screen font-sans`}>
      <style>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          
          /* COLUMN VISIBILITY LOGIC */
          
          /* Master: Show All */
          
          /* Greeter: Hide NTS, Facilities, Raw Intel. Show Strategy. */
          .print-mode-greeter .col-nts, 
          .print-mode-greeter .col-facilities,
          .print-mode-greeter .col-intel,
          .print-mode-greeter .col-inroom,
          .print-mode-greeter .col-allergies { display: none !important; }
          
          /* Delivery: Hide Identity, Vehicle, LL, Facilities, Strategy, Nts, ETA, Intel */
          .print-mode-delivery .col-identity,
          .print-mode-delivery .col-vehicle,
          .print-mode-delivery .col-ll,
          .print-mode-delivery .col-facilities,
          .print-mode-delivery .col-strategy,
          .print-mode-delivery .col-nts,
          .print-mode-delivery .col-eta,
          .print-mode-delivery .col-intel { display: none !important; }

          /* Delivery: Show InRoom and Allergies */
          .print-mode-delivery .col-inroom, 
          .print-mode-delivery .col-allergies { display: table-cell !important; }
        }
      `}</style>

      <PrintHeader mode={printMode} arrivalDateStr={dateStr} guests={guests} />
      
      <div className="px-4">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-gray-100 text-black text-[9pt] uppercase font-black border-y-2 border-black">
              {/* Common Columns */}
              <th className="p-2 w-[5%] text-center">Room</th>
              
              {/* Greeter/Master Columns */}
              <th className="p-2 w-[20%] text-left col-identity">Identity</th>
              <th className="p-2 w-[5%] text-center col-nts">Nts</th>
              <th className="p-2 w-[10%] text-left col-vehicle">Vehicle</th>
              <th className="p-2 w-[5%] text-center col-ll">L&L</th>
              <th className="p-2 w-[25%] text-left col-facilities">Facilities</th>
              <th className="p-2 w-[5%] text-center col-eta">ETA</th>
              <th className="p-2 w-[20%] text-left col-intel">Intelligence</th>
              
              {/* Greeter Specific */}
              <th className="p-2 w-[25%] text-left col-strategy">Strategy</th>
              
              {/* Delivery Specific */}
              <th className="p-2 w-[40%] text-left col-inroom">In-Room Items</th>
              <th className="p-2 w-[20%] text-left col-allergies text-rose-600">Dietary Alerts</th>
            </tr>
          </thead>
          <tbody>
            {guests.map(g => (
              <tr key={g.id} className="border-b border-gray-300 break-inside-avoid">
                {/* Room */}
                <td className="p-2 text-center font-black text-2xl align-top">{g.room.split(' ')[0]}</td>
                
                {/* Identity */}
                <td className="p-2 align-top col-identity">
                  <div className="font-black text-lg uppercase leading-none">{g.name}</div>
                  <div className="text-[8pt] text-gray-500 font-bold mt-1 uppercase tracking-wider">{g.packageName}</div>
                </td>
                
                {/* Nts */}
                <td className="p-2 text-center font-bold align-top col-nts">{g.duration}</td>
                
                {/* Vehicle */}
                <td className="p-2 font-mono font-bold text-sm uppercase align-top col-vehicle">{g.car || "—"}</td>
                
                {/* L&L */}
                <td className="p-2 text-center font-black uppercase text-sm align-top col-ll">
                  {g.ll.toLowerCase().includes('yes') ? 'YES' : 'NO'}
                </td>
                
                {/* Facilities */}
                <td className="p-2 text-[9pt] leading-snug align-top col-facilities">{g.facilities}</td>
                
                {/* ETA */}
                <td className="p-2 text-center font-black text-lg align-top col-eta">{g.eta}</td>
                
                {/* Intelligence (Notes) */}
                <td className="p-2 text-[9pt] italic leading-tight align-top col-intel">
                  {g.prefillNotes}
                </td>
                
                {/* Strategy (Greeter Only) - UPDATED: Non-bold, standard text size */}
                <td className="p-2 text-[10pt] font-normal text-indigo-900 leading-snug align-top col-strategy">
                  {g.preferences}
                </td>

                {/* Delivery Mode Specific Data Cells */}
                <td className="p-2 text-[11pt] font-black text-slate-900 leading-tight align-top col-inroom border-l border-dashed border-gray-300">
                  {g.inRoomItems || <span className="text-gray-300 font-normal italic">Standard Setup</span>}
                </td>
                
                <td className="p-2 text-[10pt] font-bold text-rose-600 italic leading-tight align-top col-allergies">
                   {getDeliveryDietary(g.prefillNotes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 px-4 text-[9px] font-black uppercase text-gray-400 border-t pt-2 flex justify-between">
        <span>Gilpin Hotel Intelligence Hub</span>
        <span>{printMode.toUpperCase()} VIEW</span>
      </div>
    </div>
  );
};
