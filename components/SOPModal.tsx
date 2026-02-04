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
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a065] mt-1">Intelligence Hub • v5.0 Titanium Protocol</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white dark:bg-stone-800 shadow-lg flex items-center justify-center text-xl font-black text-slate-500 dark:text-slate-400 hover:text-rose-600 transition-all active:scale-90 border border-slate-200 dark:border-stone-700"
          >×</button>
        </div>

        {/* Content */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12 bg-white dark:bg-[#0f1115]">
          
          {/* Section 1: The Tab Workspace */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">01. Tab Workspace</h4>
            <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col md:flex-row gap-8 items-center">
              <div className="text-5xl">📂</div>
              <div className="flex-1">
                <h6 className="font-black text-sm uppercase tracking-wider dark:text-white mb-2">Browser-Style Workflow</h6>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  The Intelligence Hub now supports multiple days simultaneously. Every PDF upload creates a dedicated <strong>Day Tab</strong> at the top of the interface. 
                  <br /><br />
                  <span className="text-[#c5a065] font-bold">Concept:</span> Switch between Friday, Saturday, and Sunday instantly. Your edits are saved to each specific day automatically. Click the <strong>×</strong> to permanently clear a day from your dashboard.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: The 3-Step Workflow */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">02. The 3-Step Workflow</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4 p-6 rounded-[2rem] bg-white dark:bg-stone-800/20 border border-slate-100 dark:border-stone-700/50">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm">1</div>
                <h5 className="font-black text-[12px] dark:text-white uppercase tracking-wider">Ingest</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Drag & Drop your Arrival Report PDF. <strong>Map-Lock</strong> technology cross-references the floor plan to fix OCR room errors, while <strong>Slash-Scan</strong> finds hidden dinner bookings.
                </p>
              </div>
              <div className="space-y-4 p-6 rounded-[2rem] bg-[#c5a065]/5 border border-[#c5a065]/20">
                <div className="w-10 h-10 rounded-full bg-[#c5a065] text-white flex items-center justify-center font-black text-sm">2</div>
                <h5 className="font-black text-[12px] dark:text-white uppercase tracking-wider text-[#c5a065]">Audit</h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Click <strong>✨ AI Audit</strong>. The system performs a <strong>Deep Sweep</strong>, scanning every line of booking text to find hidden Allergies, VIP statuses, and physical asset requests.
                </p>
              </div>
              <div className="space-y-4 p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-800/20 border border-slate-100 dark:border-stone-700/50">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm">3</div>
                <h5 className="font-black text-[12px] dark:text-white uppercase tracking-wider">Deploy</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Use the <strong>🖨️ Print</strong> menu for your specific role: <strong>Master</strong> (Full data), <strong>Greeter</strong> (Strategic view), or <strong>In-Room</strong> (Housekeeping manifest).
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Intelligence Features */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">03. Intelligence Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60">
                <span className="text-3xl block mb-4">🛡️</span>
                <h6 className="font-black text-[11px] uppercase tracking-widest dark:text-white mb-2">Revenue Guard</h6>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  The AI identifies "APR" (Advanced Purchase) codes and tags guests as <strong>✅ PAID IN FULL</strong> automatically to prevent awkward billing requests.
                </p>
              </div>
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60">
                <span className="text-3xl block mb-4">🧹</span>
                <h6 className="font-black text-[11px] uppercase tracking-widest dark:text-white mb-2">The Deep Sweep</h6>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Finds requests buried deep in "Traces" or "Booking Notes" like <strong>Ice Buckets</strong>, <strong>Dog Beds</strong>, or <strong>Extra Pillows</strong> that usually don't reach the arrival sheet.
                </p>
              </div>
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60">
                <span className="text-3xl block mb-4">💎</span>
                <h6 className="font-black text-[11px] uppercase tracking-widest dark:text-white mb-2">Map-Lock</h6>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Room names from OCR can be unreliable. Map-Lock forces every guest into the 100% correct room based on the official Gilpin Hotel and Lake House floor plan.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Voice Assistant */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">04. The Guest Partner (Voice AI)</h4>
            <div className="p-8 rounded-[2.5rem] border border-indigo-500/20 bg-indigo-500/5 flex flex-col md:flex-row gap-8 items-center">
              <div className="text-5xl animate-pulse">🤖</div>
              <div className="flex-1">
                <h6 className="font-black text-sm uppercase tracking-wider dark:text-white mb-2">Live Co-Pilot</h6>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Activate your partner by clicking the <strong>Robot</strong> icon. Speak naturally to audit the arrivals or get briefings.
                  <br /><br />
                  <strong>Voice Prompts:</strong> 
                  <span className="block mt-2 font-mono text-indigo-500 italic">"Brief me on today's arrivals."</span>
                  <span className="block font-mono text-indigo-500 italic">"Find all guests with dairy allergies."</span>
                  <span className="block font-mono text-indigo-500 italic">"Are there any VIPs arriving after 4pm?"</span>
                </p>
              </div>
            </div>
          </section>

          <div className="bg-slate-950 text-white p-8 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <p className="text-[13px] font-medium leading-relaxed italic relative z-10 max-w-2xl mx-auto">
              " This titanium protocol ensures the Gilpin Arrival Team stays ten steps ahead of every guest's needs. Accuracy is luxury. "
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="py-5 bg-slate-100 dark:bg-black/40 flex justify-center border-t border-slate-200 dark:border-stone-800/40">
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-500">Gilpin Hotel & Lake House • v5.0 Master Protocol</p>
        </div>
      </div>
    </div>
  );
};

export default SOPModal;