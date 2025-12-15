"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useBusiness, api } from '../../../providers/GlobalProvider';
import { RefreshCw, ChevronRight, ChevronDown, AlertCircle, Download } from 'lucide-react';

// --- Types ---
interface MatchedOrder {
    "Sub Order No": string;
    "Supplier SKU": string;
    "Live Order Status": string;
    "Order Date": string;
    "Product Name": string;
    
    // --- Fields for Main Table & CSV ---
    "Final Settlement Amount": string | number;
    "Total Sale Amount (Incl. Shipping & GST)": string | number;
    
    // --- Fields for Expanded View ---
    "Compensation"?: string | number;
    "Claims"?: string | number;
    "Recovery"?: string | number;
    "Return Shipping Charge (Incl. GST)"?: string | number;
    
    // Fee Columns for Platform Fee Calculation
    "Meesho Commission (Incl. GST)"?: string | number;
    "Fixed Fee (Incl. GST)"?: string | number;
    "Shipping Charge (Incl. GST)"?: string | number;
    "TCS"?: string | number;
    "TDS"?: string | number;

    // Backend Calculated
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
        finalPayout: number; // Sum of Profit
        actualPayoutSum: number; // Sum of Settlements
    };
    orders: MatchedOrder[];
}

export default function PLSummary() {
    const { selectedBusiness } = useBusiness();
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [apiData, setApiData] = useState<APIResponse | null>(null);
    const [expandedSku, setExpandedSku] = useState<string | null>(null);

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

    useEffect(() => {
        fetchPLData();
    }, [selectedBusiness]);

    // --- Data Processing ---
    const groupedData = useMemo(() => {
        if (!apiData?.orders) return [];
        const groups: Record<string, SkuGroup> = {};

        apiData.orders.forEach(order => {
            const sku = order["Supplier SKU"] || "Unknown";
            const status = (order["Live Order Status"] || "").toLowerCase();
            
            const orderValue = parseFloat(String(order["Total Sale Amount (Incl. Shipping & GST)"] || 0)) || 0;
            const settlement = parseFloat(String(order["Final Settlement Amount"] || 0)) || 0;
            const returnShip = Math.abs(parseFloat(String(order["Return Shipping Charge (Incl. GST)"] || 0))) || 0;
            const profit = order.profit || 0;

            if (!groups[sku]) {
                groups[sku] = {
                    sku,
                    productName: order["Product Name"] || "",
                    totalOrders: 0,
                    counts: { delivered: 0, return: 0, rto: 0, damaged: 0 },
                    financials: { 
                        orderValue: 0, 
                        orderPayout: 0, 
                        returnShipping: 0, 
                        finalPayout: 0,
                        actualPayoutSum: 0
                    },
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
    }, [apiData]);

   // Inside PLSummary component

const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        minimumFractionDigits: 2, // Enforce 2 decimals
        maximumFractionDigits: 2  // Limit to 2 decimals
    }).format(val);

    const toggleRow = (sku: string) => setExpandedSku(expandedSku === sku ? null : sku);

    // --- CSV Download ---
    const handleDownloadCSV = () => {
        if (groupedData.length === 0) return;

        const headers = [
            "Catalog / SKU", "Total Orders", "Delivered", "Returned", "RTO", 
            "Order Value (INR)", "Order Payout (INR)", "Return Shipping Fee (INR)", 
            "Final Profit (INR)", "Margin %"
        ];

        const rows = groupedData.map(item => {
            const f = item.financials;
            const margin = f.orderValue !== 0 ? ((f.finalPayout / f.orderValue) * 100) : 0;

            return [
                `"${item.sku.replace(/"/g, '""')}"`,
                item.totalOrders,
                item.counts.delivered,
                item.counts.return,
                item.counts.rto,
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
        link.setAttribute("href", url);
        link.setAttribute("download", `profit_loss_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!selectedBusiness) return <div className="p-8 text-gray-500">Please select a business.</div>;

    return (
        <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-8 font-sans">
            
            {/* --- Header --- */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Profit & Loss</h1>
                    <p className="text-sm text-gray-500 mt-1">Detailed financial breakdown by SKU.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleDownloadCSV}
                        disabled={groupedData.length === 0}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <Download className="h-4 w-4 mr-2 text-gray-500" />
                        Download CSV
                    </button>
                    <button 
                        onClick={fetchPLData} 
                        disabled={loading} 
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                            <div className="mt-2 text-sm text-red-700">{error}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Stats Grid --- */}
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-4">
                <StatCard 
                    label="Total Net Amount" 
                    value={apiData?.stats?.totalNetOrderAmount || 0} 
                />
                <StatCard 
                    label="Total Expenses" 
                    value={apiData?.stats?.totalCOGS || 0} 
                />
                <StatCard 
                    label="Net Profit" 
                    value={apiData?.stats?.totalProfit || 0} 
                    highlight 
                />
                <StatCard 
                    label="Net Margin" 
                    value={apiData?.stats?.profitMargin || "0%"} 
                    isPercent 
                    highlight 
                />
            </dl>

            {/* --- Main Table --- */}
            <div className="flex flex-col">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catalog / SKU</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Details</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Order Value (₹)</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Order Payout (₹)</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Return Ship Fee</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Final Payout (Profit)</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Expand</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">Loading data...</td></tr>
                                    ) : groupedData.map((item) => (
                                        <React.Fragment key={item.sku}>
                                            <tr 
                                                onClick={() => toggleRow(item.sku)}
                                                className={`cursor-pointer hover:bg-gray-50 transition-colors ${expandedSku === item.sku ? 'bg-gray-50' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-gray-900">{item.sku}</div>
                                                    <div className="text-sm text-gray-500 truncate max-w-xs">{item.productName}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-medium text-gray-900">{item.totalOrders} Total</span>
                                                        <span className="text-xs">
                                                            {item.counts.delivered} Del • {item.counts.return} Ret • {item.counts.rto} RTO
                                                            {item.counts.damaged > 0 && <span className="text-red-600 font-medium ml-1">• {item.counts.damaged} Dmg</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm text-gray-900 font-mono">
                                                    {formatCurrency(item.financials.orderValue)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm text-gray-500 font-mono">
                                                    {formatCurrency(item.financials.actualPayoutSum)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm text-orange-600 font-mono">
                                                    {formatCurrency(item.financials.returnShipping)}
                                                </td>
                                                <td className={`px-6 py-4 text-right text-sm font-mono font-bold ${item.financials.finalPayout >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(item.financials.finalPayout)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm text-gray-500">
                                                    {item.financials.orderValue !== 0 
                                                        ? ((item.financials.finalPayout / item.financials.orderValue) * 100).toFixed(1) 
                                                        : '0.0'}%
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-medium">
                                                    {expandedSku === item.sku ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                                                </td>
                                            </tr>

                                            {/* --- Expanded Sub-Table --- */}
                                            {expandedSku === item.sku && (
                                                <tr>
                                                    <td colSpan={8} className="px-0 py-0 bg-gray-50 border-b border-gray-200">
                                                        <div className="py-3 px-6">
                                                            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md bg-white">
                                                                <thead className="bg-gray-100">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Sub Order</th>
                                                                        <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Status</th>
                                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Order Value (₹)</th>
                                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Platform Fees (₹)</th>
                                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Comp (₹)</th>
                                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Claims (₹)</th>
                                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Recovery (₹)</th>
                                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Return Ship (₹)</th>
                                                                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Final Payout (₹)</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-200">
                                                                    {item.orders.map((sub, idx) => {
                                                                        // 1. Order Value
                                                                        const val = parseFloat(String(sub["Total Sale Amount (Incl. Shipping & GST)"] || 0)) || 0;
                                                                        // 2. Final Payout (Settlement)
                                                                        const pay = parseFloat(String(sub["Final Settlement Amount"] || 0)) || 0;
                                                                        // 3. Components
                                                                        const comp = parseFloat(String(sub["Compensation"] || 0)) || 0;
                                                                        const claims = parseFloat(String(sub["Claims"] || 0)) || 0;
                                                                        const recovery = parseFloat(String(sub["Recovery"] || 0)) || 0;
                                                                        const retShip = parseFloat(String(sub["Return Shipping Charge (Incl. GST)"] || 0)) || 0;

                                                                        // 4. Platform Fees Calculation (Sum of specific fee columns)
                                                                        const comm = parseFloat(String(sub["Meesho Commission (Incl. GST)"] || 0)) || 0;
                                                                        const fixed = parseFloat(String(sub["Fixed Fee (Incl. GST)"] || 0)) || 0;
                                                                        const ship = parseFloat(String(sub["Shipping Charge (Incl. GST)"] || 0)) || 0;
                                                                        const tcs = parseFloat(String(sub["TCS"] || 0)) || 0;
                                                                        const tds = parseFloat(String(sub["TDS"] || 0)) || 0;
                                                                        
                                                                        // Platform Fees is usually negative in the sheet, so we sum them
                                                                        const platFees = comm + fixed + ship + tcs + tds;

                                                                        const status = (sub["Live Order Status"] || "").toLowerCase();
                                                                        let statusColor = "text-gray-600";
                                                                        if(status.includes('delivered')) statusColor = "text-green-600";
                                                                        else if(status.includes('return')) statusColor = "text-orange-600";
                                                                        else if(status.includes('rto')) statusColor = "text-red-600";

                                                                        return (
                                                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                                                <td className="px-4 py-2 text-xs font-mono text-gray-600">{sub["Sub Order No"]}</td>
                                                                                <td className={`px-4 py-2 text-xs text-center font-bold uppercase ${statusColor}`}>
                                                                                    {sub["Live Order Status"]}
                                                                                </td>
                                                                                <td className="px-4 py-2 text-xs text-right text-gray-900">{val.toFixed(2)}</td>
                                                                                <td className="px-4 py-2 text-xs text-right text-red-500">{platFees.toFixed(2)}</td>
                                                                                <td className="px-4 py-2 text-xs text-right text-green-600">{comp !== 0 ? comp.toFixed(2) : '-'}</td>
                                                                                <td className="px-4 py-2 text-xs text-right text-red-600">{claims !== 0 ? claims.toFixed(2) : '-'}</td>
                                                                                <td className="px-4 py-2 text-xs text-right text-orange-600">{recovery !== 0 ? recovery.toFixed(2) : '-'}</td>
                                                                                <td className="px-4 py-2 text-xs text-right text-red-500">{retShip !== 0 ? retShip.toFixed(2) : '-'}</td>
                                                                                <td className="px-4 py-2 text-xs text-right font-bold text-gray-900">{pay.toFixed(2)}</td>
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
            </div>
        </div>
    );
}

// --- Stat Card Component ---
// --- Stat Card Component ---
const StatCard = ({ label, value, isPercent, highlight }: any) => {
    // Determine the raw numeric value for coloring logic
    const numVal = typeof value === 'string' ? parseFloat(value) : value;

    let formattedValue = "";

    if (isPercent) {
        // If it's a percentage, show it as is or with 2 decimals
        formattedValue = value; 
    } else {
        // For currency, use the exact 2-decimal formatter
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
        <div className="px-5 py-5 bg-white shadow rounded-lg overflow-hidden border border-gray-200">
            <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
            <dd className={`mt-1 text-3xl font-semibold ${valueColor}`}>
                {formattedValue}
            </dd>
        </div>
    );
};