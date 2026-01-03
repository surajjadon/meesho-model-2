"use client";

import React, { useState, useEffect, useMemo, useRef, KeyboardEvent } from "react";
import Link from 'next/link';
import { useBusiness, api } from "@/providers/GlobalProvider";
import { ScanBarcode, Loader2, ChevronDown, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";

// --- Interfaces ---
interface IReturnOrder {
  _id: string;
  subOrderNo: string;
  awbNumber?: string;
  orderDate: string;
  productName: string;
  supplierSku: string;
  liveOrderStatus: string;
  verificationStatus: "None" | "Delivered" | "Cancelled" | "Return" | "RTO" | "Undelivered" | "RTO and Damaged" | "Return and Damaged";
  updatedAt: string;
  createdAt?: string;
}

// --- Helper for Colors ---
const getStatusBadgeColor = (status: string) => {
    switch (status) {
        case 'Delivered': return 'bg-green-100 text-green-800 border border-green-200';
        case 'Return': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        case 'RTO': return 'bg-orange-100 text-orange-800 border border-orange-200';
        case 'Cancelled': return 'bg-red-100 text-red-800 border border-red-200';
        case 'Undelivered': return 'bg-gray-100 text-gray-800 border border-gray-200';
        case 'RTO and Damaged': return 'bg-red-50 text-red-600 border border-red-200';
        case 'Return and Damaged': return 'bg-red-50 text-red-600 border border-red-200';
        default: return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
};

const getRowHighlightColor = (status: string) => {
    switch (status) {
        case "Delivered": return "bg-green-50/50 border-l-4 border-l-green-500";
        case "Return": return "bg-yellow-50/50 border-l-4 border-l-yellow-500";
        case "RTO": return "bg-orange-50/50 border-l-4 border-l-orange-500";
        case "Cancelled": return "bg-red-50/50 border-l-4 border-l-red-500";
        default: return "hover:bg-slate-50 border-l-4 border-l-transparent";
    }
};

// --- Main Scanner Component ---
export default function ScannerPage() {
  const { selectedBusiness } = useBusiness();
  const [returns, setReturns] = useState<IReturnOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState("");
  const [targetStatus, setTargetStatus] = useState<"None" | "Delivered" | "Cancelled" | "Return" | "RTO" | "Undelivered" | "RTO and Damaged" | "Return and Damaged">("Return");
  const [isVerifying, setIsVerifying] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | "None" | "Processed">("All");
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const fetchReturns = async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const res = await api.get("/returns", { params: { gstin: selectedBusiness.gstin } });
      setReturns(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReturns(); }, [selectedBusiness]);
  
  useEffect(() => { 
      const timer = setTimeout(() => scanInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
  }, [loading]);

  // --- BULK UPDATE LOGIC (NEW) ---
  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);

    // Map selected _ids to actual subOrderNos (assuming API expects subOrderNos)
    const selectedOrders = returns.filter(r => selectedIds.includes(r._id));
    const idsToSend = selectedOrders.map(r => r.subOrderNo);

    try {
        // Call API
        await api.post("/returns/verify", { 
            gstin: selectedBusiness?.gstin, 
            ids: idsToSend, 
            status: targetStatus 
        });

        // Optimistic UI Update
        setReturns(prev => prev.map(r => 
            selectedIds.includes(r._id) 
            ? { ...r, verificationStatus: targetStatus, updatedAt: new Date().toISOString() } 
            : r
        ));

        // Clear Selection
        setSelectedIds([]);
        alert(`Successfully updated ${idsToSend.length} orders to '${targetStatus}'`);

    } catch (error) {
        console.error("Bulk update failed", error);
        alert("Failed to update selected orders. Please try again.");
    } finally {
        setIsBulkUpdating(false);
    }
  };

  // --- SCAN LOGIC ---
  const handleScan = async () => {
    const input = scanInput.trim();
    if (!input) return;
    setIsVerifying(true);
    
    let item = returns.find(r => r.awbNumber === input);
    if (!item) {
        item = returns.find(r => r.subOrderNo === input);
    }
    
    if (!item) {
      alert(`❌ Item not found!\n\nInput: "${input}"`);
      setScanInput("");
      setIsVerifying(false);
      return;
    }

    try {
      await api.post("/returns/verify", { 
          gstin: selectedBusiness?.gstin, 
          ids: [item.subOrderNo], 
          status: targetStatus 
      });

      setReturns(prev => {
        const updated = prev.map(r => 
            (r._id === item?._id) 
            ? { ...r, verificationStatus: targetStatus, updatedAt: new Date().toISOString() } 
            : r
        );
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
      
      setScanInput(""); 
    } catch (err) {
      alert("Failed to verify item.");
    } finally {
      setIsVerifying(false);
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => { 
      if (e.key === "Enter") { 
          e.preventDefault(); 
          handleScan(); 
      } 
  };

  const filteredData = useMemo(() => {
    let data = returns;
    if (statusFilter === "None") data = data.filter(r => r.verificationStatus === "None");
    if (statusFilter === "Processed") data = data.filter(r => r.verificationStatus !== "None");
    return data;
  }, [returns, statusFilter]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds(e.target.checked ? filteredData.map((r) => r._id) : []);
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6 w-full min-h-screen bg-slate-50 p-4 md:p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Returns Scanner</h1>
          <p className="text-sm text-slate-500">Scan AWB Barcode to update status.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={fetchReturns} 
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors"
            >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh Data
            </button>
            <Link 
                href="/returns" 
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 text-slate-700 font-medium"
            >
                <ArrowLeft size={16} />
                Back to Manager
            </Link>
        </div>
      </div>

      {/* Scanner Input Section */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Scan AWB Barcode / Enter AWB
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                  {isVerifying ? <Loader2 className="animate-spin" size={24} /> : <ScanBarcode size={24} />}
              </div>
              <input 
                ref={scanInputRef} 
                type="text" 
                value={scanInput} 
                onChange={(e) => setScanInput(e.target.value)} 
                onKeyDown={handleKeyDown} 
                placeholder="Click here and scan barcode..." 
                className="w-full pl-14 pr-4 py-4 text-lg font-mono bg-blue-50/30 border-2 border-blue-500/30 focus:border-blue-600 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 text-slate-800" 
              />
            </div>
          </div>

          <div className="w-full md:w-72">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Set Status To</label>
            <div className="relative">
              <select 
                value={targetStatus} 
                onChange={(e) => { setTargetStatus(e.target.value as any); scanInputRef.current?.focus(); }} 
                className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-4 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm cursor-pointer"
              >
                <option value="Return">Return (Customer)</option>
                <option value="Return and Damaged">Return and Damaged</option>
                <option value="RTO">RTO (Courier)</option>
                <option value="RTO and Damaged">RTO and Damaged</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Undelivered">Undelivered</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* --- DYNAMIC HEADER --- */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 min-h-[60px]">
          
          {selectedIds.length > 0 ? (
            // SHOW WHEN ITEMS SELECTED
            <div className="w-full flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md">{selectedIds.length} Selected</span>
                    <span className="text-sm text-slate-500">Ready to update...</span>
                </div>
                <button 
                    onClick={handleBulkUpdate}
                    disabled={isBulkUpdating}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isBulkUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Set as "{targetStatus}"
                </button>
            </div>
          ) : (
            // SHOW DEFAULT HEADER
            <>
                <h3 className="font-bold text-slate-700">Recent Returns ({filteredData.length})</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium mr-1">Filter:</span>
                    {["All", "None", "Processed"].map((filter) => (
                    <button key={filter} onClick={() => setStatusFilter(filter as any)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${ statusFilter === filter ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700" }`}>{filter}</button>
                    ))}
                </div>
            </>
          )}

        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
              <tr>
                <th className="p-4 w-10"><input type="checkbox" className="rounded border-gray-300 w-4 h-4 cursor-pointer" onChange={handleSelectAll} checked={selectedIds.length === filteredData.length && filteredData.length > 0} /></th>
                <th className="p-4">AWB & Order Details</th>
                <th className="p-4">SKU / Product</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400">Loading returns data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400">No records found. Try refreshing.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item._id} className={`group transition-colors ${getRowHighlightColor(item.verificationStatus)}`}>
                    <td className="p-4"><input type="checkbox" className="rounded border-gray-300 w-4 h-4 cursor-pointer" checked={selectedIds.includes(item._id)} onChange={() => handleSelectOne(item._id)} /></td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider w-8">AWB:</span>
                            {item.awbNumber ? (
                                <span className="font-mono text-slate-900 font-bold bg-slate-100 px-1.5 rounded">{item.awbNumber}</span>
                            ) : (
                                <span className="text-xs text-red-400 font-medium italic bg-red-50 px-1.5 rounded">Pending Map</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider w-8">ORD:</span>
                            <span className="font-mono text-slate-600 text-xs">{item.subOrderNo}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-800 max-w-[200px] truncate" title={item.supplierSku}>{item.supplierSku}</span>
                            <span className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{item.productName}</span>
                        </div>
                    </td>
                    <td className="p-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getStatusBadgeColor(item.verificationStatus)}`}>
                            {item.verificationStatus}
                        </span>
                        <div className="mt-1.5 text-[10px] text-slate-400 pl-1">
                            Live: {item.liveOrderStatus}
                        </div>
                    </td>
                    <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(item.updatedAt).toLocaleString("en-IN", {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}