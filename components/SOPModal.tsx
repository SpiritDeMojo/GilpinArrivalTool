import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SOPModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ═══════════════════════════════════════════════════════════════
   GILPIN ARRIVAL TOOL — OPERATIONAL HANDBOOK (SOP v19.0)
   ═══════════════════════════════════════════════════════════════
   23 sections covering every feature — from sign-in to AI voice.
   Scrollable with jump-to-section table of contents.
   ═══════════════════════════════════════════════════════════════ */

const SECTIONS = [
  { id: 'signin', num: '00', icon: '👤', title: 'Sign In' },
  { id: 'anywhere', num: '01', icon: '🌐', title: 'The Anywhere Workflow' },
  { id: 'dashboards', num: '02', icon: '📊', title: 'Departmental Dashboards' },
  { id: 'auditlog', num: '03', icon: '📜', title: 'Guest Activity Audit Log' },
  { id: 'roommove', num: '04', icon: '🔄', title: 'Room Move Tracking' },
  { id: 'ai', num: '05', icon: '✨', title: 'AI-Powered Features' },
  { id: 'aiassistant', num: '06', icon: '🤖', title: 'AI Live Assistant' },
  { id: 'notes', num: '07', icon: '📝', title: 'Cross-Department Notes' },
  { id: 'filters', num: '08', icon: '🏨', title: 'Property Filtering' },
  { id: 'sync', num: '09', icon: '📡', title: 'Real-Time Sync (Firebase)' },
  { id: 'voice', num: '10', icon: '🎙️', title: 'Hands-Free Voice Ops' },
  { id: 'presence', num: '11', icon: '🟢', title: 'Guest On/Off-Site' },
  { id: 'chat', num: '12', icon: '💬', title: 'Chat & Notifications' },
  { id: 'workflows', num: '13', icon: '🌅', title: 'Recommended Workflows' },
  { id: 'data', num: '14', icon: '📂', title: 'Data Sourcing' },
  { id: 'access', num: '15', icon: '🔐', title: 'Department Access Control' },
  { id: 'sessions', num: '16', icon: '🔗', title: 'Sessions & Connectivity' },
  { id: 'export', num: '17', icon: '📤', title: 'Export & Lifecycle' },
  { id: 'sounds', num: '18', icon: '🔔', title: 'Auditory Alerts' },
  { id: 'debug', num: '19', icon: '🐛', title: 'Debugging Tools' },
  { id: 'sorting', num: '20', icon: '🔀', title: 'Dashboard Sorting' },
  { id: 'ainotes', num: '21', icon: '🧠', title: 'AI Note Placement' },
  { id: 'theming', num: '22', icon: '🎨', title: 'Design & Theming' },
  { id: 'packages', num: '23', icon: '📦', title: 'Package Generator' },
  { id: 'nightmgr', num: '24', icon: '🌙', title: 'In House Dashboard' },
];

/* ─── Reusable sub-components ─── */

const Divider = ({ num, title }: { num: string; title: string }) => (
  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a065] mb-6 md:mb-8 flex items-center gap-4">
    <span className="w-10 h-[1px] bg-[#c5a065]/30" />
    {num}. {title}
    <span className="flex-1 h-[1px] bg-[#c5a065]/30" />
  </h3>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] ${className}`}>{children}</div>
);

const accent = (c: string) => `text-${c}-600 dark:text-${c}-400`;

const Tip = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] text-slate-400 mt-3 italic flex items-center gap-1.5">
    <span className="text-[#c5a065] text-xs">💡</span> {children}
  </p>
);

const MiniCard = ({ icon, label, sub }: { icon: string; label: string; sub: string }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
    <span className="text-lg mt-0.5">{icon}</span>
    <div>
      <h5 className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">{label}</h5>
      <p className="text-[10px] text-slate-400">{sub}</p>
    </div>
  </div>
);

const Pill = ({ children, color = 'violet' }: { children: React.ReactNode; color?: string }) => (
  <span className={`text-[8px] font-black uppercase bg-${color}-500/15 text-${color}-600 dark:text-${color}-400 px-2 py-0.5 rounded-full border border-${color}-500/20`}>{children}</span>
);

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */

const SOPModal: React.FC<SOPModalProps> = ({ isOpen, onClose }) => {
  const [tocOpen, setTocOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(`sop-${id}`);
    if (el && bodyRef.current) {
      const scrollY = el.offsetTop - bodyRef.current.offsetTop - 16;
      bodyRef.current.scrollTo({ top: scrollY, behavior: 'smooth' });
      setTocOpen(false);
    }
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-2 md:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-white dark:bg-[#0a0a0a] w-full max-w-6xl h-[95vh] md:h-[90vh] rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl border border-[#c5a065]/20 overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 40, scale: 0.95, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 30, scale: 0.96, filter: 'blur(6px)' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >

            {/* ── HEADER ── */}
            <div className="px-5 md:px-10 py-5 md:py-8 border-b border-[#c5a065]/10 flex justify-between items-center bg-slate-50/80 dark:bg-[#111]/80 backdrop-blur-md sticky top-0 z-50">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#c5a065] animate-pulse" />
                  <h2 className="heading-font text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                    Operational Handbook
                  </h2>
                </div>
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-slate-400 dark:text-slate-500">
                  Standard Operating Procedures • <span className="text-[#c5a065]">v19.0</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTocOpen(v => !v)}
                  className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center text-sm text-slate-500 hover:text-[#c5a065] transition-all active:scale-90"
                  title="Table of Contents"
                >☰</button>
                <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center text-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all active:scale-90">
                  ×
                </button>
              </div>
            </div>

            {/* ── TABLE OF CONTENTS ── */}
            <AnimatePresence>
              {tocOpen && (
                <motion.div
                  className="px-5 md:px-10 py-4 bg-slate-100/60 dark:bg-[#0a0a0a] border-b border-[#c5a065]/10 grid grid-cols-2 md:grid-cols-4 gap-1.5 max-h-[40vh] overflow-y-auto"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {SECTIONS.map((s, i) => (
                    <motion.button
                      key={s.id}
                      onClick={() => scrollTo(s.id)}
                      className="text-left px-3 py-2 rounded-lg hover:bg-[#c5a065]/10 transition-colors flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 hover:text-[#c5a065]"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.2 }}
                    >
                      <span>{s.icon}</span>
                      <span className="font-bold">{s.num}.</span>
                      <span className="truncate">{s.title}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── SCROLLABLE BODY ── */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#050505]">
              <div className="max-w-5xl mx-auto px-5 md:px-10 py-8 md:py-10 space-y-12 md:space-y-16">

                {/* ── WELCOME BANNER ── */}
                <div className="relative p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] bg-slate-900 overflow-hidden text-center">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                  <div className="relative z-10">
                    <div className="text-5xl md:text-7xl mb-4 animate-pulse">🏰</div>
                    <h3 className="heading-font text-2xl md:text-3xl font-black text-white mb-2 tracking-tighter">Welcome to the Gilpin Arrival Tool</h3>
                    <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                      Your unified command centre for arrivals, housekeeping, maintenance, and reception. Designed for <strong className="text-white">Gilpin Hotel & Lake House</strong> — built for speed, coordination, and guest excellence.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4 text-[9px] font-mono text-[#c5a065] tracking-widest uppercase">
                      <span className="w-2 h-2 rounded-full bg-[#c5a065] animate-pulse" /> Live Operational System
                    </div>
                  </div>
                </div>


                {/* ════════════════════════════════════════════════ */}
                {/* 00. SIGN IN                                     */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-signin">
                  <Divider num="00" title="Sign In" />
                  <Card>
                    <div className="text-3xl mb-4">👤</div>
                    <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Name-Based Identity</h4>
                    <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      When you open the app, you'll be asked to enter your name. This is <strong>not a password</strong> — it's a simple identity tag so the team knows who made each action. Your name appears on chat messages, delivery logs, and the activity timeline.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <MiniCard icon="💬" label="Chat Messages" sub="Your name appears on all messages" />
                      <MiniCard icon="📦" label="Deliveries" sub="Tracks who delivered to each room" />
                      <MiniCard icon="📡" label="Live Presence" sub="Others see who's currently online" />
                      <MiniCard icon="📋" label="Activity Log" sub="All status changes attributed to you" />
                    </div>
                    <Tip>To switch user: click your name badge in the top-right corner and press sign out.</Tip>
                  </Card>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 01. THE ANYWHERE WORKFLOW                       */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-anywhere">
                  <Divider num="01" title="The Anywhere Workflow" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Card className="group hover:border-[#c5a065]/40 transition-all">
                      <div className="text-3xl mb-4">🖥️</div>
                      <h4 className="font-bold text-base md:text-lg text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Command View (Desktop)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        Optimised for 1080p+ displays. The high-density <strong>Table View</strong> supports morning audits, bulk data entry, and PDF processing. Full filter controls enable property-wide planning at a glance.
                      </p>
                    </Card>
                    <Card className="group hover:border-[#c5a065]/40 transition-all">
                      <div className="text-3xl mb-4">📱</div>
                      <h4 className="font-bold text-base md:text-lg text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Experience View (Mobile)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        The interface transitions to <strong>Card View</strong> on tablets and mobiles automatically. Touch-friendly inputs and vertical stacking ensure all guest intelligence remains accessible in the field.
                      </p>
                    </Card>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 02. DEPARTMENTAL DASHBOARDS                     */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-dashboards">
                  <Divider num="02" title="Departmental Dashboards" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                    {[
                      { icon: '📋', name: 'Arrivals', desc: 'Master guest list with full booking data' },
                      { icon: '🧹', name: 'Housekeeping', desc: 'Room cleaning status and AI priority' },
                      { icon: '🔧', name: 'Maintenance', desc: 'Room checks, repairs, and issue log' },
                      { icon: '🛎️', name: 'Reception', desc: 'Check-in tracking and courtesy calls' },
                    ].map((d) => (
                      <div key={d.name} className="p-4 md:p-5 bg-white dark:bg-[#111] border border-slate-200 dark:border-[#222] rounded-[1.5rem] text-center hover:border-[#c5a065]/40 transition-all">
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


                {/* ════════════════════════════════════════════════ */}
                {/* 03. GUEST ACTIVITY AUDIT LOG                    */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-auditlog">
                  <Divider num="03" title="Guest Activity Audit Log" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Card>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">📜</span>
                        <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Activity Timeline</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                        Every action — status changes, note adds, deliveries — is recorded with <strong>who, what, and when</strong>. Expand any guest row and look for the <strong className="text-indigo-500">📜 Activity Log</strong> section to reveal the full timeline.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill color="indigo">Status Change</Pill>
                        <Pill color="emerald">Note Added</Pill>
                        <Pill color="amber">Delivery Logged</Pill>
                      </div>
                    </Card>
                    <Card>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">👁️</span>
                        <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Accountability & Traceability</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        The audit log provides a complete paper trail for management review — perfect for tracing who updated a room status, when a courtesy call was made, or when a guest preference was recorded. All entries are <strong>immutable</strong> and timestamped.
                      </p>
                    </Card>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 04. ROOM MOVE TRACKING                          */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-roommove">
                  <Divider num="04" title="Room Move Tracking" />
                  <Card>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl">🔄</span>
                      <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Automatic Room Move Detection</div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      When a guest&apos;s room number is changed, the system automatically records the move with timestamp and previous room. A <strong className="text-blue-500">← Room X</strong> badge appears next to the current room number on every dashboard. The Conflict Detector also displays room moves as informational alerts.
                    </p>
                    <div className="flex flex-wrap gap-3 text-[10px]">
                      <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">← 101 (Previous Room)</span>
                      <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">🔄 Room Move Alert</span>
                    </div>
                  </Card>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 05. AI-POWERED FEATURES                         */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-ai">
                  <Divider num="05" title="AI-Powered Features" />
                  <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 mb-6">
                    <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                      <div className="text-4xl md:text-5xl">✨</div>
                      <div className="flex-1">
                        <h4 className="text-base md:text-lg font-black text-white mb-3">AI Audit Refine</h4>
                        <p className="text-sm text-slate-400 leading-relaxed mb-4">
                          Analyses the entire guest manifest using Gemini AI. Scans for revenue risks such as unpaid rate codes, package discrepancies, and missing data. Highlights anomalies and suggests corrections across all guest records in a single pass.
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
                        Available on the Housekeeping Dashboard via the <strong className="text-violet-600 dark:text-violet-400">🤖 AI Priority</strong> button. Analyses guest ETAs and VIP status to recommend the optimal cleaning order — identifying the top five rooms to prioritise.
                      </p>
                      <p className="text-xs text-slate-500 italic">The AI provides reasoning explaining its priority decisions.</p>
                    </div>
                    <div className="p-6 bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">🏷️</span>
                        <div className="font-black text-sm text-violet-700 dark:text-violet-300 uppercase">AI Sentiment Analysis</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                        Analyses guest notes and preferences to generate actionable tags such as <strong>"Quiet Room Required"</strong>, <strong>"Allergy Alert"</strong>, or <strong>"Anniversary Celebration"</strong>. Tags appear as violet pills beneath guest preferences.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill>🏷️ Quiet Room</Pill>
                        <Pill>🏷️ Allergy Alert</Pill>
                        <Pill>🏷️ Anniversary</Pill>
                      </div>
                    </div>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 06. AI LIVE ASSISTANT                            */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-aiassistant">
                  <Divider num="06" title="AI Live Assistant" />
                  <div className="p-6 md:p-8 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-[1.5rem] md:rounded-[2rem] mb-6">
                    <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                      <div className="text-4xl md:text-5xl">🤖</div>
                      <div className="flex-1">
                        <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-3">Your AI Colleague</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                          A conversational AI assistant available via the <strong className="text-indigo-500">💬 Chat Panel → 🤖 Assistant tab</strong>. Supports both <strong>voice</strong> (microphone) and <strong>text</strong> input. The assistant has full access to today&apos;s guest manifest and can take real actions on your behalf.
                        </p>
                        <p className="text-xs text-slate-500 italic">Tap the 💬 floating button at bottom-right, then switch to the 🤖 Assistant tab.</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/10 rounded-[1.5rem] md:rounded-[2rem]">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">🎙️</span>
                        <div className="font-black text-sm text-indigo-700 dark:text-indigo-300 uppercase">Voice & Text Commands</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">Try these:</p>
                      <ul className="text-xs text-slate-500 space-y-1.5 list-none">
                        <li><strong className="text-indigo-400">&quot;Morning briefing&quot;</strong> — full overview of today&apos;s arrivals</li>
                        <li><strong className="text-indigo-400">&quot;What room is [Guest]?&quot;</strong> — instant guest lookup</li>
                        <li><strong className="text-indigo-400">&quot;What car is Room 5?&quot;</strong> — car registration lookup</li>
                        <li><strong className="text-indigo-400">&quot;Who is arriving next?&quot;</strong> — ETA-ordered list</li>
                        <li><strong className="text-indigo-400">&quot;How long is [Guest] staying?&quot;</strong> — duration check</li>
                      </ul>
                    </div>
                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/10 rounded-[1.5rem] md:rounded-[2rem]">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">⚡</span>
                        <div className="font-black text-sm text-indigo-700 dark:text-indigo-300 uppercase">AI Actions</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">The assistant can take real actions that update the dashboard:</p>
                      <ul className="text-xs text-slate-500 space-y-1.5 list-none">
                        <li><strong className="text-indigo-400">&quot;Note for Room 5: extra pillows&quot;</strong> — auto-creates a note</li>
                        <li><strong className="text-indigo-400">&quot;Add allergy note for Smith&quot;</strong> — targeted data entry</li>
                        <li><strong className="text-indigo-400">&quot;Mark Room 3 as cleaned&quot;</strong> — status updates</li>
                      </ul>
                      <Tip>On HTTPS the mic is available. On HTTP (mobile via IP) the assistant runs in text-only mode automatically.</Tip>
                    </div>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 07. CROSS-DEPARTMENT NOTES                      */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-notes">
                  <Divider num="07" title="Cross-Department Notes" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Card>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">📝</span>
                        <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Adding Notes</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                        Any department can add notes to a room card. Notes support <strong>priority levels</strong> (low, medium, high, <strong className="text-red-500">URGENT</strong>) and <strong>categories</strong> (Issue Found, Fixed, Info). Notes sync instantly to all connected devices.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill color="emerald">✅ Resolved</Pill>
                        <Pill color="amber">⚠️ Medium</Pill>
                        <Pill color="red">🔴 Urgent</Pill>
                      </div>
                    </Card>
                    <Card>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">✅</span>
                        <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Resolution Workflow</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Once an issue is fixed, mark it <strong>resolved</strong> to archive it and clear the alert badge. Resolved notes remain in the audit trail but no longer surface urgently. This keeps dashboards clean while preserving history.
                      </p>
                    </Card>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 08. PROPERTY FILTERING                           */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-filters">
                  <Divider num="08" title="Property Filtering" />
                  <Card>
                    <div className="text-3xl mb-4">🏨</div>
                    <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Segment by Territory</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      Toggle between <strong>🏨 Main Hotel</strong> (Rooms 1-31) and <strong>🏡 Lake House</strong> (Rooms 51-58). Filters can be combined or viewed independently. Visible across all department dashboards in the filter bar.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <MiniCard icon="🏨" label="Main Hotel" sub="Rooms 1-31" />
                      <MiniCard icon="🏡" label="Lake House" sub="Rooms 51-58" />
                    </div>
                  </Card>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 09. REAL-TIME SYNC                               */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-sync">
                  <Divider num="09" title="Real-Time Sync (Firebase)" />
                  <Card>
                    <div className="text-3xl mb-4">📡</div>
                    <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Fleet Sync Protocol</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      Every device — iPads, PCs, phones — stays synchronised via Firebase Realtime Database. Changes propagate <strong>instantly</strong>. The sync indicator in the navbar shows your connection state:
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20">
                        <div className="text-lg mb-1">🟢</div>
                        <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">Synced</div>
                        <div className="text-[9px] text-slate-400">Live connection</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20">
                        <div className="text-lg mb-1">🟡</div>
                        <div className="text-[10px] font-black text-amber-600 dark:text-amber-400">Connecting</div>
                        <div className="text-[9px] text-slate-400">Establishing link</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
                        <div className="text-lg mb-1">🔴</div>
                        <div className="text-[10px] font-black text-red-600 dark:text-red-400">Offline</div>
                        <div className="text-[9px] text-slate-400">Local storage only</div>
                      </div>
                    </div>
                    <Tip>On mobile, the sync indicator appears as a compact dot — green with a soft pulse when connected.</Tip>
                  </Card>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 10. HANDS-FREE VOICE OPS                         */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-voice">
                  <Divider num="10" title="Hands-Free Voice Ops" />
                  <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[3rem] p-6 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                      <div className="text-5xl md:text-6xl">🎙️</div>
                      <div className="space-y-4">
                        <h4 className="text-lg md:text-xl font-black text-white tracking-tight uppercase">Voice Assistant</h4>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          Use the AI Voice Assistant for hands-free queries and note creation. It can answer questions about guest data, create room notes, and provide operational summaries while you remain focused on service delivery.
                        </p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#c5a065]">
                          <span className="px-3 py-1 rounded-full border border-[#c5a065]/30 bg-black/40 italic">&quot;What car is Room 4?&quot;</span>
                          <span className="px-3 py-1 rounded-full border border-[#c5a065]/30 bg-black/40 italic">&quot;Note for Room 5: extra pillows&quot;</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 11. GUEST ON/OFF-SITE                            */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-presence">
                  <Divider num="11" title="Guest On/Off-Site Tracking" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Card>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">🚶</span>
                        <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Off-Site Status</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        When a guest leaves the property temporarily, use the <strong>🚶 Guest Off Site</strong> button in the Reception dashboard. All departments will see a <strong className="text-rose-500">🔴 OFF SITE</strong> indicator, allowing housekeeping to prioritise room access.
                      </p>
                    </Card>
                    <Card>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">🟢</span>
                        <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Cross-Department Visibility</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Housekeeping and Maintenance dashboards display guest presence indicators (<strong className="text-emerald-500">🟢 ON SITE</strong> / <strong className="text-rose-500">🔴 OFF SITE</strong>). Reception shows HK and Maintenance progress badges with a <strong>✅ Room Ready</strong> indicator when both departments are complete.
                      </p>
                    </Card>
                  </div>
                  <Tip>Field protocol: ALWAYS check the presence indicator before entering a room. If &quot;On Site,&quot; knock and wait.</Tip>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 12. CHAT & NOTIFICATIONS                        */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-chat">
                  <Divider num="12" title="Chat & Notifications" />
                  <div className="p-6 md:p-8 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-[1.5rem] md:rounded-[2rem] mb-6">
                    <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                      <div className="text-4xl md:text-5xl">💬</div>
                      <div className="flex-1">
                        <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-3">Unified Chat Panel</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                          The floating <strong className="text-indigo-500">💬</strong> button opens the Chat Panel with two tabs: <strong>Team Chat</strong> for cross-department messaging, and <strong>🤖 AI Assistant</strong> for voice/text AI commands. An unread badge shows when new team messages arrive.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Pill color="blue">Reception</Pill>
                          <Pill color="emerald">Housekeeping</Pill>
                          <Pill color="amber">Maintenance</Pill>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 13. RECOMMENDED WORKFLOWS                        */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-workflows">
                  <Divider num="13" title="Recommended Workflows" />
                  <div className="space-y-4">
                    {[
                      { bg: 'indigo', icon: '🌅', title: 'Morning Briefing', body: 'Upload the PDF manifest. Run ✨ AI Audit to scan for revenue risks. Open 📊 Strategic Analytics for VIP intensity and arrival volumes. Brief the team with the AI Tactical Summary.' },
                      { bg: 'emerald', icon: '🧹', title: 'Housekeeping Rounds', body: 'Use the HK Dashboard, filter by property, and progress rooms through: Pending → In Progress → Cleaned → Inspected → Complete. Run 🤖 AI Priority for optimal cleaning order.' },
                      { bg: 'amber', icon: '🛎️', title: 'Guest Check-In', body: 'Monitor Room Ready indicators on Reception. Transition guests: Pre-Arrival → Arrived → On-Site → Checked-In. Log courtesy calls and notes for each guest.' },
                      { bg: 'rose', icon: '🌙', title: 'End of Day', body: 'Export data via 📤 Excel. Review audit logs for completeness. Delete the session from Session Browser after export if day is complete.' },
                    ].map(w => (
                      <div key={w.title} className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-${w.bg}-50 dark:bg-${w.bg}-900/10 border border-${w.bg}-100 dark:border-${w.bg}-500/10 flex flex-col md:flex-row gap-6 md:gap-8 items-center`}>
                        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-${w.bg}-500/20 flex items-center justify-center text-2xl flex-shrink-0`}>{w.icon}</div>
                        <div className="flex-1">
                          <h4 className={`font-black text-xs uppercase tracking-widest text-${w.bg}-500 mb-2`}>{w.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-loose">{w.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 14. DATA SOURCING                                */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-data">
                  <Divider num="14" title="Data Sourcing" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Card className="hover:border-[#c5a065]/40 transition-all">
                      <div className="text-3xl mb-4">📂</div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase mb-2">PDF Mode</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Traditional manual upload for local manifest copies. Upload via the <strong>📂 Upload</strong> button in the navigation bar. The parser extracts guest data automatically.
                      </p>
                    </Card>
                    <Card className="hover:border-[#c5a065]/40 transition-all">
                      <div className="text-3xl mb-4">⚡</div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase mb-2">PMS Mode</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Live integration for real-time guest status directly from the hotel property management system. Available when configured by the administrator.
                      </p>
                    </Card>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 15. DEPARTMENT ACCESS CONTROL                    */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-access">
                  <Divider num="15" title="Department Access Control" />
                  <Card>
                    <div className="text-3xl mb-4">🔐</div>
                    <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Role-Based Dashboard</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                      On sign-in, select your department: <strong>Housekeeping (HK)</strong>, <strong>Maintenance (MAINT)</strong>, or <strong>Reception (REC)</strong>. Each department sees their dedicated dashboard with role-specific controls. The <strong>Default</strong> mode grants full access to all four dashboards.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MiniCard icon="📋" label="Default" sub="Full access to all views" />
                      <MiniCard icon="🧹" label="HK" sub="Housekeeping dashboard" />
                      <MiniCard icon="🔧" label="MAINT" sub="Maintenance dashboard" />
                      <MiniCard icon="🛎️" label="REC" sub="Reception dashboard" />
                    </div>
                  </Card>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 16. SESSIONS & CONNECTIVITY                     */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-sessions">
                  <Divider num="16" title="Sessions & Connectivity" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                    <Card className="hover:border-[#c5a065]/40 transition-all">
                      <div className="text-3xl mb-4">☁️</div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase mb-2">Vercel Cloud (Recommended)</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        App is hosted on Vercel (e.g., <code className="text-[#c5a065]">gilpin.vercel.app</code>). Staff use the shared URL with <code>?session=ID</code> for 100% cloud sync. Works on any device with internet.
                      </p>
                    </Card>
                    <Card className="hover:border-[#c5a065]/40 transition-all">
                      <div className="text-3xl mb-4">🏠</div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase mb-2">On-Premises Server</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Use a Reception PC as a local server (<code>npm run dev -- --host</code>). Devices connect via local IP. Data syncs via Firebase — only app memory is local. High privacy: hotel WiFi only.
                      </p>
                    </Card>
                  </div>
                  <div className="p-5 md:p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-[1.5rem] md:rounded-[2rem]">
                    <h4 className="font-black text-xs uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-2">🏆 The &quot;Single Uploader&quot; Rule</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <strong>Reception PC</strong> is the dedicated uploader (via PDF/PMS). All other staff <strong>never</strong> upload data. They join sessions by tapping an active session in the Session Browser or using a shared link with the <code>?session=ID</code> parameter.
                    </p>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 17. EXPORT & LIFECYCLE                           */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-export">
                  <Divider num="17" title="Export & Lifecycle" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <Card>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">📤</span>
                        <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Excel Export</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Export the full guest dataset to Excel via the <strong>📤 Excel</strong> button. Includes all columns, notes, statuses, and audit trail data. Perfect for management reporting and record-keeping.
                      </p>
                    </Card>
                    <Card>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xl">🗑️</span>
                        <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Session Cleanup</div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        The Reception Manager should delete sessions once the operational day is complete and data has been exported. The 🗑️ icon on the Session Browser removes the session from <strong>all devices</strong> in the fleet.
                      </p>
                      <Tip>Always perform an Excel Export before deleting a session.</Tip>
                    </Card>
                  </div>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 18. AUDITORY ALERTS                              */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-sounds">
                  <Divider num="18" title="Auditory Alerts" />
                  <Card>
                    <div className="text-3xl mb-4">🔔</div>
                    <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-3">Sound Notifications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <MiniCard icon="🔔" label="Chime" sub="Status change (e.g. Room marked Clean)" />
                      <MiniCard icon="🚨" label="Alert" sub="New high-priority note or urgent issue" />
                      <MiniCard icon="🚪" label="Doorbell" sub="Guest arrival (status set to On Site)" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Use the <strong>🔔/🔕</strong> button in the navbar to toggle mute. Mute settings are saved per-device, so front desk can stay audible while back-of-house mutes during service.
                    </p>
                  </Card>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 19. DEBUGGING TOOLS                              */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-debug">
                  <Divider num="19" title="Debugging Tools" />
                  <Card>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xl">🐛</span>
                      <div className="font-black text-sm text-slate-900 dark:text-white uppercase">Mobile Debug Console</div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Add <strong>?debug=1</strong> to the URL on mobile to see a live console overlay at the bottom of the screen. Shows all log messages, connection state, and errors without needing DevTools.
                    </p>
                  </Card>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 20. DASHBOARD SORTING                            */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-sorting">
                  <Divider num="20" title="Dashboard Sorting" />
                  <Card>
                    <div className="text-3xl mb-4">🔀</div>
                    <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2">Sort by ETA or Room Number</h4>
                    <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      All three dashboards (Housekeeping, Maintenance, Reception) feature <strong>sort controls</strong> in the filter bar. Toggle between:
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <MiniCard icon="🕐" label="ETA Sort" sub="Earliest arrivals first" />
                      <MiniCard icon="🚪" label="Room Sort" sub="Ascending room number" />
                    </div>
                    <Tip>Sort preferences persist per dashboard within the session. The arrivals table always shows the original file order.</Tip>
                  </Card>
                </section>


                {/* ════════════════════════════════════════════════ */}
                {/* 21. AI NOTE PLACEMENT                            */}
                {/* ════════════════════════════════════════════════ */}
                <section id="sop-ainotes">
                  <Divider num="21" title="AI Note Placement" />
                  <Card>
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
                          <div className="text-[10px] text-slate-500">Guest preferences, dietary needs, VIP notes, return-guest intel</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0a0a0a] border border-slate-100 dark:border-[#1a1a1a]">
                        <span className="text-lg mt-0.5">📝</span>
                        <div>
                          <div className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Notes Column</div>
                          <div className="text-[10px] text-slate-500">General operational notes, logistics, booking changes</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20">
                        <span className="text-lg mt-0.5">🧹</span>
                        <div>
                          <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase">Housekeeping Notes</div>
                          <div className="text-[10px] text-slate-500">Room prep, allergies, bed config, special cleaning — tagged [HK]</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/20">
                        <span className="text-lg mt-0.5">🔧</span>
                        <div>
                          <div className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase">Maintenance Notes</div>
                          <div className="text-[10px] text-slate-500">Room defects, repairs, facility issues — tagged [MAINT]</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </section>

                {/* ── 22 — DESIGN & THEMING ── */}
                <section id="theming">
                  <Divider num="22" title="Design & Theming" />
                  <Card>
                    <p style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
                      The Arrival Tool features a premium dual-theme design system with a handcrafted animation engine.
                    </p>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <MiniCard icon="🌙" label="Dark Mode" sub="Toggle via moon/sun icon in the navbar. All dashboards, modals, notes, and forms adapt automatically." />
                      <MiniCard icon="☀️" label="Light Mode" sub="Warm ivory base theme with gold accents. Optimised for well-lit environments and printed output." />
                      <MiniCard icon="✨" label="Animation Engine" sub="Spring-physics page transitions, 3D card entrances, whileTap/whileHover feedback, and Framer Motion orchestration." />
                      <MiniCard icon="🎯" label="Contrast" sub="Dark mode notes, badges, and form inputs use explicit contrast-safe colours to ensure readability." />
                    </div>
                    <Tip>The theme persists across sessions. All animations are disabled during printing for clean paper output.</Tip>
                  </Card>
                </section>

                {/* ── 23 — PACKAGE GENERATOR ── */}
                <section id="packages">
                  <Divider num="23" title="Package Generator" />
                  <Card>
                    <p style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
                      Create bespoke guest itinerary packages with the built-in Package Generator. Access via <strong>☰ → Package Generator</strong>.
                    </p>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <MiniCard icon="✨" label="Presets" sub="Choose Magical Escape (3-day), Gilpinmoon (4-day), or start from a blank template." />
                      <MiniCard icon="👤" label="Guest Info" sub="Enter guest names and room assignment. Changes reflect instantly on the cover page." />
                      <MiniCard icon="📅" label="Date Automation" sub="Pick a start date — day titles update automatically (Day One · Monday 10 Feb, etc.)." />
                      <MiniCard icon="🎨" label="Visual Style" sub="Switch fonts (Garamond, Lato, Playfair), pick accent colours, and upload a custom logo." />
                    </div>
                    <div style={{ height: 16 }} />
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <MiniCard icon="✏️" label="Direct Text Editing" sub="Click any text on the A4 preview to edit it directly — guest names, labels, day titles, activities, and even the hotel address." />
                      <MiniCard icon="🔤" label="Formatting Toolbar" sub="Select text and use Bold (B), Italic (I), Underline (U) buttons. Adjust size with the XS→3XL dropdown. Clear formatting with ✕." />
                      <MiniCard icon="🖨️" label="Print" sub="Click Print in the toolbar to open a clean A4-landscape print preview. Formatting (bold, italic) is preserved in print output." />
                      <MiniCard icon="💾" label="Save / Load" sub="Save your itinerary as a JSON file and reload it later. Useful for templates and recurring packages." />
                    </div>
                    <div style={{ height: 16 }} />
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <MiniCard icon="📱" label="Mobile Mode" sub="On portrait mobile, a rotation prompt offers landscape guidance. Tap 'Continue in Portrait' for a responsive editor with a wrapping toolbar and swipeable sidebar overlay." />
                    </div>
                    <Tip>All text on the preview sheets is editable. Select text and use the toolbar to apply bold, italic, or underline formatting before printing.</Tip>
                  </Card>
                </section>

                {/* ── 24 — IN HOUSE DASHBOARD ── */}
                <section id="nightmgr">
                  <Divider num="24" title="In House Dashboard" />
                  <Card>
                    <p style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
                      The In House Dashboard provides a real-time overview of all 38 rooms (30 Main Hotel + 8 Lake House) with occupancy data, guest details, and operational tools. Access via the <strong>🏠 In House</strong> tab.
                    </p>
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <MiniCard icon="🏨" label="Room Grid" sub="Colour-coded cards: green = arrival, indigo = stayover, dashed = empty. Click any occupied room to expand guest details (flags, car plates, preferences, in-room items)." />
                      <MiniCard icon="📊" label="Live Stats" sub="Header shows Occupied, Empty, Occupancy %, Guests (pax), and Cars. Property breakdown bars show Main Hotel and Lake House separately." />
                      <MiniCard icon="🔄" label="Room Move" sub="Click a room → expand details → 🔄 Move Room. Choose an empty room from the picker grid. The move syncs immediately to Firebase and all stats recalculate." />
                      <MiniCard icon="🖨️" label="Print Report" sub="Click Print Report for a landscape table with Room, Name, Guest, Type, Car, Pax, Dinner, and Flags. Separate sections for Main Hotel and Lake House." />
                    </div>
                    <div style={{ height: 16 }} />
                    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                      <MiniCard icon="🚗" label="Car Plates" sub="Registration plates show as monospaced badges. Dark mode uses bright text for visibility. Plates are included in the print report." />
                      <MiniCard icon="📅" label="Stayover Calculation" sub="Guests who arrived BEFORE today and depart AFTER today are stayovers. Night number (e.g., Night 2/3) is shown. Latest session data takes priority for dedup." />
                      <MiniCard icon="📱" label="Mobile View" sub="Room cards switch to a horizontal scrollable slider on screens under 768px with scroll-snap for smooth swiping." />
                    </div>
                    <Tip>Use the All / Main Hotel / Lake House filter buttons to focus on a specific property. Stats and room count update accordingly.</Tip>
                  </Card>
                </section>

              </div>

              {/* ── FOOTER ── */}
              <div className="bg-slate-100 dark:bg-[#0a0a0a] p-6 md:p-8 text-center border-t border-slate-200 dark:border-[#222]">
                <p className="text-[9px] md:text-[10px] text-slate-400 dark:text-slate-600 font-mono tracking-widest uppercase">
                  Gilpin Hotel & Lake House • Standard Operating Procedures • v20.0 • Internal Use Only
                </p>
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SOPModal;