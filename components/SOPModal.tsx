import React from 'react';

interface SOPModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOPModal: React.FC<SOPModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/99 backdrop-blur-3xl z-[5000] flex items-center justify-center p-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-stone-900 w-full max-w-5xl rounded-[3.5rem] shadow-2xl border border-[#c5a065]/50 overflow-hidden flex flex-col max-h-[92vh] transform transition-all animate-in zoom-in-95">
        {/* Header */}
        <div className="p-10 border-b border-slate-100 dark:border-stone-800 flex justify-between items-center bg-slate-50/50 dark:bg-stone-800/40">
          <div>
            <h2 className="heading-font text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">Receptionist Instruction</h2>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#c5a065] mt-2">Daily Operations • Standard Operating Procedure</p>
          </div>
          <button onClick={onClose} className="w-14 h-14 rounded-full bg-white dark:bg-stone-800 shadow-xl flex items-center justify-center text-3xl font-bold hover:text-rose-500 transition-all active:scale-90 border border-slate-100 dark:border-stone-700">×</button>
        </div>

        {/* Content */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
          
          {/* How the App Works */}
          <section className="space-y-6">
            <h4 className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-950 dark:text-white border-b border-slate-100 pb-2">How this Tool works</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-slate-100 dark:border-stone-700">
                <div className="text-xl mb-2 font-black">1. Extraction</div>
                <p className="text-[12px] text-slate-500 leading-relaxed">The tool reads the PDF and pulls out names, rooms, and raw notes. It highlights important terms like room codes and car registrations in the "Raw Intelligence Stream".</p>
              </div>
              <div className="bg-slate-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-slate-100 dark:border-stone-700">
                <div className="text-xl mb-2 font-black">2. AI Audit</div>
                <p className="text-[12px] text-slate-500 leading-relaxed">Gemini AI audits every guest. It identifies if a guest has a missing dinner booking, a secret upgrade, or a specific package inclusion (like Champagne).</p>
              </div>
              <div className="bg-slate-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-slate-100 dark:border-stone-700">
                <div className="text-xl mb-2 font-black">3. Reporting</div>
                <p className="text-[12px] text-slate-500 leading-relaxed">Generate specific sheets: <strong>Greeter</strong> for car matching, <strong>Delivery</strong> for Bar/FOH setups, and <strong>Excel</strong> for the master arrivals desk.</p>
              </div>
            </div>
          </section>

          {/* Receptionist Actions */}
          <section className="space-y-8">
            <h3 className="font-black uppercase tracking-[0.5em] text-[11px] text-[#c5a065] text-center">Your Check-In Strategy</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-100 dark:border-indigo-800 rounded-[2.5rem]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">🎫</div>
                  <h5 className="font-black text-[13px] uppercase text-indigo-900 dark:text-indigo-300 tracking-widest">Collecting the Voucher</h5>
                </div>
                <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>The Rule:</strong> Guests never pay at check-in, but if the AI identifies a <strong>💳 BILLING ALERT</strong>, you must ask for the voucher code or physical gift card on arrival. 
                  <br/><br/>
                  <em>Why?</em> This prevents a "surprise" bill at check-out. It ensures their last memory of Gilpin is smooth, not an administrative argument over a voucher.
                </p>
              </div>

              <div className="p-8 bg-rose-50 dark:bg-rose-900/15 border border-rose-100 dark:border-rose-800 rounded-[2.5rem]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">🍴</div>
                  <h5 className="font-black text-[13px] uppercase text-rose-900 dark:text-rose-300 tracking-widest">The Dinner Check</h5>
                </div>
                <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>The Rule:</strong> If you see the 😩 icon, the guest has NO dinner bookings. 
                  <br/><br/>
                  <em>Action:</em> Mention it during the greeting. "I noticed you haven't booked a table for tonight yet; would you like me to reserve a spot at Source or Spice while we still have availability?" Don't let them miss our food!
                </p>
              </div>
            </div>
          </section>

          {/* Icon Guide */}
          <section className="space-y-6">
            <h3 className="font-black uppercase tracking-[0.4em] text-[10px] text-[#c5a065]">Visual Alerts Quick-Reference</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-50 dark:bg-stone-800/40 border border-slate-100 dark:border-stone-800 rounded-2xl">
                <div className="text-2xl mb-2">🤫</div>
                <div className="font-black text-[9px] uppercase mb-1 text-amber-600">Silent Upgrade</div>
                <p className="text-[9px] text-slate-500">The guest does not know they have been upgraded. Do NOT mention the new room name until you arrive at the door.</p>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-stone-800/40 border border-slate-100 dark:border-stone-800 rounded-2xl">
                <div className="text-2xl mb-2">🚨</div>
                <div className="font-black text-[9px] uppercase mb-1 text-rose-600">PGI Alert</div>
                <p className="text-[9px] text-slate-500">Previous Guest Issue. This guest had a bad experience before. Manager greeting is essential.</p>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-stone-800/40 border border-slate-100 dark:border-stone-800 rounded-2xl">
                <div className="text-2xl mb-2">🎁</div>
                <div className="font-black text-[9px] uppercase mb-1 text-blue-600">Setup Required</div>
                <p className="text-[9px] text-slate-500">Physical items (Hamper/Flowers) are part of this booking. Ensure Bar/Reception has them ready.</p>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-stone-800/40 border border-slate-100 dark:border-stone-800 rounded-2xl">
                <div className="text-2xl mb-2">🥛/🥜</div>
                <div className="font-black text-[9px] uppercase mb-1 text-emerald-600">Dietary</div>
                <p className="text-[9px] text-slate-500">Allergies detected. Ensure the kitchen and waitstaff are briefed on this arrival.</p>
              </div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-950 flex justify-center">
           <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-600">Gilpin Hotel • Built for Reception Excellence</p>
        </div>
      </div>
    </div>
  );
};

export default SOPModal;