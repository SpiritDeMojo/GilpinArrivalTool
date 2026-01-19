import React from 'react';

interface SOPModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOPModal: React.FC<SOPModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0f1115] w-full max-w-5xl rounded-[2.5rem] shadow-2xl border border-[#c5a065]/40 overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-10 py-6 border-b border-[#c5a065]/20 flex justify-between items-center bg-slate-50/50 dark:bg-stone-900/50">
          <div>
            <h2 className="heading-font text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Operational Guide</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a065] mt-1">Arrivals Hub • GIU Ultimate Protocol v4.0</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white dark:bg-stone-800 shadow-lg flex items-center justify-center text-xl font-black text-slate-500 dark:text-slate-400 hover:text-rose-600 transition-all active:scale-90 border border-slate-200 dark:border-stone-700"
          >×</button>
        </div>

        {/* Content */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12 bg-white dark:bg-[#0f1115]">
          
          {/* AI Identities & Roles */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">Intelligence Architecture</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🛡️</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Guest Intelligence Unit (GIU)</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  The back-end refinement engine. It audits raw booking data to identify package inclusions (Champagne/Balloons), loyalty status (Yes xN), and complimentary upgrades. It ensures every guest field meets the "Gilpin Standard" before briefing.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-[#c5a065]/5 border border-[#c5a065]/20 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🤝</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-[#c5a065]">Guest Experience Partner</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  The live operational assistant. Reachable via the 🤖 icon for "Morning Briefings," "Cross-Checks," and deep investigation of the <strong>Raw Booking Stream</strong>. It flags discrepancies between Clean Data and hidden Booking Text.
                </p>
              </div>

            </div>
          </section>

          {/* Core Feature Architecture */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">Tactical Deployment Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🗞️</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Morning Briefing</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Voice command "Give me a Morning Briefing" to get a friendly narrative summary: Arrivals split, VIP arrivals, missing car registrations, and stay analysis (>1 night).
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔍</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">The "Cross-Check"</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  The Partner scans the Raw Stream for hidden details. If it finds "Gluten Free" in the messy text but the clean notes are empty, it triggers a <strong>⚠️ MISSED ALERT</strong> protocol.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📊</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Rec Host Alignment</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Excel Exports are strictly formatted to match the physical Reception Host Desk sheets, including the "Lakehouse Orange Banner" and proper room spacing.
                </p>
              </div>

            </div>
          </section>

          {/* Operational Workflow */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">Deployment Cycle</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">1</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Extraction</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Drop PDF. The parser identifies rooms, ETAs, and visit counts (L&L) using v3.70 legacy logic.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-[#c5a065] text-white flex items-center justify-center font-black text-xs">2</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">GIU Audit</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Trigger <strong>✨ AI Audit</strong>. The GIU transforms raw notes into structured, emoji-coded strategic intelligence.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs">3</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Partner Brief</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Open <strong>🤖 Partner Chat</strong>. Ask for a "Briefing" or check specific room numbers for hidden "Booking Stream" details.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs">4</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Output</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select <strong>🖨️ Print</strong> mode: Master (Internal), Greeter (Reception), or Delivery (Housekeeping/In-Room).
                </p>
              </div>
            </div>
          </section>

          {/* Logic Protocols (GIU Specific) */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">GIU Strategic Protocols</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { e: "🍾", t: "Celebration Audit", d: "Auto-adds Champagne/Itinerary if package detected." },
                { e: "🤫", t: "Comp Upgrade", d: "Flags 'Guest Unaware' upgrades for suprise arrival." },
                { e: "🛡️", t: "Billing Guard", d: "Flags vouchers/bill-payers to hide costs from guests." },
                { e: "⚠️", t: "Safety First", d: "Highest priority highlighting for all dietary/allergies." }
              ].map(item => (
                <div key={item.t} className="p-4 border border-[#c5a065]/20 rounded-3xl bg-[#c5a065]/5">
                  <span className="text-xl block mb-2">{item.e}</span>
                  <div className="font-black text-[9px] uppercase tracking-wide text-slate-900 dark:text-slate-100 mb-1">{item.t}</div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">{item.d}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="bg-slate-950 text-white p-8 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <p className="text-[12px] font-medium leading-relaxed italic relative z-10 max-w-2xl mx-auto">
              " This hub ensures the Arrival Team stays two steps ahead of every guest's needs."
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="py-5 bg-slate-100 dark:bg-black/40 flex justify-center border-t border-slate-200 dark:border-stone-800/40">
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-500">Gilpin Hotel & Lake House • Intelligence Unit Protocol</p>
        </div>
      </div>
    </div>
  );
};

export default SOPModal;