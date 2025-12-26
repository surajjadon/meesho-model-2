"use client";

import React, { useState, ChangeEvent, useEffect } from 'react';
import { useBusiness, api } from '../../../providers/GlobalProvider';
import { 
    Upload, DollarSign, Calendar, CheckCircle, Activity, FileText, 
    AlertCircle, Eye, RefreshCw, LineChart, ArrowLeft,
    Search, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, XAxis, YAxis, Tooltip, Area, CartesianGrid 
} from 'recharts';

// --- Interfaces ---
interface PaymentStats {
    totalNetOrderAmount: number;
    totalAdsCost: number;
    totalReferralEarnings: number;
    totalCompensation: number;
    totalRecoveries: number;
    paymentsCount: number;
    averagePayment: number;
}

interface TrendData {
    date: string;
    payment: number;
}

interface UploadResponse {
    fileName: string;
    stats: PaymentStats;
    paymentTrend: TrendData[];
    savedPayment: PaymentHistoryItem;
}

interface PaymentHistoryItem {
    _id: string;
    fileName: string;
    uploadedAt: string;
    totalNetOrderAmount: number;
    startDate: string;
    endDate: string;
}

// --- Helper Functions ---
const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

const ZERO_STATS: PaymentStats = {
    totalNetOrderAmount: 0,
    totalAdsCost: 0,
    totalReferralEarnings: 0,
    totalCompensation: 0,
    totalRecoveries: 0,
    paymentsCount: 0,
    averagePayment: 0,
};

// --- Component: Stat Card ---
const StatCard = ({ title, value, icon, highlight }: { title: string; value: string; icon: React.ReactNode, highlight?: boolean }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</p>
                <p className={`text-2xl sm:text-3xl font-bold mt-2 tracking-tight ${highlight ? 'text-indigo-600' : 'text-gray-900'}`}>{value}</p>
            </div>
            <div className={`p-2.5 rounded-lg ${highlight ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                {icon}
            </div>
        </div>
    </div>
);

// --- Component: Detailed View (Server-Side Pagination) ---
const UploadDetailView = ({ 
    onBack, 
    uploadId 
}: { 
    onBack: () => void; 
    uploadId: string 
}) => {
    
    // Data State
    const [pageData, setPageData] = useState<any[]>([]);
    const [meta, setMeta] = useState({ 
        totalItems: 0, 
        totalPages: 0, 
        currentPage: 1, 
        endDate: '', 
        totalAmount: 0 
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter & Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Fetch Paginated Data from Backend
    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = {
                    page: currentPage,
                    limit: itemsPerPage,
                    search: searchTerm
                };
                // Calls the new paginated endpoint
                const { data } = await api.get(`/payments/history/${uploadId}/paginated`, { params });
                
                setPageData(data.rawOrderPayments);
                setMeta({
                    totalItems: data.totalItems,
                    totalPages: data.totalPages,
                    currentPage: data.currentPage,
                    endDate: data.endDate,
                    totalAmount: data.totalNetOrderAmount
                });
            } catch (err) {
                console.error("Failed to load details", err);
                setError("Failed to load payment details.");
            } finally {
                setLoading(false);
            }
        };

        if (uploadId) {
            fetchDetails();
        }
    }, [uploadId, currentPage, itemsPerPage, searchTerm]);

    // Reset to page 1 when search term changes (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if(currentPage !== 1) setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const renderTypeBadge = (type: string) => {
        if (!type || type === '-') return <span className="text-gray-400 font-mono text-xs">-</span>;
        if (type === 'PREMIUM_RETURN') {
            return <span className="px-2 py-0.5 bg-gray-800 text-white text-[10px] font-bold rounded uppercase tracking-wider">PREMIUM_RETURN</span>;
        }
        return <span className="text-indigo-700 bg-indigo-50 font-medium text-xs px-2 py-1 rounded border border-indigo-100">{type}</span>;
    };

    return (
        <div className="bg-white w-full rounded-xl border border-gray-200 shadow-lg flex flex-col h-[700px] overflow-hidden">
            
            {/* --- Header Section --- */}
            <div className="p-5 border-b border-gray-100 flex flex-col gap-4 bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-indigo-600 border border-transparent hover:border-gray-200 transition-all shadow-sm cursor-pointer">
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">Payment Details</h3>
                            <p className="text-xs text-gray-500">
                                Settlement Date: {meta.endDate ? new Date(meta.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '...'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search SKU, Order ID..." 
                                className="pl-10 pr-4 py-2 w-full sm:w-64 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <select 
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-white border border-gray-300 text-gray-900 py-2 pl-3 pr-8 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium"
                            >
                                <option value={10}>10 rows</option>
                                <option value={20}>20 rows</option>
                                <option value={50}>50 rows</option>
                            </select>

                            <div className="flex rounded-md shadow-sm">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1 || loading}
                                    className="p-2 border border-gray-300 rounded-l-lg bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(meta.totalPages, prev + 1))}
                                    disabled={currentPage === meta.totalPages || loading}
                                    className="p-2 border-l-0 border border-gray-300 rounded-r-lg bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Table Section --- */}
            <div className="flex-1 overflow-auto relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
                        <RefreshCw className="animate-spin text-indigo-500" size={32} />
                    </div>
                )}

                {error ? (
                    <div className="h-full flex flex-col items-center justify-center text-red-500 gap-2">
                        <AlertCircle size={32} />
                        <p>{error}</p>
                    </div>
                ) : (
                    <table className="min-w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3 border-b border-gray-200 whitespace-nowrap">Order Date</th>
                                <th className="px-6 py-3 border-b border-gray-200 whitespace-nowrap">Sub Order No.</th>
                                <th className="px-6 py-3 border-b border-gray-200 whitespace-nowrap">SKU</th>
                                <th className="px-6 py-3 border-b border-gray-200 whitespace-nowrap">Type</th>
                                <th className="px-6 py-3 border-b border-gray-200 text-right whitespace-nowrap">Sale Amount</th>
                                <th className="px-6 py-3 border-b border-gray-200 text-right whitespace-nowrap">Claims/Comp</th>
                                <th className="px-6 py-3 border-b border-gray-200 text-right whitespace-nowrap">Recovery</th>
                                <th className="px-6 py-3 border-b border-gray-200 text-right whitespace-nowrap bg-gray-100">Settlement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                            {pageData.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                        No transaction records found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                pageData.map((row, index) => {
                                    const dateStr = row["Order Date"] ? row["Order Date"].split(' ')[0] : '-';
                                    const amount = parseFloat(row["Total Sale Amount (Incl. Shipping & GST)"] || "0");
                                    const claims = parseFloat(row["Claims"] || "0") + parseFloat(row["Compensation"] || "0");
                                    const recovery = parseFloat(row["Recovery"] || "0");
                                    const net = parseFloat(row["Final Settlement Amount"] || "0");

                                    return (
                                        <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-3 whitespace-nowrap text-gray-500 text-xs">{dateStr}</td>
                                            <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">{row["Sub Order No"]}</td>
                                            <td className="px-6 py-3 max-w-[200px] truncate text-xs text-gray-600" title={row["Supplier SKU"]}>
                                                {row["Supplier SKU"]}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                {renderTypeBadge(row["Price Type"])}
                                            </td>
                                            <td className="px-6 py-3 text-right whitespace-nowrap font-mono text-gray-900">{formatCurrency(amount)}</td>
                                            <td className="px-6 py-3 text-right whitespace-nowrap font-mono text-green-600">{claims > 0 ? formatCurrency(claims) : '-'}</td>
                                            <td className="px-6 py-3 text-right whitespace-nowrap font-mono text-red-500">{recovery !== 0 ? formatCurrency(recovery) : '-'}</td>
                                            <td className="px-6 py-3 text-right font-bold text-gray-900 bg-gray-50/50 whitespace-nowrap font-mono">{formatCurrency(net)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer Pagination */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                <span>
                    Showing {meta.totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, meta.totalItems)} of {meta.totalItems}
                </span>
                <span>Page {currentPage} of {meta.totalPages || 1}</span>
            </div>
        </div>
    );
};

// --- Main Dashboard Component ---
export default function PaymentsDashboard() {
    const { selectedBusiness } = useBusiness();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data State
    const [stats, setStats] = useState<PaymentStats>(ZERO_STATS);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [histories, setHistories] = useState<PaymentHistoryItem[]>([]);
    
    // View State
    const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // ✅ Initialize Filters to Current Month
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    });
    
    const [endDate, setEndDate] = useState(() => {
        const now = new Date();
        // Set to end of current month
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    // Fetch Data
    const fetchData = async () => {
        if (!selectedBusiness) return;
        setStatsLoading(true);
        setError(null);
        
        try {
            const params = { 
                gstin: selectedBusiness.gstin,
                startDate,
                endDate
            };

            const [statsRes, historyRes, trendRes] = await Promise.all([
                api.get('/payments/stats', { params }),
                api.get('/payments/history', { params: { gstin: selectedBusiness.gstin } }), // History is usually not date filtered
                api.get('/payments/trend', { params })
            ]);

            setStats(statsRes.data);
            setHistories(historyRes.data);
            setTrendData(trendRes.data);
            
        } catch (err) {
            console.error(err);
            setError("Could not load payment data. Please try again.");
        } finally {
            setStatsLoading(false);
        }
    };
    
    // Re-fetch when business or date filters change
    useEffect(() => {
        fetchData();
    }, [selectedBusiness, startDate, endDate]); // Added startDate/endDate dependency

    const handleClearFilter = () => {
        // Reset to default (Current Month)
        const now = new Date();
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
        setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleProcessFile = async () => {
        if (!file || !selectedBusiness) return;
        setIsProcessing(true);
        setError(null);

        const formData = new FormData();
        formData.append("paymentFile", file);
        formData.append("gstin", selectedBusiness.gstin);

        try {
            const { data }: { data: UploadResponse } = await api.post('/payments/upload', formData);
            setHistories(prev => [data.savedPayment, ...prev]);
            fetchData(); // Refresh stats
            setFile(null); 
        } catch (err: any) {
            setError(err.response?.data?.message || "Upload failed. Check file format.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!selectedBusiness) return <div className="p-8 text-center text-gray-500 font-medium">Please select a business from the dashboard.</div>;

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 py-6 space-y-6 font-sans">
            
            {/* --- Control Bar (Header, Upload, Filters) --- */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
                
                {/* Title */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                    <p className="text-sm text-gray-500 mt-1">Track settlements, deductions, and payment trends.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                    
                    {/* Date Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Calendar className="h-4 w-4 text-gray-500" />
                            </div>
                            <input
                                type="date"
                                className="cursor-pointer block w-full rounded-lg border border-gray-300 bg-white pl-10 text-sm text-gray-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 py-2.5 transition-shadow shadow-sm"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="date"
                                className="cursor-pointer block w-full rounded-lg border border-gray-300 bg-white pl-3 text-sm text-gray-900 font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 py-2.5 transition-shadow shadow-sm"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={fetchData} // Manual refresh
                                className="cursor-pointer px-4 py-2.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100"
                            >
                                Apply
                            </button>
                            <button 
                                onClick={handleClearFilter}
                                title="Reset to This Month"
                                className="cursor-pointer px-3 py-2.5 bg-white border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div className="flex items-center gap-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-4">
                        <div className="relative flex items-center w-full">
                            <input 
                                type="file" 
                                id="file-upload" 
                                className="hidden" 
                                onChange={handleFileChange}
                                accept=".xlsx, .xls"
                            />
                            <label 
                                htmlFor="file-upload" 
                                className={`
                                    cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full md:w-auto border shadow-sm
                                    ${file ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}
                                `}
                            >
                                <Upload size={16} className={file ? "text-indigo-600" : "text-gray-500"} />
                                <span className="truncate max-w-[120px]">{file ? file.name : "Upload Sheet"}</span>
                            </label>
                        </div>
                        {file && (
                            <button 
                                onClick={handleProcessFile}
                                disabled={isProcessing}
                                className="cursor-pointer px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                            >
                                {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : "Import"}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center gap-2 animate-pulse">
                    <AlertCircle size={18}/> {error}
                </div>
            )}

            {/* --- Stats Grid --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard 
                    title="Total Settlement" 
                    value={statsLoading ? '...' : formatCurrency(stats.totalNetOrderAmount)} 
                    icon={<DollarSign size={20} />} 
                    highlight
                />
                <StatCard 
                    title="Ads Deduction" 
                    value={statsLoading ? '...' : formatCurrency(stats.totalAdsCost)} 
                    icon={<Activity size={20} />} 
                />
                <StatCard 
                    title="Payments Count" 
                    value={statsLoading ? '...' : stats.paymentsCount.toLocaleString()} 
                    icon={<CheckCircle size={20} />} 
                />
                <StatCard 
                    title="Avg. Settlement" 
                    value={statsLoading ? '...' : formatCurrency(stats.averagePayment)} 
                    icon={<LineChart size={20} />} 
                />
            </div>

            {/* --- Main Content Area (Sliding View) --- */}
            <div className="relative w-full min-h-[600px]">
                
                {/* 1. Dashboard View */}
                <div 
                    className={`
                        absolute top-0 left-0 w-full transition-all duration-500 ease-in-out
                        ${viewDetailsId ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
                    `}
                >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Chart Section */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-800">Payment Trends</h3>
                                <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md">
                                    {startDate && endDate ? 'Custom Range' : 'All Time'}
                                </span>
                            </div>
                            
                            <div className="flex-1 w-full min-h-0">
                                {statsLoading ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading trends...</div>
                                ) : trendData.length === 0 ? (
                                    <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 text-sm border border-dashed border-gray-200">
                                        No trend data available for this period.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPayment" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis 
                                                dataKey="date" 
                                                tickLine={false} axisLine={false}
                                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                                tickFormatter={(date) => new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                minTickGap={30}
                                            />
                                            <YAxis 
                                                tickLine={false} axisLine={false}
                                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                                tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                                            />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value) => [formatCurrency(Number(value)), "Settlement"]}
                                                labelFormatter={(label) => new Date(label).toLocaleDateString("en-IN", { dateStyle: 'medium' })}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="payment" 
                                                stroke="#4f46e5" 
                                                strokeWidth={2}
                                                fillOpacity={1} 
                                                fill="url(#colorPayment)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Recent Uploads List */}
                        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[400px] overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-gray-800">History</h3>
                                <FileText size={16} className="text-gray-400" />
                            </div>
                            
                            <div className="flex-1 overflow-auto p-0">
                                <table className="w-full text-left text-sm">
                                    <tbody className="divide-y divide-gray-50">
                                        {histories.length === 0 ? (
                                            <tr><td className="p-8 text-center text-gray-400 text-xs">No payment files uploaded yet.</td></tr>
                                        ) : (
                                            histories.map((item) => (
                                                <tr key={item._id} className="hover:bg-indigo-50/30 transition-colors group cursor-default">
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-700 truncate max-w-[120px]" title={item.fileName}>
                                                                {item.fileName.replace('.xlsx', '')}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {new Date(item.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour:'2-digit', minute:'2-digit' })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="block font-semibold text-gray-800 text-xs">
                                                            {formatCurrency(item.totalNetOrderAmount)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button 
                                                            onClick={() => setViewDetailsId(item._id)}
                                                            className="cursor-pointer text-gray-300 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-full transition-all"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Detailed View (Slides in) */}
                <div 
                    className={`
                        absolute top-0 left-0 w-full transition-all duration-500 ease-in-out
                        ${viewDetailsId ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}
                    `}
                >
                    {viewDetailsId && (
                        <UploadDetailView 
                            uploadId={viewDetailsId} 
                            onBack={() => setViewDetailsId(null)} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
}