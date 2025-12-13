"use client";

import React, { useState, ChangeEvent, useEffect, useMemo } from 'react';
import { useBusiness, api } from '../../../providers/GlobalProvider';
import { 
    Upload, DollarSign, Calendar, CheckCircle, Activity, FileText, 
    AlertCircle, Filter, Eye, RefreshCw, LineChart, ArrowLeft,
    Search, List, Info, ChevronLeft, ChevronRight
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
    paymentsCount?: number; 
}

// --- Specific Interface for the Detailed View Data ---
interface OrderPaymentRow {
    "Sub Order No": string;
    "Order Date": string;
    "Supplier SKU": string;
    "Price Type": string;
    "Total Sale Amount (Incl. Shipping & GST)": string;
    "Claims": string;
    "Compensation": string;
    "Recovery": string;
    "Final Settlement Amount": string;
    [key: string]: any; // Allow other dynamic keys
}

interface PaymentDetailData {
    _id: string;
    fileName: string;
    rawOrderPayments: OrderPaymentRow[];
    endDate:Date,
    totalNetOrderAmount: number;
    // Add other fields if needed for header display
}

// --- Helper ---
const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

const StatCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
        <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
        </div>
        <div className="absolute bottom-4 right-4 text-slate-300">
            {icon}
        </div>
    </div>
);

const ZERO_STATS: PaymentStats = {
    totalNetOrderAmount: 0,
    totalAdsCost: 0,
    totalReferralEarnings: 0,
    totalCompensation: 0,
    totalRecoveries: 0,
    paymentsCount: 0,
    averagePayment: 0,
};

// --- New Component: Detail White Box (With Real Data Logic) ---
const UploadDetailView = ({ 
    onBack, 
    uploadId 
}: { 
    onBack: () => void; 
    uploadId: string 
}) => {
    
    const [detailData, setDetailData] = useState<PaymentDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter & Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // 1. Fetch Data on Mount
    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                // Assuming your API endpoint is structured like this to get a single document
                // Adjust '/payments/history/' if your backend route is different
                const { data } = await api.get(`/payments/history/${uploadId}`);
                setDetailData(data);
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
    }, [uploadId]);

    // 2. Compute Filtered & Paginated Data
    const processedData = useMemo(() => {
        if (!detailData?.rawOrderPayments) return { pageData: [], totalItems: 0, totalPages: 0 };

        // A. Filter
        const filtered = detailData.rawOrderPayments.filter(row => {
            const searchLower = searchTerm.toLowerCase();
            return (
                (row["Sub Order No"]?.toLowerCase() || "").includes(searchLower) ||
                (row["Supplier SKU"]?.toLowerCase() || "").includes(searchLower) ||
                (row["Price Type"]?.toLowerCase() || "").includes(searchLower)
            );
        });

        // B. Paginate
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        // Ensure current page is valid after filtering
        const validPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages)); 
        
        const startIndex = (validPage - 1) * itemsPerPage;
        const pageData = filtered.slice(startIndex, startIndex + itemsPerPage);

        return { pageData, totalItems, totalPages, validPage };
    }, [detailData, searchTerm, currentPage, itemsPerPage]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    
    // Helper to render the badge style based on type
    const renderTypeBadge = (type: string) => {
        if (!type || type === '-') {
            return (
                <span className="w-6 h-6 flex items-center justify-center bg-slate-200 text-slate-500 text-xs rounded-sm font-bold">
                    -
                </span>
            );
        }
        if (type === 'PREMIUM_RETURN') {
            return (
                <span className="px-2 py-1 bg-slate-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                    PREMIUM_RETURN
                </span>
            );
        }
        return <span className="text-slate-600 font-medium text-xs bg-slate-100 px-2 py-1 rounded">{type}</span>;
    };

    if (loading) return (
        <div className="bg-white w-full rounded-xl border border-slate-200 shadow-sm h-[600px] flex items-center justify-center">
            <RefreshCw className="animate-spin text-slate-400" size={32} />
        </div>
    );

    if (error || !detailData) return (
        <div className="bg-white w-full rounded-xl border border-slate-200 shadow-sm h-[600px] flex flex-col items-center justify-center gap-4">
            <AlertCircle className="text-red-400" size={48} />
            <p className="text-slate-600">{error || "No data found."}</p>
            <button onClick={onBack} className="text-blue-600 hover:underline">Go Back</button>
        </div>
    );

    return (
        <div className="bg-white w-full rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
            
            {/* --- Header Section --- */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
                {/* Top Row: Back Button & Title */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                       
                       <h3 className="font-bold text-lg text-slate-800 truncate max-w-lg">
    Payments on {new Date(detailData.endDate).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    })}
</h3>
                    </div>
                </div>

                {/* Second Row: Controls (Search & Filters) */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search (Sub-order, SKU, Type...)" 
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        {/* Pages Dropdown */}
                        <div className="relative">
                            <select 
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none cursor-pointer hover:bg-slate-50 transition-colors"
                            >
                                <option value={10}>10 / page</option>
                                <option value={20}>20 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={processedData.validPage === 1}
                            className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        <span className="text-xs text-slate-500">
                            Showing {Math.min((processedData.validPage - 1) * itemsPerPage + 1, processedData.totalItems)}–
                            {Math.min(processedData.validPage * itemsPerPage, processedData.totalItems)} of {processedData.totalItems}
                        </span>

                        <button 
                            onClick={() => setCurrentPage(prev => Math.min(processedData.totalPages, prev + 1))}
                            disabled={processedData.validPage === processedData.totalPages || processedData.totalPages === 0}
                            className="p-1.5 border border-slate-200 rounded text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Table Section --- */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase tracking-wider shadow-sm">
                        <tr>
                            <th className="px-4 py-3 border-b border-slate-100">Order Date</th>
                            <th className="px-4 py-3 border-b border-slate-100">Sub Order No.</th>
                            <th className="px-4 py-3 border-b border-slate-100">SKU</th>
                            <th className="px-4 py-3 border-b border-slate-100">Price Type</th>
                            <th className="px-4 py-3 border-b border-slate-100 text-right">Order Amount</th>
                            <th className="px-4 py-3 border-b border-slate-100 text-right">Claims & Comp.</th>
                            <th className="px-4 py-3 border-b border-slate-100 text-right">Recoveries</th>
                            <th className="px-4 py-3 border-b border-slate-100 text-right">Net Amount</th>
                            
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {processedData.pageData.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                    No payments found matching your search.
                                </td>
                            </tr>
                        ) : (
                            processedData.pageData.map((row, index) => {
                                // Data Processing
                                const dateStr = row["Order Date"] ? row["Order Date"].split(' ')[0] : '-';
                                const amount = parseFloat(row["Total Sale Amount (Incl. Shipping & GST)"] || "0");
                                const claims = parseFloat(row["Claims"] || "0") + parseFloat(row["Compensation"] || "0");
                                const recovery = parseFloat(row["Recovery"] || "0");
                                const net = parseFloat(row["Final Settlement Amount"] || "0");

                                return (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">{dateStr}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800">{row["Sub Order No"]}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate" title={row["Supplier SKU"]}>
                                            {row["Supplier SKU"]}
                                        </td>
                                        <td className="px-4 py-3">
                                            {renderTypeBadge(row["Price Type"])}
                                        </td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(amount)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(claims)}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(recovery)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCurrency(net)}</td>
                                       
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default function PaymentsDashboard() {
    const { selectedBusiness } = useBusiness();
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for all-time data
    const [allTimeStats, setAllTimeStats] = useState<PaymentStats>(ZERO_STATS);
    const [allTimeTrend, setAllTimeTrend] = useState<TrendData[]>([]);
    const [histories, setHistories] = useState<PaymentHistoryItem[]>([]);
    
    // View State (Null = Dashboard, String = Detail View ID)
    const [viewDetailsId, setViewDetailsId] = useState<string | null>(null);

    // Loading states
    const [statsLoading, setStatsLoading] = useState(true);
    
    // Fetch all initial data on load
    const fetchData = async () => {
        if (!selectedBusiness) return;
        setStatsLoading(true);
        setError(null);
        
        try {
            const gstin = selectedBusiness.gstin;
            const [statsRes, historyRes, trendRes] = await Promise.all([
                api.get('/payments/stats', { params: { gstin } }),
                api.get('/payments/history', { params: { gstin } }),
                api.get('/payments/trend', { params: { gstin } })
            ]);

            setAllTimeStats(statsRes.data);
            setHistories(historyRes.data);
            setAllTimeTrend(trendRes.data);
            
        } catch (err) {
            console.error(err);
            setError("Could not load payment data.");
        } finally {
            setStatsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [selectedBusiness]);

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
            
            // Optimistic Update
            setAllTimeStats(prev => ({
                totalNetOrderAmount: prev.totalNetOrderAmount + data.stats.totalNetOrderAmount,
                totalAdsCost: prev.totalAdsCost + data.stats.totalAdsCost,
                totalReferralEarnings: prev.totalReferralEarnings + data.stats.totalReferralEarnings,
                totalCompensation: prev.totalCompensation + data.stats.totalCompensation,
                totalRecoveries: prev.totalRecoveries + data.stats.totalRecoveries,
                paymentsCount: prev.paymentsCount + data.stats.paymentsCount,
                averagePayment: (prev.paymentsCount + data.stats.paymentsCount) > 0 
                    ? (prev.totalNetOrderAmount + data.stats.totalNetOrderAmount) / (prev.paymentsCount + data.stats.paymentsCount)
                    : 0,
            }));

            setHistories(prev => [data.savedPayment, ...prev]);

            setAllTimeTrend(prevTrend => {
                const newTrendData = data.paymentTrend;
                const trendMap = new Map(prevTrend.map(item => [item.date, item.payment]));
                newTrendData.forEach(item => {
                    trendMap.set(item.date, (trendMap.get(item.date) || 0) + item.payment);
                });
                return Array.from(trendMap, ([date, payment]) => ({ date, payment }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            });
            
            setFile(null); 
            
        } catch (err: any) {
            setError(err.response?.data?.message || "Upload failed.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!selectedBusiness) return <div className="p-6 bg-yellow-50 text-yellow-700 rounded-lg">Please select a business profile.</div>;

    return (
        <div className="space-y-6 overflow-hidden">
            
            {/* --- Control Bar (Filters & Upload) --- */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm cursor-pointer hover:bg-slate-100 transition-colors">
                        <Filter size={16} />
                        <span>Filter: All time</span>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex items-center">
                        <input 
                            type="file" 
                            id="file-upload" 
                            className="hidden" 
                            onChange={handleFileChange}
                            accept=".xlsx, .xls"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-l-lg text-sm font-medium transition-colors">
                            Choose file
                        </label>
                        <span className="px-4 py-2 bg-slate-50 border-y border-r border-slate-200 rounded-r-lg text-xs text-slate-500 min-w-[120px] truncate">
                            {file ? file.name : "No file chosen"}
                        </span>
                    </div>
                    <button 
                        onClick={handleProcessFile}
                        disabled={!file || isProcessing}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                    >
                        {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : "Import"}
                    </button>
                </div>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}

            {/* --- Stats Grid (Always Visible) --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Payment Amount" 
                    value={statsLoading ? '...' : formatCurrency(allTimeStats.totalNetOrderAmount)} 
                    icon={<DollarSign size={24} />} 
                />
                <StatCard 
                    title="Total Ads Cost" 
                    value={statsLoading ? '...' : formatCurrency(allTimeStats.totalAdsCost)} 
                    icon={<Activity size={24} />} 
                />
                <StatCard 
                    title="Successful Payments" 
                    value={statsLoading ? '...' : allTimeStats.paymentsCount.toLocaleString()} 
                    icon={<CheckCircle size={24} />} 
                />
                <StatCard 
                    title="Average Payment" 
                    value={statsLoading ? '...' : formatCurrency(allTimeStats.averagePayment)} 
                    icon={<LineChart size={24} />} 
                />
            </div>

            {/* --- Main Content Area with Sliding Transition --- */}
            <div className="relative w-full min-h-[600px]">
                
                {/* 1. The Original Dashboard View (Grid) */}
                <div 
                    className={`
                        absolute top-0 left-0 w-full transition-all duration-1000 ease-in-out
                        ${viewDetailsId ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}
                    `}
                >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Payment Trends Graph */}
                        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold text-slate-800">Payment Trends</h3>
                                <span className="text-xs text-slate-400">All time</span>
                            </div>
                            
                            <div className="h-[300px] w-full">
                                {statsLoading ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Loading trends...</div>
                                ) : allTimeTrend.length === 0 ? (
                                    <div className="h-full flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 text-sm">
                                        No trend data available yet.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={allTimeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPayment" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis 
                                                dataKey="date" 
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                tickFormatter={(date) => new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                minTickGap={30}
                                            />
                                            <YAxis 
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                                tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`}
                                            />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
                                                labelFormatter={(label) => new Date(label).toLocaleDateString("en-IN", { dateStyle: 'medium' })}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="payment" 
                                                stroke="#3b82f6" 
                                                strokeWidth={2}
                                                fillOpacity={1} 
                                                fill="url(#colorPayment)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        {/* Right: Recent Uploads Table */}
                        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                            <div className="p-5 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-800">Recent Uploads</h3>
                            </div>
                            
                            <div className="flex-1 overflow-auto max-h-[300px] p-0">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-2 font-medium">File Name</th>
                                            <th className="px-4 py-2 font-medium text-right">Amount</th>
                                            <th className="px-4 py-2 font-medium text-center">Date</th>
                                            <th className="px-4 py-2 font-medium text-center">View</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {histories.length === 0 ? (
                                            <tr><td colSpan={4} className="p-4 text-center text-slate-400">No uploads yet.</td></tr>
                                        ) : (
                                            histories.map((item) => (
                                                <tr key={item._id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <FileText size={14} className="text-slate-400" />
                                                            <span className="font-medium text-slate-700 truncate max-w-[80px] block" title={item.fileName}>
                                                                {item.fileName.replace('.xlsx', '')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                                        {formatCurrency(item.totalNetOrderAmount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-slate-500 text-xs">
                                                        {new Date(item.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button 
                                                            onClick={() => setViewDetailsId(item._id)}
                                                            className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50 cursor-pointer"
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

                {/* 2. The New Detail View (White Box) */}
                <div 
                    className={`
                        absolute top-0 left-0 w-full transition-all duration-1000 ease-in-out
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

            {/* Footer Info */}
            <div className="text-xs text-slate-400 flex justify-between items-center mt-4">
                <p>Last import: {histories[0] ? new Date(histories[0].uploadedAt).toLocaleString() : 'Never'}</p>
                <p>Source: Excel (.xlsx)</p>
            </div>
        </div>
    );
}