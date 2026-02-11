import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, MotionValue } from 'framer-motion';
import { Guest, FilterType, PropertyFilter } from '../types';

interface DashboardProps {
  guests: Guest[];
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  propertyFilter: PropertyFilter;
  onPropertyChange: (filter: PropertyFilter) => void;
}

/* ── Stagger variants ── */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.92, filter: 'blur(6px)' },
  show: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

/* ── Animated Counter Component ── */
const AnimatedNumber: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
  const spring = useSpring(0, { stiffness: 120, damping: 20, mass: 0.8 });
  const display = useTransform(spring, (v: number) => Math.round(v));
  const [displayVal, setDisplayVal] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    spring.set(value);
    prevValue.current = value;
  }, [value, spring]);

  useEffect(() => {
    const unsub = display.on('change', (v: number) => setDisplayVal(v));
    return unsub;
  }, [display]);

  return (
    <motion.span
      className={className}
      key={`num-${value}`}
      animate={value !== prevValue.current ? {
        scale: [1, 1.2, 1],
        transition: { duration: 0.3 },
      } : {}}
    >
      {displayVal}
    </motion.span>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  guests,
  activeFilter,
  onFilterChange
}) => {
  const getStats = () => {
    const total = guests.length;

    // Strict v3.72 Classification
    const mainHotel = guests.filter(g => {
      const rNum = parseInt(g.room.split(' ')[0]);
      return rNum > 0 && rNum <= 31;
    }).length;

    const lakeHouse = guests.filter(g => {
      const rNum = parseInt(g.room.split(' ')[0]);
      return rNum >= 51 && rNum <= 58;
    }).length;

    const vips = guests.filter(g => g.prefillNotes.includes('⭐') || g.prefillNotes.includes('VIP') || g.packageName === 'POB_STAFF').length;

    const allergies = guests.filter(g => ['⚠️', '🥛', '🥜', '🍞', '🧀'].some(e => g.prefillNotes.includes(e))).length;

    const returns = guests.filter(g => g.ll.toLowerCase().includes('yes')).length;

    return [
      { id: 'all' as FilterType, label: 'Arrivals', val: total, color: 'text-slate-950 dark:text-white' },
      { id: 'main' as FilterType, label: 'Main Hotel', val: mainHotel, color: 'text-blue-700 dark:text-blue-400' },
      { id: 'lake' as FilterType, label: 'Lake House', val: lakeHouse, color: 'text-emerald-700 dark:text-emerald-400' },
      { id: 'return' as FilterType, label: 'Returns', val: returns, color: 'text-indigo-700 dark:text-indigo-400' },
      { id: 'vip' as FilterType, label: 'VIPs', val: vips, color: 'text-[#c5a065]' },
      { id: 'allergy' as FilterType, label: 'Allergies', val: allergies, color: 'text-rose-700 dark:text-rose-400' },
    ];
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full px-2 md:px-0">
      {/* Stat Cards: Staggered entrance with animated counters */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-2 md:gap-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {getStats().map((stat) => (
          <motion.div
            key={stat.id}
            variants={item}
            whileHover={{ scale: 1.08, y: -3, rotateX: -2, rotateY: 2, boxShadow: '0 12px 32px rgba(197, 160, 101, 0.25)' }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onFilterChange(stat.id)}
            style={{ perspective: 600 }}
            className={`ripple-container dashboard-stat-card px-3 md:px-6 py-2 md:py-3 cursor-pointer transition-colors duration-200 rounded-[1.25rem] md:rounded-full flex flex-col items-center justify-center border min-w-[70px] md:min-w-[110px] ${activeFilter === stat.id
              ? 'bg-[#c5a065] text-white border-[#c5a065] shadow-lg z-10'
              : 'bg-white/50 dark:bg-stone-900/50 border-slate-200 dark:border-stone-800 hover:border-[#c5a065]/50'
              }`}
          >
            <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] md:tracking-widest ${activeFilter === stat.id ? 'text-white' : 'text-slate-400'}`}>
              {stat.label}
            </span>
            <AnimatedNumber
              value={stat.val}
              className={`text-base md:text-xl font-black ${activeFilter === stat.id ? 'text-white' : stat.color}`}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Dashboard;