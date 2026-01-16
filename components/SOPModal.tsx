import React from 'react';

interface SOPModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOPModal: React.FC<SOPModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-[5000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-stone-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-[#c5a065]/50 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-stone-800 flex justify-between items-center bg-slate-50/50 dark:bg-stone-800/30">
          <div>
            <h2 className="heading-font text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Reception SOP</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a065]">Gilpin Arrivals Engine v3.99 Gold</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-white dark:bg-stone-800 shadow-lg flex items-center justify-center text-2xl font-bold hover:text-rose-500 transition-colors">×</button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
          
          {/* Step 1 */}
          <section className="flex gap-6">
            <div className="w-12 h-12 rounded-2xl bg-[#c5a065] text-slate-950 flex items-center justify-center font-black text-xl shrink-0">1</div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm mb-2 text-slate-900 dark:text-white">Data Ingestion & Security</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mb-3">
                Upload the daily <strong>Arrival List</strong> or <strong>Guest Greeter</strong> PDF from the PMS. 
              </p>
              <div className="bg-rose-50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30 text-[10px] text-rose-700 dark:text-rose-400 font-bold">
                ⚠️ ALERT: If the "Security Warning" banner appears, you are viewing a historical file. Verify the date immediately before proceeding.
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section className="flex gap-6">
            <div className="w-12 h-12 rounded-2xl bg-[#c5a065] text-slate-950 flex items-center justify-center font-black text-xl shrink-0">2</div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm mb-2 text-slate-900 dark:text-white">Diamond AI Refinement</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mb-3">
                Click <strong>💎 DIAMOND AI REFINE</strong>. This is critical for 5-star service.
              </p>
              <ul className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">✨ Declutters system trace noise</li>
                <li className="flex items-center gap-2">🔄 Translates Rate Codes (BB_1 → B&B)</li>
                <li className="flex items-center gap-2">🔍 Detects Duplicate Bookings</li>
                <li className="flex items-center gap-2">📈 Summarizes Loyalty History</li>
              </ul>
            </div>
          </section>

          {/* Step 3 */}
          <section className="flex gap-6">
            <div className="w-12 h-12 rounded-2xl bg-[#c5a065] text-slate-950 flex items-center justify-center font-black text-xl shrink-0">3</div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm mb-2 text-slate-900 dark:text-white">Concierge Strategy Review</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mb-2">
                Review the <strong>Concierge Strategy</strong> column (Purple text).
              </p>
              <p className="text-[10px] italic text-slate-400 leading-relaxed">
                Look for tactical greetings like "Confirm crab allergy on arrival" or "Discreetly mention the 50th birthday hamper." This ensures a personalized "Guest DNA" experience.
              </p>
            </div>
          </section>

          {/* Step 4 */}
          <section className="flex gap-6">
            <div className="w-12 h-12 rounded-2xl bg-[#c5a065] text-slate-950 flex items-center justify-center font-black text-xl shrink-0">4</div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm mb-2 text-slate-900 dark:text-white">Host Sheet Sync</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mb-3">
                Click <strong>⬇️ EXCEL</strong> to generate the formatted copy for the "Rec Host Sheet".
              </p>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                ✓ Room 55 (Maud) and 56 (Beatrice) are automatically mapped to the Lake House section for copy-pasting.
              </p>
            </div>
          </section>

          {/* Step 5 */}
          <section className="flex gap-6">
            <div className="w-12 h-12 rounded-2xl bg-[#c5a065] text-slate-950 flex items-center justify-center font-black text-xl shrink-0">5</div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-sm mb-2 text-slate-900 dark:text-white">Strategic Printing</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border border-slate-100 dark:border-stone-800 rounded-xl">
                  <div className="text-[9px] font-black uppercase text-sky-600 mb-1">In-Room</div>
                  <p className="text-[9px] text-slate-400">HK setup specs only.</p>
                </div>
                <div className="p-3 border border-slate-100 dark:border-stone-800 rounded-xl">
                  <div className="text-[9px] font-black uppercase text-amber-600 mb-1">Greeter</div>
                  <p className="text-[9px] text-slate-400">FOH greeting by ETA.</p>
                </div>
                <div className="p-3 border border-slate-100 dark:border-stone-800 rounded-xl">
                  <div className="text-[9px] font-black uppercase text-slate-600 mb-1">Arrivals</div>
                  <p className="text-[9px] text-slate-400">Internal density master list.</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950 flex justify-center">
           <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">Relais & Châteaux Gold Standard Workflow • Confidential</p>
        </div>
      </div>
    </div>
  );
};

export default SOPModal;