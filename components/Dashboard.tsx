import React from 'react';
import { Guest, FilterType } from '../types';

interface DashboardProps {
  guests: Guest[];
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ guests, activeFilter, onFilterChange }) => {
  const getStats = () => {
    const total = guests.length;
    
    // Strict v3.72 Classification
    const mainHotel = guests.filter(g => {
      const rNum = parseInt(g.room.split(' ')[0]);
      return rNum > 0 && rNum <= 31;
    }).length;
    
    const lakeHouse = guests.filter(g => {
      const rNum = parseInt(g.room.split(' ')[0]);
      return rNum >= 51 && rNum <= 60;
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
    <div className="flex items-center justify-center gap-2">
      {getStats().map(stat => (
        <div
          key={stat.id}
          onClick={() => onFilterChange(stat.id)}
          className={`px-6 py-2 cursor-pointer transition-all duration-300 rounded-full flex flex-col items-center justify-center border border-transparent ${
            activeFilter === stat.id 
            ? 'bg-[#c5a065] text-white shadow-lg' 
            : 'hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <span className={`text-[9px] font-black uppercase tracking-widest ${activeFilter === stat.id ? 'text-white' : 'text-slate-400'}`}>
            {stat.label}
          </span>
          <span className={`text-lg font-black ${activeFilter === stat.id ? 'text-white' : stat.color}`}>
            {stat.val}
          </span>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;