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
  
  html = html.replace(/(\d{5})/g, '<span class="hl-badge hl-id">ID: $1</span>');
  html = html.replace(/\b(BB_1|BB_2|BB_3|BB_|APR_1_BB|APR_2_BB|APR_3_BB|MIN|MAGESC|COMP|LHAPR|LHMAG|LHBB1|LHBB2|LHBB|RO)\b/g, '<span class="hl-badge hl-ro">$1</span>');
  html = html.replace(/\b(Spice|Source|ESPA|Bento|Aromatherapy)\b/gi, '<span class="hl-badge hl-ctx-teal">$1</span>');
  html = html.replace(/\b([A-Z]{2}[0-9]{2}\s?[A-Z]{3}|[A-Z][0-9]{1,3}\s?[A-Z]{3}|[A-Z]{3}\s?[0-9]{1,3}[A-Z])\b/gi, '<span class="hl-badge hl-car">$1</span>');
  
  const sections = [
    { regex: /(HK Notes:.*?)(?=\n|Unit:|Page|Billing:|Guest Notes:|Booking Notes:|Traces:)/gi, cls: "hl-ctx-teal" },
    { regex: /(Guest Notes:.*?)(?=\n|Unit:|Page|Billing:|HK Notes:|Booking Notes:|Traces:)/gi, cls: "hl-ctx-purple" },
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
      className={`w-full bg-transparent resize-none overflow-hidden outline-none px-1 py-0.5 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[#c5a065] dark:focus:border-amber-400 rounded transition-all duration-200 ${center ? 'text-center' : ''} ${bold ? 'font-black' : 'font-bold'} ${className} text-slate-900 dark:text-slate-100 block leading-tight text-[10.5px]`}
    />
  );
};

const GuestRow: React.FC<GuestRowProps> = ({ 
  guest, onUpdate, onDelete, isExpanded, onToggleExpand 
}) => {
  const isReturn = guest.ll.toLowerCase().includes('yes');

  return (
    <>
      <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-200 no-print border-b border-slate-100 dark:border-slate-800">
        <td className="p-0.5 align-middle text-center w-[30px]">
          <button onClick={onDelete} className="text-slate-300 hover:text-rose-500 font-bold transition-colors text-base">×</button>
        </td>
        <td className="p-0.5 align-top w-[110px]">
          <ResizableTextArea field="room" value={guest.room} bold onUpdate={onUpdate} className="uppercase text-[#c5a065] dark:text-amber-400" />
        </td>
        <td className="p-0.5 align-top w-[220px]">
          <div className="flex flex-col">
            <ResizableTextArea field="name" value={guest.name} bold onUpdate={onUpdate} className="text-[11px]" />
            {guest.packageName && (
              <span className="text-[6.5px] font-black bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-900 px-1 py-0.5 ml-1 rounded uppercase tracking-widest w-fit">
                {guest.packageName}
              </span>
            )}
          </div>
        </td>
        <td className="p-0.5 align-top w-[60px]">
          <ResizableTextArea field="duration" value={guest.duration} center onUpdate={onUpdate} className="text-slate-500 font-bold" />
        </td>
        <td className="p-0.5 align-top w-[100px]">
          <ResizableTextArea field="car" value={guest.car} onUpdate={onUpdate} className="uppercase font-mono text-indigo-700 dark:text-indigo-400 font-bold tracking-widest" />
        </td>
        <td className="p-0.5 align-top text-center w-[60px]">
          <ResizableTextArea field="ll" value={guest.ll} center onUpdate={onUpdate} className={isReturn ? 'text-emerald-700 font-black' : 'text-slate-400'} />
        </td>
        <td className="p-0.5 align-top w-[240px]">
          <ResizableTextArea field="facilities" value={guest.facilities} onUpdate={onUpdate} className="leading-tight text-slate-700 dark:text-slate-300" />
        </td>
        <td className="p-0.5 align-top w-[60px]">
          <ResizableTextArea field="eta" value={guest.eta} center onUpdate={onUpdate} className="font-black text-slate-950 dark:text-white" />
        </td>
        <td className="p-0.5 align-top">
          <ResizableTextArea field="prefillNotes" value={guest.prefillNotes} onUpdate={onUpdate} className="leading-tight italic text-slate-700 dark:text-slate-400" />
        </td>
        <td className="p-0.5 align-top w-[220px]">
          <ResizableTextArea field="preferences" value={guest.preferences} onUpdate={onUpdate} className="leading-tight text-purple-800 dark:text-purple-400 font-bold" />
        </td>
      </tr>
      <tr className="no-print">
        <td colSpan={10} className="px-10 py-0">
          <div 
            className={`raw-data-header flex items-center gap-1.5 cursor-pointer py-1 text-[8.5px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600 hover:text-[#c5a065] transition-all`} 
            onClick={onToggleExpand}
          >
            <div className={`w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[4px] border-l-current transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}></div>
            <span>RAW INTEL STREAM</span>
          </div>
          {isExpanded && (
            <div className="raw-intel-box p-3 mb-3 animate-in fade-in slide-in-from-top-1 bg-slate-50 dark:bg-stone-900/40 rounded-lg border border-slate-100 dark:border-slate-800 shadow-inner">
              <div 
                className="select-all custom-scrollbar overflow-x-auto whitespace-pre-wrap font-mono text-[9.5px] leading-relaxed text-slate-700 dark:text-slate-300"
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