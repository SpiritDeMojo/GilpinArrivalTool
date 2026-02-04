
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
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a065] mt-1">Arrivals Hub • GIU Titanium Protocol v4.1</p>
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
                  The Titanium back-end engine. V4.1 introduces **Revenue Guard (APR)** to auto-tag payments and **Map-Enforced Validation** to eliminate OCR room errors. It ensures every guest field meets the exact Gilpin Floor Plan standards.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-[#c5a065]/5 border border-[#c5a065]/20 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🤝</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-[#c5a065]">Guest Experience Partner</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Operational co-pilot. Now utilizes the **Deep Sweep** data to cross-reference Traces and Guest Notes during briefings. It is your primary tool for validating hidden items (Ice Buckets, Vouchers) that standard reports miss.
                </p>
              </div>

            </div>
          </section>

          {/* Core Feature Architecture */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">Titanium Deployment Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💎</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Map-Enforced Precision</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Room numbers are cross-referenced against the official Gilpin Floor Plan. This eliminates OCR room glitches like "125-Hardknott" and guarantees 100% accurate room-to-number mapping.
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🧹</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">The "Deep Sweep"</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Consolidated search across Traces, Guest Notes, and In-Room fields. It captures manual requests (Ice Buckets, Dog Beds, Extra Pillows) while filtering out staff initials (KW, LV, JH).
                </p>
              </div>

              <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-stone-900/40 border border-slate-100 dark:border-stone-800/60 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚡</span>
                  <h6 className="font-black text-[11px] uppercase tracking-wider dark:text-white">Slash-Scan Extraction</h6>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Ignores broken PDF section headers. V4.1 scans the raw text for "/Spice", "/Source", or "/Lake House" markers to capture every dining and spa booking without fail.
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
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Map-Enforced Parsing</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Drop PDF. The parser identifies rooms and verifies them against blueprints to fix numbering duplicates.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-[#c5a065] text-white flex items-center justify-center font-black text-xs">2</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Zero-Loss Analysis</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Trigger <strong>✨ AI Audit</strong>. The GIU Titanium engine audits packages and applies the Revenue Guard.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs">3</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Partner Brief</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Open <strong>🤖 Partner Chat</strong> for a "Morning Briefing" to check for missed alerts in the Deep Sweep stream.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-xs">4</div>
                <h5 className="font-bold text-[11px] dark:text-white uppercase tracking-wider">Final Output</h5>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select <strong>🖨️ Print</strong> mode: Master (Internal), Greeter (Reception), or Delivery (Housekeeping).
                </p>
              </div>
            </div>
          </section>

          {/* Logic Protocols (GIU Specific) */}
          <section className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c5a065] border-b border-[#c5a065]/10 pb-2">GIU Strategic Protocols</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { e: "💎", t: "Map-Lock", d: "Rooms verified against blueprints to stop numbering glitches." },
                { e: "🛡️", t: "Revenue Guard", d: "APR packages are auto-tagged as ✅ PAID IN FULL (Extras Only)." },
                { e: "🧹", t: "Deep Sweep", d: "Captures 'Ice Buckets' and manual requests buried in notes." },
                { e: "⚡", t: "Slash-Scan", d: "Captures dining bookings even if PDF headers are missing." }
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
              " This titanium protocol ensures the Gilpin Arrival Team stays ten steps ahead of every guest's needs."
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="py-5 bg-slate-100 dark:bg-black/40 flex justify-center border-t border-slate-200 dark:border-stone-800/40">
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-500">Gilpin Hotel & Lake House • Titanium Protocol v4.1</p>
        </div>
      </div>
    </div>
  );
};

export default SOPModal;
