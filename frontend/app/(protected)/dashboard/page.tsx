"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useBusiness, useAuth, api } from '@/providers/GlobalProvider';
import { 
    TrendingUp, ShoppingBag, Package, ArrowUpRight, Calendar, ChevronLeft, ChevronRight, Search,
    BarChart as BarChartIcon 
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend
} from 'recharts';

// --- Interfaces ---
interface DashboardData {
    topStats: {
        totalNet: number;
        totalOrders: number;
        topProduct: string;
    };
    monthlyTrend: { date: string; profit: number; revenue?: number }[];
    skuPL: {
        sku: string;
        month: string;
        delivered: number;
        orderValue: number;
        finalPayout: number;
        cogs: number;
        margin: number;
        unmatchedQty?: number;
        returned: number;
    }[];
}

// --- Helper Components ---
const StatCard = ({ title, value, subtext, icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
        <div className={`absolute top-0 right-0 p-4 opacity-10 ${color}`}>
            {icon}
        </div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 mb-2">{value}</h3>
        <div className="flex items-center gap-2">
            <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ArrowUpRight size={12} /> {subtext}
            </span>
            <span className="text-xs text-slate-400">vs last month</span>
        </div>
    </div>
);

const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);


export const getUserData = async (email: string) => {
  try {
    const response = await api.get(
      `/team/user-details/${encodeURIComponent(email)}`
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    throw error;
  }
};


export default function DashboardPage() {
    const { selectedBusiness } = useBusiness();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);
    
    // Filter State
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchData = async () => {
            if (!selectedBusiness) return;
            setLoading(true);
            try {
                // Re-using the PL summary endpoint as it has most data we need
                const res = await api.get('/pl/summary', { params: { gstin: selectedBusiness.gstin } });
                
                // Process data for the dashboard
                const skuList = res.data.skuPL || [];
                
                // Calculate total orders from SKU list
                const totalOrders = skuList.reduce((sum: number, item: any) => sum + (item.delivered || 0), 0);
                
                // Find top product
                const sortedSkus = [...skuList].sort((a: any, b: any) => b.delivered - a.delivered);
                const topProduct = sortedSkus.length > 0 ? sortedSkus[0].sku : 'N/A';

                setData({
                    topStats: {
                        totalNet: res.data.topStats.totalNet,
                        totalOrders,
                        topProduct
                    },
                    monthlyTrend: res.data.monthlyTrend,
                    skuPL: res.data.skuPL
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedBusiness]);


    useEffect(() => {
  if (!user?.email) return;

  const fetchUser = async () => {
    const data = await getUserData(user.email);
    console.log(data);
  };

  fetchUser();
}, [user?.email]);


    // Filter Data by Month
    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.skuPL.filter(item => item.month === selectedMonth);
    }, [data, selectedMonth]);

    // Filter Data by Search Term
    const searchedData = useMemo(() => {
        return filteredData.filter(item => 
            item.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [filteredData, searchTerm]);

    // Pagination
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return searchedData.slice(start, start + itemsPerPage);
    }, [searchedData, currentPage]);

    // Calculate Stats for Selected Month
    const monthlyStats = useMemo(() => {
        return filteredData.reduce((acc, item) => ({
            revenue: acc.revenue + item.orderValue,
            orders: acc.orders + item.delivered
        }), { revenue: 0, orders: 0 });
    }, [filteredData]);

    if (!selectedBusiness) return <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">Please select a business profile to view the dashboard.</div>;
    if (loading) return <div className="p-10 text-center text-slate-500">Loading your dashboard...</div>;

    return (
        <div className="space-y-8 font-sans text-slate-800">
            
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">Welcome back, <span className="font-semibold text-blue-600">{user?.name}</span>!</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <Calendar size={18} className="text-slate-400 ml-2" />
                    <span className="text-sm font-medium text-slate-600">Filter by Month:</span>
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title={`Total Sales (${selectedMonth})`} 
                    value={formatCurrency(monthlyStats.revenue)} 
                    subtext="12.5%" 
                    color="text-blue-600"
                    icon={<TrendingUp size={40} />}
                />
                <StatCard 
                    title={`Total Orders (${selectedMonth})`} 
                    value={monthlyStats.orders.toLocaleString()} 
                    subtext="8.2%" 
                    color="text-purple-600"
                    icon={<ShoppingBag size={40} />}
                />
                <StatCard 
                    title="Best Selling SKU" 
                    value={data?.topStats.topProduct} 
                    subtext="Top Performer" 
                    color="text-orange-600"
                    icon={<Package size={40} />}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profit Trend */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Profit/Loss (Monthly)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.monthlyTrend}>
                                <defs>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                                <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`}/>
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                <Area type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Daily Units (Mocked/Simplified for now as we aggregate by month) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold mb-6">Sales Overview</h3>
                    <div className="h-[300px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <div className="text-center">
                            <BarChartIcon size={40} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Daily breakdown coming soon</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top SKUs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-800">Top SKUs ({selectedMonth})</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search SKU..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">SKU</th>
                                <th className="px-6 py-4 text-right">Units Sold</th>
                                <th className="px-6 py-4 text-right">Revenue</th>
                                <th className="px-6 py-4 text-right">PnL</th>
                                <th className="px-6 py-4 text-right">Returns</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedData.length > 0 ? (
                                paginatedData.map((item, index) => {
                                    const pnl = item.finalPayout - item.cogs;
                                    return (
                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-700">{item.sku}</td>
                                            <td className="px-6 py-4 text-right text-slate-600">{item.delivered}</td>
                                            <td className="px-6 py-4 text-right text-slate-600">{formatCurrency(item.orderValue)}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(pnl)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-500">{item.returned}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                        No data found for {selectedMonth}. Try changing the month filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, searchedData.length)} of {searchedData.length} entries</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(searchedData.length / itemsPerPage), p + 1))} 
                            disabled={currentPage * itemsPerPage >= searchedData.length}
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}