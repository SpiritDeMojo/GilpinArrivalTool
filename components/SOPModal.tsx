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
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a065] mt-1">Intelligence Hub • User Manual & System Architecture</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white dark:bg-stone-800 shadow-lg flex items-center justify-center text-xl font-black text-slate-500 dark:text-slate-400 hover:text-rose-600 transition-all active:scale-90 border border-slate-200 dark:border-stone-700"
          >×</button>
        </div>

        {/* Content */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12 bg-white dark:bg-[#0f1115]">
          
          {/* Core Feature Architecture */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">Core System Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🧬</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Intelligence Parsing</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Automatically extracts and categorizes complex data from PDF arrival lists, identifying room assignments, guest history (L&L), and specific stay requirements with high precision.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🤖</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">AI Tactical Assistant</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  A real-time "Gilpin Agent" accessible via the nav-bar. It processes voice and text to provide instant insights on vehicle registrations, ETAs, and complex guest requirements.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">✨</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Gemini Strategy Engine</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Highlights critical guest notes and internal strategies, including "Comp Upgrade: Guest Unaware," dietary alerts, and VIP statuses using advanced LLM reasoning.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🖨️</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Multi-View Output</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Generates specialized, dynamic printouts for different departments, including Greeter Lists for arrival teams and Delivery Lists for Housekeeping assets.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎛️</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Operational Control</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Features a "Diamond Theme" UI with Ivory/Obsidian modes and a glassmorphism dashboard for real-time filtering of Main Hotel and Lake House guests.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🛡️</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Data Integrity</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Maintains a "Source of Truth" by integrating regex filtering to accurately capture vehicle registrations while excluding internal noise and rate codes.
                </p>
              </div>

            </div>
          </section>

          {/* Step-by-Step Instructions */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">Operational Workflow</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">1</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Ingestion</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Drop the Arrival PDF into the hub. The parser instantly builds the room matrix.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-[#c5a065] text-white flex items-center justify-center font-black text-xs">2</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">AI Audit</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Trigger <strong>✨ AI Audit</strong> to refine raw data and activate the <strong>🤖 Tactical Agent</strong>.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs">3</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Review</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Adjust ETAs or vehicle info. Use the AI chat to query specific room details or stay histories.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs">4</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Deploy</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Print specialized sheets or export to Excel for the Reception Host Desk.
                </p>
              </div>
            </div>
          </section>

          {/* Logic Protocols (Existing) */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">Automated Audit Protocols</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { e: "🎉", t: "Celebrations", d: "Flags CEL/MAG packages missing assets." },
                { e: "🤫", t: "Comp Upgrades", d: "Flags 'Guest Unaware' upgrades." },
                { e: "⭐", t: "VIP Status", d: "Priority mapping for POB staff and owners." },
                { e: "💳", t: "Billing Guard", d: "Detects vouchers to hide bills from guests." }
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
              "Efficiency is the silent partner of luxury. This hub is the final safety net ensuring every detail matches the Gilpin standard."
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="py-5 bg-slate-100 dark:bg-black/40 flex justify-center border-t border-slate-200 dark:border-stone-800/40">
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-500">Gilpin Hotel & Lake House • GIU Ultimate Protocol</p>
        </div>
      </div>
    </div>
  );
};

export default SOPModal;