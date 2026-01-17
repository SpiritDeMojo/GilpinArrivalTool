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
            <h2 className="heading-font text-4xl font-black text-slate-950 dark:text-white uppercase tracking-tighter">System Operations Manual</h2>
            <p className="text-[11px] font-black uppercase tracking-[0.5em] text-[#c5a065] mt-2">Intelligence Hub • Technical Guide & Usage</p>
          </div>
          <button onClick={onClose} className="w-14 h-14 rounded-full bg-white dark:bg-stone-800 shadow-xl flex items-center justify-center text-3xl font-bold hover:text-rose-500 transition-all active:scale-90 border border-slate-100 dark:border-stone-700">×</button>
        </div>

        {/* Content */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
          
          {/* How the App Works */}
          <section className="space-y-6">
            <h4 className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-950 dark:text-white border-b border-slate-100 pb-2">Technical Workflow</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-slate-100 dark:border-stone-700">
                <div className="text-xl mb-2 font-black">1. Upload</div>
                <p className="text-[11px] text-slate-500 leading-relaxed uppercase font-bold">PDF Ingestion</p>
                <p className="text-[12px] text-slate-500 leading-relaxed mt-2">Drag and drop the standard Arrivals PDF. The system performs OCR to map guest IDs, rooms, and raw notes into the live grid.</p>
              </div>
              <div className="bg-slate-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-slate-100 dark:border-stone-700">
                <div className="text-xl mb-2 font-black">2. AI Audit</div>
                <p className="text-[11px] text-slate-500 leading-relaxed uppercase font-bold">Gemini Intelligence</p>
                <p className="text-[12px] text-slate-500 leading-relaxed mt-2">Click "AI Refine" to activate Gemini. The model cleans notes, identifies billing alerts, and flags package inclusions automatically.</p>
              </div>
              <div className="bg-slate-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-slate-100 dark:border-stone-700">
                <div className="text-xl mb-2 font-black">3. Manage</div>
                <p className="text-[11px] text-slate-500 leading-relaxed uppercase font-bold">Grid Interaction</p>
                <p className="text-[12px] text-slate-500 leading-relaxed mt-2">Use the Dashboard to filter by VIP, Allergy, or Room Type. Edit any cell directly to manually override or add specific details.</p>
              </div>
              <div className="bg-slate-50 dark:bg-stone-800/50 p-6 rounded-2xl border border-slate-100 dark:border-stone-700">
                <div className="text-xl mb-2 font-black">4. Output</div>
                <p className="text-[11px] text-slate-500 leading-relaxed uppercase font-bold">Reporting Suite</p>
                <p className="text-[12px] text-slate-500 leading-relaxed mt-2">Generate print-ready Greeter lists, Housekeeping Delivery sheets, or Export a master Excel file for the Front Desk.</p>
              </div>
            </div>
          </section>

          {/* Icon Guide */}
          <section className="space-y-6">
            <h3 className="font-black uppercase tracking-[0.4em] text-[10px] text-[#c5a065]">Data & Visual Alerts Quick-Reference</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-50 dark:bg-stone-800/40 border border-slate-100 dark:border-stone-800 rounded-2xl">
                <div className="text-2xl mb-2">🤫</div>
                <div className="font-black text-[9px] uppercase mb-1 text-amber-600">Silent Upgrade</div>
                <p className="text-[9px] text-slate-500">System detected "Guest Unaware" or "Secret" markers in the raw stream. High priority for discreet handling.</p>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-stone-800/40 border border-slate-100 dark:border-stone-800 rounded-2xl">
                <div className="text-2xl mb-2">🚨</div>
                <div className="font-black text-[9px] uppercase mb-1 text-rose-600">PGI / Alert</div>
                <p className="text-[9px] text-slate-500">Previous Guest Issue or Complaint history found. Indicates a need for heightened attention during arrival.</p>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-stone-800/40 border border-slate-100 dark:border-stone-800 rounded-2xl">
                <div className="text-2xl mb-2">🎁</div>
                <div className="font-black text-[9px] uppercase mb-1 text-blue-600">In-Room Setup</div>
                <p className="text-[9px] text-slate-500">Physical assets detected in the package or HK notes (Champagne, Flowers, Balloons) that require setup.</p>
              </div>
              <div className="p-5 bg-slate-50 dark:bg-stone-800/40 border border-slate-100 dark:border-stone-800 rounded-2xl">
                <div className="text-2xl mb-2">🥛 / 🥜</div>
                <div className="font-black text-[9px] uppercase mb-1 text-emerald-600">Dietary / Allergy</div>
                <p className="text-[9px] text-slate-500">System detected allergy keywords. Cross-referenced and verified against the dietary master flags.</p>
              </div>
            </div>
          </section>

          {/* System Constraints */}
          <section className="space-y-4">
             <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-950 dark:text-white">Integration Details</h4>
             <div className="bg-slate-50 dark:bg-stone-800/40 p-6 rounded-2xl text-[12px] text-slate-500 leading-relaxed border border-slate-100 dark:border-stone-800">
               <ul className="list-disc pl-5 space-y-2">
                 <li><strong>Data Persistence:</strong> Edits are stored in the current session memory. Refreshing the browser will clear the grid. Export to Excel frequently to save progress.</li>
                 <li><strong>AI Rate Limits:</strong> The "AI Refine" process runs in batches to ensure stability. If the system stalls, wait for the cooldown phase to complete.</li>
                 <li><strong>Print Calibration:</strong> All print outputs (Arrivals, Greeter, In-Room) are calibrated for A4 Portrait. Use the system print dialog for final scaling.</li>
               </ul>
             </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-950 flex justify-center">
           <p className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-600">Gilpin Hotel • Intelligence Hub Operation Standard</p>
        </div>
      </div>
    </div>
  );
};

export default SOPModal;