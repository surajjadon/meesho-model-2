"use client";

import React, { useEffect, useState } from 'react';
import { useBusiness, api } from '../../../providers/GlobalProvider';
import { ShoppingCart, ListChecks, BarChart3, Banknote, RefreshCw, Filter, XCircle } from 'lucide-react';
import ProtectRoute from "@/components/ProtectRoute";
// --- UPDATED Interfaces to match new OrderData model ---
interface Product {
  sku?: string;
  size?: string;
  quantity?: number;
  color?: string;
  orderNo?: string;
}

interface Order {
  _id: string;
  purchaseOrderNo?: string;
  invoiceNo?: string;
  products: Product[];
  inventoryProcessed: boolean;
  createdAt: string;
  deliveryPartner?: string;
}

interface TopSku {
    sku: string;
    count: number;
}

interface Stats {
  totalOrders: number;
  pendingCount: number;
  pendingValue: number;
  topSkus: TopSku[];
}

// Helper to get the start and end of the current month
const getInitialDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        from: startOfMonth.toISOString().split('T')[0],
        to: endOfMonth.toISOString().split('T')[0],
    };
};

export default function OrdersPage() {
  const { selectedBusiness, loading: businessLoading } = useBusiness();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, pendingCount: 0, pendingValue: 0, topSkus: [] });
  
  // State for date inputs (staging) and applied filters (for fetching)
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [appliedFilters, setAppliedFilters] = useState(getInitialDateRange);

  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [processMessage, setProcessMessage] = useState("");

  const fetchOrders = async () => {
    if (selectedBusiness) {
      setLoading(true); setError(""); setProcessMessage("");
      try {
        const params = { 
            gstin: selectedBusiness.gstin,
            // Use the applied filters for the API call
            fromDate: appliedFilters.from,
            toDate: appliedFilters.to
        };
        const res = await api.get('/orders', { params });
        console.log(params);
        setOrders(res.data.orders);
        setStats(res.data.stats);
      } catch (err) { 
        setError("Failed to fetch orders."); 
        setOrders([]);
        setStats({ totalOrders: 0, pendingCount: 0, pendingValue: 0, topSkus: [] });
      } finally { 
        setLoading(false); 
      }
    } else {
      setOrders([]); 
      setStats({ totalOrders: 0, pendingCount: 0, pendingValue: 0, topSkus: [] });
    }
  };

  // Refetch only when business or applied filters change
  useEffect(() => {
    fetchOrders();
  }, [selectedBusiness, appliedFilters]);

  const handleProcessInventory = async () => {
    if (!selectedBusiness) return;
    setIsProcessing(true);
    setProcessMessage("Updating inventory for all pending orders...");
    try {
      const res = await api.post('/orders/process-inventory', { gstin: selectedBusiness.gstin });
      setProcessMessage(`✅ ${res.data.message}. Refreshed order list.`);
      fetchOrders(); // Refetch data to update stats and list
    } catch (err: any) {
      setProcessMessage(`❌ Error: ${err.response?.data?.message || 'Failed to process inventory.'}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleFilter = () => {
    setAppliedFilters(dateRange);
  };

  const handleReset = () => {
    const initialRange = getInitialDateRange();
    setDateRange(initialRange);
    setAppliedFilters(initialRange);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatCurrency = (value: number) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

  // ✅ Helper to get order ID
  const getOrderId = (order: Order) => {
    return order.purchaseOrderNo || order.invoiceNo || order.products[0]?.orderNo || 'N/A';
  };

  // ✅ Helper to get SKUs from products
  const getSkuList = (order: Order) => {
    return order.products.map(p => p.sku).filter(Boolean).join(', ') || 'N/A';
  };

  // ✅ Helper to get total quantity
  const getTotalQuantity = (order: Order) => {
    return order.products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  };

  if (businessLoading) return <div className="p-6">Loading business data...</div>;
  if (!selectedBusiness) return <div className="p-6 bg-yellow-100 text-yellow-800 rounded-md">Please select a business to view its orders.</div>;

  return (
    <ProtectRoute permission="cropper">
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Order Dashboard</h1>
      {processMessage && <p className="text-sm font-medium">{processMessage}</p>}

      {/* Horizontal Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <label htmlFor="from" className="text-sm font-medium text-slate-600">From</label>
                <input type="date" name="from" id="from" value={dateRange.from} onChange={handleDateChange} className="p-2 border border-slate-300 rounded-md text-sm"/>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="to" className="text-sm font-medium text-slate-600">To</label>
                <input type="date" name="to" id="to" value={dateRange.to} onChange={handleDateChange} className="p-2 border border-slate-300 rounded-md text-sm"/>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleFilter} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                <Filter size={16} />
                Filter
            </button>
            <button onClick={handleReset} title="Reset to current month" className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                <XCircle size={16} />
            </button>
        </div>
      </div>

      {/* Two-Column Layout for Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4"><div className="p-3 bg-blue-100 rounded-lg"><ShoppingCart size={24} className="text-blue-600"/></div><div><p className="text-sm text-slate-500">Total Orders</p><p className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalOrders}</p></div></div>
            <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4"><div className="p-3 bg-red-100 rounded-lg"><Banknote size={24} className="text-red-600"/></div><div><p className="text-sm text-slate-500">Total Pending Value</p><p className="text-2xl font-bold text-red-600">{loading ? '...' : formatCurrency(stats.pendingValue)}</p></div></div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
            {/* Top SKUs Card */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg"><BarChart3 size={24} className="text-purple-600"/></div>
                    <h3 className="text-lg font-bold text-slate-800">Top SKUs</h3>
                </div>
                {loading ? <p className="text-sm text-slate-500">Loading...</p> : stats.topSkus.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                        {stats.topSkus.map(item => (
                            <li key={item.sku} className="flex justify-between items-center">
                                <span className="font-mono text-slate-700 truncate pr-2" title={item.sku}>{item.sku}</span>
                                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">{item.count}</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-slate-500">No SKU data for this period.</p>}
            </div>

            {/* Pending Inventory Card */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg"><ListChecks size={24} className="text-orange-600"/></div>
                        <div>
                            <p className="text-sm text-slate-500">Pending Inventory</p>
                            <p className="text-2xl font-bold text-orange-600">{loading ? '...' : stats.pendingCount}</p>
                        </div>
                    </div>
                    {stats.pendingCount > 0 && (
                      <button onClick={handleProcessInventory} disabled={isProcessing || loading} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-slate-400">
                        <RefreshCw className={isProcessing ? 'animate-spin' : ''} size={16} />
                        {isProcessing ? 'Processing...' : 'Process All'}
                      </button>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* ✅ UPDATED: Invoice Details Table with new structure */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6"><h2 className="text-xl font-bold text-slate-800">Invoice Details for Period</h2></div>
        {error && <p className="text-red-500 px-6 pb-4">{error}</p>}
        {loading ? <div className="text-center py-10">Loading orders...</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Order ID</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">SKU(s)</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Qty</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Delivery</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Status</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Date Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.length > 0 ? orders.map((order) => (
                  <tr key={order._id} className={order.inventoryProcessed ? '' : 'bg-orange-50'}>
                    <td className="p-3 font-mono text-slate-700">{getOrderId(order)}</td>
                    <td className="p-3 font-mono font-medium text-blue-600 max-w-xs truncate" title={getSkuList(order)}>
                      {getSkuList(order)}
                    </td>
                    <td className="p-3 text-slate-700 font-semibold">{getTotalQuantity(order)}</td>
                    <td className="p-3 text-slate-600 text-xs">{order.deliveryPartner || 'N/A'}</td>
                    <td className="p-3">
                      {order.inventoryProcessed ? 
                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Processed</span> : 
                        <span className="px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full">Pending</span>
                      }
                    </td>
                    <td className="p-3 text-slate-600">{formatDate(order.createdAt)}</td>
                  </tr>
                )) : 
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500">No orders found for the selected date range.</td></tr>
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </ProtectRoute>
  );
}