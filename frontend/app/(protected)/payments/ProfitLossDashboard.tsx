"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBusiness, api } from '../../../providers/GlobalProvider';
import { 
    RefreshCw, ChevronRight, ChevronDown, Download, Search, Filter, X, 
    Calendar, TrendingUp, TrendingDown, DollarSign,IndianRupee, PieChart, Loader2
} from 'lucide-react';
import { handleApiError } from '@/lib/errorHandler';

// --- Types ---
interface MatchedOrder {
    "Sub Order No": string;
    "Supplier SKU": string;
    "Live Order Status": string;
    "Order Date": string;
    "Product Name": string;
    "Final Settlement Amount": string | number;
    "Total Sale Amount (Incl. Shipping & GST)": string | number;
    "Return Shipping Charge (Incl. GST)"?: string | number;
    "Price Type"?: string;
    costPrice: number;
    packagingCost: number;
    profit: number;
    marginPercent: string;
    _isDamaged: boolean;
    _needsMapping?: boolean;
    [key: string]: any;
}

interface APIResponse {
    stats: {
        totalNetOrderAmount: number;
        totalRevenue: number;
        totalCOGS: number;
        totalProfit: number;
        profitMargin: string;
    };
    orders: MatchedOrder[];
    actionRequired?: string;
    pendingSkus?: string[];
}

interface SkuGroup {
    sku: string;
    productName: string;
    totalOrders: number;
    needsMapping: boolean;
    counts: {
        delivered: number;
        return: number;
        rto: number;
        damaged: number;
    };
    financials: {
        orderValue: number;      
        actualPayoutSum: number;     
        returnShipping: number;  
        finalProfit: number; 
    };
    orders: MatchedOrder[];
}

interface StatCardProps {
    label: string;
    value: number | string | undefined;
    icon: React.ElementType;
    isPercent?: boolean;
    highlight?: boolean;
    loading?: boolean;
}

// --- Helper: Parse Date ---
// NOTE: Backend sends diverse formats from Excel uploads. Normalization handled here for now.
const parseOrderDate = (dateStr: string) => {
    if (!dateStr) return new Date(0); 
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateStr);
};

export default function PLSummary() {
    const { selectedBusiness } = useBusiness();
    const router = useRouter(); 
    
    // --- State ---
    const [loading, setLoading] = useState<boolean>(true); 
    const [apiData, setApiData] = useState<APIResponse | null>(null);
    const [expandedSku, setExpandedSku] = useState<string | null>(null);

    // 1️⃣ FIX: Race Condition Guard Ref
    const activeGstinRef = useRef<string | null>(null);

    // Unmapped Logic
    const [showMapModal, setShowMapModal] = useState(false);
    const [unmappedSkus, setUnmappedSkus] = useState<string[]>([]);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); 
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // --- Fetch Logic ---
    // NOTE: Manual fetch used here due to large payload + grouped client-side processing.
    // This allows finer control over the loading state during heavy aggregation.
    // Will migrate to React Query once server-side grouping is available.
    const fetchPLData = async () => {
        if (!selectedBusiness?.gstin) return;

        const currentGstin = selectedBusiness.gstin;
        activeGstinRef.current = currentGstin;

        setLoading(true);
        try {
            const { data } = await api.get('/pl/matched-orders', {
                params: { gstin: currentGstin }
            });

            // 🔒 GUARD: Prevent race condition if business switched during fetch
            if (activeGstinRef.current !== currentGstin) return;

            setApiData(data);

            if (data.actionRequired === "MAP_SKUS" && data.pendingSkus?.length > 0) {
                setUnmappedSkus(data.pendingSkus);
                setShowMapModal(true); 
            } 

        } catch (err: any) {
            if (activeGstinRef.current !== currentGstin) return;
            handleApiError(err, "Failed to load financial data.");
        } finally {
            if (activeGstinRef.current === currentGstin) {
                setLoading(false);
            }
        }
    };

    // 2️⃣ FIX: Trigger fetch safely
    useEffect(() => { 
        if (selectedBusiness?.gstin) {
            fetchPLData(); 
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBusiness?.gstin]);

    // --- Navigation ---
    const handleGoToMapping = (skuToMap?: string) => {
        if (skuToMap && typeof skuToMap === 'string') {
            router.push(`/mapping?sku=${encodeURIComponent(skuToMap)}`);
        } else {
            router.push('/mapping'); 
        }
    };

    // --- Data Processing ---
    // NOTE: Client-side aggregation. For very large datasets (>5000 rows), this logic should move server-side.
    const groupedData = useMemo(() => {
        if (!apiData?.orders?.length) return []; // Short-circuit early

        const groups: Record<string, SkuGroup> = {};

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        // Pre-compute lowercase search query for performance
        const searchLower = searchQuery.toLowerCase();

        apiData.orders.forEach(order => {
            const sku = order["Supplier SKU"] || "Unknown";
            const pName = order["Product Name"] || "";
            const status = (order["Live Order Status"] || "").toLowerCase();
            const orderDateObj = parseOrderDate(order["Order Date"]);
            
            // Filters
            if (searchLower && !sku.toLowerCase().includes(searchLower) && !pName.toLowerCase().includes(searchLower)) return;
            if (start && orderDateObj < start) return;
            if (end && orderDateObj > end) return;

            let matchesStatus = true;
            if (statusFilter === 'delivered') matchesStatus = status.includes('delivered');
            else if (statusFilter === 'return') matchesStatus = status.includes('return');
            else if (statusFilter === 'rto') matchesStatus = status.includes('rto');
            else if (statusFilter === 'damaged') matchesStatus = order._isDamaged;
            if (!matchesStatus) return;

            const orderValue = parseFloat(String(order["Total Sale Amount (Incl. Shipping & GST)"] || 0)) || 0;
            const settlement = parseFloat(String(order["Final Settlement Amount"] || 0)) || 0;
            const returnShip = Math.abs(parseFloat(String(order["Return Shipping Charge (Incl. GST)"] || 0))) || 0;
            const profit = order.profit || 0;

            if (!groups[sku]) {
                groups[sku] = {
                    sku,
                    productName: pName,
                    totalOrders: 0,
                    needsMapping: false,
                    counts: { delivered: 0, return: 0, rto: 0, damaged: 0 },
                    financials: { orderValue: 0, actualPayoutSum: 0, returnShipping: 0, finalProfit: 0 },
                    orders: []
                };
            }

            if (order._needsMapping) {
                groups[sku].needsMapping = true;
            }

            groups[sku].totalOrders++;
            if (status.includes('delivered')) groups[sku].counts.delivered++;
            else if (status.includes('return')) groups[sku].counts.return++;
            else if (status.includes('rto')) groups[sku].counts.rto++;
            if (order._isDamaged) groups[sku].counts.damaged++;

            groups[sku].financials.orderValue += orderValue;
            groups[sku].financials.actualPayoutSum += settlement;
            groups[sku].financials.returnShipping += returnShip;
            groups[sku].financials.finalProfit += profit;
            groups[sku].orders.push(order);
        });

        return Object.values(groups);
    }, [apiData, searchQuery, statusFilter, startDate, endDate]); 

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

    const toggleRow = (sku: string) => setExpandedSku(expandedSku === sku ? null : sku);

    const handleDownloadCSV = () => {
        if (groupedData.length === 0) return;
        const headers = ["Catalog / SKU", "Filtered Orders", "Filtered Value (INR)", "Filtered Payout (INR)", "Return Shipping Fee (INR)", "Final Profit (INR)", "Margin %"];
        const rows = groupedData.map(item => {
            const f = item.financials;
            const margin = f.orderValue !== 0 ? ((f.finalProfit / f.orderValue) * 100) : 0;
            return [
                `"${item.sku.replace(/"/g, '""')}"`,
                item.totalOrders,
                f.orderValue.toFixed(2),
                f.actualPayoutSum.toFixed(2),
                f.returnShipping.toFixed(2),
                item.needsMapping ? "Needs Mapping" : f.finalProfit.toFixed(2),
                item.needsMapping ? "N/A" : margin.toFixed(2)
            ].join(",");
        });
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `profit_loss_filtered_${Date.now()}.csv`;
        link.click();
        
        // 3️⃣ FIX: Clean up memory leak
        setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    if (!selectedBusiness) return <div className="p-8 text-gray-500 text-center">Please select a business.</div>;

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6 font-sans relative animate-in fade-in duration-500">
            
            {/* --- Unmapped SKUs Modal --- */}
            {showMapModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-white">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Action Required</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    The following SKUs need mapping to calculate Profit & Loss accurately.
                                </p>
                            </div>
                            <button onClick={() => setShowMapModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 bg-white">
                            <ul className="divide-y divide-gray-100">
                                {unmappedSkus.map((sku, index) => (
                                    <li key={index} className="flex justify-between items-center px-6 py-4 hover:bg-gray-50 transition-colors">
                                        <span className="text-sm font-medium text-gray-700 truncate pr-4" title={sku}>{sku}</span>
                                        <button onClick={() => handleGoToMapping(sku)} className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md shadow-sm transition-colors">
                                            Map SKU
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50 text-right">
                            <button onClick={() => setShowMapModal(false)} className="text-sm text-gray-500 hover:text-gray-700 underline">
                                Close and View Partial Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Profit & Loss</h1>
                    <p className="text-sm text-gray-500 mt-1">Detailed financial breakdown by SKU.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={handleDownloadCSV} disabled={loading || groupedData.length === 0} className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors">
                        <Download className="h-4 w-4 mr-2 text-gray-500" /> CSV
                    </button>
                    <button onClick={fetchPLData} disabled={loading} className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors min-w-[100px]">
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />} 
                        {loading ? 'Refreshing' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* --- Stats Grid --- */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Net Amount" value={apiData?.stats?.totalNetOrderAmount} icon={IndianRupee} loading={loading} />
                <StatCard label="Total COGS" value={apiData?.stats?.totalCOGS} icon={TrendingDown} loading={loading} />
                <StatCard label="Net Profit" value={apiData?.stats?.totalProfit} highlight icon={TrendingUp} loading={loading} />
                <StatCard label="Net Margin" value={apiData?.stats?.profitMargin} isPercent highlight icon={PieChart} loading={loading} />
            </dl>

            {/* --- Filters --- */}
            <div className="flex flex-col xl:flex-row gap-4 xl:items-end bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="w-full xl:flex-1">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">Search SKU</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-4 w-4 text-gray-400" /></div>
                        <input type="text" className="block w-full rounded-lg border-gray-300 pl-10 text-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 text-gray-900 transition-shadow focus:shadow-sm" placeholder="Enter SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>
                
                <div className="w-full sm:w-1/2 xl:w-48">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">Order Status</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Filter className="h-4 w-4 text-gray-400" /></div>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block w-full rounded-lg border-gray-300 pl-10 text-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 text-gray-900 bg-white appearance-none transition-shadow focus:shadow-sm">
                            <option value="all">All Orders</option>
                            <option value="delivered">Delivered Only</option>
                            <option value="return">Returns</option>
                            <option value="rto">RTO</option>
                            <option value="damaged">Damaged</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 h-full w-8 text-gray-400" size={16} />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <div className="w-full sm:w-1/2 xl:w-40">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">Start Date</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Calendar className="h-4 w-4 text-gray-400" /></div>
                            <input type="date" className="block w-full rounded-lg border-gray-300 pl-10 text-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 text-gray-900 transition-shadow focus:shadow-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="w-full sm:w-1/2 xl:w-40">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">End Date</label>
                        <div className="relative">
                            <input type="date" className="block w-full rounded-lg border-gray-300 pl-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 text-gray-900 transition-shadow focus:shadow-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                {(searchQuery || statusFilter !== 'all' || startDate || endDate) && (
                    <button onClick={() => { setSearchQuery(""); setStatusFilter("all"); setStartDate(""); setEndDate(""); }} className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-red-200 shadow-sm text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors h-[42px]">
                        <X className="h-4 w-4 mr-1.5" /> Clear
                    </button>
                )}
            </div>

            {/* --- Main Table --- */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Catalog / SKU</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Order Details</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Order Value</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Order Payout</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Return Ship</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Net Profit</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Margin</th>
                                <th scope="col" className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                Array.from({ length: 10 }).map((_, index) => (
                                    <tr key={index} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-32 bg-gray-200 rounded mb-1"></div>
                                            <div className="h-3 w-48 bg-gray-100 rounded"></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-20 bg-gray-200 rounded mb-1"></div>
                                            <div className="h-3 w-24 bg-gray-100 rounded"></div>
                                        </td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-16 bg-gray-200 rounded ml-auto"></div></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-16 bg-gray-200 rounded ml-auto"></div></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-12 bg-gray-200 rounded ml-auto"></div></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-14 bg-gray-200 rounded ml-auto"></div></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 w-10 bg-gray-200 rounded ml-auto"></div></td>
                                        <td className="px-6 py-4"><div className="h-5 w-5 bg-gray-100 rounded-full ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : groupedData.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-20 text-center text-sm text-gray-500">No data matches your filters.</td></tr>
                            ) : groupedData.map((item) => (
                                <React.Fragment key={item.sku}>
                                    <tr onClick={() => toggleRow(item.sku)} className={`cursor-pointer transition-colors duration-150 hover:bg-indigo-50/50 ${expandedSku === item.sku ? 'bg-indigo-50/80' : ''}`}>
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <div className="text-sm font-bold text-gray-900 truncate" title={item.sku}>{item.sku}</div>
                                            <div className="text-sm text-gray-500 truncate" title={item.productName}>{item.productName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                            {statusFilter === 'all' && !startDate && !endDate ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold text-gray-800">{item.totalOrders} Total</span>
                                                    <span className="text-xs text-gray-500 flex gap-2">
                                                        <span className="text-green-600">{item.counts.delivered} Del</span>
                                                        <span className="text-orange-600">{item.counts.return} Ret</span>
                                                        {item.counts.rto > 0 && <span className="text-red-600">{item.counts.rto} RTO</span>}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                    {item.totalOrders} Filtered
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-900 font-mono font-medium whitespace-nowrap">
                                            {formatCurrency(item.financials.orderValue)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 font-mono whitespace-nowrap">
                                            {formatCurrency(item.financials.actualPayoutSum)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-orange-600 font-mono whitespace-nowrap">
                                            {formatCurrency(item.financials.returnShipping)}
                                        </td>
                                        <td className={`px-6 py-4 text-right text-sm font-mono font-bold whitespace-nowrap ${item.financials.finalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.needsMapping ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleGoToMapping(item.sku); }}
                                                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none"
                                                >
                                                    Map NOW
                                                </button>
                                            ) : (
                                                formatCurrency(item.financials.finalProfit)
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                                            {item.needsMapping ? (
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-500">--</span>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.financials.finalProfit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                    {item.financials.orderValue !== 0 
                                                        ? ((item.financials.finalProfit / item.financials.orderValue) * 100).toFixed(1) 
                                                        : '0.0'}%
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            {expandedSku === item.sku ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-400" />}
                                        </td>
                                    </tr>

                                    {/* --- Expanded Sub-Table --- */}
                                    {expandedSku === item.sku && (
                                        <tr className="animate-in fade-in slide-in-from-top-1 duration-200">
                                            <td colSpan={8} className="px-0 py-0 bg-gray-50/50 border-b border-gray-200">
                                                <div className="py-4 px-4 sm:px-8 overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white shadow-sm">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Sub Order</th>
                                                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Date</th>
                                                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Status</th>
                                                                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Payout</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {item.orders.map((sub, idx) => {
                                                                let statusColor = "bg-gray-100 text-gray-600";
                                                                const status = (sub["Live Order Status"] || "").toLowerCase();
                                                                if(status.includes('delivered')) statusColor = "bg-green-100 text-green-700";
                                                                else if(status.includes('return')) statusColor = "bg-orange-100 text-orange-700";
                                                                else if(status.includes('rto')) statusColor = "bg-red-100 text-red-700";

                                                                return (
                                                                    <tr key={idx} className="hover:bg-gray-50">
                                                                        <td className="px-4 py-2 text-xs font-mono text-gray-600 font-medium whitespace-nowrap">{sub["Sub Order No"]}</td>
                                                                        <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{sub["Order Date"]}</td>
                                                                        <td className="px-4 py-2 text-center whitespace-nowrap">
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>{sub["Live Order Status"]}</span>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-xs text-right font-bold text-gray-900 font-mono whitespace-nowrap">
                                                                            {parseFloat(String(sub["Final Settlement Amount"] || 0)).toFixed(2)}
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- Stat Card Component ---
const StatCard = ({ label, value, isPercent, highlight, icon: Icon, loading }: StatCardProps) => {
    const numVal = typeof value === 'string' ? parseFloat(value) : (value || 0);
    
    let formattedValue = "";
    if (loading || value === undefined || value === null) {
        formattedValue = "...";
    } else if (isPercent) {
        formattedValue = typeof value === 'string' ? value : `${numVal}%`; 
    } else {
        formattedValue = new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR', 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(numVal);
    }
    
    let valueColor = "text-gray-900";
    if (!loading && highlight) {
        valueColor = numVal >= 0 ? "text-green-600" : "text-red-600";
    }

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
                <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
                {Icon && <Icon className={`h-5 w-5 ${!loading && highlight ? (numVal >= 0 ? 'text-green-500' : 'text-red-500') : 'text-gray-400'}`} />}
            </div>
            <dd className={`text-2xl sm:text-3xl font-bold tracking-tight ${valueColor}`}>
                {loading ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                    formattedValue
                )}
            </dd>
        </div>
    );
};