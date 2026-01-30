"use client";

import React, { useState } from 'react';
import { useBusiness } from '@/providers/GlobalProvider';
import api from '../../lib/api';
import { handleApiError } from '@/lib/errorHandler';
import ProtectRoute from "@/app/components/ProtectRoute";
import { Package, Search, Plus, Filter, AlertCircle, RefreshCw } from 'lucide-react';
// 1. Import React Query
import { useQuery } from '@tanstack/react-query';

// Interface
interface InventoryItem {
  _id: string;
  title: string;
  stock: number;
  price: number;
  sku?: string; // Added optional fields for better UI if available
  image?: string;
}

const InventoryPage = () => {
  const { selectedBusiness, loading: businessLoading } = useBusiness();
  const [search, setSearch] = useState("");

  // --- 2. Query Hook ---
  const { 
    data: inventory = [], 
    isLoading, 
    isError,
    refetch 
  } = useQuery({
    queryKey: ['inventory', selectedBusiness?.gstin],
    queryFn: async () => {
        // The interceptor handles the GSTIN header automatically
        const res = await api.get('/inventory');
        return res.data as InventoryItem[];
    },
    enabled: !!selectedBusiness?.gstin, // Only fetch when business is selected
  });

  // Simple client-side search filter
  const filteredInventory = inventory.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))
  );

  // --- Loading Business State ---
  if (businessLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // --- No Business Selected State ---
  if (!selectedBusiness) {
    return (
        <ProtectRoute permission="inventory">
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 bg-white rounded-xl border border-dashed border-slate-300 m-6">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <Package className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No Business Selected</h3>
                <p className="text-slate-500 max-w-sm mt-2">Please select a business profile from the header to manage your inventory.</p>
            </div>
        </ProtectRoute>
    );
  }

  return (
    <ProtectRoute permission="inventory">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Inventory Manager</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Manage stock and pricing for <span className="font-semibold text-blue-600">{selectedBusiness.brandName}</span>
                </p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => refetch()} 
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-95">
                    <Plus size={16} /> Add Item
                </button>
            </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search by product name or SKU..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Filter size={16} /> Filters
            </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                        <tr>
                            <th className="p-4">Product Details</th>
                            <th className="p-4">Stock Status</th>
                            <th className="p-4">Price</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            // Skeleton Loading State
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="p-4"><div className="h-4 w-48 bg-slate-100 rounded"></div><div className="h-3 w-24 bg-slate-50 rounded mt-2"></div></td>
                                    <td className="p-4"><div className="h-6 w-16 bg-slate-100 rounded-full"></div></td>
                                    <td className="p-4"><div className="h-4 w-12 bg-slate-100 rounded"></div></td>
                                    <td className="p-4 text-right"><div className="h-8 w-8 bg-slate-100 rounded ml-auto"></div></td>
                                </tr>
                            ))
                        ) : isError ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-red-500 bg-red-50">
                                    <div className="flex flex-col items-center gap-2">
                                        <AlertCircle size={24} />
                                        <span>Failed to load inventory. Please try refreshing.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredInventory.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-slate-400">
                                    No products found matching your search.
                                </td>
                            </tr>
                        ) : (
                            filteredInventory.map((item) => (
                                <tr key={item._id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {/* Optional Image Placeholder */}
                                            <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 shrink-0">
                                                <Package size={20} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 line-clamp-1">{item.title}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {item.sku || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            item.stock > 10 ? 'bg-green-100 text-green-800' : 
                                            item.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {item.stock > 0 ? `${item.stock} in Stock` : 'Out of Stock'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-medium text-slate-700">
                                        ₹{item.price.toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        
        {/* Footer Stats (Optional) */}
        {!isLoading && !isError && (
            <div className="text-xs text-slate-400 text-center">
                Showing {filteredInventory.length} products
            </div>
        )}
      </div>
    </ProtectRoute>
  );
};

export default InventoryPage;