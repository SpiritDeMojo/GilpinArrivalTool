import React, { useState, useRef, useEffect } from 'react';
import { Transcription } from '../hooks/useLiveAssistant';

interface LiveChatWidgetProps {
  isLiveActive: boolean;
  isMicEnabled: boolean;
  transcriptions: Transcription[];
  interimInput: string;
  interimOutput: string;
  onToggleMic: () => void;
  onSendMessage: (text: string) => void;
  onClose: () => void;
  onClearHistory: () => void;
}

const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({
  isLiveActive, isMicEnabled, transcriptions, interimInput, interimOutput, onToggleMic, onSendMessage, onClose, onClearHistory
}) => {
  const [textMsg, setTextMsg] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcriptions, interimInput, interimOutput]);

  // Persistent Visibility: Show if session is active OR if there's history to review
  if (!isLiveActive && transcriptions.length === 0) return null;

  const handleSend = () => {
    if (!textMsg.trim()) return;
    onSendMessage(textMsg);
    setTextMsg("");
  };

  const statusColor = isLiveActive 
    ? (isMicEnabled ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]') 
    : 'bg-slate-400';

  const statusText = isLiveActive 
    ? (isMicEnabled ? 'Listening' : 'Live') 
    : 'History';

  return (
    <div className="fixed top-[82px] right-10 no-print z-[2000] pointer-events-none animate-in slide-in-from-top-4 duration-300">
      <div className="bg-white dark:bg-stone-900 shadow-2xl border border-[#c5a065] p-5 rounded-[2.5rem] w-80 max-h-[600px] flex flex-col pointer-events-auto">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
            <p className="text-[10px] font-black uppercase text-[#c5a065] tracking-widest">
              Assistant Feed • <span className={isLiveActive ? 'text-emerald-500' : 'text-slate-400'}>{statusText}</span>
            </p>
          </div>
          <button 
            onClick={isLiveActive ? onClose : onClearHistory} 
            className="text-slate-400 hover:text-rose-500 font-black text-xs px-2 transition-colors"
            title={isLiveActive ? "Stop Session" : "Clear History"}
          >×</button>
        </div>
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 py-1 mb-3">
          {transcriptions.map((t, i) => (
            <div key={i} className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3 text-[11px] leading-snug font-medium shadow-sm rounded-2xl ${t.role === 'user' ? 'bg-[#c5a065] text-white rounded-br-none' : 'bg-slate-100 dark:bg-stone-800 text-slate-800 dark:text-white rounded-bl-none border border-slate-200 dark:border-stone-700'}`}>{t.text}</div>
            </div>
          ))}
          
          {interimInput && (
            <div className="flex flex-col items-end opacity-70">
              <div className="p-3 text-[11px] leading-snug font-medium bg-[#c5a065]/50 text-white rounded-2xl rounded-br-none italic">{interimInput}...</div>
            </div>
          )}
          {interimOutput && (
            <div className="flex flex-col items-start opacity-70">
              <div className="p-3 text-[11px] leading-snug font-medium bg-slate-100 dark:bg-stone-800 text-slate-500 rounded-2xl rounded-bl-none border border-slate-200 dark:border-stone-700 italic">{interimOutput}...</div>
            </div>
          )}

          {transcriptions.length === 0 && !interimInput && !interimOutput && (
            <p className="text-[10px] text-slate-400 italic text-center py-4">"Assistant Feed Active. speak or type commands."</p>
          )}
        </div>

        <div className={`flex gap-2 p-1 bg-slate-50 dark:bg-stone-800/50 rounded-2xl border border-slate-200 dark:border-stone-700 items-center transition-opacity ${!isLiveActive ? 'opacity-50 pointer-events-none' : ''}`}>
          <button 
            onClick={onToggleMic}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isMicEnabled ? 'bg-rose-500 text-white shadow-lg animate-pulse' : 'bg-slate-200 dark:bg-stone-700 text-slate-500'}`}
          >
            <span className="text-sm">{isMicEnabled ? '🎙️' : '🔇'}</span>
          </button>
          <input 
            type="text"
            value={textMsg}
            onChange={(e) => setTextMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isLiveActive ? "Type command..." : "Session Offline"}
            disabled={!isLiveActive}
            className="flex-1 bg-transparent border-none px-2 py-2 text-[11px] outline-none text-slate-900 dark:text-white"
          />
          <button 
            onClick={handleSend}
            disabled={!isLiveActive}
            className="bg-[#c5a065] text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-[#b08d54] transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {!isLiveActive && transcriptions.length > 0 && (
          <p className="text-[9px] text-slate-400 text-center mt-3 font-bold uppercase tracking-widest animate-pulse">
            Reviewing History
          </p>
        )}
      </div>
    </div>
  );
};

export default LiveChatWidget;