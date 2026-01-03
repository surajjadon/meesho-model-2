"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useBusiness, api } from '../../../providers/GlobalProvider';
import { 
    RefreshCw, 
    ChevronRight, 
    ChevronDown, 
    Download, 
    Search, 
    Filter, 
    X, 
    Calendar,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart
} from 'lucide-react';

// --- Types ---
interface MatchedOrder {
    "Sub Order No": string;
    "Supplier SKU": string;
    "Live Order Status": string;
    "Order Date": string;
    "Product Name": string;
    "Final Settlement Amount": string | number;
    "Total Sale Amount (Incl. Shipping & GST)": string | number;
    "Compensation"?: string | number;
    "Claims"?: string | number;
    "Recovery"?: string | number;
    "Return Shipping Charge (Incl. GST)"?: string | number;
    "Meesho Commission (Incl. GST)"?: string | number;
    "Fixed Fee (Incl. GST)"?: string | number;
    "Shipping Charge (Incl. GST)"?: string | number;
    "TCS"?: string | number;
    "TDS"?: string | number;
    costPrice: number;
    packagingCost: number;
    profit: number;
    marginPercent: string;
    _isDamaged: boolean;
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
}

interface SkuGroup {
    sku: string;
    productName: string;
    totalOrders: number;
    counts: {
        delivered: number;
        return: number;
        rto: number;
        damaged: number;
    };
    financials: {
        orderValue: number;      
        orderPayout: number;     
        returnShipping: number;  
        finalPayout: number; 
        actualPayoutSum: number; 
    };
    orders: MatchedOrder[];
}

export default function PLSummary() {
    const { selectedBusiness } = useBusiness();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [apiData, setApiData] = useState<APIResponse | null>(null);
    const [expandedSku, setExpandedSku] = useState<string | null>(null);

    // --- Filters ---
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); 
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // --- Helper: Parse Date String ---
    const parseOrderDate = (dateStr: string) => {
        if (!dateStr) return new Date(0); 
        if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
            const parts = dateStr.split('-');
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return new Date(dateStr);
    };

    // --- Fetch Logic ---
    const fetchPLData = async () => {
        if (!selectedBusiness) return;
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/pl/matched-orders', {
                params: { gstin: selectedBusiness.gstin }
            });
            setApiData(data);
        } catch (err: any) {
            console.error("Error fetching P&L:", err);
            setError("Failed to load financial data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPLData(); }, [selectedBusiness]);

    // --- Data Processing ---
    const groupedData = useMemo(() => {
        if (!apiData?.orders) return [];
        const groups: Record<string, SkuGroup> = {};

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        apiData.orders.forEach(order => {
            const sku = order["Supplier SKU"] || "Unknown";
            const pName = order["Product Name"] || "";
            const status = (order["Live Order Status"] || "").toLowerCase();
            const orderDateObj = parseOrderDate(order["Order Date"]);
            
            // Filters
            const matchesSearch = sku.toLowerCase().includes(searchQuery.toLowerCase()) || pName.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return;
            if (start && orderDateObj < start) return;
            if (end && orderDateObj > end) return;

            let matchesStatus = true;
            if (statusFilter === 'delivered') matchesStatus = status.includes('delivered');
            else if (statusFilter === 'return') matchesStatus = status.includes('return');
            else if (statusFilter === 'rto') matchesStatus = status.includes('rto');
            else if (statusFilter === 'damaged') matchesStatus = order._isDamaged;
            if (!matchesStatus) return;

            // Aggregation
            const orderValue = parseFloat(String(order["Total Sale Amount (Incl. Shipping & GST)"] || 0)) || 0;
            const settlement = parseFloat(String(order["Final Settlement Amount"] || 0)) || 0;
            const returnShip = Math.abs(parseFloat(String(order["Return Shipping Charge (Incl. GST)"] || 0))) || 0;
            const profit = order.profit || 0;

            if (!groups[sku]) {
                groups[sku] = {
                    sku,
                    productName: pName,
                    totalOrders: 0,
                    counts: { delivered: 0, return: 0, rto: 0, damaged: 0 },
                    financials: { orderValue: 0, orderPayout: 0, returnShipping: 0, finalPayout: 0, actualPayoutSum: 0 },
                    orders: []
                };
            }

            groups[sku].totalOrders++;
            if (status.includes('delivered')) groups[sku].counts.delivered++;
            else if (status.includes('return')) groups[sku].counts.return++;
            else if (status.includes('rto')) groups[sku].counts.rto++;
            if (order._isDamaged) groups[sku].counts.damaged++;

            groups[sku].financials.orderValue += orderValue;
            groups[sku].financials.actualPayoutSum += settlement;
            groups[sku].financials.returnShipping += returnShip;
            groups[sku].financials.finalPayout += profit;
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
            const margin = f.orderValue !== 0 ? ((f.finalPayout / f.orderValue) * 100) : 0;
            return [
                `"${item.sku.replace(/"/g, '""')}"`,
                item.totalOrders,
                f.orderValue.toFixed(2),
                f.actualPayoutSum.toFixed(2),
                f.returnShipping.toFixed(2),
                f.finalPayout.toFixed(2),
                margin.toFixed(2)
            ].join(",");
        });
        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `profit_loss_filtered_${Date.now()}.csv`;
        link.click();
    };

    if (!selectedBusiness) return <div className="p-8 text-gray-500 text-center">Please select a business.</div>;

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6 font-sans">
            
            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Profit & Loss</h1>
                    <p className="text-sm text-gray-500 mt-1">Detailed financial breakdown by SKU.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleDownloadCSV}
                        disabled={groupedData.length === 0}
                        className="cursor-pointer flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <Download className="h-4 w-4 mr-2 text-gray-500" />
                        CSV
                    </button>
                    <button 
                        onClick={fetchPLData} 
                        disabled={loading} 
                        className="cursor-pointer flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* --- Stats Grid --- */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Total Net Amount" 
                    value={apiData?.stats?.totalNetOrderAmount || 0} 
                    icon={DollarSign}
                />
                <StatCard 
                    label="Total COGS" 
                    value={apiData?.stats?.totalCOGS || 0} 
                    icon={TrendingDown}
                />
                <StatCard 
                    label="Net Profit" 
                    value={apiData?.stats?.totalProfit || 0} 
                    highlight 
                    icon={TrendingUp}
                />
                <StatCard 
                    label="Net Margin" 
                    value={apiData?.stats?.profitMargin || "0%"} 
                    isPercent 
                    highlight 
                    icon={PieChart}
                />
            </dl>

            {/* --- Responsive Filters Bar --- */}
            <div className="flex flex-col xl:flex-row gap-4 xl:items-end bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                {/* Search */}
                <div className="w-full xl:flex-1">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">Search SKU</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full rounded-lg border-gray-300 pl-10 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 py-2.5 text-gray-900 placeholder-gray-400 transition-shadow"
                            placeholder="Enter SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                
                {/* Status Filter */}
                <div className="w-full sm:w-1/2 xl:w-48">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">Order Status</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Filter className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="cursor-pointer block w-full rounded-lg border-gray-300 pl-10 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 py-2.5 text-gray-900 bg-white appearance-none"
                        >
                            <option value="all">All Orders</option>
                            <option value="delivered">Delivered Only</option>
                            <option value="return">Returns</option>
                            <option value="rto">RTO</option>
                            <option value="damaged">Damaged</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 h-full w-8 text-gray-400" size={16} />
                    </div>
                </div>

                {/* Date Filter */}
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <div className="w-full sm:w-1/2 xl:w-40">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">Start Date</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Calendar className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="date"
                                className="cursor-pointer block w-full rounded-lg border-gray-300 pl-10 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 py-2.5 text-gray-900"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-1/2 xl:w-40">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 ml-1">End Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                className="cursor-pointer block w-full rounded-lg border-gray-300 pl-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 py-2.5 text-gray-900"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Reset Button */}
                {(searchQuery || statusFilter !== 'all' || startDate || endDate) && (
                    <button
                        onClick={() => { setSearchQuery(""); setStatusFilter("all"); setStartDate(""); setEndDate(""); }}
                        className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-red-200 shadow-sm text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors h-[42px]"
                    >
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
                                <tr><td colSpan={8} className="px-6 py-20 text-center text-sm text-gray-500 italic">Loading financial data...</td></tr>
                            ) : groupedData.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-20 text-center text-sm text-gray-500">No data matches your filters.</td></tr>
                            ) : groupedData.map((item) => (
                                <React.Fragment key={item.sku}>
                                    <tr 
                                        onClick={() => toggleRow(item.sku)}
                                        className={`cursor-pointer transition-colors duration-150 hover:bg-indigo-50/50 ${expandedSku === item.sku ? 'bg-indigo-50/80' : ''}`}
                                    >
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <div className="text-sm font-bold text-gray-900 truncate">{item.sku}</div>
                                            <div className="text-sm text-gray-500 truncate">{item.productName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                            {statusFilter === 'all' && !startDate && !endDate ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-semibold text-gray-800">{item.totalOrders} Total</span>
                                                    <span className="text-xs text-gray-500 flex gap-2">
                                                        <span>{item.counts.delivered} Del</span>
                                                        <span>{item.counts.return} Ret</span>
                                                        {item.counts.damaged > 0 && <span className="text-red-600 font-bold">{item.counts.damaged} Dmg</span>}
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
                                        <td className={`px-6 py-4 text-right text-sm font-mono font-bold whitespace-nowrap ${item.financials.finalPayout >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(item.financials.finalPayout)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.financials.finalPayout >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {item.financials.orderValue !== 0 
                                                    ? ((item.financials.finalPayout / item.financials.orderValue) * 100).toFixed(1) 
                                                    : '0.0'}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            {expandedSku === item.sku ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-400" />}
                                        </td>
                                    </tr>

                                    {/* --- Expanded Sub-Table --- */}
                                    {expandedSku === item.sku && (
                                        <tr>
                                            <td colSpan={8} className="px-0 py-0 bg-gray-50/50 border-b border-gray-200">
                                                <div className="py-4 px-4 sm:px-8 overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white shadow-sm">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Sub Order</th>
                                                                <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Date</th>
                                                                <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Status</th>
                                                                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Order Val</th>
                                                                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Fees</th>
                                                                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Comp</th>
                                                                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Claims</th>
                                                                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Recovery</th>
                                                                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Ret. Ship</th>
                                                                <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Payout</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {item.orders.map((sub, idx) => {
                                                                const val = parseFloat(String(sub["Total Sale Amount (Incl. Shipping & GST)"] || 0)) || 0;
                                                                const pay = parseFloat(String(sub["Final Settlement Amount"] || 0)) || 0;
                                                                const comp = parseFloat(String(sub["Compensation"] || 0)) || 0;
                                                                const claims = parseFloat(String(sub["Claims"] || 0)) || 0;
                                                                const recovery = parseFloat(String(sub["Recovery"] || 0)) || 0;
                                                                const retShip = parseFloat(String(sub["Return Shipping Charge (Incl. GST)"] || 0)) || 0;
                                                                const fees = (parseFloat(String(sub["Meesho Commission (Incl. GST)"] || 0)) || 0) + 
                                                                             (parseFloat(String(sub["Fixed Fee (Incl. GST)"] || 0)) || 0) +
                                                                             (parseFloat(String(sub["Shipping Charge (Incl. GST)"] || 0)) || 0) +
                                                                             (parseFloat(String(sub["TCS"] || 0)) || 0) +
                                                                             (parseFloat(String(sub["TDS"] || 0)) || 0);

                                                                const status = (sub["Live Order Status"] || "").toLowerCase();
                                                                let statusColor = "bg-gray-100 text-gray-600";
                                                                if(status.includes('delivered')) statusColor = "bg-green-100 text-green-700";
                                                                else if(status.includes('return')) statusColor = "bg-orange-100 text-orange-700";
                                                                else if(status.includes('rto')) statusColor = "bg-red-100 text-red-700";

                                                                return (
                                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                                        <td className="px-4 py-2 text-xs font-mono text-gray-600 font-medium whitespace-nowrap">{sub["Sub Order No"]}</td>
                                                                        <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{sub["Order Date"]}</td>
                                                                        <td className="px-4 py-2 text-center whitespace-nowrap">
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>
                                                                                {sub["Live Order Status"]}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-xs text-right text-gray-900 font-mono whitespace-nowrap">{val.toFixed(2)}</td>
                                                                        <td className="px-4 py-2 text-xs text-right text-red-500 font-mono whitespace-nowrap">{fees.toFixed(2)}</td>
                                                                        <td className="px-4 py-2 text-xs text-right text-green-600 font-mono whitespace-nowrap">{comp !== 0 ? comp.toFixed(2) : '-'}</td>
                                                                        <td className="px-4 py-2 text-xs text-right text-red-600 font-mono whitespace-nowrap">{claims !== 0 ? claims.toFixed(2) : '-'}</td>
                                                                        <td className="px-4 py-2 text-xs text-right text-orange-600 font-mono whitespace-nowrap">{recovery !== 0 ? recovery.toFixed(2) : '-'}</td>
                                                                        <td className="px-4 py-2 text-xs text-right text-red-500 font-mono whitespace-nowrap">{retShip !== 0 ? retShip.toFixed(2) : '-'}</td>
                                                                        <td className="px-4 py-2 text-xs text-right font-bold text-gray-900 font-mono whitespace-nowrap">{pay.toFixed(2)}</td>
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

// --- Stat Card Component (Updated Design) ---
const StatCard = ({ label, value, isPercent, highlight, icon: Icon }: any) => {
    const numVal = typeof value === 'string' ? parseFloat(value) : value;
    let formattedValue = "";

    if (isPercent) {
        formattedValue = value; 
    } else {
        formattedValue = new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR', 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }).format(numVal);
    }
    
    let valueColor = "text-gray-900";
    if (highlight) {
        valueColor = numVal >= 0 ? "text-green-600" : "text-red-600";
    }

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
                <dt className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
                {Icon && <Icon className={`h-5 w-5 ${highlight ? (numVal >= 0 ? 'text-green-500' : 'text-red-500') : 'text-gray-400'}`} />}
            </div>
            <dd className={`text-2xl sm:text-3xl font-bold tracking-tight ${valueColor}`}>
                {formattedValue}
            </dd>
        </div>
    );
};