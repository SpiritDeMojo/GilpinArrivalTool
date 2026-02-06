import React from 'react';

interface SOPModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOPModal: React.FC<SOPModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl border border-[#c5a065]/20 overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95">

        {/* --- Header: Titanium Protocol Branding --- */}
        <div className="px-10 py-8 border-b border-[#c5a065]/10 flex justify-between items-center bg-slate-50/80 dark:bg-[#111]/80 backdrop-blur-md sticky top-0 z-50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#c5a065] animate-pulse"></span>
              <h2 className="heading-font text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                Intelligence Hub Manual
              </h2>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
              Operational Handbook • <span className="text-[#c5a065]">v8.0 Titanium Protocol</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center text-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all active:scale-90"
          >
            ×
          </button>
        </div>

        {/* --- Scrollable Body: Content Sections --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#050505]">
          <div className="max-w-5xl mx-auto p-10 space-y-16">

            {/* 01. THE ANYWHERE WORKFLOW */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                01. The "Anywhere" Workflow
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] group hover:border-[#c5a065]/40 transition-all">
                  <div className="text-3xl mb-4">🖥️</div>
                  <h4 className="font-bold text-lg dark:text-white mb-2 uppercase tracking-tight">The Desk (Command View)</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Optimized for 1080p+ displays. Use the high-density <strong>Table View</strong> for morning audits, bulk data entry, and PDF processing. The full suite of filters allows for rapid property-wide strategizing.
                  </p>
                </div>
                <div className="p-8 rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] group hover:border-[#c5a065]/40 transition-all">
                  <div className="text-3xl mb-4">📱</div>
                  <h4 className="font-bold text-lg dark:text-white mb-2 uppercase tracking-tight">On-The-Move (Experience View)</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    The interface automatically transitions to <strong>Card View</strong> on tablets and mobiles. Specifically designed for greeters at the car or housekeepers in the field. Touch-friendly inputs and vertical data stacking ensure intelligence is always at your fingertips.
                  </p>
                </div>
              </div>
            </section>

            {/* 02. DEPARTMENTAL DASHBOARDS */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                02. Departmental Dashboards
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] text-center">
                  <div className="text-2xl mb-2">📋</div>
                  <div className="font-black text-sm dark:text-white">Arrivals</div>
                  <p className="text-[10px] text-slate-400 mt-1">Master guest list</p>
                </div>
                <div className="p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] text-center">
                  <div className="text-2xl mb-2">🧹</div>
                  <div className="font-black text-sm dark:text-white">Housekeeping</div>
                  <p className="text-[10px] text-slate-400 mt-1">Room cleaning status</p>
                </div>
                <div className="p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] text-center">
                  <div className="text-2xl mb-2">🔧</div>
                  <div className="font-black text-sm dark:text-white">Maintenance</div>
                  <p className="text-[10px] text-slate-400 mt-1">Room checks & fixes</p>
                </div>
                <div className="p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] text-center">
                  <div className="text-2xl mb-2">🛎️</div>
                  <div className="font-black text-sm dark:text-white">Reception</div>
                  <p className="text-[10px] text-slate-400 mt-1">Check-in & courtesy calls</p>
                </div>
              </div>

              <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 rounded-[2rem]">
                <h4 className="font-black text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">🔄 Room Readiness System</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  A room is marked <strong className="text-emerald-600">"Ready for Guest"</strong> only when <strong>BOTH</strong> Housekeeping AND Maintenance have marked it complete. Reception can see real-time progress with visual indicators showing which departments have finished.
                </p>
              </div>
            </section>

            {/* 03. CROSS-DEPARTMENT NOTES */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                03. Cross-Department Notes
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">📝</span>
                    <div className="font-black text-sm dark:text-white uppercase">Add Room Notes</div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Any department can add notes visible to all others. Use the <strong>📝 Add Note</strong> button on any room card. Notes include priority levels (Low, Medium, High, Urgent) and categories (Issue, Info, Request).
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">✅</span>
                    <div className="font-black text-sm dark:text-white uppercase">Resolve Notes</div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Once an issue is addressed, mark the note as <strong>Resolved</strong>. Resolved notes are hidden from the main view but remain in the system for audit purposes. Unresolved notes show a badge count.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-[1.5rem]">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  <strong>⚠️ Priority Levels:</strong> Urgent notes are highlighted in red and should be addressed immediately. High priority notes appear in orange.
                </p>
              </div>
            </section>

            {/* 04. PROPERTY FILTERING */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                04. Property Filtering
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🏨</span>
                    <div className="font-black text-sm dark:text-white">Main Hotel (1-31)</div>
                  </div>
                  <p className="text-xs text-slate-500">Filter to show only Main Hotel rooms. Perfect for focused housekeeping rounds.</p>
                </div>
                <div className="flex-1 p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🏡</span>
                    <div className="font-black text-sm dark:text-white">Lake House (51-60)</div>
                  </div>
                  <p className="text-xs text-slate-500">Filter to show only Lake House rooms. Useful for dedicated Lake House teams.</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">Use checkboxes in each dashboard's filter bar to toggle property views. Both can be enabled simultaneously.</p>
            </section>

            {/* 05. REAL-TIME SYNC */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                05. Real-Time Sync (Firebase)
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="bg-slate-900 rounded-[2rem] p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="text-5xl">🔥</div>
                  <div className="flex-1">
                    <h4 className="text-lg font-black text-white mb-3">Cross-Device Synchronization</h4>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                      When configured, all changes sync instantly across all connected devices. Update a room status on your iPad and see it reflected on the front desk computer within seconds.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">🟢 Synced = Connected</span>
                      <span className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold">🟡 Connecting...</span>
                      <span className="px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">🔴 Offline = Local Only</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 06. THE VOICE PARTNER */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                06. Hands-Free Operations
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="bg-slate-900 rounded-[3rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                  <div className="text-6xl animate-pulse">🎙️</div>
                  <div className="space-y-4">
                    <h4 className="text-xl font-black text-white tracking-tight uppercase">"Start the morning briefing."</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Use the <strong>AI Voice Assistant</strong> for queries while multitasking. It distinguishes between your verified edits (Clean Data) and the original booking text (Raw Stream).
                    </p>
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#c5a065]">
                      <span className="px-3 py-1 rounded-full border border-[#c5a065]/30 bg-black/40 italic">"What car is Room 4 arriving in?"</span>
                      <span className="px-3 py-1 rounded-full border border-[#c5a065]/30 bg-black/40 italic">"Which rooms need housekeeping?"</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 07. TACTICAL SCENARIOS */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                07. Tactical Scenarios (Best Practices)
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="space-y-4">
                <div className="p-8 rounded-[2.5rem] bg-indigo-50 dark:bg-[#0f1016] border border-indigo-100 dark:border-indigo-500/10 flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl">🌅</div>
                  <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-widest dark:text-white mb-2 text-indigo-500">The Morning Meeting</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-loose">
                      Upload the PDF manifest. Click <strong className="text-indigo-500">✨ AI Audit</strong> to scan for revenue risks (unpaid codes) and package discrepancies. Review the <strong>Strategic Analytics</strong> to brief the team on today's arrivals.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-emerald-50 dark:bg-[#0c1310] border border-emerald-100 dark:border-emerald-500/10 flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">🧹</div>
                  <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-widest dark:text-white mb-2 text-emerald-500">Housekeeping Rounds</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-loose">
                      Switch to <strong>Housekeeping Dashboard</strong>. Filter by property (Main or Lake). Work through rooms by clicking status buttons: Pending → In Progress → Cleaned → Inspected → Complete. Add notes for any issues found.
                    </p>
                  </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-amber-50 dark:bg-[#140f0c] border border-amber-100 dark:border-amber-500/10 flex flex-col md:flex-row gap-8 items-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">🛎️</div>
                  <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-widest dark:text-white mb-2 text-amber-600">Guest Check-In</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-loose">
                      Use <strong>Reception Dashboard</strong> to track guest arrivals. Wait for Room Ready indicator (both HK ✓ and Maint ✓). Update guest status through: Pre-Arrival → Arrived → On-Site → Checked-In. Make courtesy calls and log notes.
                    </p>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Footer: Legal / Versioning */}
          <div className="bg-slate-100 dark:bg-[#0a0a0a] p-8 text-center border-t border-slate-200 dark:border-[#222]">
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              GILPIN HOTEL & LAKE HOUSE • STRATEGIC OVERSIGHT • INTERNAL USE ONLY
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SOPModal;