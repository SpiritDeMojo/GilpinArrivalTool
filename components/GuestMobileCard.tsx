import React, { useState } from 'react';
import { Guest } from '../types';
import { HighlightedRaw } from './GuestRow';

interface GuestMobileCardProps {
  guest: Guest;
  onUpdate: (updates: Partial<Guest>) => void;
  onDelete: () => void;
}

const GuestMobileCard: React.FC<GuestMobileCardProps> = ({ guest, onUpdate, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isReturn = guest.ll.toLowerCase().includes('yes');

  return (
    <div className="bg-white dark:bg-stone-900 rounded-[2rem] border border-slate-200 dark:border-stone-800 shadow-xl overflow-hidden mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* --- Card Header: Room & Name --- */}
      <div className="p-5 flex items-start justify-between border-b border-slate-100 dark:border-stone-800/50">
        <div className="flex items-center gap-4">
          <div className="bg-[#c5a065]/10 p-3 rounded-2xl border border-[#c5a065]/20 flex-shrink-0">
            <input
              value={guest.room}
              onChange={(e) => onUpdate({ room: e.target.value })}
              className="bg-transparent text-lg font-black text-[#c5a065] text-center outline-none uppercase"
              style={{ width: `${Math.max(3, Math.min(guest.room.length + 1, 10))}ch`, maxWidth: '120px', minWidth: '3rem' }}
              title={guest.room}
            />
            {guest.previousRoom && (
              <div className="text-[8px] font-bold text-blue-500 text-center mt-0.5">← {guest.previousRoom}</div>
            )}
          </div>
          <div>
            <input
              value={guest.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="block w-full bg-transparent text-base font-black text-slate-900 dark:text-white outline-none"
            />
            {guest.packageName && (
              <span className="text-[9px] font-black bg-[#c5a065]/10 text-[#c5a065] px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 inline-block">
                {guest.packageName}
              </span>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="text-slate-300 hover:text-rose-500 text-2xl font-bold p-1">×</button>
      </div>

      {/* --- Card Body: Key Logistics --- */}
      <div className="p-5 grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-stone-800/20">
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">ETA</label>
          <input
            value={guest.eta}
            onChange={(e) => onUpdate({ eta: e.target.value })}
            className="w-full bg-white dark:bg-stone-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-stone-700 text-sm font-bold text-center text-slate-900 dark:text-white outline-none focus:border-[#c5a065]"
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Vehicle</label>
          <input
            value={guest.car}
            onChange={(e) => onUpdate({ car: e.target.value })}
            className="w-full bg-white dark:bg-stone-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-stone-700 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white outline-none focus:border-[#c5a065]"
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Stay (Nts)</label>
          <input
            value={guest.duration}
            onChange={(e) => onUpdate({ duration: e.target.value })}
            className="w-full bg-white dark:bg-stone-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-stone-700 text-sm font-bold text-center text-slate-900 dark:text-white outline-none focus:border-[#c5a065]"
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">L&L Status</label>
          <input
            value={guest.ll}
            onChange={(e) => onUpdate({ ll: e.target.value })}
            className={`w-full bg-white dark:bg-stone-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-stone-700 text-sm font-bold text-center text-slate-900 dark:text-white outline-none focus:border-[#c5a065] ${isReturn ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
          />
        </div>
      </div>

      {/* --- Card Intelligence: Strategy & Notes --- */}
      <div className="p-5 space-y-4">
        <div>
          <label className="text-[9px] font-black uppercase text-indigo-500 tracking-widest block mb-1">Tactical Strategy</label>
          <textarea
            value={guest.preferences}
            onChange={(e) => onUpdate({ preferences: e.target.value })}
            rows={2}
            className="w-full bg-indigo-50/50 dark:bg-indigo-500/5 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 outline-none focus:border-indigo-400 leading-tight"
          />
          {guest.aiTags && guest.aiTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {guest.aiTags.map((tag, i) => (
                <span key={i} className="text-[8px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20">
                  🏷️ {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-[10px] font-black uppercase text-[#c5a065] tracking-widest py-2 border-t border-slate-100 dark:border-stone-800"
          >
            <span>{isExpanded ? '▼ Hide Intelligence' : '▶ Show Booking Stream'}</span>
            <span className="bg-[#c5a065]/10 px-2 py-0.5 rounded">Audit V6.0</span>
          </button>

          {isExpanded && (
            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Intelligence Notes</label>
                <textarea
                  value={guest.prefillNotes}
                  onChange={(e) => onUpdate({ prefillNotes: e.target.value })}
                  rows={3}
                  className="w-full bg-white dark:bg-stone-800 p-3 rounded-xl border border-slate-200 dark:border-stone-700 text-[11px] italic text-slate-500 outline-none leading-relaxed"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Facilities & Dining</label>
                <textarea
                  value={guest.facilities}
                  onChange={(e) => onUpdate({ facilities: e.target.value })}
                  rows={2}
                  className="w-full bg-white dark:bg-stone-800 p-3 rounded-xl border border-slate-200 dark:border-stone-700 text-[11px] outline-none leading-tight"
                />
              </div>
              <div className="p-4 bg-slate-900 rounded-2xl overflow-x-auto">
                <div className="font-mono text-[9px] text-white/80 leading-relaxed whitespace-pre-wrap">
                  <HighlightedRaw text={guest.rawHtml} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestMobileCard;