import React, { useRef, useEffect } from 'react';
import { Guest } from '../types';

interface GuestRowProps {
  guest: Guest;
  isEditMode: boolean;
  onUpdate: (updates: Partial<Guest>) => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const highlightRaw = (text: string) => {
  if (!text) return "";
  let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  // Highlight ID and Package Codes
  html = html.replace(/(\d{5})/g, '<span class="hl-badge hl-id">ID: $1</span>');
  html = html.replace(/\b(BB_1|BB_2|BB_3|BB_|APR_1_BB|APR_2_BB|APR_3_BB|MIN|MAGESC|COMP|LHAPR|LHMAG|LHBB1|LHBB2|LHBB|RO)\b/g, '<span class="hl-badge hl-ro">$1</span>');
  
  // UK Numberplate Highlight
  html = html.replace(/\b([A-Z]{2}[0-9]{2}\s?[A-Z]{3}|[A-Z][0-9]{1,3}\s?[A-Z]{3}|[A-Z]{3}\s?[0-9]{1,3}[A-Z])\b/gi, '<span class="hl-badge hl-car">$1</span>');
  
  // Section Highlights
  const sections = [
    { regex: /(HK Notes:.*?)(?=\n|Unit:|Page|Billing:|Guest Notes:)/gi, cls: "hl-ctx-teal" },
    { regex: /(Guest Notes:.*?)(?=\n|Unit:|Page|Billing:|HK Notes:)/gi, cls: "hl-ctx-purple" },
    { regex: /(In Room.*?:.*?)(?=\n|Billing|HK Notes|Checked:|Guest Notes:)/gi, cls: "hl-ctx-blue" },
    { regex: /((?:Allergies|Dietary|Complaint|Issue|Alert):.*?)(?=\n|HK Notes|Billing|$)/gi, cls: "hl-ctx-red" }
  ];

  sections.forEach(s => {
    html = html.replace(s.regex, (match) => `<span class="hl-block ${s.cls}">${match}</span>`);
  });

  return html;
};

const ResizableTextArea = ({ field, className, value, bold, center, onUpdate }: { 
  field: keyof Guest, 
  className?: string, 
  value: string, 
  bold?: boolean, 
  center?: boolean,
  onUpdate: (updates: Partial<Guest>) => void
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = '0px';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value || ''}
      onChange={(e) => onUpdate({ [field]: e.target.value })}
      rows={1}
      className={`w-full bg-transparent resize-none overflow-hidden outline-none p-1.5 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[#c5a065] dark:focus:border-amber-400 rounded transition-all duration-200 ${center ? 'text-center' : ''} ${bold ? 'font-extrabold' : 'font-semibold'} ${className} text-slate-900 dark:text-slate-100 block leading-tight`}
    />
  );
};

const GuestRow: React.FC<GuestRowProps> = ({ 
  guest, onUpdate, onDelete, isExpanded, onToggleExpand 
}) => {
  const isElite = (guest.stayHistoryCount || 0) > 5;

  return (
    <>
      <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 no-print">
        <td className="p-3 align-middle text-center">
          <button onClick={onDelete} className="text-slate-300 hover:text-rose-500 font-bold transition-colors text-xl">×</button>
        </td>
        <td className="p-3 align-top">
          <ResizableTextArea field="room" value={guest.room} bold onUpdate={onUpdate} className="uppercase text-[13px] text-[#c5a065] dark:text-amber-400" />
        </td>
        <td className="p-3 align-top">
          <div className="flex flex-col gap-1">
            <ResizableTextArea field="name" value={guest.name} bold onUpdate={onUpdate} className="text-[13px]" />
            {guest.packageName && (
              <span className="text-[8px] font-black bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-900 px-1.5 py-0.5 rounded uppercase tracking-widest w-fit">
                {guest.packageName}
              </span>
            )}
          </div>
        </td>
        <td className="p-3 align-top">
          <ResizableTextArea field="duration" value={guest.duration} center onUpdate={onUpdate} className="text-slate-500 dark:text-slate-400 font-bold text-[11px]" />
        </td>
        <td className="p-3 align-top">
          <ResizableTextArea field="car" value={guest.car} onUpdate={onUpdate} className="uppercase font-mono text-indigo-700 dark:text-indigo-400 font-bold text-[11px]" />
        </td>
        <td className="p-3 align-top text-center">
          <div className="flex flex-col items-center">
            <span className={`text-[11px] font-black ${guest.ll.toLowerCase().includes('yes') ? 'text-emerald-600' : 'text-slate-300'}`}>
              {guest.ll}
            </span>
            {isElite && <span className="text-[8px] text-amber-500 font-black uppercase tracking-tighter">Elite</span>}
          </div>
        </td>
        <td className="p-3 align-top">
          <ResizableTextArea field="facilities" value={guest.facilities} onUpdate={onUpdate} className="text-[11px] leading-snug" />
        </td>
        <td className="p-3 align-top">
          <ResizableTextArea field="preferences" value={guest.preferences} onUpdate={onUpdate} className="text-[11px] leading-snug text-purple-700 dark:text-purple-400 italic font-medium" />
        </td>
        <td className="p-3 align-top">
          <ResizableTextArea field="eta" value={guest.eta} center onUpdate={onUpdate} className="font-black text-[13px]" />
        </td>
        <td className="p-3 align-top">
          <ResizableTextArea field="prefillNotes" value={guest.prefillNotes} onUpdate={onUpdate} className="text-[11px] leading-snug italic text-slate-600 dark:text-slate-400" />
        </td>
      </tr>
      <tr className="no-print border-b border-slate-100 dark:border-slate-800/50">
        <td colSpan={10} className="px-10 py-0">
          <div 
            className={`raw-data-header ${isExpanded ? 'open' : ''}`} 
            onClick={onToggleExpand}
          >
            <div className="triangle"></div>
            <span>{guest.isManual ? 'Manual Entry Intel' : `Raw Intelligence Data (${guest.id})`}</span>
          </div>
          {isExpanded && (
            <div className="raw-intel-box p-6 mb-6 animate-in fade-in slide-in-from-top-2">
              <div 
                className="select-all custom-scrollbar overflow-x-auto whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightRaw(guest.rawHtml) }}
              />
            </div>
          )}
        </td>
      </tr>
    </>
  );
};

export default GuestRow;