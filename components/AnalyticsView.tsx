import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { Guest, ArrivalSession, GlobalAnalyticsData } from '../types';
import { AnalyticsService } from '../services/analyticsService';

interface AnalyticsViewProps {
  activeGuests: Guest[];
  allSessions: ArrivalSession[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ allSessions }) => {
  const [data, setData] = useState<GlobalAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sessionsRef = useRef<string>("");

  const fetchAnalytics = useCallback(async () => {
    if (allSessions.length === 0) return;
    setIsLoading(true);
    try {
      const result = await AnalyticsService.generateGlobalAnalytics(allSessions);
      if (result) {
        setData(result);
        sessionsRef.current = JSON.stringify(allSessions.map(s => ({ id: s.id, count: s.guests.length })));
      }
    } catch (e) {
      console.error("Strategic Analytics Sync Failed:", e);
    } finally {
      setIsLoading(false);
    }
  }, [allSessions]);

  useEffect(() => {
    const currentSessionsState = JSON.stringify(allSessions.map(s => ({ id: s.id, count: s.guests.length })));
    if (!data || (currentSessionsState !== sessionsRef.current && !isLoading)) {
      fetchAnalytics();
    }
  }, [allSessions, data, isLoading, fetchAnalytics]);

  // Handle case with no sessions/manifests
  if (allSessions.length === 0) {
    return (
      <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-12 border border-white/20 dark:border-white/5 shadow-xl text-center mb-10 animate-in fade-in duration-500">
        <span className="text-4xl block mb-4">📈</span>
        <h3 className="text-sm font-black uppercase tracking-widest text-[#c5a065]">Awaiting Manifest Intelligence</h3>
        <p className="text-xs text-slate-500 mt-2 italic">The analytics engine will activate once at least one arrival list is deployed into the hub.</p>
      </div>
    );
  }

  // Color Map Constants
  const identityColors: Record<string, string> = {
    'Strategic (VIP)': '#c5a065',
    'Return Guests': '#3b82f6',
    'New Arrivals': '#1e293b'
  };

  const riskColors: Record<string, string> = {
    'Allergies': '#f43f5e',
    'Previous Issues': '#eab308',
    'Billing Alerts': '#ef4444',
    'TBD Logistics': '#94a3b8'
  };

  // Helper to normalize AI keys to UI color keys in case of minor hallucinations
  const normalizeKey = (key: string, map: Record<string, string>): string => {
    const lowerKey = key.toLowerCase();
    const found = Object.keys(map).find(k => k.toLowerCase() === lowerKey || lowerKey.includes(k.toLowerCase()) || k.toLowerCase().includes(lowerKey));
    return found || key;
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

  // Normalization for AreaChart (requires at least 2 points to render an area visually)
  const normalizedOccupancy = data?.occupancyPulse && data.occupancyPulse.length === 1
    ? [{ date: 'Start', count: 0 }, ...data.occupancyPulse, { date: 'End', count: 0 }]
    : data?.occupancyPulse || [];

  return (
    <div className="space-y-6 mb-10 animate-in fade-in duration-700">
      
      {/* HEADER & SYNC CONTROLS */}
      <div className="flex justify-between items-end px-2">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#c5a065]/10 rounded-2xl flex items-center justify-center text-2xl border border-[#c5a065]/20 shadow-inner">🧠</div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a065]">Strategic Intelligence Feed</h2>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight">Synthesizing {allSessions.length} Portfolio Manifests</p>
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

      {/* LOADING STATE PLACEHOLDER */}
      {!data && isLoading && (
        <div className="h-[400px] flex flex-col items-center justify-center bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] border-2 border-dashed border-[#c5a065]/20 animate-pulse">
          <div className="w-16 h-16 border-4 border-[#c5a065]/20 border-t-[#c5a065] rounded-full animate-spin mb-4"></div>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#c5a065]">Parsing Portfolios & Generating Strategic Models...</p>
        </div>
      )}

      {data && (
        <>
          {/* KPI STAT STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Volume', val: allSessions.reduce((acc, s) => acc + s.guests.length, 0), icon: '🌍', color: 'text-slate-900 dark:text-white' },
              { label: 'Loyalty Index', val: `${data.loyaltyRate}%`, icon: '🔄', color: 'text-emerald-500' },
              { label: 'VIP Intensity', val: `${data.vipIntensity}%`, icon: '💎', color: 'text-[#c5a065]' },
              { label: 'Strategic Risks', val: data.riskAnalysis.reduce((acc, r) => acc + r.value, 0), icon: '🚩', color: 'text-rose-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/50 dark:bg-white/5 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/20 dark:border-white/5 shadow-sm flex flex-col items-center group hover:border-[#c5a065]/40 transition-all">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{stat.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</span>
                <span className={`text-3xl font-black ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>

          {/* AI GENERATED INSIGHT */}
          <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 p-8 rounded-[3rem] backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-indigo-500/10 text-4xl font-black">AI</div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Tactical Summary & Outlook</h4>
            <p className="text-base font-semibold text-indigo-950 dark:text-indigo-200 leading-relaxed italic relative z-10">
              "{data.strategicInsights}"
            </p>
          </div>

          {/* MAIN CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* OCCUPANCY PULSE TRACE */}
            <div className="lg:col-span-2 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] p-10 border border-white/20 dark:border-white/5 shadow-xl flex flex-col h-[400px]">
              <h3 className="text-[11px] font-black uppercase tracking-[0.35em] text-[#c5a065] mb-8">Occupancy Pulse Trace</h3>
              <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={normalizedOccupancy} key={`area-pulse-${data.lastUpdated}`}>
                    <defs>
                      <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c5a065" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#c5a065" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(197, 160, 101, 0.1)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" stroke="#c5a065" strokeWidth={5} fill="url(#pulseFill)" animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* STRATEGIC MIX PIE */}
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] p-10 border border-white/20 dark:border-white/5 shadow-xl flex flex-col h-[400px]">
              <h3 className="text-[11px] font-black uppercase tracking-[0.35em] text-[#c5a065] mb-8 text-center">Global Strategic Mix</h3>
              <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart key={`mix-pie-${data.lastUpdated}`}>
                    <Pie
                      data={data.strategicMix}
                      cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={8}
                      dataKey="value" nameKey="name" stroke="none" animationDuration={1200}
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
              </div>
            </div>
          </div>

          {/* SECONDARY ANALYTICS SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* RISK PATTERN ANALYSIS - VERTICAL BAR CHART */}
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] p-10 border border-white/20 dark:border-white/5 shadow-xl flex flex-col h-[350px]">
              <h3 className="text-[11px] font-black uppercase tracking-[0.35em] text-[#c5a065] mb-8">Risk Pattern Analysis</h3>
              <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.riskAnalysis} layout="vertical" margin={{ left: 10, right: 30 }} key={`risk-bar-${data.lastUpdated}`}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={130} 
                      style={{ fontSize: '10px', fontWeight: 800, fill: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(197, 160, 101, 0.05)' }} />
                    <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={24} animationDuration={1000}>
                      {data.riskAnalysis.map((entry, index) => (
                        <Cell key={`risk-bar-cell-${index}`} fill={riskColors[normalizeKey(entry.name, riskColors)] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LOYALTY SUMMARY CARD */}
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] p-10 border border-white/20 dark:border-white/5 shadow-xl flex flex-col h-[350px] items-center justify-center">
              <h3 className="text-[11px] font-black uppercase tracking-[0.35em] text-[#c5a065] mb-8">Loyalty Anchor Summary</h3>
              <div className="text-center">
                <div className="text-6xl font-black text-emerald-500 mb-2 tabular-nums">{data.loyaltyRate}%</div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4">Retention Benchmark</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic max-w-[280px] leading-relaxed mx-auto">
                  {data.loyaltyRate > 30 
                    ? "Portfolio indicates a strong repeat-stay cluster. AI recommends personalized loyalty recognition during greeter engagement." 
                    : "High new-acquisition volume detected. Focus operational energy on first-impression excellence and property orientation."}
                </p>
              </div>
            </div>
          </div>

          <p className="text-[8px] font-black uppercase tracking-[0.8em] text-slate-400/40 text-center pt-4">Strategic Pulse Alpha • v5.0 Master • Unified {new Date(data.lastUpdated).toLocaleTimeString()}</p>
        </>
      )}
    </div>
  );
};

export default AnalyticsView;