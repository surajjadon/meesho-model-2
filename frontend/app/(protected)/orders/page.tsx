"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useBusiness, api } from '../../../providers/GlobalProvider';
import { ShoppingCart, ListChecks, BarChart3, Banknote, Filter, XCircle, X, Loader2, CheckCircle } from 'lucide-react';
import ProtectRoute from "@/app/components/ProtectRoute";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from 'sonner';

// --- Interfaces ---

interface InventoryItemData {
  _id: string;
  title: string;
  sku?: string;
}

interface Product {
  sku?: string;
  size?: string;
  quantity?: number;
  color?: string;
  orderNo?: string;
}

interface BatchConsumption {
  batchId: string;
  qtyConsumed: number;
  costPerUnit: number;
  consumedDate?: string;
  inventoryItem?: string | InventoryItemData; 
}

interface Order {
  _id: string;
  purchaseOrderNo?: string;
  invoiceNo?: string;
  products: Product[];
  inventoryProcessed: boolean;
  orderDate: string;
  deliveryPartner?: string;
  packagingCost?: number;
  batchConsumption?: BatchConsumption[]; 
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
  const queryClient = useQueryClient();

  // Local UI State
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [appliedFilters, setAppliedFilters] = useState(getInitialDateRange);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Sync UI State
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");

  // 1️⃣ FIX: Add Ref to track sync state
  const lastSyncedRef = useRef<string | null>(null);

  // --- 1. QUERY: Fetch Orders & Stats ---
  // This automatically refetches when appliedFilters change (correct behavior)
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['orders', selectedBusiness?.gstin, appliedFilters.from, appliedFilters.to],
    queryFn: async () => {
        const params = { 
            gstin: selectedBusiness?.gstin,
            fromDate: appliedFilters.from,
            toDate: appliedFilters.to
        };
        const res = await api.get('/orders', { params });
        return res.data; // Expected: { orders: Order[], stats: Stats }
    },
    enabled: !!selectedBusiness?.gstin, 
  });

  const orders: Order[] = data?.orders || [];
  const stats: Stats = data?.stats || { totalOrders: 0, pendingCount: 0, pendingValue: 0, topSkus: [] };

  // --- 2. MUTATION: Auto Sync ---
  const syncMutation = useMutation({
    mutationFn: async () => {
        return api.post('/orders/process-inventory', { gstin: selectedBusiness?.gstin });
    },
    onMutate: () => {
        setSyncStatus("syncing");
        setSyncMessage("Syncing inventory and processing pending orders...");
    },
    onSuccess: (res) => {
        const message = res.data.message || "Sync Complete";
        const results = res.data.results || {};
        const processedCount = results.ordersProcessed || 0;

        setSyncStatus("success");
        setSyncMessage(`Auto-Sync Complete: ${message} (${processedCount} orders processed).`);
        
        queryClient.invalidateQueries({ queryKey: ['orders'] });

        setTimeout(() => {
            setSyncStatus("idle");
            setSyncMessage("");
        }, 5000);
    },
    // 👇 UPDATED ONERROR BLOCK TO SHOW BACKEND MESSAGE 👇
    onError: (err: any) => {

      // We use 'err: any' above to allow access to .response without TS errors
      const backendErrorMessage = err.response?.data?.error || err.message || "Auto-sync failed.";
      // 2. Pass the dynamic message to your error handler
      toast.error("Auto-sync failed.", { description: backendErrorMessage });
      
      // 3. Update the UI state with the real error
      setSyncStatus("error");
      setSyncMessage(backendErrorMessage);

      // 4. Optional: Clear error message after 5 seconds
      setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage("");
      }, 5000);
    }
  });

  // --- 3. EFFECT: Trigger Auto Sync (FIXED) ---
  // Only runs ONCE per business session. Does NOT run on filter change.
  useEffect(() => {
    // A. Basic safety check
    if (!selectedBusiness?.gstin) return;

    // B. Guard: If we already synced this business ID, do not sync again.
    if (lastSyncedRef.current === selectedBusiness.gstin) return;

    // C. Lock & Execute
    lastSyncedRef.current = selectedBusiness.gstin;
    syncMutation.mutate();
    
  }, [selectedBusiness?.gstin]); // 🟢 Dependent ONLY on the business ID

  // --- Handlers ---
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const handleFilter = () => setAppliedFilters(dateRange);
  
  const handleReset = () => {
    const initialRange = getInitialDateRange();
    setDateRange(initialRange);
    setAppliedFilters(initialRange);
  };

  // Helper Functions
  const formatCurrency = (value: number) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const getOrderId = (order: Order) => order.products[0]?.orderNo || 'N/A';
  const getSkuList = (order: Order) => order.products.map(p => p.sku).filter(Boolean).join(', ') || 'N/A';
  const getTotalQuantity = (order: Order) => order.products.reduce((sum, p) => sum + (p.quantity || 0), 0);

  const getInventoryTitle = (item: string | InventoryItemData | undefined) => {
    if (!item) return 'N/A';
    if (typeof item === 'object' && 'title' in item) {
        return item.title;
    }
    return item; 
  };

  if (businessLoading) return <div className="p-6">Loading business data...</div>;
  if (!selectedBusiness) return <div className="p-6 bg-yellow-100 text-yellow-800 rounded-md">Please select a business to view its orders.</div>;

  return (
    <ProtectRoute permission="cropper">
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-autohide space-y-6 text-gray-600 relative p-6">
      <h1 className="text-3xl font-bold text-slate-800 ">Order Dashboard</h1>
      
      {/* --- AUTO SYNC STATUS NOTIFICATION --- */}
      {syncStatus !== "idle" && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 shadow-sm border flex items-center gap-3 transition-all duration-300 ${
            syncStatus === "syncing"
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : syncStatus === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {syncStatus === "syncing" && (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          )}
          {syncStatus === "success" && (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          {syncStatus === "error" && (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          
          <div className="flex-1">
            <p className="text-sm font-medium">
               {syncStatus === "syncing" ? "Auto-Syncing..." : syncStatus === "success" ? "Sync Successful" : "Sync Error"}
            </p>
            {syncMessage && <p className="text-xs opacity-90">{syncMessage}</p>}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <label htmlFor="from" className="text-sm font-medium text-slate-600">From</label>
                <input type="date" name="from" id="from" value={dateRange.from} onChange={handleDateChange} className="p-2 border border-slate-300 rounded-md text-sm cursor-pointer"/>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="to" className="text-sm font-medium text-slate-600">To</label>
                <input type="date" name="to" id="to" value={dateRange.to} onChange={handleDateChange} className="p-2 border border-slate-300 rounded-md text-sm cursor-pointer"/>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={handleFilter} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 cursor-pointer transition-colors">
                <Filter size={16} /> Filter
            </button>
            <button onClick={handleReset} title="Reset to current month" className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors">
                <XCircle size={16} />
            </button>
        </div>
      </div>

      {/* Stats Cards */}
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* LEFT COLUMN */}
  <div className="space-y-6">
    {/* Total Orders */}
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4">
      <div className="p-3 bg-blue-100 rounded-lg">
        <ShoppingCart size={24} className="text-blue-600" />
      </div>
      <div className="space-y-2 w-full">
        <p className="text-sm text-slate-500">Total Orders</p>
        {loading ? (
          <div className="h-7 w-24 bg-gray-300 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-slate-800">
            {stats.totalOrders}
          </p>
        )}
      </div>
    </div>

    {/* Total Pending Value */}
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4">
      <div className="p-3 bg-red-100 rounded-lg">
        <Banknote size={24} className="text-red-600" />
      </div>
      <div className="space-y-2 w-full">
        <p className="text-sm text-slate-500">Total Pending Value</p>
        {loading ? (
          <div className="h-7 w-32 bg-gray-300 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(stats.pendingValue)}
          </p>
        )}
      </div>
    </div>
  </div>

  {/* RIGHT COLUMN */}
  <div className="space-y-6">
    {/* Top SKUs */}
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-purple-100 rounded-lg">
          <BarChart3 size={24} className="text-purple-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Top SKUs</h3>
      </div>

      {loading ? (
        <ul className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="flex justify-between items-center animate-pulse">
              <div className="h-4 w-40 bg-gray-300 rounded" />
              <div className="h-6 w-10 bg-gray-300 rounded-md" />
            </li>
          ))}
        </ul>
      ) : stats.topSkus.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {stats.topSkus.map((item) => (
            <li
              key={item.sku}
              className="flex justify-between items-center"
            >
              <span
                className="font-mono text-slate-700 truncate pr-2"
                title={item.sku}
              >
                {item.sku}
              </span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No SKU data.</p>
      )}
    </div>

    {/* Pending Inventory */}
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-orange-100 rounded-lg">
          <ListChecks size={24} className="text-orange-600" />
        </div>
        <div className="space-y-2 w-full">
          <p className="text-sm text-slate-500">Pending Inventory</p>
          {loading ? (
            <div className="h-7 w-20 bg-gray-300 rounded" />
          ) : (
            <p className="text-2xl font-bold text-orange-600">
              {stats.pendingCount}
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
</div>


      {/* Invoice Details Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6"><h2 className="text-xl font-bold text-slate-800">Invoice Details for Period</h2></div>
        {queryError && <p className="text-red-500 px-6 pb-4">Failed to load orders.</p>}
        {loading ? <div className="animate-pulse">
  {[1, 2, 3, 4].map((i) => (
    <div
      key={i}
      className="grid grid-cols-[2fr_3fr_0.5fr_1.2fr_1fr_1fr_1.2fr] gap-4 px-4 py-3 border-b"
    >
      {/* Order No */}
      <div className="h-4 w-40 bg-gray-300 rounded" />

      {/* SKU */}
      <div className="h-4 w-56 bg-gray-300 rounded" />

      {/* Qty */}
      <div className="h-4 w-6 bg-gray-300 rounded mx-auto" />

      {/* Delivery */}
      <div className="h-4 w-24 bg-gray-300 rounded" />

      {/* Status pill */}
      <div className="h-6 w-24 bg-gray-300 rounded-full" />

      {/* Pkg Cost */}
      <div className="h-4 w-16 bg-gray-300 rounded" />

      {/* Order Date */}
      <div className="h-4 w-24 bg-gray-300 rounded" />
    </div>
  ))}
</div>
 : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Order No.</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">SKU(s)</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Qty</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Delivery</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Status</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Pkg Cost</th>
                  <th className="p-3 text-left font-semibold text-slate-600 uppercase">Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.length > 0 ? orders.map((order) => (
                  <tr 
                    key={order._id} 
                    onClick={() => setSelectedOrder(order)} 
                    className={`cursor-pointer hover:bg-slate-100 transition-colors ${order.inventoryProcessed ? '' : 'bg-orange-50'}`}
                  >
                    <td className="p-3 font-mono text-slate-700">{getOrderId(order)}</td>
                    <td className="p-3 font-mono font-medium text-blue-600 max-w-xs truncate" title={getSkuList(order)}>{getSkuList(order)}</td>
                    <td className="p-3 text-slate-700 font-semibold">{getTotalQuantity(order)}</td>
                    <td className="p-3 text-slate-600 text-xs">{order.deliveryPartner || 'N/A'}</td>
                    <td className="p-3">
                      {order.inventoryProcessed ? 
                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Processed</span> : 
                        <span className="px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-100 rounded-full">Pending</span>
                      }
                    </td>
                    <td className="p-3 font-medium text-slate-700">{order.packagingCost !== undefined ? formatCurrency(order.packagingCost) : '-'}</td>
                    <td className="p-3 text-slate-600">{order.orderDate}</td>
                  </tr>
                )) : 
                  <tr><td colSpan={7} className="text-center py-8 text-slate-500">No orders found for the selected date range.</td></tr>
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL POP-UP */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center bg-slate-100 px-6 py-4 border-b border-slate-200">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Batch Details</h3>
                    <p className="text-sm text-slate-500">Order: <span className="font-mono">{getOrderId(selectedOrder)}</span></p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer">
                    <X size={20} />
                </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
                {selectedOrder.batchConsumption && selectedOrder.batchConsumption.length > 0 ? (
                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                    {/* Updated Columns */}
                                    <th className="px-4 py-3 text-left font-semibold">Inventory Item</th>
                                    <th className="px-4 py-3 text-left font-semibold">Batch ID</th>
                                    <th className="px-4 py-3 text-left font-semibold">Consumed Date</th>
                                    <th className="px-4 py-3 text-right font-semibold">Qty</th>
                                    <th className="px-4 py-3 text-right font-semibold">Cost/Unit</th>
                                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {selectedOrder.batchConsumption.map((batch, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        {/* Shows Title if object, ID if string */}
                                        <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate" title={getInventoryTitle(batch.inventoryItem)}>
                                            {getInventoryTitle(batch.inventoryItem)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{batch.batchId}</td>
                                        {/* Shows Consumed Date */}
                                        <td className="px-4 py-3 text-slate-600 text-xs">
                                            {batch.consumedDate ? formatDate(batch.consumedDate) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-700">{batch.qtyConsumed}</td>
                                        <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(batch.costPerUnit)}</td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                                            {formatCurrency(batch.qtyConsumed * batch.costPerUnit)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td colSpan={5} className="px-4 py-3 text-right font-bold text-slate-600">Total Batch Cost:</td>
                                    <td className="px-4 py-3 text-right font-bold text-blue-600">
                                        {formatCurrency(selectedOrder.batchConsumption.reduce((sum, b) => sum + (b.qtyConsumed * b.costPerUnit), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <p className="text-slate-500">No batch consumption data available for this order.</p>
                    </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                <button 
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors cursor-pointer"
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </ProtectRoute>
  );
}