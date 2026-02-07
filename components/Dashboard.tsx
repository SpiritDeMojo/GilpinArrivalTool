import React from 'react';
import { Guest, FilterType, PropertyFilter } from '../types';

interface DashboardProps {
  guests: Guest[];
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  propertyFilter: PropertyFilter;
  onPropertyChange: (filter: PropertyFilter) => void;
}

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
      {/* Stat Cards: Wrapping logic for mobile */}
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
        {getStats().map(stat => (
          <div
            key={stat.id}
            onClick={() => onFilterChange(stat.id)}
            className={`px-3 md:px-6 py-2 md:py-3 cursor-pointer transition-all duration-300 rounded-[1.25rem] md:rounded-full flex flex-col items-center justify-center border min-w-[70px] md:min-w-[110px] ${activeFilter === stat.id
                ? 'bg-[#c5a065] text-white border-[#c5a065] shadow-lg scale-105 z-10'
                : 'bg-white/50 dark:bg-stone-900/50 border-slate-200 dark:border-stone-800 hover:border-[#c5a065]/50'
              }`}
          >
            <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] md:tracking-widest ${activeFilter === stat.id ? 'text-white' : 'text-slate-400'}`}>
              {stat.label}
            </span>
            <span className={`text-base md:text-xl font-black ${activeFilter === stat.id ? 'text-white' : stat.color}`}>
              {stat.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;