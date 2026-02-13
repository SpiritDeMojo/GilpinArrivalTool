import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { Guest, ArrivalSession, GlobalAnalyticsData, FilterType } from '../types';
import { AnalyticsService } from '../services/analyticsService';

interface AnalyticsViewProps {
  activeGuests: Guest[];
  allSessions: ArrivalSession[];
  activeFilter: FilterType;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ allSessions, activeFilter }) => {
  const [data, setData] = useState<GlobalAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);
  const sessionsRef = useRef<string>("");

  // Deep filtering logic: Apply Dashboard filter to all sessions before analytics processing
  const filteredSessions = useMemo(() => {
    if (activeFilter === 'all') return allSessions;
    return allSessions.map(session => ({
      ...session,
      guests: session.guests.filter(g => {
        const rNum = parseInt(g.room.split(' ')[0]);
        const isMain = rNum > 0 && rNum <= 31;
        const isLake = rNum >= 51 && rNum <= 58;

        if (activeFilter === 'main') return isMain;
        if (activeFilter === 'lake') return isLake;
        if (activeFilter === 'vip') return g.prefillNotes.includes('⭐') || g.prefillNotes.includes('VIP') || g.packageName === 'POB_STAFF';
        if (activeFilter === 'allergy') return ['⚠️', '🥛', '🥜', '🍞', '🧀'].some(e => g.prefillNotes.includes(e));
        if (activeFilter === 'return') return g.ll.toLowerCase().includes('yes');
        return true;
      })
    })).filter(s => s.guests.length > 0);
  }, [allSessions, activeFilter]);

  const fetchAnalytics = useCallback(async () => {
    if (filteredSessions.length === 0) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setChartsReady(false);
    try {
      const result = await AnalyticsService.generateGlobalAnalytics(filteredSessions);
      if (result) {
        setData(result);
        sessionsRef.current = JSON.stringify(filteredSessions.map(s => ({ id: s.id, count: s.guests.length })));
        setTimeout(() => setChartsReady(true), 500);
      }
    } catch (e) {
      console.error("Strategic Analytics Sync Failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [filteredSessions]);

  useEffect(() => {
    const currentSessionsState = JSON.stringify(filteredSessions.map(s => ({ id: s.id, count: s.guests.length })));
    if (!data || (currentSessionsState !== sessionsRef.current && !isLoading)) {
      fetchAnalytics();
    }
  }, [filteredSessions, data, isLoading, fetchAnalytics]);

  // Operational Logic: Room Category Occupancy Calculation using extracted roomType
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {
      "Master Room": 0,
      "Classic Room": 0,
      "Junior Suite": 0,
      "Garden Room": 0,
      "Spa Lodge": 0,
      "Spa Suite": 0,
      "Lake House Classic": 0,
      "Lake House Master": 0,
      "Lake House Suite": 0,
      "Lake House Spa Suite": 0,
      "Other": 0
    };

    const allGuests = filteredSessions.flatMap(s => s.guests);
    allGuests.forEach(g => {
      const type = g.roomType?.toUpperCase();
      const rNum = parseInt(g.room.split(' ')[0]);

      if (type === 'MR') counts["Master Room"]++;
      else if (type === 'CR') counts["Classic Room"]++;
      else if (type === 'JS') counts["Junior Suite"]++;
      else if (type === 'GR') counts["Garden Room"]++;
      else if (type === 'SL') counts["Spa Lodge"]++;
      else if (type === 'SS') counts["Spa Suite"]++;
      else if (type === 'LHC') counts["Lake House Classic"]++;
      else if (type === 'LHM') counts["Lake House Master"]++;
      else if (type === 'LHS') counts["Lake House Suite"]++;
      else if (type === 'LHSS') counts["Lake House Spa Suite"]++;
      else {
        if (rNum >= 51 && rNum <= 56) counts["Lake House Classic"]++;
        else if (rNum === 57 || rNum === 58) counts["Lake House Spa Suite"]++;
        else if (rNum >= 1 && rNum <= 6) counts["Junior Suite"]++;
        else if (rNum >= 7 && rNum <= 14) counts["Master Room"]++;
        else if (rNum >= 15 && rNum <= 20) counts["Garden Room"]++;
        else if (rNum >= 21 && rNum <= 25) counts["Spa Lodge"]++;
        else if (rNum >= 26 && rNum <= 31) counts["Spa Suite"]++;
        else counts["Other"]++;
      }
    });

    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredSessions]);

  const uniqueOccupancyData = useMemo(() => {
    if (!data?.occupancyPulse) return [];
    const seen = new Set();
    const result: { date: string, count: number }[] = [];

    data.occupancyPulse.forEach(item => {
      if (!seen.has(item.date)) {
        seen.add(item.date);
        result.push(item);
      }
    });

    if (result.length === 1) {
      return [{ date: 'Start', count: 0 }, ...result, { date: 'End', count: 0 }];
    }
    return result;
  }, [data?.occupancyPulse]);

  if (allSessions.length === 0) {
    return (
      <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-12 border border-white/20 dark:border-white/5 shadow-xl text-center mb-10 animate-in fade-in duration-500">
        <span className="text-4xl block mb-4">📈</span>
        <h3 className="text-sm font-black uppercase tracking-widest text-[#c5a065]">Awaiting Manifest Intelligence</h3>
        <p className="text-xs text-slate-500 mt-2 italic">The analytics engine will activate once at least one arrival list is deployed into the hub.</p>
      </div>
    );
  }

  const identityColors: Record<string, string> = {
    'Strategic (VIP)': '#c5a065',
    'Return Guests': '#3b82f6',
    'New Arrivals': '#1e293b'
  };

  const categoryColors: Record<string, string> = {
    'Master Room': '#1e293b',
    'Classic Room': '#475569',
    'Junior Suite': '#c5a065',
    'Garden Room': '#3b82f6',
    'Spa Lodge': '#8b5cf6',
    'Spa Suite': '#f43f5e',
    'Lake House Classic': '#10b981',
    'Lake House Master': '#059669',
    'Lake House Suite': '#047857',
    'Lake House Spa Suite': '#34d399',
    'Other': '#94a3b8'
  };

  const normalizeKey = (key: string, map: Record<string, string>): string => {
    const lowerKey = key.toLowerCase();
    const found = Object.keys(map).find(k => k.toLowerCase() === lowerKey || lowerKey.includes(k.toLowerCase()) || k.toLowerCase().includes(lowerKey));
    return found || key;
  };

  const formatDateLabel = (str: string) => {
    if (!str || str === 'Start' || str === 'End') return "";
    const parts = str.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].substring(0, 3)} ${parts[1]}`.replace(/,/g, '');
    }
    return str;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-stone-900 border border-[#c5a065]/30 p-3 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#c5a065] mb-1">{label || payload[0].name}</p>
          <p className="text-sm font-bold dark:text-white">
            {payload[0].value} <span className="text-[10px] font-normal text-slate-400">Guests</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 mb-10 animate-in fade-in duration-700">

      <div className="flex justify-between items-end px-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#c5a065]/10 rounded-2xl flex items-center justify-center text-2xl border border-[#c5a065]/20 shadow-inner">🧠</div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a065]">Strategic Intelligence Feed</h2>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">
              Synthesizing {filteredSessions.reduce((acc, s) => acc + s.guests.length, 0)} arrivals •
              <span className="text-[#c5a065] ml-1 uppercase font-black">
                {activeFilter === 'all' ? 'Full Estate' : activeFilter.toUpperCase()}
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-full border border-[#c5a065]/30 text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${isLoading ? 'bg-[#c5a065]/10 animate-pulse cursor-wait' : 'hover:bg-[#c5a065] hover:text-white hover:scale-105 active:scale-95 bg-white dark:bg-stone-900'}`}
        >
          <span>{isLoading ? '⏳' : '🔄'}</span>
          {isLoading ? 'Calibrating Data...' : 'Refresh AI Analytics'}
        </button>
      </div>

      {!data && isLoading && (
        <div className="h-[400px] flex flex-col items-center justify-center bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] border-2 border-dashed border-[#c5a065]/20 animate-pulse">
          <div className="w-16 h-16 border-4 border-[#c5a065]/20 border-t-[#c5a065] rounded-full animate-spin mb-4"></div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#c5a065]">Parsing Portfolios & Generating Strategic Models...</p>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Arrival Volume', val: filteredSessions.reduce((acc, s) => acc + s.guests.length, 0), icon: '🌍', color: 'text-slate-900 dark:text-white' },
              { label: 'Avg Occupancy', val: `${data.averageOccupancy ?? Math.round(filteredSessions.reduce((acc, s) => acc + s.guests.length, 0) / 39 * 100)}%`, icon: '🏨', color: 'text-amber-500' },
              { label: 'VIP Intensity', val: `${data.vipIntensity}%`, icon: '💎', color: 'text-[#c5a065]' },
              { label: 'Loyalty Impact', val: `${data.loyaltyRate}%`, icon: '🔄', color: 'text-indigo-500' },
              { label: 'Target Growth', val: `${100 - data.loyaltyRate}%`, icon: '🌱', color: 'text-emerald-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/50 dark:bg-white/5 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-sm flex flex-col items-center group hover:border-[#c5a065]/40 transition-all">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{stat.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</span>
                <span className={`text-3xl font-black ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 p-8 rounded-[3rem] backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-indigo-500/10 text-4xl font-black">AI</div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Tactical Summary & Outlook</h4>
            <p className="text-base font-semibold text-indigo-950 dark:text-indigo-200 leading-relaxed italic relative z-10">
              "{data.strategicInsights}"
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] p-10 border border-white/20 dark:border-white/5 shadow-xl flex flex-col h-[400px]">
              <h3 className="text-[11px] font-black uppercase tracking-[0.35em] text-[#c5a065] mb-8">Occupancy Pulse Trace</h3>
              <div className="flex-1 w-full min-h-0 relative">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={uniqueOccupancyData} key={`area-pulse-${data.lastUpdated}-${activeFilter}`}>
                      <defs>
                        <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c5a065" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#c5a065" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(197, 160, 101, 0.1)" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                        tickFormatter={formatDateLabel}
                        interval={0}
                      />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="count" stroke="#c5a065" strokeWidth={5} fill="url(#pulseFill)" animationDuration={1000} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center animate-pulse text-[10px] font-black uppercase text-[#c5a065]/40 tracking-widest">Stabilizing Pulse Data...</div>
                )}
              </div>
            </div>

            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] p-10 border border-white/20 dark:border-white/5 shadow-xl flex flex-col h-[400px]">
              <h3 className="text-[11px] font-black uppercase tracking-[0.35em] text-[#c5a065] mb-8 text-center">Arrival Portfolio Mix</h3>
              <div className="flex-1 w-full min-h-0 relative">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={`mix-pie-${data.lastUpdated}-${activeFilter}`}>
                      <Pie
                        data={data.strategicMix}
                        cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={8}
                        dataKey="value" nameKey="name" stroke="none" animationDuration={1000}
                      >
                        {data.strategicMix.map((entry, index) => (
                          <Cell key={`mix-cell-${index}`} fill={identityColors[normalizeKey(entry.name, identityColors)] || '#1e293b'} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom" align="center"
                        formatter={(v) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{v}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center animate-pulse text-[10px] font-black uppercase text-[#c5a065]/40 tracking-widest">Calibrating Mix...</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] p-10 border border-white/20 dark:border-white/5 shadow-xl flex flex-col h-[450px]">
              <h3 className="text-[11px] font-black uppercase tracking-[0.35em] text-[#c5a065] mb-8">Room Category Occupancy Breakdown</h3>
              <div className="flex-1 w-full min-h-0 relative">
                {chartsReady ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryStats} layout="vertical" margin={{ left: 10, right: 30 }} key={`cat-bar-${data.lastUpdated}-${activeFilter}`}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        width={140}
                        style={{ fontSize: '9px', fontWeight: 800, fill: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(197, 160, 101, 0.05)' }} />
                      <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={18} animationDuration={1000}>
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cat-bar-cell-${index}`} fill={categoryColors[entry.name] || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center animate-pulse text-[10px] font-black uppercase text-[#c5a065]/40 tracking-widest">Profiling Room Portfolio...</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl flex flex-col h-[450px] relative overflow-hidden group">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#c5a065]/10 rounded-full blur-3xl group-hover:bg-[#c5a065]/20 transition-all"></div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.35em] text-[#c5a065] mb-8 text-center">Operational Stream Focus</h3>

              <div className="flex-1 flex flex-col justify-center relative z-10 text-center space-y-8">
                <div>
                  <div className="text-7xl font-black text-[#c5a065] tabular-nums mb-2">
                    {filteredSessions.reduce((acc, s) => acc + s.guests.length, 0)}
                  </div>
                  <div className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Filtered target volume</div>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                  <p className="text-[12px] text-slate-300 italic leading-relaxed">
                    "Intelligence focus set to <span className="text-[#c5a065] font-bold uppercase">{activeFilter}</span>. System is displaying ungroupped room categories and unique occupancy patterns from all active manifests."
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live strategic stream sync active</span>
              </div>
            </div>
          </div>

          <p className="text-[8px] font-black uppercase tracking-[0.8em] text-slate-400/40 text-center pt-8">Strategic Pulse Alpha • v5.0 Master • Unified {new Date(data.lastUpdated).toLocaleTimeString()}</p>
        </>
      )}
    </div>
  );
};

export default AnalyticsView;