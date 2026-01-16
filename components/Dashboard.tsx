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
      { id: 'all' as FilterType, label: 'Arrivals', val: total, accent: 'pill-accent-1' },
      { id: 'main' as FilterType, label: 'Main Hotel', val: mainHotel, accent: 'pill-accent-2' },
      { id: 'lake' as FilterType, label: 'Lake House', val: lakeHouse, accent: 'pill-accent-3' },
      { id: 'return' as FilterType, label: 'Returns', val: returns, accent: 'pill-accent-4' },
      { id: 'vip' as FilterType, label: 'VIPs', val: vips, accent: 'pill-accent-5' },
      { id: 'allergy' as FilterType, label: 'Allergies', val: allergies, accent: 'pill-accent-6' },
    ];
  };

  return (
    <div className="dashboard-strip">
      {getStats().map(stat => (
        <div
          key={stat.id}
          onClick={() => onFilterChange(stat.id)}
          className={`stat-pill ${stat.accent} ${activeFilter === stat.id ? 'active' : ''}`}
        >
          <span className="sp-label">{stat.label}</span>
          <span className="sp-val">{stat.val}</span>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;