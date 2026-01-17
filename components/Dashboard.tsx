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
    const mainHotel = guests.filter(g => {
      const parts = g.room.split(' ');
      const rNum = parseInt(parts[0]);
      return (rNum > 0 && rNum <= 31) || isNaN(rNum);
    }).length;
    const lakeHouse = guests.filter(g => {
      const parts = g.room.split(' ');
      const rNum = parseInt(parts[0]);
      return rNum >= 51 && rNum <= 60;
    }).length;
    const vips = guests.filter(g => g.prefillNotes.includes('⭐') || g.prefillNotes.includes('VIP')).length;
    const allergies = guests.filter(g => g.prefillNotes.includes('⚠️') || g.prefillNotes.includes('🥛') || g.prefillNotes.includes('🥜') || g.prefillNotes.includes('🍞') || g.prefillNotes.includes('🧀')).length;
    const returns = guests.filter(g => g.ll.toLowerCase().includes('yes')).length;

    return [
      { id: 'all' as FilterType, label: 'Arrivals', val: total, color: 'text-slate-950 dark:text-white' },
      { id: 'main' as FilterType, label: 'Main', val: mainHotel, color: 'text-blue-600 dark:text-blue-400' },
      { id: 'lake' as FilterType, label: 'Lake House', val: lakeHouse, color: 'text-emerald-600 dark:text-emerald-400' },
      { id: 'return' as FilterType, label: 'Returns', val: returns, color: 'text-indigo-600 dark:text-indigo-400' },
      { id: 'vip' as FilterType, label: 'VIPs', val: vips, color: 'text-[#c5a065]' },
      { id: 'allergy' as FilterType, label: 'Allergies', val: allergies, color: 'text-rose-600 dark:text-rose-400' },
    ];
  };

  return (
    <div className="dashboard-strip px-6">
      {getStats().map(stat => (
        <div
          key={stat.id}
          onClick={() => onFilterChange(stat.id)}
          className={`stat-pill group ${activeFilter === stat.id ? 'active' : ''}`}
        >
          <span className="sp-label transition-colors group-hover:text-slate-950 dark:group-hover:text-white">{stat.label}</span>
          <span className={`sp-val ${stat.color} transition-transform group-hover:scale-110`}>{stat.val}</span>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;