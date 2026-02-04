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
    <div className="no-print w-full flex justify-center mt-4 mb-2">
      <div className="flex items-center gap-2 overflow-x-auto p-2 max-w-full no-scrollbar">
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSwitch(session.id)}
            className={`
              group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all duration-200 border select-none
              ${activeId === session.id 
                ? 'bg-[#c5a065] text-white border-[#c5a065] shadow-md font-bold' 
                : 'bg-white dark:bg-stone-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-stone-700 hover:border-[#c5a065]/50'}
            `}
          >
            <span className="text-[10px] uppercase tracking-wider whitespace-nowrap">{session.label || session.id}</span>
            <button
              onClick={(e) => {
                e.stopPropagation(); // 🛑 Critical Fix: Prevents tab selection when clicking delete
                if(window.confirm(`Delete ${session.label || session.id}?`)) onDelete(session.id);
              }}
              className={`
                w-4 h-4 flex items-center justify-center rounded-full transition-colors text-xs font-bold ml-1
                ${activeId === session.id ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-stone-600 text-slate-400'}
              `}
            >
              ×
            </button>
          </div>
        ))}
        
        <button 
          onClick={onCreate}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-stone-800 text-slate-400 hover:bg-[#c5a065] hover:text-white transition-all flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-200 dark:border-stone-700"
          title="New Empty Tab"
        >
          <span className="text-lg font-bold leading-none">+</span>
        </button>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
    </div>
  );
};

export default SessionBar;