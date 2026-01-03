"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Upload, Scissors, RefreshCw, CheckCircle, AlertTriangle, FileText, ArrowRight, Search, History, Calendar, RefreshCcw } from 'lucide-react';
import { useBusiness, api } from "@/providers/GlobalProvider";
import ProtectRoute from "@/components/ProtectRoute";
interface ProcessedOrder {
  orderId: string;
  sku: string;
  quantity: number;
  status: 'saved' | 'skipped'; 
  customerName?: string;
  awb?: string;
}

interface ProcessingSummary {
  saved: number;
  skipped: number;
  totalProcessed: number;
  unmappedSkus: string[];
  details: ProcessedOrder[];
}

interface HistoryItem {
  _id: string;
  fileName: string;
  processedAt: string;
  stats: {
    saved: number;
    skipped: number;
    totalProcessed: number;
    unmappedCount: number;
  };
}

export default function CropperPage() {
  const { selectedBusiness } = useBusiness();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // UI State
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | 'warning' | null>(null);
  const [currentStats, setCurrentStats] = useState<ProcessingSummary | null>(null);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewingGstin, setViewingGstin] = useState<string>(""); // Track which GSTIN we are viewing history for
  
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch History - Accepts optional GSTIN override



  const fetchHistory = async (gstinOverride?: string) => {
    const gstinToUse = gstinOverride || selectedBusiness?.gstin;
    if (!gstinToUse) return;

    setViewingGstin(gstinToUse); // Update local view state
    setLoadingHistory(true);
    try {
      const res = await api.get('/cropper/history', { params: { gstin: gstinToUse } });
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Reset when global business changes
  useEffect(() => {
    if (selectedBusiness) {
        fetchHistory(selectedBusiness.gstin);
    }
  }, [selectedBusiness]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage("");
      setMessageType(null);
      setCurrentStats(null); 
    }
  };

  const handleProcessPDF = async () => {
    if (!file || !selectedBusiness) return;

    setIsProcessing(true);
    setCurrentStats(null);
    setMessage("Uploading and processing PDF on server...");
    setMessageType('info');

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('gstin', selectedBusiness.gstin); // Send selected, but backend might override

    try {
      const response = await api.post('/cropper/upload', formData);
      const { results } = response.data;

      setCurrentStats({
        saved: results.saved || 0,
        skipped: results.skipped || 0,
        unmappedSkus: results.unmappedSkus || [],
        totalProcessed: (results.saved || 0) + (results.skipped || 0),
        details: results.details || []
      });

      // ✅ SMART CHECK: Did backend switch GSTIN?
      const detectedGstin = results.detectedGstin;
      
      if (detectedGstin && detectedGstin !== selectedBusiness.gstin) {
          setMessage(`⚠️ Smart Switch: PDF belonged to ${detectedGstin}. Data saved to that business.`);
          setMessageType('warning');
          // Force refresh history for the DETECTED business
          fetchHistory(detectedGstin); 
      } else {
          setMessage("Processing complete! See summary below.");
          setMessageType('success');
          // Refresh history for current business
          fetchHistory(selectedBusiness.gstin);
      }

    } catch (err: any) {
      console.error(err);
      setMessage(`❌ Error: ${err.response?.data?.message || 'Server error.'}`);
      setMessageType('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredDetails = currentStats?.details.filter(order => 
    order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <ProtectRoute permission="cropper">
    <div className="space-y-8 pb-10">
      <Head><title>Process PDF Labels</title></Head>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
          <Scissors className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Process & Sync PDF Labels</h1>
          <p className="text-slate-600 mt-1">Upload your shipping label PDF to save orders and update inventory automatically.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Uploader */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-colors text-center">
              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                <div className="p-4 bg-blue-100 rounded-full mb-4 text-blue-600">
                  <Upload className="w-8 h-8" />
                </div>
                <span className="text-lg font-semibold text-slate-700">Click to upload PDF Label</span>
                <span className="text-sm text-slate-500 mt-1">Supports Meesho, Flipkart, Amazon labels</span>
                <input type="file" onChange={handleFileChange} accept="application/pdf" className="hidden" />
              </label>
            </div>

            {file && (
              <div className="mt-4 flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-700 text-sm font-medium">
                <FileText size={18} /> {file.name}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button 
                onClick={handleProcessPDF} 
                disabled={!file || isProcessing} 
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-blue-800 transition-all disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed"
              >
                <RefreshCw className={isProcessing ? 'animate-spin' : ''} size={20} />
                {isProcessing ? 'Processing Labels...' : 'Process PDF & Sync Inventory'}
              </button>
            </div>
            
            {message && (
              <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
                messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 
                messageType === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                <div className="mt-0.5">
                  {messageType === 'success' && <CheckCircle className="w-5 h-5" />}
                  {messageType === 'error' && <AlertTriangle className="w-5 h-5" />}
                  {messageType === 'warning' && <RefreshCcw className="w-5 h-5" />}
                  {messageType === 'info' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>}
                </div>
                <span className="font-medium">{message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: DB History Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <History size={18} /> Upload History
                </h3>
                <button onClick={() => fetchHistory(viewingGstin)} className="text-xs text-blue-600 hover:underline">Refresh</button>
              </div>
              {viewingGstin && (
                  <div className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded flex justify-between items-center">
                      <span>Viewing: {viewingGstin}</span>
                      {selectedBusiness?.gstin !== viewingGstin && (
                          <span className="text-orange-600 font-bold">(Switched)</span>
                      )}
                  </div>
              )}
            </div>
            
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {loadingHistory ? (
                 <div className="p-8 text-center text-slate-400 text-sm">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No history found.</div>
              ) : (
                history.map((item) => (
                  <div key={item._id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-slate-800 text-sm truncate max-w-[180px]" title={item.fileName}>
                        {item.fileName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-2">
                       <Calendar size={10} />
                       {new Date(item.processedAt).toLocaleString()}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-green-50 text-green-700 px-1.5 py-1 rounded text-center border border-green-100">
                         <span className="font-bold block">{item.stats.saved}</span> Saved
                      </div>
                      <div className="bg-orange-50 text-orange-700 px-1.5 py-1 rounded text-center border border-orange-100">
                         <span className="font-bold block">{item.stats.skipped}</span> Skip
                      </div>
                      <div className="bg-blue-50 text-blue-700 px-1.5 py-1 rounded text-center border border-blue-100">
                         <span className="font-bold block">{item.stats.totalProcessed}</span> Total
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Results (Same as before) */}
      {currentStats && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
           <div>
             <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
               <FileText className="text-slate-400" /> Processing Summary
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Detected</p>
                   <p className="text-3xl font-bold text-slate-800 mt-1">{currentStats.totalProcessed}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-green-200 bg-green-50/30 shadow-sm">
                   <p className="text-green-600 text-sm font-medium uppercase tracking-wider">Successfully Saved</p>
                   <p className="text-3xl font-bold text-green-700 mt-1">{currentStats.saved}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <p className="text-orange-500 text-sm font-medium uppercase tracking-wider">Duplicates Skipped</p>
                   <p className="text-3xl font-bold text-orange-600 mt-1">{currentStats.skipped}</p>
                </div>
             </div>
           </div>

           {/* Table */}
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="font-bold text-slate-800 text-lg">Processed Orders Details</h3>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Search ID or SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                       <tr>
                          <th className="px-6 py-3">Order ID</th>
                          <th className="px-6 py-3">SKU</th>
                          <th className="px-6 py-3 text-center">Qty</th>
                          <th className="px-6 py-3">AWB</th>
                          <th className="px-6 py-3">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {filteredDetails.length === 0 ? (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400">No orders match your search.</td></tr>
                       ) : filteredDetails.map((order, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-6 py-3 font-medium text-slate-700">{order.orderId}</td>
                             <td className="px-6 py-3 text-slate-600"><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{order.sku}</span></td>
                             <td className="px-6 py-3 text-center text-slate-600">{order.quantity}</td>
                             <td className="px-6 py-3 text-slate-500 text-xs">{order.awb || '-'}</td>
                             <td className="px-6 py-3">
                                {order.status === 'saved' ? 
                                   <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100"><CheckCircle size={10} /> Saved</span> : 
                                   <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full border border-orange-100">Skipped</span>
                                }
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}
    </div>
    </ProtectRoute>
  );
}