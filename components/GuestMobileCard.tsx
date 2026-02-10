import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Guest } from '../types';
import BookingStream from './BookingStream';

interface GuestMobileCardProps {
  guest: Guest;
  onUpdate: (updates: Partial<Guest>) => void;
  onDelete: () => void;
  index?: number;
}

/* ── Card entrance variants ── */
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
};

const GuestMobileCard: React.FC<GuestMobileCardProps> = ({ guest, onUpdate, onDelete, index = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isReturn = guest.ll.toLowerCase().includes('yes');

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileTap={{ scale: 0.985, transition: { duration: 0.1 } }}
    >
      <div className="guest-mobile-card bg-white dark:bg-stone-900 rounded-[2rem] border border-slate-200 dark:border-stone-800 shadow-xl overflow-hidden mb-4">
        {/* --- Card Header: Room & Name --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
          className="p-5 flex items-start justify-between border-b border-slate-100 dark:border-stone-800/50"
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="bg-[#c5a065]/10 p-3 rounded-2xl border border-[#c5a065]/20 flex-shrink-0"
              whileTap={{ scale: 0.92, borderColor: 'rgba(197, 160, 101, 0.6)' }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <input
                value={guest.room}
                onChange={(e) => onUpdate({ room: e.target.value })}
                name="room"
                aria-label="room"
                className="bg-transparent text-lg font-black text-[#c5a065] text-center outline-none uppercase"
                style={{ width: `${Math.max(3, Math.min(guest.room.length + 1, 10))}ch`, maxWidth: '120px', minWidth: '3rem' }}
                title={guest.room}
              />
              {guest.previousRoom && (
                <div className="text-[8px] font-bold text-blue-500 text-center mt-0.5">← {guest.previousRoom}</div>
              )}
            </motion.div>
            <div>
              <input
                value={guest.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                name="name"
                aria-label="name"
                className="block w-full bg-transparent text-base font-black text-slate-900 dark:text-white outline-none"
              />
              {guest.packageName && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                  className="text-[9px] font-black bg-[#c5a065]/10 text-[#c5a065] px-2 py-0.5 rounded-full uppercase tracking-widest mt-1 inline-block"
                >
                  {guest.packageName}
                </motion.span>
              )}
            </div>
          </div>
          <motion.button
            onClick={onDelete}
            className="text-slate-300 hover:text-rose-500 text-2xl font-bold p-1"
            whileTap={{ scale: 0.7, rotate: 90 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >×</motion.button>
        </motion.div>

        {/* --- Card Body: Key Logistics --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.21, duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
          className="p-5 grid grid-cols-2 gap-4 bg-slate-50/50 dark:bg-stone-800/20"
        >
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">ETA</label>
            <input
              value={guest.eta}
              onChange={(e) => onUpdate({ eta: e.target.value })}
              className="w-full bg-white dark:bg-stone-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-stone-700 text-sm font-bold text-center text-slate-900 dark:text-white outline-none focus:border-[#c5a065] focus:ring-2 focus:ring-[#c5a065]/20 transition-all duration-200"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Vehicle</label>
            <input
              value={guest.car}
              onChange={(e) => onUpdate({ car: e.target.value })}
              className="w-full bg-white dark:bg-stone-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-stone-700 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white outline-none focus:border-[#c5a065] focus:ring-2 focus:ring-[#c5a065]/20 transition-all duration-200"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Stay (Nts)</label>
            <input
              value={guest.duration}
              onChange={(e) => onUpdate({ duration: e.target.value })}
              className="w-full bg-white dark:bg-stone-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-stone-700 text-sm font-bold text-center text-slate-900 dark:text-white outline-none focus:border-[#c5a065] focus:ring-2 focus:ring-[#c5a065]/20 transition-all duration-200"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">L&L Status</label>
            <input
              value={guest.ll}
              onChange={(e) => onUpdate({ ll: e.target.value })}
              className={`w-full bg-white dark:bg-stone-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-stone-700 text-sm font-bold text-center text-slate-900 dark:text-white outline-none focus:border-[#c5a065] focus:ring-2 focus:ring-[#c5a065]/20 transition-all duration-200 ${isReturn ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
            />
          </div>
        </motion.div>

        {/* --- Card Intelligence: Strategy & Notes --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27, duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }}
          className="p-5 space-y-4"
        >
          <div>
            <label className="text-[9px] font-black uppercase text-indigo-500 tracking-widest block mb-1">Tactical Strategy</label>
            <textarea
              value={guest.preferences}
              onChange={(e) => onUpdate({ preferences: e.target.value })}
              rows={2}
              name="preferences"
              aria-label="preferences"
              className="w-full bg-indigo-50/50 dark:bg-indigo-500/5 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 leading-tight transition-all duration-200"
            />
            {guest.aiTags && guest.aiTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {guest.aiTags.map((tag, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.7, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 300, damping: 18 }}
                    className="text-[8px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full border border-violet-500/20"
                  >
                    🏷️ {tag}
                  </motion.span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2">
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase text-[#c5a065] tracking-widest py-3 border-t border-slate-100 dark:border-stone-800 active:bg-[#c5a065]/5 rounded-lg transition-colors"
              whileTap={{ scale: 0.97 }}
            >
              <span className="flex items-center gap-1">
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.8, 0.25, 1] }}
                  style={{ display: 'inline-block' }}
                >▶</motion.span>
                {isExpanded ? 'Hide Intelligence' : 'Show Booking Stream'}
              </span>
              <motion.span
                className="bg-[#c5a065]/10 px-2 py-0.5 rounded"
                whileTap={{ scale: 0.9 }}
              >Audit V6.0</motion.span>
            </motion.button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  key="mobile-expand"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] as [number, number, number, number] }}
                  style={{ overflow: 'hidden' }}
                >
                  <motion.div
                    className="mt-4 space-y-4"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                  >
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Intelligence Notes</label>
                      <textarea
                        value={guest.prefillNotes}
                        onChange={(e) => onUpdate({ prefillNotes: e.target.value })}
                        rows={3}
                        name="prefillNotes"
                        aria-label="prefillNotes"
                        className="w-full bg-white dark:bg-stone-800 p-3 rounded-xl border border-slate-200 dark:border-stone-700 text-[11px] italic text-slate-500 dark:text-slate-300 outline-none leading-relaxed focus:border-[#c5a065] focus:ring-2 focus:ring-[#c5a065]/20 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Facilities & Dining</label>
                      <textarea
                        value={guest.facilities}
                        onChange={(e) => onUpdate({ facilities: e.target.value })}
                        rows={2}
                        name="facilities"
                        aria-label="facilities"
                        className="w-full bg-white dark:bg-stone-800 p-3 rounded-xl border border-slate-200 dark:border-stone-700 text-[11px] dark:text-slate-200 outline-none leading-tight focus:border-[#c5a065] focus:ring-2 focus:ring-[#c5a065]/20 transition-all duration-200"
                      />
                    </div>
                    <div className="p-4 bg-slate-900 rounded-2xl overflow-x-auto">
                      <BookingStream guest={guest} />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default GuestMobileCard;