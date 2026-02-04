import React from 'react';
import { ArrivalSession } from '../types'; 

interface SessionBarProps {
  sessions: ArrivalSession[];
  activeId: string;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

const SessionBar: React.FC<SessionBarProps> = ({ sessions, activeId, onSwitch, onDelete }) => {
  if (sessions.length === 0) return null;

  return (
    <div className="no-print w-full flex justify-center mt-6 mb-4">
      <div className="flex items-center gap-3 overflow-x-auto p-2 max-w-full no-scrollbar">
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSwitch(session.id)}
            className={`
              group flex items-center gap-2 px-5 py-2 rounded-full cursor-pointer transition-all duration-200 border select-none
              ${activeId === session.id 
                ? 'bg-[#c5a065] text-white border-[#c5a065] shadow-lg font-bold scale-105' 
                : 'bg-white dark:bg-stone-900 text-slate-500 border-slate-200 dark:border-stone-700 hover:border-[#c5a065]/50'}
            `}
          >
            <span className="text-[11px] uppercase tracking-widest whitespace-nowrap">{session.label || session.id}</span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // 🛑 Critical Fix: Stops the tab from being selected when clicking delete
                if (window.confirm("Delete this list?")) onDelete(session.id);
              }}
              className={`
                w-5 h-5 flex items-center justify-center rounded-full transition-colors text-xs font-bold ml-2
                ${activeId === session.id ? 'bg-white/20 hover:bg-white/40 text-white' : 'bg-slate-100 dark:bg-stone-800 hover:bg-rose-500 hover:text-white text-slate-400'}
              `}
              title="Delete List"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </div>
  );
};

export default SessionBar;