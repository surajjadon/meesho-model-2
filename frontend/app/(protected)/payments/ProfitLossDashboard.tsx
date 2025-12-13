"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useBusiness, api } from '@/providers/GlobalProvider';
import { 
    TrendingUp, Download, Filter, ChevronDown, 
    DollarSign, FileText, PieChart, Calendar, Check 
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

// --- Interfaces ---
interface KPIStats {
    revenue: { value: number; trend: number };
    expenses: { value: number; trend: number };
    profit: { value: number; trend: number };
    margin: { value: number; trend: number };
}

interface SkuPL {
    sku: string;
    month: string;
    finalPayout: number;
    cogs: number;
    margin: number;
}

// --- Helper Components ---

// ✅ FIXED: Added 'trendLabel' to the type definition
const KPICard = ({ 
    title, 
    value, 
    trendValue, 
    trendLabel, 
    icon, 
    isPositive 
}: { 
    title: string, 
    value: string, 
    trendValue: string, 
    trendLabel?: string, // Added this optional prop
    icon: React.ReactNode, 
    isPositive?: boolean 
}) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <div className="text-slate-400">{icon}</div>
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-1">{value}</h3>
        <div className="flex items-center gap-2 text-xs">
            <span className={`font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />} 
                {trendValue}
            </span>
            <span className="text-slate-400">{trendLabel || "vs prev period"}</span>
        </div>
    </div>
);

const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function ProfitLossDashboard() {
    const { selectedBusiness } = useBusiness();
    const [loading, setLoading] = useState(true);
    
    // --- State ---
    const [kpiStats, setKpiStats] = useState<KPIStats | null>(null);
    const [skuPL, setSkuPL] = useState<SkuPL[]>([]);
    const [activeView, setActiveView] = useState<'Overview' | 'Category' | 'Channel'>('Overview');
    
    // --- Filter State ---
    const [timeFilter, setTimeFilter] = useState('This Month');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filterOptions = ['This Month', 'Last Month', 'Last 3 Months', 'Last 6 Months', 'Year to Date', 'All Time'];

    // Close dropdown logic
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchPLData = async () => {
            if (!selectedBusiness) return;
            setLoading(true);
            try {
                const res = await api.get('/pl/summary', { 
                    params: { 
                        gstin: selectedBusiness.gstin,
                        timeFilter: timeFilter 
                    } 
                });
                setKpiStats(res.data.kpiStats);
                setSkuPL(res.data.skuPL || []);
            } catch (err) {
                console.error("Failed to fetch P&L data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPLData();
    }, [selectedBusiness, timeFilter]);

    // --- Visual Aggregations ---
    const monthlySummary = useMemo(() => {
        const map = new Map<string, { month: string, revenue: number, expenses: number, profit: number }>();
        skuPL.forEach(item => {
            if (!map.has(item.month)) {
                map.set(item.month, { month: item.month, revenue: 0, expenses: 0, profit: 0 });
            }
            const entry = map.get(item.month)!;
            entry.revenue += item.finalPayout;
            entry.expenses += item.cogs;
            entry.profit += item.margin;
        });
        return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
    }, [skuPL]);

    const topContributors = useMemo(() => {
        const skuMap = new Map<string, { sku: string, revenue: number, profit: number }>();
        skuPL.forEach(item => {
            if (!skuMap.has(item.sku)) {
                skuMap.set(item.sku, { sku: item.sku, revenue: 0, profit: 0 });
            }
            const entry = skuMap.get(item.sku)!;
            entry.revenue += item.finalPayout;
            entry.profit += item.margin;
        });
        return Array.from(skuMap.values()).sort((a, b) => b.profit - a.profit).slice(0, 5);
    }, [skuPL]);

    const tableData = useMemo(() => {
        return [...monthlySummary].sort((a, b) => b.month.localeCompare(a.month));
    }, [monthlySummary]);

    if (!selectedBusiness) return <div className="p-6 bg-yellow-50 text-yellow-800 rounded-md">Please select a business.</div>;
    
    return (
        <div className="space-y-6 font-sans pb-10">
            
            {/* --- 1. Control Bar --- */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm relative z-30">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 whitespace-nowrap select-none">
                        <Filter size={16} className="text-slate-500" />
                        <span>Filter period:</span>
                    </div>
                    
                    {/* Dropdown Container */}
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`px-4 py-2 border rounded-lg text-sm flex items-center gap-3 transition-all min-w-[160px] justify-between ${
                                isFilterOpen 
                                ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Calendar size={15} className={isFilterOpen ? 'text-blue-600' : 'text-slate-400'}/>
                                <span className="font-medium">{timeFilter}</span>
                            </div>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isFilterOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isFilterOpen && (
                            <div className="absolute top-[120%] left-0 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-[100] animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                                <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Duration</div>
                                {filterOptions.map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => {
                                            setTimeFilter(option);
                                            setIsFilterOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-all flex items-center justify-between ${
                                            timeFilter === option ? 'text-blue-600 bg-blue-50 font-medium' : 'text-slate-600'
                                        }`}
                                    >
                                        {option}
                                        {timeFilter === option && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm w-full md:w-auto justify-center">
                        <Download size={16} /> Export Report
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-20 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                    Loading financial data...
                </div>
            ) : (
                <>
                    {/* --- 2. KPI Cards --- */}
                    {kpiStats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <KPICard 
                                title="Net Profit" 
                                value={formatCurrency(kpiStats.profit.value)} 
                                trendValue={`${Math.abs(kpiStats.profit.trend).toFixed(1)}%`}
                                isPositive={kpiStats.profit.trend >= 0}
                                icon={<TrendingUp size={20} />}
                            />
                            <KPICard 
                                title="Total Revenue" 
                                value={formatCurrency(kpiStats.revenue.value)} 
                                trendValue={`${Math.abs(kpiStats.revenue.trend).toFixed(1)}%`}
                                isPositive={kpiStats.revenue.trend >= 0}
                                icon={<FileText size={20} />}
                            />
                            <KPICard 
                                title="Total Expenses" 
                                value={formatCurrency(kpiStats.expenses.value)} 
                                trendValue={`${Math.abs(kpiStats.expenses.trend).toFixed(1)}%`}
                                isPositive={kpiStats.expenses.trend <= 0} 
                                icon={<DollarSign size={20} />}
                            />
                            <KPICard 
                                title="Profit Margin" 
                                value={`${kpiStats.margin.value.toFixed(1)}%`} 
                                trendValue={`${Math.abs(kpiStats.margin.trend).toFixed(1)} pts`}
                                trendLabel="vs prev period"
                                isPositive={kpiStats.margin.trend >= 0}
                                icon={<PieChart size={20} />}
                            />
                        </div>
                    )}

                    {/* --- 3. Tabs --- */}
                    <div className="flex gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
                        {['Overview', 'By Category', 'By Channel'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveView(tab as any)}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                                    activeView === tab 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* --- 4. Split View: Trend & Contributors --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Graph */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm z-10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800">Profit Trend</h3>
                            </div>
                            
                            <div className="h-[300px] bg-slate-50/50 rounded-xl border border-slate-100 p-2 flex items-center justify-center">
                                {monthlySummary.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={monthlySummary}>
                                            <defs>
                                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis 
                                                dataKey="month" 
                                                tick={{ fontSize: 11, fill: '#64748b' }} 
                                                tickLine={false} axisLine={false} 
                                            />
                                            <YAxis 
                                                tick={{ fontSize: 11, fill: '#64748b' }} 
                                                tickLine={false} axisLine={false} 
                                                tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                                            />
                                            <Tooltip formatter={(val: number) => [formatCurrency(val), 'Profit']} />
                                            <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} fill="url(#colorProfit)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-slate-400">No data for selected period.</div>
                                )}
                            </div>
                        </div>

                        {/* Right: Top Contributors */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col z-10">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800">Top Contributors</h3>
                                <span className="text-xs text-slate-400">by Profit</span>
                            </div>

                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-slate-400 font-medium text-xs border-b border-slate-100">
                                        <tr>
                                            <th className="text-left pb-2 font-medium">Source</th>
                                            <th className="text-right pb-2 font-medium">Impact</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {topContributors.length === 0 ? (
                                            <tr><td colSpan={2} className="text-center py-8 text-slate-400">No data.</td></tr>
                                        ) : topContributors.map((item, idx) => (
                                            <tr key={idx} className="group">
                                                <td className="py-3 pr-2">
                                                    <p className="font-medium text-slate-700 truncate max-w-[140px]">{item.sku}</p>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        +{formatCurrency(item.profit)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* --- 5. Table --- */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Detailed Breakdown</h3>
                            <div className="text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded">{timeFilter}</div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Month</th>
                                        <th className="px-6 py-3">Revenue</th>
                                        <th className="px-6 py-3">Expenses</th>
                                        <th className="px-6 py-3">Net Profit</th>
                                        <th className="px-6 py-3">Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tableData.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">No data.</td></tr>
                                    ) : tableData.map((item) => {
                                        const marginPercent = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                                        return (
                                            <tr key={item.month} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 font-medium text-slate-700">{item.month}</td>
                                                <td className="px-6 py-4 text-slate-600">{formatCurrency(item.revenue)}</td>
                                                <td className="px-6 py-4 text-slate-600">{formatCurrency(item.expenses)}</td>
                                                <td className="px-6 py-4 font-bold text-slate-800">{formatCurrency(item.profit)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                        marginPercent > 15 ? 'bg-green-100 text-green-700' : 
                                                        marginPercent > 0 ? 'bg-yellow-100 text-yellow-700' : 
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {marginPercent.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}