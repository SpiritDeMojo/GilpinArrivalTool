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
    <div className="w-full bg-white border-b-4 border-black mb-6 px-4 py-4 flex items-center justify-between">
      {/* Far Left: Printed Timestamp */}
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase text-gray-400">Security Audit</span>
        <span className="text-[12px] font-bold text-black">Printed: {timestamp}</span>
      </div>

      {/* Center: Logo and Title */}
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full border-4 border-[#c5a065] bg-white flex items-center justify-center shadow-md overflow-hidden p-2">
          <img src={GILPIN_LOGO_URL} alt="Gilpin" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col">
          <h1 className="heading-font text-4xl font-black text-black leading-none uppercase tracking-tighter">
            {titles[mode]}
          </h1>
          <div className="text-[#c5a065] font-black text-sm tracking-[0.3em] uppercase mt-1">
            {arrivalDateStr}
          </div>
        </div>
      </div>

      {/* Right: Dashboard Stats */}
      <div className="scale-75 origin-right">
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
  
  const getColClasses = (mode: PrintMode) => {
    return `print-mode-${mode}`;
  };

  return (
    <div className={`print-only ${getColClasses(printMode)} bg-white min-h-screen font-sans`}>
      <PrintHeader mode={printMode} arrivalDateStr={dateStr} guests={guests} />
      
      <div className="px-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-black text-[10pt] uppercase font-black border-y-2 border-black">
              <th className="p-2 w-[8%] text-center">Room</th>
              <th className="p-2 w-[20%] text-left col-identity">Identity</th>
              <th className="p-2 w-[4%] text-center col-nts">Nts</th>
              <th className="p-2 w-[12%] text-left col-vehicle">Vehicle</th>
              <th className="p-2 w-[6%] text-center col-ll">L&L</th>
              <th className="p-2 w-[25%] text-left col-facilities">Facilities</th>
              <th className="p-2 w-[8%] text-center col-eta">ETA</th>
              <th className="p-2 w-[20%] text-left col-intel">Intelligence</th>
              <th className="p-2 w-[20%] text-left col-strategy">Strategy</th>
              
              {/* Specialized Columns for Delivery Mode */}
              <th className="p-2 w-[25%] text-left col-inroom">In-Room Items</th>
              <th className="p-2 w-[25%] text-left col-allergies">Dietary / Allergies</th>
            </tr>
          </thead>
          <tbody>
            {guests.map(g => (
              <tr key={g.id} className="border-b border-gray-300">
                <td className="p-3 text-center font-black text-xl">{g.room.split(' ')[0]}</td>
                
                <td className="p-3 col-identity">
                  <div className="font-black text-lg uppercase leading-none">{g.name}</div>
                  <div className="text-[9pt] text-gray-500 font-bold mt-1 uppercase tracking-wider">{g.packageName}</div>
                </td>
                
                <td className="p-3 text-center font-bold col-nts">{g.duration}</td>
                
                <td className="p-3 font-mono font-bold text-md col-vehicle uppercase">{g.car || "—"}</td>
                
                <td className="p-3 text-center font-black col-ll uppercase text-sm">
                  {g.ll.toLowerCase().includes('yes') ? 'L&L' : 'No'}
                </td>
                
                <td className="p-3 text-[10pt] leading-snug col-facilities">{g.facilities}</td>
                
                <td className="p-3 text-center font-black text-xl col-eta">{g.eta}</td>
                
                <td className="p-3 text-[10pt] italic leading-tight col-intel">
                  {g.prefillNotes}
                </td>
                
                <td className="p-3 text-[11pt] font-black text-indigo-900 leading-tight col-strategy">
                  {g.preferences}
                </td>

                {/* Delivery Mode Specific Data Cells */}
                <td className="p-3 text-[11pt] font-black text-indigo-800 leading-tight col-inroom">
                  {g.inRoomItems || "Standard Assets"}
                </td>
                
                <td className="p-3 text-[11pt] font-bold text-rose-800 italic leading-tight col-allergies">
                  {/* Extract allergies/diets from prefillNotes or display the string */}
                  {g.prefillNotes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 px-4 text-[10px] font-black uppercase text-gray-400 border-t pt-4">
        Gilpin Hotel Intelligence Hub • Tactical Deployment Sheet • Confidential
      </div>
    </div>
  );
};