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
            <h2 className="heading-font text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Gilpin Intelligence Hub • Operational Guide</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a065] mt-1">v5.0 Titanium Protocol</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white dark:bg-stone-800 shadow-lg flex items-center justify-center text-xl font-black text-slate-500 dark:text-slate-400 hover:text-rose-600 transition-all active:scale-90 border border-slate-200 dark:border-stone-700"
          >×</button>
        </div>

        {/* Content Body */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12 bg-white dark:bg-[#0f1115]">
          
          {/* Section 1: The Workspace (Tabs) */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">01. The Workspace (Tabs)</h4>
            <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col md:flex-row gap-8 items-center">
              <div className="text-5xl">📂</div>
              <div className="flex-1">
                <h6 className="font-black text-sm uppercase tracking-wider dark:text-white mb-2">Browser-Style Organization</h6>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  The Hub now works like a modern web browser. Every Arrival PDF you drop into the interface creates a dedicated <strong>Day Tab</strong> at the top (e.g., "Friday 7th", "Saturday 8th"). 
                  <br /><br />
                  <span className="text-[#c5a065] font-bold">Concept:</span> Switch between different arrival days instantly by clicking the tabs. Your edits and notes are saved automatically to the specific day. When you're finished with a list, click the <strong>×</strong> to close the tab and clear the memory.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: The 3-Step Workflow */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">02. The 3-Step Workflow</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4 p-6 rounded-[2rem] bg-white dark:bg-stone-800/20 border border-slate-100 dark:border-stone-700/50 relative overflow-hidden group">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm z-10 relative">1</div>
                <h5 className="font-black text-[12px] dark:text-white uppercase tracking-wider relative z-10">Ingest</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed relative z-10">
                  Drag & Drop the Arrival Report. <strong>Map-Lock</strong> automatically validates room names against the floor plan, ensuring 100% accurate numbering.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-[2rem] bg-[#c5a065]/5 border border-[#c5a065]/30 relative overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-[#c5a065] text-white flex items-center justify-center font-black text-sm z-10 relative">2</div>
                <h5 className="font-black text-[12px] dark:text-white uppercase tracking-wider relative z-10">Audit</h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed relative z-10 font-medium">
                  Click <strong>✨ AI Audit</strong>. The Intelligence Unit scans every hidden trace to find Allergies, Payment statuses, and missing package items automatically.
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-[2rem] bg-white dark:bg-stone-800/20 border border-slate-100 dark:border-stone-700/50 relative overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm z-10 relative">3</div>
                <h5 className="font-black text-[12px] dark:text-white uppercase tracking-wider relative z-10">Deploy</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed relative z-10">
                  Use the <strong>🖨️ Print</strong> menu to generate the layout for your role: <strong>Greeter</strong>, <strong>Master</strong>, or <strong>In-Room</strong> checklists.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Intelligence Features */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">03. Intelligence Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 transition-transform hover:-translate-y-1">
                <span className="text-3xl block mb-4">🛡️</span>
                <h6 className="font-black text-[10px] uppercase tracking-widest dark:text-white mb-2">Revenue Guard</h6>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Identifies "APR" codes and tags guests as <strong>✅ PAID IN FULL</strong> so you never ask for money at the door.
                </p>
              </div>
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 transition-transform hover:-translate-y-1">
                <span className="text-3xl block mb-4">🧹</span>
                <h6 className="font-black text-[10px] uppercase tracking-widest dark:text-white mb-2">Deep Sweep</h6>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Hunts for "Ice Buckets" or "Dog Beds" buried deep in booking traces and brings them to the surface.
                </p>
              </div>
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 transition-transform hover:-translate-y-1">
                <span className="text-3xl block mb-4">💎</span>
                <h6 className="font-black text-[10px] uppercase tracking-widest dark:text-white mb-2">Map-Lock</h6>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ensures 100% accurate Room Numbers by validating every entry against the official Gilpin floor plan.
                </p>
              </div>
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 transition-transform hover:-translate-y-1">
                <span className="text-3xl block mb-4">🎁</span>
                <h6 className="font-black text-[10px] uppercase tracking-widest dark:text-white mb-2">Asset Tracker</h6>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Places gifts (Champagne, Flowers) directly in the <strong>Intelligence</strong> column so Greeters never miss a surprise.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Voice AI Assistant */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">04. The Guest Partner (Voice AI)</h4>
            <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border border-indigo-500/20 flex flex-col md:flex-row gap-8 items-center">
              <div className="text-5xl animate-pulse">🤖</div>
              <div className="flex-1">
                <h6 className="font-black text-sm uppercase tracking-wider dark:text-white mb-2">Operational Co-Pilot</h6>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Click the <strong>Robot</strong> icon in the navigation bar to wake your assistant. You can speak naturally or type commands.
                  <br /><br />
                  <span className="text-indigo-500 font-bold uppercase tracking-widest text-[10px]">Suggested Commands:</span>
                  <ul className="mt-3 space-y-2 text-[11px] font-mono italic">
                    <li>• "Give me a morning briefing for Friday."</li>
                    <li>• "Which guests have dairy allergies?"</li>
                    <li>• "Are there any special occasions arriving after 4 PM?"</li>
                  </ul>
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: Strategic Intelligence Dashboard */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">05. Strategic Intelligence Dashboard</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 transition-all hover:border-[#c5a065]/30">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-3xl">📈</span>
                  <h6 className="font-black text-[12px] uppercase tracking-widest dark:text-white">Occupancy Pulse</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Visualizes the flow of arrivals across your manifests. This help the management team spot peak check-in windows to ensure greeters are positioned when the pressure is highest.
                </p>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 transition-all hover:border-[#c5a065]/30">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-3xl">🥧</span>
                  <h6 className="font-black text-[12px] uppercase tracking-widest dark:text-white">Strategic Mix</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Breaks down the arrival portfolio into <strong>Strategic (VIP)</strong>, <strong>Return</strong>, and <strong>New</strong> guests. Use this to pivot the team's tone between "Welcome back" and property orientation.
                </p>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 transition-all hover:border-[#c5a065]/30">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-3xl">🔍</span>
                  <h6 className="font-black text-[12px] uppercase tracking-widest dark:text-white">Risk Pattern Analysis</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  A pre-emptive operational scan that clusters hidden booking risks—like missing TBD logistics or payment alerts—into categories for rapid resolution before guest arrival.
                </p>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 transition-all hover:border-[#c5a065]/30">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-3xl">⚓</span>
                  <h6 className="font-black text-[12px] uppercase tracking-widest dark:text-white">Loyalty Anchor</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  A high-level percentage score reflecting the retention strength of the current manifest. A high score suggests a "Home away from home" atmosphere is required for the day.
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