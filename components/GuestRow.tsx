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
  
  // High-level metadata badges
  html = html.replace(/(\d{5})/g, '<span class="hl-badge hl-id">ID: $1</span>');
  html = html.replace(/\b(BB_1|BB_2|BB_3|BB_|APR_1_BB|APR_2_BB|APR_3_BB|BB_1_WIN|BB_2_WIN|BB_3_WIN|MIN|MAGESC|COMP|LHAPR|LHMAG|LHBB1|LHBB2|LHBB|RO|CEL_DBB_1|POB_STAFF)\b/g, '<span class="hl-badge hl-ro">$1</span>');
  html = html.replace(/\b(Spice|Source|ESPA|Bento|Aromatherapy|Massage|Facial|Spa)\b/gi, '<span class="hl-badge hl-ctx-teal">$1</span>');
  html = html.replace(/\b([A-Z]{2}[0-9]{2}\s?[A-Z]{3}|[A-Z][0-9]{1,4}\s?[A-Z]{0,3}|[A-Z]{3}\s?[0-9]{1,3}[A-Z])\b/gi, (match) => {
    // Basic filter for car plates vs room codes
    if (match.length < 3 || /^(BB|RO|APR|MIN|LH)/i.test(match)) return match;
    return `<span class="hl-badge hl-car">${match}</span>`;
  });

  // Critical Gilpin Intelligence
  html = html.replace(/\b(Voucher|Gift|Certificate|Redeem)\b/gi, '<span class="hl-badge hl-ctx-purple">$1</span>');
  html = html.replace(/\b(Birthday|Anniversary|Honeymoon|Celebration|Engagement|Wedding)\b/gi, '<span class="hl-badge hl-ctx-teal">🎉 $1</span>');
  html = html.replace(/\b(Unaware|Secret|Comp|FOC|Upgrade)\b/gi, '<span class="hl-badge hl-ctx-purple">🤫 $1</span>');
  html = html.replace(/\b(Champagne|Flowers|Balloons|Hamper|Chocolates|Itinerary)\b/gi, '<span class="hl-badge hl-ctx-blue">🎁 $1</span>');
  
  // Sectional Block Highlighting
  const sections = [
    { regex: /(HK Notes:.*?)(?=\n|Unit:|Page|Billing:|Guest Notes:|Booking Notes:|Traces:)/gi, cls: "hl-ctx-teal" },
    { regex: /(Guest Notes:.*?)(?=\n|Unit:|Page|Billing:|HK Notes:|Booking Notes:|Traces:)/gi, cls: "hl-ctx-purple" },
    { regex: /(In Room.*?:.*?)(?=\n|Billing|HK Notes|Checked:|Guest Notes:)/gi, cls: "hl-ctx-blue" },
    { regex: /((?:Allergies|Dietary|Complaint|Issue|Alert|PGI):.*?)(?=\n|HK Notes|Billing|$)/gi, cls: "hl-ctx-red" }
  ];

  sections.forEach(s => {
    html = html.replace(s.regex, (match) => `<span class="hl-block ${s.cls}">${match}</span>`);
  });

  // Time highlighting
  html = html.replace(/\b(\d{2}:\d{2}|\d{4})\b/g, (match) => {
    if (match.length === 4 && !match.includes(':')) {
        const h = parseInt(match.substring(0,2));
        if (h >= 0 && h <= 23) return `<span class="font-bold text-slate-900 dark:text-white underline decoration-gilpin-gold/50">${match}</span>`;
    }
    return match;
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
      className={`w-full bg-transparent resize-none overflow-hidden outline-none px-2 py-1.5 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 focus:border-[#c5a065] dark:focus:border-[#c5a065] rounded-xl transition-all duration-300 ${center ? 'text-center' : ''} ${bold ? 'font-black' : 'font-bold'} ${className} text-slate-900 dark:text-slate-100 block leading-tight text-[11px]`}
    />
  );
};

const GuestRow: React.FC<GuestRowProps> = ({ 
  guest, onUpdate, onDelete, isExpanded, onToggleExpand 
}) => {
  const isReturn = guest.ll.toLowerCase().includes('yes');

  return (
    <>
      <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-all duration-300 no-print border-b border-slate-100 dark:border-stone-800/40">
        <td className="p-1 align-middle text-center">
          <button onClick={onDelete} className="text-slate-300 hover:text-rose-500 font-bold transition-all text-xl hover:scale-125">×</button>
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="room" value={guest.room} bold onUpdate={onUpdate} className="uppercase text-[#c5a065] font-black" />
        </td>
        <td className="p-1 align-top">
          <div className="flex flex-col gap-1">
            <ResizableTextArea field="name" value={guest.name} bold onUpdate={onUpdate} className="text-[12px] tracking-tight" />
            {guest.packageName && (
              <span className="text-[7.5px] font-black bg-slate-950 text-white dark:bg-stone-800 dark:text-amber-400 px-2 py-1 ml-2 rounded-lg uppercase tracking-[0.2em] w-fit border border-white/5">
                {guest.packageName}
              </span>
            )}
          </div>
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="duration" value={guest.duration} center onUpdate={onUpdate} className="text-slate-400 font-black" />
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="car" value={guest.car} onUpdate={onUpdate} className="uppercase font-mono text-indigo-700 dark:text-indigo-400 font-black tracking-widest" />
        </td>
        <td className="p-1 align-top text-center">
          <ResizableTextArea field="ll" value={guest.ll} center onUpdate={onUpdate} className={isReturn ? 'text-emerald-700 dark:text-emerald-500 font-black' : 'text-slate-400'} />
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="facilities" value={guest.facilities} onUpdate={onUpdate} className="leading-snug text-slate-700 dark:text-slate-400" />
        </td>
        <td className="p-1 align-top text-center">
          <ResizableTextArea field="eta" value={guest.eta} center onUpdate={onUpdate} className="font-black text-slate-950 dark:text-white text-base" />
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="prefillNotes" value={guest.prefillNotes} onUpdate={onUpdate} className="leading-snug italic text-slate-700 dark:text-slate-500" />
        </td>
        <td className="p-1 align-top">
          <ResizableTextArea field="preferences" value={guest.preferences} onUpdate={onUpdate} className="leading-snug text-indigo-700 dark:text-indigo-400 font-black" />
        </td>
      </tr>
      <tr className="no-print">
        <td colSpan={10} className="px-16 py-0">
          <div 
            className={`raw-data-header flex items-center gap-3 cursor-pointer py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-stone-700 hover:text-[#c5a065] transition-all group`} 
            onClick={onToggleExpand}
          >
            <div className={`w-2 h-2 rounded-full bg-current transition-all duration-500 ${isExpanded ? 'scale-150 shadow-[0_0_12px_currentColor]' : ''}`}></div>
            <span>Raw Intelligence Stream</span>
          </div>
          {isExpanded && (
            <div className="raw-intel-box p-8 mb-8 animate-in fade-in slide-in-from-top-2 bg-slate-50 dark:bg-stone-900/60 rounded-[2rem] border border-slate-100 dark:border-stone-800 shadow-inner">
              <div 
                className="select-all custom-scrollbar overflow-x-auto whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed text-slate-700 dark:text-slate-400"
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