import React from 'react';
import { ArrivalSession } from '../types';

interface SessionBarProps {
  sessions: ArrivalSession[];
  activeId: string;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

const SessionBar: React.FC<SessionBarProps> = ({ sessions, activeId, onSwitch, onDelete, onCreate }) => {
  if (sessions.length === 0) return null;

  return (
    <div className="no-print flex justify-center items-center gap-3 py-4 mb-4 overflow-x-auto no-scrollbar bg-transparent border-b border-[#c5a065]/10 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3 px-8">
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSwitch(session.id)}
            className={`
              group flex items-center gap-2 px-5 py-2.5 rounded-full cursor-pointer transition-all duration-300 border
              ${activeId === session.id 
                ? 'bg-[#c5a065] text-white border-[#c5a065] shadow-lg scale-105 font-bold' 
                : 'bg-white dark:bg-stone-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-stone-700 hover:border-[#c5a065]/50'}
            `}
          >
            <span className="text-[11px] uppercase tracking-widest whitespace-nowrap">{session.label || session.id}</span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // 🛑 Critical Fix: Stop selection event bubbling
                if (window.confirm(`Permanently delete all data for ${session.label || session.id}?`)) {
                  onDelete(session.id);
                }
              }}
              className={`
                w-5 h-5 flex items-center justify-center rounded-full transition-colors text-xs font-bold
                ${activeId === session.id ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-stone-600 text-slate-400'}
              `}
            >
              ×
            </button>
          </div>
        ))}
        
        <button 
          onClick={onCreate}
          className="w-10 h-10 rounded-full bg-slate-200 dark:bg-stone-800 text-slate-500 hover:bg-[#c5a065] hover:text-white transition-all flex items-center justify-center shadow-sm flex-shrink-0"
          title="New Empty Session"
        >
          <span className="text-2xl font-bold leading-none">+</span>
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default SessionBar;
