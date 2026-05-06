import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap
} from 'recharts';
import { 
  TrendingUp, Settings, Calendar, Globe, Database, 
  ChevronRight, Save, Lock, LayoutDashboard, Eye, EyeOff, Loader2, Trophy
} from 'lucide-react';
import { format, subDays, startOfYear, isAfter, parseISO } from 'date-fns';
import { cn, formatPercent } from './lib/utils';

// --- Types ---
interface Target {
  code: string;
  name: string;
  quantity: number;
}

interface HistoryPoint {
  date: string;
  close: number;
}

interface SummaryItem {
  name: string;
  code: string;
  startPrice: number;
  currentPrice: number;
  returnPercent: number;
  baseDate: string;
  quantity: number;
  weight: number;
}

// --- Components ---

const Header = () => (
  <header className="mb-8 text-center pb-8 border-b border-gray-100">
    <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Stock Performance</h1>
    <p className="text-gray-500 font-light">Value Horizon's Advanced Investment Tracking Engine</p>
  </header>
);

const AdminModal = ({ isOpen, onClose, categories }: { isOpen: boolean, onClose: () => void, categories: string[] }) => {
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      fetchContent();
    }
  }, [isOpen, category]);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/targets');
      const data = await res.json();
      const catData = data[category] || [];
      const formatted = catData.map((d: any) => `${d.code}|${d.name}|${d.quantity}`).join('\n');
      setContent(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/targets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, category, content })
      });
      if (!res.ok) throw new Error('Unauthorized or update failed');
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" /> Admin Configuration
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-4">
            <div className="w-1/3">
              <label className="block text-sm font-medium mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter admin password"
              />
            </div>
            <div className="w-2/3">
              <label className="block text-sm font-medium mb-1">Target File</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">File Content (code|name|quantity)</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 h-64 font-mono text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="p-6 bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [categories, setCategories] = useState<Record<string, Target[]>>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [history, setHistory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/targets');
      const data = await res.json();
      setCategories(data);
      const firstTab = Object.keys(data)[0];
      if (firstTab && !activeTab) setActiveTab(firstTab);
    } catch (e) {
      console.error(e);
    } finally {
      // Don't set loading false yet, wait for history
    }
  };

  useEffect(() => {
    if (activeTab && categories[activeTab]) {
      fetchHistory();
    }
  }, [activeTab, startDate, endDate, categories]);

  const fetchHistory = async () => {
    const targets = categories[activeTab];
    if (!targets) return;
    
    setLoading(true);
    const symbols = targets.map(t => t.code).join(',');
    try {
      const res = await fetch(`/api/history?symbols=${symbols}&start=${startDate}&end=${endDate}`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const targets = categories[activeTab] || [];
    const results: SummaryItem[] = [];
    let grandTotalMarketValue = 0;

    const dataPoints: { name: string; mktVal: number; item: any }[] = [];

    targets.forEach(t => {
      const rawSym = t.code;
      const data = history[rawSym];
      if (!data || !data.history || data.history.length === 0) return;

      const firstPoint = data.history[0];
      const startPrice = firstPoint.close;
      const currentPrice = data.price; // Use the more accurate price from quote
      const returnPercent = ((currentPrice - startPrice) / startPrice) * 100;

      const mktVal = currentPrice * (t.quantity || 0);
      dataPoints.push({
        name: t.name,
        mktVal,
        item: {
          name: t.name,
          code: t.code,
          startPrice,
          currentPrice,
          returnPercent,
          baseDate: format(new Date(firstPoint.date), 'yyyy-MM-dd'),
          quantity: t.quantity,
        }
      });
      grandTotalMarketValue += mktVal;
    });

    dataPoints.forEach(dp => {
      results.push({
        ...dp.item,
        weight: grandTotalMarketValue > 0 ? (dp.mktVal / grandTotalMarketValue) * 100 : 0
      });
    });

    return results.sort((a, b) => b.returnPercent - a.returnPercent);
  }, [history, categories, activeTab]);

  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    Object.values(history).forEach((item: any) => {
      const data = item.history;
      if (Array.isArray(data)) {
        data.forEach((p: any) => allDates.add(format(new Date(p.date), 'yyyy-MM-dd')));
      }
    });

    const sortedDates = Array.from(allDates).sort();
    
    return sortedDates.map(date => {
      const row: any = { date };
      Object.entries(history).forEach(([sym, item]: [string, any]) => {
        const target = (categories[activeTab] || []).find(t => t.code === sym);
        if (!target || visibility[target.name] === false) return;

        const data = item.history;
        const point = (data as any[]).find((p: any) => format(new Date(p.date), 'yyyy-MM-dd') === date);
        if (point) {
          // Base 100 calculation
          const firstPrice = (data as any[])[0].close;
          row[target.name] = (point.close / firstPrice) * 100;
        }
      });
      return row;
    });
  }, [history, activeTab, categories, visibility]);

  const treemapData = useMemo(() => {
    return summary
      .filter(s => s.weight > 0.05 && visibility[s.name] !== false)
      .sort((a, b) => b.weight - a.weight) // Strict descending order by weight
      .map(s => ({
        name: s.name,
        value: s.weight,
        displayLabel: `${s.name}\n${s.weight.toFixed(1)}%`
      }));
  }, [summary, visibility]);

  const monthlyRankings = useMemo(() => {
    if (!history || Object.keys(history).length === 0) return [];

    const monthsMap: Record<string, Record<string, number>> = {};
    const symToName: Record<string, string> = {};
    const targets = categories[activeTab] || [];
    targets.forEach(t => symToName[t.code] = t.name);

    Object.entries(history).forEach(([sym, data]: [string, any]) => {
      const name = symToName[sym];
      if (!name || !data.history) return;

      data.history.forEach((d: any) => {
        const monthKey = d.date.substring(0, 7); // yyyy-MM
        if (!monthsMap[monthKey]) monthsMap[monthKey] = {};
        monthsMap[monthKey][name] = d.close;
      });
    });

    const sortedMonthKeys = Object.keys(monthsMap).sort();
    if (sortedMonthKeys.length === 0) return [];

    return sortedMonthKeys.map((m, idx) => {
      const returns = targets.map(t => {
        const name = t.name;
        const currentPrice = monthsMap[m][name];
        let prevPrice = idx > 0 ? monthsMap[sortedMonthKeys[idx - 1]][name] : undefined;

        if (prevPrice === undefined && history[t.code]?.history?.length > 0) {
           prevPrice = history[t.code].history[0].close;
        }

        const ret = currentPrice && prevPrice ? (currentPrice / prevPrice) - 1 : 0;
        return { name, return: ret, code: t.code };
      }).sort((a, b) => b.return - a.return);

      return {
        month: m,
        label: format(parseISO(m + '-01'), 'MMM yyyy'),
        ranks: returns
      };
    });
  }, [history, categories, activeTab]);

  const toggleVisibility = (name: string) => {
    setVisibility(prev => ({ ...prev, [name]: prev[name] === false }));
  };

  if (!activeTab && loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin w-8 h-8 text-black" /></div>;
  }

  const COLORS = [
    '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', 
    '#0891b2', '#ea580c', '#be123c', '#1d4ed8', '#059669'
  ];

  const getColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100">
      <div className="max-w-7xl mx-auto px-4 py-12 md:px-8">
        <Header />

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 items-end">
          <div className="md:col-span-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Analysis Category</label>
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 h-12">
              {Object.keys(categories).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={cn(
                    "flex-1 rounded-lg text-sm font-semibold transition-all duration-200",
                    activeTab === cat ? "bg-white shadow-sm text-black ring-1 ring-black/5" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none h-12"
                />
              </div>
            </div>
            <div className="relative">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none h-12"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 mb-16">
          {summary.map((item, idx) => {
            const isHidden = visibility[item.name] === false;
            return (
              <button 
                key={`${item.code}-${item.name}`}
                onClick={() => toggleVisibility(item.name)}
                className={cn(
                  "group relative p-2.5 rounded-lg border transition-all duration-300 text-left overflow-hidden h-20 flex flex-col justify-between",
                  isHidden 
                    ? "bg-gray-50 border-gray-100 opacity-40 grayscale" 
                    : "bg-white border-gray-100 hover:shadow-md hover:border-black/5 active:scale-95"
                )}
              >
                {!isHidden && <div className="absolute top-0 left-0 w-0.5 h-full" style={{ backgroundColor: getColor(item.name) }} />}
                <div className="overflow-hidden">
                  <h3 className="text-[11px] uppercase text-gray-400 tracking-wider mb-0.5 truncate pr-2">{item.name}</h3>
                  <div className="text-sm font-bold tracking-tight leading-none mb-0.5 truncate">
                    {new Intl.NumberFormat().format(Math.round(item.currentPrice))}
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold",
                    item.returnPercent >= 0 ? "text-red-500" : "text-blue-500"
                  )}>
                    {formatPercent(item.returnPercent)}
                  </div>
                </div>
                {!isHidden ? <Eye className="absolute top-2 right-2 w-2.5 h-2.5 text-gray-200" /> : <EyeOff className="absolute top-2 right-2 w-2.5 h-2.5 text-gray-200" />}
              </button>
            )
          })}
        </div>

        {/* Charts Section */}
        {summary.length > 0 && (
          <div className="space-y-16">
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-400" /> Performance Trend
                </h2>
                <div className="text-xs font-medium text-gray-400">Daily Close (Base 100 Normalized)</div>
              </div>
              <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#9ca3af'}} 
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#9ca3af'}}
                      label={{ value: 'Index (Base 100)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9ca3af' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      itemStyle={{ fontWeight: '600' }}
                      // Ensure quantity/value not in tooltip, only normalized index
                      formatter={(val: number, name: string) => [`${val.toFixed(2)}`, name]}
                      itemSorter={(item: any) => -item.value}
                    />
                    <Legend 
                      iconType="diamond"
                      wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: '500' }}
                    />
                    {summary.map((s, idx) => (
                      visibility[s.name] !== false && (
                        <Line 
                          key={s.name} 
                          type="monotone" 
                          dataKey={s.name} 
                          stroke={getColor(s.name)} 
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          animationDuration={1500}
                        />
                      )
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {monthlyRankings.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" /> Monthly Return Ranking
                  </h2>
                  <div className="text-xs font-medium text-gray-400">Relative Performance by Month</div>
                </div>
                <div className="overflow-x-auto -mx-8 px-8">
                  <div className="min-w-max">
                    <table className="w-full border-separate border-spacing-x-2 border-spacing-y-0">
                      <thead>
                        <tr>
                          <th className="p-1 text-[10px] uppercase font-black text-gray-300 text-left sticky left-0 bg-white/90 backdrop-blur-sm z-10">Rank</th>
                          {monthlyRankings.map(m => (
                            <th key={m.month} className="p-1 text-[11px] font-bold text-gray-900 min-w-[140px]">
                              {m.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(Math.min(10, categories[activeTab]?.length || 0))].map((_, rankIdx) => (
                          <tr key={rankIdx}>
                            <td className="p-1 text-[10px] font-black text-gray-400 sticky left-0 bg-white/90 backdrop-blur-sm z-10">
                              {rankIdx + 1}
                            </td>
                            {monthlyRankings.map(m => {
                              const item = m.ranks[rankIdx];
                              if (!item) return <td key={m.month} className="p-0.5"></td>;
                              
                              const itemColor = getColor(item.name);
                              const isHovered = hoveredStock === item.name;
                              const isDimmed = hoveredStock !== null && !isHovered;

                              return (
                                <td 
                                  key={m.month} 
                                  className="p-0.5 transition-all duration-300"
                                  onMouseEnter={() => setHoveredStock(item.name)}
                                  onMouseLeave={() => setHoveredStock(null)}
                                >
                                  <div 
                                    className={cn(
                                      "relative flex flex-col p-2 rounded-xl border transition-all duration-300",
                                      isHovered 
                                        ? "scale-105 shadow-lg z-20" 
                                        : "border-transparent",
                                      isDimmed ? "opacity-30 scale-95 grayscale-[0.5]" : "opacity-100"
                                    )}
                                    style={{ 
                                      backgroundColor: isHovered ? `${itemColor}20` : `${itemColor}08`,
                                      borderColor: isHovered ? itemColor : 'transparent'
                                    }}
                                  >
                                    <div 
                                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full"
                                      style={{ backgroundColor: itemColor }}
                                    />
                                    <div className="pl-1">
                                      <div className="text-[11px] text-gray-900 truncate tracking-tight leading-tight">{item.name}</div>
                                      <div className={cn(
                                        "text-[9px] mt-0.5 leading-none",
                                        item.return >= 0 ? "text-red-500" : "text-blue-500"
                                      )}>
                                        {item.return >= 0 ? '▲' : '▼'} {(item.return * 100).toFixed(1)}%
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-gray-400" /> Portfolio Weights
                  </h2>
                  <div className="text-xs font-medium text-gray-400">Relative Concentration by Market Value</div>
                </div>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="value"
                      stroke="#fff"
                      fill="#000"
                      aspectRatio={4 / 3}
                      isAnimationActive={false}
                      content={<CustomTreemapContent getColor={getColor} />}
                    >
                        <Tooltip 
                          formatter={(val: number, name: string) => [`${val.toFixed(2)}%`, name]}
                        />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
            </div>

            {summary.length > 0 && (
              <div className="mt-12 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <details className="group">
                  <summary className="text-sm font-bold text-gray-500 cursor-pointer list-none flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                    View Raw Data Details
                  </summary>
                  <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-gray-100 pb-4">
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Asset Name</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Code</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Start Price</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Current Price</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Return</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Base Date</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {summary.map(s => (
                          <tr key={`${s.code}-${s.name}`} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 font-semibold">{s.name}</td>
                            <td className="py-4 text-gray-400 font-mono text-xs">{s.code}</td>
                            <td className="py-4 font-medium">{new Intl.NumberFormat().format(Math.round(s.startPrice))}</td>
                            <td className="py-4 font-medium">{new Intl.NumberFormat().format(Math.round(s.currentPrice))}</td>
                            <td className={cn("py-4 font-bold", s.returnPercent >= 0 ? "text-red-500" : "text-blue-500")}>
                              {formatPercent(s.returnPercent)}
                            </td>
                            <td className="py-4 text-gray-400 text-xs">{s.baseDate}</td>
                            <td className="py-4 font-bold text-gray-900">{s.weight.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </div>
        )}

        <footer className="mt-24 pt-8 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-4">
            <span>Source: Yahoo Finance | Enterprise Edition Data Engine</span>
             <button 
              onClick={() => setIsAdminOpen(true)}
              className="p-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <Settings className="w-3 h-3 text-gray-400" />
            </button>
          </div>
           <div className="flex gap-4">
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>Encrypted Configuration</span>
           </div>
        </footer>

        <AdminModal 
          isOpen={isAdminOpen} 
          onClose={() => {
            setIsAdminOpen(false);
            fetchTargets();
          }} 
          categories={Object.keys(categories)}
        />
      </div>
    </div>
  );
}

const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, value, getColor } = props;

  if (width < 30 || height < 30) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: getColor ? getColor(name) : '#ccc',
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      {width > 50 && height > 35 && (
        <foreignObject x={x + 4} y={y + 4} width={width - 8} height={height - 8}>
           <div className="h-full flex flex-col items-center justify-center text-center text-white overflow-hidden pointer-events-none select-none">
              <div className="text-[18px] font-medium truncate w-full px-1 leading-tight opacity-90">{name}</div>
              <div className="text-[14px] opacity-70 leading-none mt-1">{value.toFixed(1)}%</div>
           </div>
        </foreignObject>
      )}
    </g>
  );
};
