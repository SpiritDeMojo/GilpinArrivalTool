import React from 'react';
import { ArrivalSession } from '../types';
import { useUser } from '../contexts/UserProvider';

interface SessionBarProps {
  sessions: ArrivalSession[];
  activeId: string;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

const SessionBar: React.FC<SessionBarProps> = ({ sessions, activeId, onSwitch, onDelete }) => {
  const { department } = useUser();
  const isRec = department === 'REC';
  if (sessions.length === 0) return null;

  return (
    <div className="no-print w-full flex justify-center mt-4 md:mt-6 mb-3 md:mb-4 px-3 md:px-0">
      <div className="flex items-center gap-2 md:gap-3 overflow-x-auto p-2 max-w-full no-scrollbar snap-x snap-mandatory">
        {sessions.map((session, index) => (
          <div
            key={session.id}
            onClick={() => onSwitch(session.id)}
            style={{ animationDelay: `${index * 0.06}s` }}
            className={`
              session-tab group flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-2 rounded-full cursor-pointer transition-all duration-200 border select-none flex-shrink-0 snap-start min-h-[40px]
              ${activeId === session.id
                ? 'bg-[#c5a065] text-white border-[#c5a065] shadow-lg font-bold scale-105'
                : 'bg-white dark:bg-stone-900 text-slate-500 border-slate-200 dark:border-stone-700 hover:border-[#c5a065]/50 active:bg-slate-50 dark:active:bg-stone-800'}
            `}
          >
            <span className="text-[10px] md:text-[11px] uppercase tracking-widest whitespace-nowrap">{session.label || session.id}</span>
            {isRec && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${session.label || session.id}"?\n\nThis will remove it from all devices.`)) onDelete(session.id);
                }}
                className={`
                  w-6 h-6 md:w-5 md:h-5 flex items-center justify-center rounded-full transition-colors text-xs font-bold ml-1
                  ${activeId === session.id ? 'bg-white/20 hover:bg-white/40 text-white' : 'bg-slate-100 dark:bg-stone-800 hover:bg-rose-500 hover:text-white text-slate-400'}
                `}
                title="Delete List"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }` }} />
    </div>
  );
};

export default SessionBar;