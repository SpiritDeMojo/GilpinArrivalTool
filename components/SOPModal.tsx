import React from 'react';

interface SOPModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOPModal: React.FC<SOPModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-2 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-6xl h-[95vh] md:h-[90vh] rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl border border-[#c5a065]/20 overflow-hidden flex flex-col transform transition-all animate-in zoom-in-95">

        {/* --- Header --- */}
        <div className="px-5 md:px-10 py-5 md:py-8 border-b border-[#c5a065]/10 flex justify-between items-center bg-slate-50/80 dark:bg-[#111]/80 backdrop-blur-md sticky top-0 z-50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#c5a065] animate-pulse"></span>
              <h2 className="heading-font text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                Operational Handbook
              </h2>
            </div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-slate-400 dark:text-slate-500">
              Standard Operating Procedures • <span className="text-[#c5a065]">v17.1</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center text-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all active:scale-90"
          >
            ×
          </button>
        </div>

        {/* --- Scrollable Body --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#050505]">
          <div className="max-w-5xl mx-auto px-5 md:px-10 py-8 md:py-10 space-y-12 md:space-y-16">

            {/* 00. SIGN IN */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                00. Sign In
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222]">
                <div className="text-3xl mb-4">👤</div>
                <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Name-Based Identity</h4>
                <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  When you open the app, you'll be asked to enter your name. This is <strong>not a password</strong> — it's a simple identity tag so the team knows who made each action.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">💬</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Chat Messages</h5>
                      <p className="text-[10px] text-slate-400">Your name appears on all chat messages</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">📦</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">In-Room Deliveries</h5>
                      <p className="text-[10px] text-slate-400">Tracks who delivered items to each room</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">📡</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Live Presence</h5>
                      <p className="text-[10px] text-slate-400">Other devices see who's currently online</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">📋</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Activity Log</h5>
                      <p className="text-[10px] text-slate-400">All status changes are attributed to you</p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-4">
                  <strong>To change user:</strong> Click your name badge in the top-right corner of the navbar and press the sign-out button.
                </p>
              </div>
            </section>

            {/* 01. THE ANYWHERE WORKFLOW */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                01. The Anywhere Workflow
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] group hover:border-[#c5a065]/40 transition-all">
                  <div className="text-3xl mb-4">🖥️</div>
                  <h4 className="font-bold text-base md:text-lg text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Command View (Desktop)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    Optimised for 1080p+ displays. The high-density <strong>Table View</strong> supports morning audits, bulk data entry, and PDF processing. Full filter controls enable property-wide planning at a glance.
                  </p>
                </div>
                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] group hover:border-[#c5a065]/40 transition-all">
                  <div className="text-3xl mb-4">📱</div>
                  <h4 className="font-bold text-base md:text-lg text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Experience View (Mobile)</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    The interface transitions to <strong>Card View</strong> on tablets and mobiles automatically. Touch-friendly inputs and vertical data stacking ensure all guest intelligence remains accessible in the field.
                  </p>
                </div>
              </div>
            </section>

            {/* 02. DEPARTMENTAL DASHBOARDS */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                02. Departmental Dashboards
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                {[
                  { icon: '📋', name: 'Arrivals', desc: 'Master guest list with full booking data' },
                  { icon: '🧹', name: 'Housekeeping', desc: 'Room cleaning status and AI priority' },
                  { icon: '🔧', name: 'Maintenance', desc: 'Room checks, repairs, and issue log' },
                  { icon: '🛎️', name: 'Reception', desc: 'Check-in tracking and courtesy calls' },
                ].map((d) => (
                  <div key={d.name} className="p-4 md:p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] text-center">
                    <div className="text-2xl mb-2">{d.icon}</div>
                    <div className="font-black text-sm text-slate-900 dark:text-white">{d.name}</div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">{d.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 md:p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                <h4 className="font-black text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">🔄 Room Readiness System</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  A room is marked <strong className="text-emerald-600 dark:text-emerald-400">"Ready for Guest"</strong> only when <strong>both</strong> Housekeeping and Maintenance have marked it complete. Reception sees real-time progress with visual indicators showing which departments have finished.
                </p>
              </div>
            </section>

            {/* 03. GUEST ACTIVITY AUDIT LOG */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                03. Guest Activity Audit Log
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">📜</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Activity Timeline</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Every status change, room update, and delivery action is automatically recorded with a timestamp and the user who performed it. Tap the <strong>📜</strong> button on any guest row to open the full audit trail in a slide-out panel.
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🔍</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Department Filtering</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Filter the audit trail by department — Housekeeping, Maintenance, or Reception — to see only the changes relevant to your team. Entries are grouped by date and sorted chronologically for easy review.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 rounded-[1.5rem]">
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                  <strong>Tracked fields:</strong> HK status, Maintenance status, Guest status, Room assignment, In-room delivery, ETA, Vehicle, Facilities, Preferences, and Room Notes.
                </p>
              </div>
            </section>

            {/* 04. ROOM MOVE TRACKING */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                04. Room Move Tracking
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">🔄</span>
                  <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Automatic Room Move Detection</div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                  When a guest's room number is changed, the system automatically records the move with timestamp and previous room. A <strong className="text-blue-500">← Room X</strong> badge appears next to the current room number on every dashboard. The Conflict Detector also displays room moves as informational alerts.
                </p>
                <div className="flex flex-wrap gap-3 text-[10px]">
                  <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">← 101 (Previous Room Badge)</span>
                  <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">🔄 Room Move Conflict Alert</span>
                </div>
              </div>
            </section>

            {/* 05. AI-POWERED FEATURES */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                05. AI-Powered Features
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 mb-4 md:mb-6">
                <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                  <div className="text-4xl md:text-5xl">✨</div>
                  <div className="flex-1">
                    <h4 className="text-base md:text-lg font-black text-white mb-3">AI Audit Refine</h4>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                      Analyses the entire guest manifest using Gemini AI. Scans for revenue risks such as unpaid rate codes, package discrepancies, and missing data. Highlights anomalies and suggests corrections across all guest records.
                    </p>
                    <p className="text-xs text-slate-500 italic">Accessible from the ✨ AI Audit button in the navigation bar.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🧹</span>
                    <div className="font-black text-sm text-violet-700 dark:text-violet-300 uppercase">AI Cleaning Priority</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    Available on the Housekeeping Dashboard via the <strong className="text-violet-600 dark:text-violet-400">🤖 AI Priority</strong> button. Analyses guest ETAs and VIP status to recommend the optimal cleaning order — identifying the top five rooms to prioritise. Highlighted rooms display a violet priority badge with ranking position.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 italic">The AI provides a reasoning summary explaining its priority decisions.</p>
                </div>

                <div className="p-6 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🏷️</span>
                    <div className="font-black text-sm text-violet-700 dark:text-violet-300 uppercase">AI Sentiment Analysis</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    Analyses guest notes and preferences to generate actionable tags such as <strong>"Quiet Room Required"</strong>, <strong>"Allergy Alert"</strong>, or <strong>"Anniversary Celebration"</strong>. Tags appear as violet pills beneath the guest's preferences on both desktop and mobile views.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[8px] font-black uppercase bg-violet-500/15 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20">🏷️ Quiet Room</span>
                    <span className="text-[8px] font-black uppercase bg-violet-500/15 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20">🏷️ Allergy Alert</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 05b. AI LIVE ASSISTANT */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                05b. AI Live Assistant
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 md:p-8 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-[1.5rem] md:rounded-[2rem] mb-6">
                <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                  <div className="text-4xl md:text-5xl">🤖</div>
                  <div className="flex-1">
                    <h4 className="text-base md:text-lg font-black text-white mb-3">AI Live Assistant</h4>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                      Your conversational AI colleague — available via the <strong className="text-indigo-400">💬 Chat Panel → 🤖 Assistant tab</strong>. Supports both voice (microphone) and text input. The assistant has full access to today&apos;s guest manifest and can take real actions on your behalf.
                    </p>
                    <p className="text-xs text-slate-500 italic">Tap the 💬 floating button at bottom-right, then switch to the 🤖 Assistant tab.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🎙️</span>
                    <div className="font-black text-sm text-indigo-700 dark:text-indigo-300 uppercase">Voice &amp; Text Commands</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    Speak or type any of these commands:
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 list-none">
                    <li><strong className="text-indigo-400">&quot;Morning briefing&quot;</strong> — full overview of today&apos;s arrivals</li>
                    <li><strong className="text-indigo-400">&quot;What room is [Guest]?&quot;</strong> — guest lookup</li>
                    <li><strong className="text-indigo-400">&quot;What car is Room 5?&quot;</strong> — car registration lookup</li>
                    <li><strong className="text-indigo-400">&quot;How long is [Guest] staying?&quot;</strong> — duration check</li>
                    <li><strong className="text-indigo-400">&quot;Who is arriving next?&quot;</strong> — chronological ETA order</li>
                  </ul>
                </div>

                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">⚡</span>
                    <div className="font-black text-sm text-indigo-700 dark:text-indigo-300 uppercase">AI Actions</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    The assistant can take real actions that update the dashboard:
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 list-none">
                    <li><strong className="text-indigo-400">&quot;Note for Room 5: extra pillows&quot;</strong> — adds a room note</li>
                    <li><strong className="text-indigo-400">&quot;Mark Room 7 as cleaned&quot;</strong> — updates HK status</li>
                    <li><strong className="text-indigo-400">&quot;Room 3 inspection complete&quot;</strong> — marks as inspected</li>
                    <li><strong className="text-indigo-400">&quot;Guest in Room 4 has arrived&quot;</strong> — sets guest to on-site</li>
                    <li><strong className="text-indigo-400">&quot;Check out Room 9&quot;</strong> — marks guest as checked out</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 06. STRATEGIC ANALYTICS */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                06. Strategic Analytics
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem] mb-4 md:mb-6">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  The <strong>📊 Intelligence</strong> panel provides a data-driven overview of arrival patterns across all uploaded manifests. Toggle it from the navigation bar. Below is a guide to each statistic.
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-[#0a0a0a] rounded-xl border border-slate-100 dark:border-[#222]">
                    <div className="flex items-center gap-2 mb-1">
                      <span>🌍</span>
                      <span className="font-black text-xs uppercase text-slate-900 dark:text-white">Arrival Volume</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      The total number of guest arrivals across all active manifests matching the current filter. This is a simple count of every guest record currently loaded in the system.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#0a0a0a] rounded-xl border border-slate-100 dark:border-[#222]">
                    <div className="flex items-center gap-2 mb-1">
                      <span>💎</span>
                      <span className="font-black text-xs uppercase text-slate-900 dark:text-white">VIP Intensity</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      The percentage of arrivals flagged as VIP, Director, Celebrity, or other high-profile designations. <strong>Calculation:</strong> (Number of VIP-flagged guests ÷ Total guests) × 100. A higher percentage indicates a service-intensive day requiring elevated attention from all departments.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#0a0a0a] rounded-xl border border-slate-100 dark:border-[#222]">
                    <div className="flex items-center gap-2 mb-1">
                      <span>🔄</span>
                      <span className="font-black text-xs uppercase text-slate-900 dark:text-white">Loyalty Impact</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      The percentage of guests who are returning visitors (L&L status = "Yes"). <strong>Calculation:</strong> (Number of returning guests ÷ Total guests) × 100. A high loyalty rate reflects strong guest retention and signals that personalised touches — remembering preferences, acknowledging return visits — will be particularly important.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-[#0a0a0a] rounded-xl border border-slate-100 dark:border-[#222]">
                    <div className="flex items-center gap-2 mb-1">
                      <span>🌱</span>
                      <span className="font-black text-xs uppercase text-slate-900 dark:text-white">Target Growth</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      The percentage of first-time guests. <strong>Calculation:</strong> 100% − Loyalty Impact. This represents the new guest acquisition opportunity. First-time guests require thorough welcome briefings and proactive service to encourage future returns.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem]">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white mb-2">📈 Occupancy Pulse Trace</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    An area chart showing the number of guest arrivals per date across all loaded manifests. Each point represents a unique date. This helps identify busy periods and staffing requirements at a glance.
                  </p>
                </div>
                <div className="p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem]">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white mb-2">🍰 Arrival Portfolio Mix</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    A donut chart breaking down arrivals into three categories: VIP/Strategic guests, Returning guests, and New arrivals. This informs service-level allocations and helps teams understand the day's guest composition.
                  </p>
                </div>
                <div className="p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem]">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white mb-2">📊 Room Category Breakdown</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    A horizontal bar chart showing how many guests are booked into each room category (Master Room, Junior Suite, Spa Lodge, Lake House, etc.). Categories are determined by the room type code or inferred from room number ranges.
                  </p>
                </div>
                <div className="p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem]">
                  <h4 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white mb-2">🧠 AI Tactical Summary</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    A Gemini-generated narrative summarising the day's key patterns, risks, and opportunities. This is refreshed each time analytics data is recalculated and provides an at-a-glance briefing for team leaders.
                  </p>
                </div>
              </div>
            </section>

            {/* 07. CROSS-DEPARTMENT NOTES */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                07. Cross-Department Notes
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">📝</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Add Room Notes</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Any department can add notes visible to all others. Use the <strong>📝 Add Note</strong> button on any room card. Notes include priority levels (Low, Medium, High, Urgent) and categories (Issue, Info, Request).
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">✅</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Resolve Notes</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Once an issue is addressed, mark the note as <strong>Resolved</strong>. Resolved notes are hidden from the main view but remain in the system for audit purposes. Unresolved notes display a badge count on each room card.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-[1.5rem]">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  <strong>⚠️ Priority Levels:</strong> Urgent notes are highlighted in red and should be addressed immediately. High priority notes appear in orange.
                </p>
              </div>
            </section>

            {/* 08. PROPERTY FILTERING */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                08. Property Filtering
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="flex-1 p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🏨</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white">Main Hotel (Rooms 1–31)</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Filter to display only Main Hotel rooms. Useful for focused housekeeping rounds and departmental handovers.</p>
                </div>
                <div className="flex-1 p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🏡</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white">Lake House (Rooms 51–58)</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">Filter to display only Lake House rooms. Useful for dedicated Lake House teams and targeted operations.</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 text-center">Use checkboxes in each dashboard's filter bar to toggle property views. Both can be enabled simultaneously.</p>
            </section>

            {/* 09. REAL-TIME SYNC */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                09. Real-Time Sync
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                  <div className="text-4xl md:text-5xl">🔥</div>
                  <div className="flex-1">
                    <h4 className="text-base md:text-lg font-black text-white mb-3">Cross-Device Synchronisation</h4>
                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                      When configured with Firebase, all changes synchronise instantly across connected devices. A status update on one device is reflected on all others within seconds. The connection badge in the dashboard header indicates the current sync state.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <span className="px-3 md:px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">🟢 Synced</span>
                      <span className="px-3 md:px-4 py-2 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold">🟡 Connecting</span>
                      <span className="px-3 md:px-4 py-2 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">🔴 Offline (Local Only)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Day Sync */}
              <div className="mt-4 md:mt-6 p-6 md:p-8 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">📅</span>
                  <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Multi-Day Sessions</div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Upload <strong>multiple arrival PDFs</strong> (e.g. Monday, Tuesday, Wednesday) on the reception PC. Each day appears as a separate tab in the <strong>Session Bar</strong> at the top of the dashboard. All connected devices — phones, tablets, other PCs — see every day automatically.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">📤</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Upload</h5>
                      <p className="text-[10px] text-slate-400">Upload PDFs on reception PC — each day syncs to all devices</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">📱</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">View</h5>
                      <p className="text-[10px] text-slate-400">Tap tabs to switch between days — all data stays synced</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">🗑️</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Delete</h5>
                      <p className="text-[10px] text-slate-400">Deleting a session removes it from all devices instantly</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Reliability */}
              <div className="mt-4 md:mt-6 p-6 md:p-8 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">🛡️</span>
                  <div className="font-black text-sm text-emerald-700 dark:text-emerald-400 uppercase">Sync Reliability Engine</div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  The sync system includes built-in self-healing. If your device loses connection — backgrounded tabs, Wi-Fi drops, or mobile sleep mode — it automatically recovers without manual refresh.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">📱</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Background Recovery</h5>
                      <p className="text-[10px] text-slate-400">Tabs automatically re-subscribe when you return after 60+ seconds away</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">💾</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Smart Persistence</h5>
                      <p className="text-[10px] text-slate-400">Local storage writes are skipped during remote updates to prevent data conflicts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">🔄</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Health Monitoring</h5>
                      <p className="text-[10px] text-slate-400">Connection health is continuously verified — stale listeners are replaced automatically</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 10. HANDS-FREE OPERATIONS */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                10. Hands-Free Operations
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                  <div className="text-5xl md:text-6xl animate-pulse">🎙️</div>
                  <div className="space-y-4">
                    <h4 className="text-lg md:text-xl font-black text-white tracking-tight uppercase">Voice Assistant</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Use the AI Voice Assistant for hands-free queries and note creation. It can answer questions about guest data, create room notes, and provide operational summaries while you remain focused on service delivery.
                    </p>
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#c5a065]">
                      <span className="px-3 py-1 rounded-full border border-[#c5a065]/30 bg-black/40 italic">"What car is Room 4 arriving in?"</span>
                      <span className="px-3 py-1 rounded-full border border-[#c5a065]/30 bg-black/40 italic">"Note for Room 5: extra pillows"</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 11. GUEST ON/OFF-SITE TRACKING */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                11. Guest On/Off-Site Tracking
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🚶</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Off-Site Status</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    When a guest leaves the property temporarily, use the <strong>🚶 Guest Off Site</strong> button in the Reception dashboard. All departments will see a <strong className="text-rose-500">🔴 OFF SITE</strong> indicator, allowing housekeeping to prioritise room access.
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🟢</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Cross-Department Visibility</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Housekeeping and Maintenance dashboards display guest presence indicators (<strong className="text-emerald-500">🟢 ON SITE</strong> / <strong className="text-rose-500">🔴 OFF SITE</strong>). Reception shows HK and Maintenance progress badges with a <strong>✅ Room Ready</strong> indicator when both departments are complete.
                  </p>
                </div>
              </div>
            </section>

            {/* 12. CHAT PANEL & NOTIFICATIONS */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                12. Chat Panel &amp; Notifications
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 md:p-8 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-[1.5rem] md:rounded-[2rem] mb-6">
                <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                  <div className="text-4xl md:text-5xl">💬</div>
                  <div className="flex-1">
                    <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-3">Unified Chat Panel</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      The floating <strong className="text-indigo-400">💬</strong> button in the bottom-right corner opens the Chat Panel with two tabs: <strong>Team Chat</strong> for cross-department messaging, and <strong>🤖 AI Assistant</strong> for voice/text AI commands.
                    </p>
                    <p className="text-xs text-slate-500 italic">An unread badge shows on the FAB when new team messages arrive while the panel is closed.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">💬</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Team Chat Tab</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    Real-time messaging between all team members on the same session. Messages are colour-coded by department. Use the <strong>🗑️</strong> button to clear the entire chat history (with confirmation).
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[8px] font-black uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">Reception</span>
                    <span className="text-[8px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">Housekeeping</span>
                    <span className="text-[8px] font-black uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">Maintenance</span>
                  </div>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🤖</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">AI Assistant Tab</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                    The AI assistant <strong>auto-connects</strong> when you switch to the Assistant tab — no Start button needed. On HTTPS/localhost, the 🎙️ mic toggle appears for voice input. On HTTP (mobile via IP), the assistant runs in <strong>text-only mode</strong> automatically.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 italic">If the connection fails, an error banner with a Retry button will appear.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🔔</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Sound Notifications</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Audio alerts sound when remote users make changes: a chime for status updates, an alert tone for urgent notes, and a doorbell for guest arrivals. Use the 🔔/🔕 button in the navigation to toggle mute.
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🗑️</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Delete Chat</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Tap the <strong>🗑️</strong> button to clear the entire chat. A confirmation banner slides in before deletion. Clearing is instant and syncs to all connected devices.
                  </p>
                </div>
              </div>
            </section>


            {/* 13. TACTICAL SCENARIOS */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                13. Recommended Workflows
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="space-y-4">
                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-indigo-50 dark:bg-[#0f1016] border border-indigo-100 dark:border-indigo-500/10 flex flex-col md:flex-row gap-6 md:gap-8 items-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-2xl flex-shrink-0">🌅</div>
                  <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-widest text-indigo-500 mb-2">Morning Briefing</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-loose">
                      Upload the PDF manifest. Run <strong className="text-indigo-500">✨ AI Audit</strong> to scan for revenue risks and data discrepancies. Open <strong>📊 Strategic Analytics</strong> to review VIP Intensity, Loyalty Impact, and arrival volumes. Brief the team with the AI Tactical Summary.
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-emerald-50 dark:bg-[#0c1310] border border-emerald-100 dark:border-emerald-500/10 flex flex-col md:flex-row gap-6 md:gap-8 items-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl flex-shrink-0">🧹</div>
                  <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-widest text-emerald-500 mb-2">Housekeeping Rounds</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-loose">
                      Switch to Housekeeping Dashboard. Use <strong className="text-violet-500">🤖 AI Priority</strong> to determine optimal cleaning order. Check the guest presence indicator before entering rooms. Work through status buttons: Pending → In Progress → Cleaned → Inspected → Complete. Tap 📜 to review any room's activity history.
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-amber-50 dark:bg-[#140f0c] border border-amber-100 dark:border-amber-500/10 flex flex-col md:flex-row gap-6 md:gap-8 items-center">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0">🛎️</div>
                  <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">Guest Check-In</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-loose">
                      Use the Reception Dashboard to track guest arrivals. Watch for the <strong>✅ Room Ready</strong> indicator showing both HK and Maintenance are complete. Use <strong>🚶 Guest Off Site</strong> when guests leave temporarily. Log courtesy calls with sentiment tags. Review AI-generated tags for proactive service opportunities.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 14. BOOKING STREAM */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                14. Booking Stream
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222]">
                <div className="text-3xl mb-4">📄</div>
                <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Structured PDF View</h4>
                <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Each guest row has a <strong>▶ Booking Stream</strong> toggle. Expanding it shows the original PDF booking data in a clean, structured layout — not raw text.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">📋</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Header Row</h5>
                      <p className="text-[10px] text-slate-400">ID, Name, Room, Time, Status, Departure, Type, Rate Code, Rate, Car Reg</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">🍽️</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Facility Bookings</h5>
                      <p className="text-[10px] text-slate-400">Restaurant reservations, spa sessions, and activity bookings</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">⚠️</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Allergies & HK Notes</h5>
                      <p className="text-[10px] text-slate-400">Red-highlighted allergy alerts and housekeeping notes side-by-side</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">💰</span>
                    <div>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Charges & Billing</h5>
                      <p className="text-[10px] text-slate-400">Line items with dates and prices, billing summary, and rate information</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 15. DEPARTMENT ACCESS CONTROL */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                15. Department Access
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222]">
                <div className="text-3xl mb-4">🔐</div>
                <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Role-Based Views</h4>
                <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  On sign-in you select your <strong>department</strong>. This controls which tabs and tools appear.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🧹</span>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Housekeeping</h5>
                    </div>
                    <p className="text-[10px] text-slate-400">🧹 HK tab only. Room name, allergies, and HK notes visible. No AI or print tools.</p>
                  </div>
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔧</span>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Maintenance</h5>
                    </div>
                    <p className="text-[10px] text-slate-400">🔧 Maintenance tab only. Room name, car reg, and HK notes visible. No AI or print tools.</p>
                  </div>
                  <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🛎️</span>
                      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">Reception</h5>
                    </div>
                    <p className="text-[10px] text-slate-400">All 4 tabs. Full guest data, AI Audit, Intelligence, Print, Excel, and manual booking tools.</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3">Your department is saved locally — you won’t need to re-select unless you sign out.</p>
              </div>
            </section>

            {/* 16. UI ANIMATIONS & VISUAL POLISH */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                16. UI Animations & Visual Polish
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] mb-6">
                <div className="text-3xl mb-4">✨</div>
                <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Premium Animation System</h4>
                <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  The interface features a comprehensive animation engine designed for a premium, responsive feel. All animations are theme-aware (light & dark) and automatically disabled in <strong>print mode</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🎬</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Entrance Animations</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Content sections fade in with a subtle upward slide on page load. Dashboard filter pills cascade in with staggered timing (50ms apart). Session tabs slide in from the left (60ms stagger). Table rows enter with a 20ms staggered cascade. Guest cards and rows use <strong>Framer Motion</strong> AnimatePresence for smooth expand/collapse transitions.
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">👆</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Micro-Interactions</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Buttons scale down on press (0.96x). Table rows lift with a shadow on hover. Dashboard pills hover-lift with enhanced shadow. Status badges scale up (1.05x) on hover. Input fields gain a golden glow ring on focus. Mobile cards respond to touch with a subtle press-down. Chat messages enter with a ripple animation (slide-up + scale spring).
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🎨</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">View Transitions</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Switching between dashboard tabs triggers a Framer Motion scale-up with fade-in and de-blur transition (AnimatePresence mode="wait"). The active tab displays a continuous golden shimmer sweep. Non-active tabs show an ambient golden glow on hover. Tab buttons feature whileHover and whileTap spring feedback.
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🌗</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Theme Transitions</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Toggling between light and dark mode smoothly transitions all colours over 0.3 seconds. The navbar logo adapts with a dark background and golden glow shadow in dark mode. The logo features a 3D spherical tilt with perspective and an interactive hover pop-out effect.
                  </p>
                </div>
              </div>

              <div className="p-5 md:p-6 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                <h4 className="font-black text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">🖨️ Print Safety</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  All animations, transitions, and visual effects are automatically disabled in print mode via <strong>@media print</strong>. Printed documents display static, clean layouts with no motion artifacts.
                </p>
              </div>
            </section>

            {/* 17. WEATHER WIDGET & LOGO GLOBE */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                17. Weather Widget & Logo Globe
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222]">
                  <div className="text-3xl mb-4">🌦️</div>
                  <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Live Weather Display</h4>
                  <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    The navbar shows <strong>live Windermere weather</strong> (temperature + icon) instead of the static &quot;Gilpin Hotel&quot; title. Data is fetched from the Open-Meteo API every 15 minutes with zero API key required.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                      <span className="text-sm">☀️</span>
                      <span className="text-[10px] text-slate-500">Clear / Sunny</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                      <span className="text-sm">🌧️</span>
                      <span className="text-[10px] text-slate-500">Rain / Drizzle</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                      <span className="text-sm">🌨️</span>
                      <span className="text-[10px] text-slate-500">Snow</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                      <span className="text-sm">⛈️</span>
                      <span className="text-[10px] text-slate-500">Thunderstorm</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3">Falls back to &quot;Gilpin Hotel&quot; if offline or API unavailable.</p>
                </div>

                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222]">
                  <div className="text-3xl mb-4">🌐</div>
                  <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">3D Logo Globe</h4>
                  <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    The Gilpin logo sits inside a <strong>76px gold-bordered sphere</strong> with a 3D perspective tilt. A glass-like radial gradient overlay creates a convex globe illusion.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <span className="text-[#c5a065] mt-0.5">▸</span>
                      <span><strong>Hover pop-out:</strong> Logo scales to 1.6× and extends beyond the circle with transparent background</span>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <span className="text-[#c5a065] mt-0.5">▸</span>
                      <span><strong>3D tilt:</strong> perspective(200px) rotateY/X for a side-angled sphere look</span>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <span className="text-[#c5a065] mt-0.5">▸</span>
                      <span><strong>Entrance:</strong> Spins in from -30° rotation with drop + scale bounce</span>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <span className="text-[#c5a065] mt-0.5">▸</span>
                      <span><strong>Responsive:</strong> 76px → 62px → 56px → 50px across breakpoints</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 18. NOTIFICATIONS, SMART NOTES & CHAT POLISH */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                18. Notifications, Smart Notes &amp; Chat Polish
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222]">
                  <div className="text-3xl mb-4">🔔</div>
                  <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Browser Notifications &amp; Smart Chime</h4>
                  <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    The system now <strong>requests browser notification permission</strong> on first load. When a new team message arrives from another user, you get:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <span className="text-[#c5a065] mt-0.5">▸</span>
                      <span><strong>Desktop notification</strong> with sender name, preview text and Gilpin logo icon</span>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <span className="text-[#c5a065] mt-0.5">▸</span>
                      <span><strong>Audio chime</strong> via Web Audio API (AudioContext with auto-resume for suspended contexts)</span>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <span className="text-[#c5a065] mt-0.5">▸</span>
                      <span><strong>FAB pulse ring</strong> — gold ripple animation on the chat button when unread messages exist</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222]">
                  <div className="text-3xl mb-4">🧠</div>
                  <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">AI Smart Notes (hkNotes)</h4>
                  <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    The AI Audit engine now generates <strong>housekeeping-specific intelligence</strong> in a dedicated <code className="text-[#c5a065]">hkNotes</code> field. Allergies, dietary restrictions, pet requirements, and room prep instructions are routed here automatically.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <span className="text-[#c5a065] mt-0.5">▸</span>
                      <span><strong>Dual routing:</strong> Allergy data appears in both intelligence notes AND hkNotes</span>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-slate-500">
                      <span className="text-[#c5a065] mt-0.5">▸</span>
                      <span><strong>Chat animations:</strong> Spring scale-up (sent), blur-in slide-up (received) via Framer Motion</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 19. CONNECTION RECOVERY & RECONNECT */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                19. Connection Recovery &amp; Reconnect
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] mb-6">
                <div className="text-3xl mb-4">🔌</div>
                <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Connection Status Indicator</h4>
                <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  The navbar shows a <strong>colour-coded dot</strong> indicating Firebase sync status. This is the first thing to check if data isn't syncing.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"></span>
                    <div>
                      <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">Green</div>
                      <div className="text-[9px] text-slate-500">Connected</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]"></span>
                    <div>
                      <div className="text-[10px] font-black text-amber-700 dark:text-amber-400">Amber</div>
                      <div className="text-[9px] text-slate-500">Reconnecting</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-500/20">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"></span>
                    <div>
                      <div className="text-[10px] font-black text-rose-700 dark:text-rose-400">Red</div>
                      <div className="text-[9px] text-slate-500">Offline</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">⚡</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Auto Recovery</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    The system automatically reconnects when you return from the lock screen, switch apps, or restore network. A soft reconnect (goOffline → goOnline) fires on <strong>visibilitychange</strong> and <strong>focus</strong> events with 5-second debounce.
                  </p>
                </div>
                <div className="p-6 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] md:rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">☢️</span>
                    <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Nuclear Reconnect</div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    If the dot stays red, <strong>tap it</strong> to trigger a "nuclear" reconnect. This completely destroys and rebuilds the Firebase connection, clearing any corrupted SDK state. All listeners and intervals are torn down and re-established automatically.
                  </p>
                </div>
              </div>

              <div className="p-5 md:p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                <h4 className="font-black text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">📱 Mobile Debug Mode</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Add <strong>?debug=1</strong> to the URL on mobile to see a live console overlay at the bottom of the screen. Shows all log messages, connection state, and errors without needing DevTools.
                </p>
              </div>
            </section>

            {/* 20. DASHBOARD SORTING */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                20. Dashboard Sorting
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] mb-6">
                <div className="text-3xl mb-4">🔀</div>
                <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Sort by ETA or Room Number</h4>
                <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  All three dashboards (Housekeeping, Maintenance, Reception) feature <strong>sort controls</strong> in the filter bar. Toggle between:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-sm">🕐</span>
                    <div>
                      <div className="text-[10px] font-black text-slate-700 dark:text-slate-300">ETA Sort</div>
                      <div className="text-[9px] text-slate-400">Earliest arrivals first</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-sm">🚪</span>
                    <div>
                      <div className="text-[10px] font-black text-slate-700 dark:text-slate-300">Room Sort</div>
                      <div className="text-[9px] text-slate-400">Ascending room number</div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3">Sort preferences persist per dashboard within the session. The arrivals table always shows the original file order.</p>
              </div>
            </section>

            {/* 21. AI NOTE PLACEMENT */}
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
                <span className="w-10 h-[1px] bg-[#c5a065]/30"></span>
                21. AI Note Placement
                <span className="flex-1 h-[1px] bg-[#c5a065]/30"></span>
              </h3>

              <div className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] mb-6">
                <div className="text-3xl mb-4">🧠</div>
                <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Where AI Notes Go</h4>
                <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  When speaking to the AI assistant, you can ask it to add notes to specific columns. The AI routes data based on context:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20">
                    <span className="text-lg mt-0.5">🎯</span>
                    <div>
                      <div className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase">Intelligence Column</div>
                      <div className="text-[10px] text-slate-500">Guest preferences, dietary needs, VIP notes, return-guest intel. Default for arrival notes.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                    <span className="text-lg mt-0.5">📝</span>
                    <div>
                      <div className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Notes Column</div>
                      <div className="text-[10px] text-slate-500">General operational notes, logistics, booking changes.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20">
                    <span className="text-lg mt-0.5">🧹</span>
                    <div>
                      <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">Housekeeping Notes</div>
                      <div className="text-[10px] text-slate-500">Room prep, allergies, bed configuration, special cleaning requests. Tagged with [HK].</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/20">
                    <span className="text-lg mt-0.5">🔧</span>
                    <div>
                      <div className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase">Maintenance Notes</div>
                      <div className="text-[10px] text-slate-500">Room defects, repairs needed, facility issues. Tagged with [MAINT].</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Footer */}
          <div className="bg-slate-100 dark:bg-[#0a0a0a] p-6 md:p-8 text-center border-t border-slate-200 dark:border-[#222]">
            <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-600 font-mono tracking-widest uppercase">
              Gilpin Hotel & Lake House • Standard Operating Procedures • Internal Use Only
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SOPModal;