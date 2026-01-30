"use client";

import { useState, ChangeEvent, useMemo,useRef,useEffect, useCallback } from 'react';
import Head from 'next/head';
import { 
  Upload, Scissors, RefreshCw, CheckCircle, AlertTriangle, 
  FileText, History, Calendar, RefreshCcw, Package, 
  Eye, ChevronRight, ArrowLeft
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness, api } from "@/providers/GlobalProvider";
import ProtectRoute from "@/app/components/ProtectRoute";
import { handleApiError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { CropperUploadSchema } from './../../Schema/cropper.Schema';
// --- Interfaces ---
interface ProcessedOrder {
  orderId: string;
  sku: string;
  quantity: number;
  status: 'saved' | 'skipped' | 'error';
  customerName?: string;
  awb?: string;
  deliveryPartner?: string;
}

interface DailyBreakdownItem {
  date: string;
  totalOrders: number;
  partners: Record<string, number>;
}

interface ProcessingSummary {
  saved: number;
  skipped: number;
  totalProcessed: number;
  unmappedSkus: string[];
  details: ProcessedOrder[];
  dailyBreakdown?: DailyBreakdownItem[];
  source?: 'upload' | 'history'; 
  fileName?: string;
  processedAt?: string;
}

interface HistoryItem {
  _id: string;
  businessGstin: string;
  fileName: string;
  processedAt: string;
  stats: {
    saved: number;
    skipped: number;
    totalProcessed: number;
    unmappedCount: number;
    inventoryDeducted: number;
  };
  dailyBreakdown?: DailyBreakdownItem[];
}


// --- Helper: Format Date as DD.MM.YYYY ---
const parseDDMMYYYY = (value?: string | null) => {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;

  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
};

const formatDateDDMMYYYY = (dateString: string) => {
  const d = parseDDMMYYYY(dateString);
  if (!d) return "Invalid date";

  return `${String(d.getDate()).padStart(2, "0")}.${String(
    d.getMonth() + 1
  ).padStart(2, "0")}.${d.getFullYear()}`;
};




// --- Component: History Skeleton Loader ---
const HistorySkeleton = () => (
  <div className="p-4 space-y-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="flex justify-between mb-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-4"></div>
        </div>
        <div className="h-3 bg-gray-100 rounded w-1/2 mb-1"></div>
        <div className="flex gap-2">
           <div className="h-5 bg-gray-100 rounded w-12"></div>
           <div className="h-5 bg-gray-100 rounded w-12"></div>
        </div>
      </div>
    ))}
  </div>
);

export default function CropperPage() {
  const { selectedBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  
  // Abort controller for upload
  const uploadAbortRef = useRef<AbortController | null>(null);

  // UI State
  const [currentStats, setCurrentStats] = useState<ProcessingSummary | null>(null);
  
  // Interaction State
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Filter State
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // --- React Query: Fetch History ---
  const { 
    data: history = [], 
    isLoading: loadingHistory, 
    isFetching: isFetchingHistory,
    refetch: refetchHistory 
  } = useQuery({
    queryKey: ['cropperHistory', selectedBusiness?.gstin],
    queryFn: async () => {
      const res = await api.get('/cropper/history', { 
        params: { gstin: selectedBusiness?.gstin } 
      });
      return res.data as HistoryItem[];
    },
    enabled: !!selectedBusiness?.gstin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
  uploadAbortRef.current?.abort();
}, [selectedBusiness?.gstin]);


  // --- React Query: Upload Mutation ---
  const uploadMutation = useMutation({
       mutationFn: async (formData: FormData) => {
      uploadAbortRef.current?.abort();
      uploadAbortRef.current = new AbortController();

      const promise = api.post('/cropper/upload', formData, {
  signal: uploadAbortRef.current!.signal,
});

      toast.promise(promise, {
        loading: 'Uploading and analyzing PDF...',
        success: (res: any) => {
          const { results } = res.data;
          return `Successfully processed ${results.saved} orders!`;
        },
        error: (err: any) => `Upload failed: ${err.response?.data?.message || 'Server Error'}`,
      });

      const response = await promise;
      return response.data;
    },
    onSuccess: (data, variables) => {
      const { results } = data;
      const uploadedFile = variables.get('pdfFile') as File;

      setCurrentStats({
        saved: results.saved || 0,
        skipped: results.skipped || 0,
        unmappedSkus: results.unmappedSkus || [],
        totalProcessed: (results.saved || 0) + (results.skipped || 0),
        details: results.details || [],
        dailyBreakdown: results.dailyBreakdown,
        source: 'upload',
        fileName: uploadedFile.name,
        processedAt: new Date().toISOString()
      });

      if (results.dailyBreakdown) {
        const allPartners = new Set<string>();
        results.dailyBreakdown.forEach((d: any) => Object.keys(d.partners).forEach(k => allPartners.add(k)));
        const firstPartner = Array.from(allPartners)[0];
        if (firstPartner) setSelectedPartner(firstPartner);
      }

      const detectedGstin = results.detectedGstin;
      if (detectedGstin && detectedGstin !== selectedBusiness?.gstin) {
        toast.warning(`Smart Switch: PDF belonged to ${detectedGstin}. Data saved to that business.`)
      } else {
        toast.success("Processing complete successfully.");
      }
      
      // Invalidate history to trigger a background refresh
      queryClient.invalidateQueries({ queryKey: ['cropperHistory'] });
    },
    onError: (err) => {
      handleApiError(err, "Server error");
    }
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCurrentStats(null);
      setSelectedHistoryId(null); 
      setSelectedPartner(null);
      setFilterStartDate("");
      setFilterEndDate("");
    }
  };

  const handleReset = () => {
    setFile(null);
    setCurrentStats(null);
    setSelectedHistoryId(null);
    setSelectedPartner(null);
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const handleProcessPDF = async () => {
  if (!file || !selectedBusiness) return;

  const parsed = CropperUploadSchema.safeParse({
    pdfFile: file,
    gstin: selectedBusiness.gstin,
  });

  if (!parsed.success) {
    toast.error(parsed.error.issues[0].message);
    return;
  }

  const formData = new FormData();
  formData.append("pdfFile", file);
  formData.append("gstin", selectedBusiness.gstin);

  uploadMutation.mutate(formData);
};


  const handleSelectHistory = (item: HistoryItem) => {
    setSelectedHistoryId(item._id);
    setFile(null); 
    setFilterStartDate("");
    setFilterEndDate("");
    
    setCurrentStats({
      saved: item.stats.saved,
      skipped: item.stats.skipped,
      totalProcessed: item.stats.totalProcessed,
      unmappedSkus: [],
      details: [], 
      dailyBreakdown: item.dailyBreakdown,
      source: 'history',
      fileName: item.fileName,
      processedAt: item.processedAt
    });
    console.log(item.dailyBreakdown);

    if (item.dailyBreakdown) {
        const allPartners = new Set<string>();
        item.dailyBreakdown.forEach(d => Object.keys(d.partners).forEach(k => allPartners.add(k)));
        const firstPartner = Array.from(allPartners)[0];
        if (firstPartner) setSelectedPartner(firstPartner);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const focusDateRaw = currentStats?.processedAt;
  const focusDateLabel = focusDateRaw
  ? (() => {
      const d = parseDDMMYYYY(focusDateRaw) ?? new Date(focusDateRaw);
      return isNaN(d.getTime())
        ? "Invalid date"
        : d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
    })()
  : "New Upload";


  const consolidatedSummary = useMemo(() => {
    if (!currentStats?.dailyBreakdown) return null;

    const summary = {
        totalOrders: 0,
        partners: {} as Record<string, number>
    };

    currentStats.dailyBreakdown.forEach(day => {
        summary.totalOrders += day.totalOrders;
        Object.entries(day.partners).forEach(([partner, count]) => {
            summary.partners[partner] = (summary.partners[partner] || 0) + count;
        });
    });

    return summary;
  }, [currentStats]);

  const getFilteredBatchesForPartner = useCallback(
  (partnerName: string) => {
    if (!currentStats?.dailyBreakdown) return [];

    return currentStats.dailyBreakdown
      .filter(day => {
        if (!day.partners[partnerName]) return false;

        const parsed = parseDDMMYYYY(day.date);
        if (!parsed) return false;

        const iso = parsed.toISOString().split("T")[0];

        if (filterStartDate && iso < filterStartDate) return false;
        if (filterEndDate && iso > filterEndDate) return false;

        return true;
      })
      .map(day => ({
        rawDate: day.date,
        formattedDate: day.date, // already DD.MM.YYYY
        count: day.partners[partnerName]
      }))
      .sort((a, b) => {
        const d1 = parseDDMMYYYY(b.rawDate)?.getTime() ?? 0;
        const d2 = parseDDMMYYYY(a.rawDate)?.getTime() ?? 0;
        return d1 - d2;
      });
  },
  [currentStats, filterStartDate, filterEndDate]
);


  return (
    <ProtectRoute permission="cropper">
    <div className="space-y-8 pb-10">
      <Head><title>Process PDF Labels</title></Head>

      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
          <Scissors className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Process & Sync PDF Labels</h1>
          <p className="text-gray-600 mt-1">Upload your shipping label PDF to save orders and update inventory automatically.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Uploader */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {!currentStats ? (
                <>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50/50 hover:bg-gray-50 transition-colors text-center cursor-pointer group">
                  <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                    <div className="p-4 bg-blue-100 rounded-full mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8" />
                    </div>
                    <span className="text-lg font-semibold text-gray-700">Click to upload PDF Label</span>
                    <span className="text-sm text-gray-500 mt-1">Supports Meesho, Flipkart, Amazon labels</span>
                    <input type="file" onChange={handleFileChange} accept="application/pdf" className="hidden" />
                  </label>
                </div>
                {file && (
                  <div className="mt-4 flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-700 text-sm font-medium">
                    <FileText size={18} /> {file.name}
                  </div>
                )}
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-6">
                    <div className="bg-green-100 p-3 rounded-full text-green-600 mb-3">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">File Processed Successfully</h3>
                    <p className="text-gray-500 text-sm mb-6">{currentStats.fileName}</p>
                    <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 shadow-sm rounded-lg text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium">
                        <ArrowLeft size={16} /> Upload Another File
                    </button>
                </div>
            )}

            {!currentStats && (
                <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
                
                {uploadMutation.isPending && (
                    <div className="w-full space-y-2">
                        <div className="flex justify-between text-xs text-blue-600 font-medium">
                            <span>Uploading & Processing...</span>
                            <span className="animate-pulse">Please wait</span>
                        </div>
                        <div className="h-2 bg-blue-100 rounded-full overflow-hidden relative">
                             <div className="absolute top-0 left-0 bottom-0 bg-blue-600 w-1/3 rounded-full animate-[slide_1.5s_infinite_linear]"></div>
                            
                        </div>
                    </div>
                )}

                <button 
                  onClick={handleProcessPDF} 
                  disabled={!file || uploadMutation.isPending} 
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-md hover:from-blue-700 hover:to-blue-800 transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed cursor-pointer"
                >
                    <RefreshCw className={uploadMutation.isPending ? 'animate-spin' : ''} size={20} />
                    {uploadMutation.isPending ? 'Processing Labels...' : 'Process PDF & Sync Inventory'}
                </button>
                </div>
            )}
          </div>
        </div>

        {/* Right: DB History Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-6">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <History size={18} /> Upload History
                </h3>
                <button 
                    onClick={() => refetchHistory()} 
                    disabled={isFetchingHistory}
                    className="text-xs text-blue-600 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                    {isFetchingHistory && <RefreshCw size={10} className="animate-spin" />}
                    Refresh
                </button>
              </div>
            </div>
            
            <div className="max-h-[600px] overflow-y-auto relative">
              
              {loadingHistory && history.length === 0 && (
                <HistorySkeleton />
              )}

              {!loadingHistory && history.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">No history found.</div>
              )}

              <div className={`divide-y divide-gray-100 transition-opacity duration-300 ${isFetchingHistory && history.length > 0 ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {history.map((item) => (
                  <div 
                    key={item._id} 
                    onClick={() => handleSelectHistory(item)}
                    className={`group p-4 cursor-pointer transition-all border-l-4 ${selectedHistoryId === item._id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50 border-transparent hover:border-gray-300'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className={`font-medium text-sm truncate max-w-[180px] ${selectedHistoryId === item._id ? 'text-blue-700' : 'text-gray-800'}`} title={item.fileName}>{item.fileName}</p>
                      <Eye size={16} className={`text-gray-300 ${selectedHistoryId === item._id ? 'text-blue-400' : 'group-hover:text-gray-500'}`} />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-2"><Calendar size={10} />{(() => {
  const d =
    parseDDMMYYYY(item.processedAt) ??
    new Date(item.processedAt);

  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
})()}
</div>
                    <div className="flex gap-2 text-xs">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">{item.stats.saved} Saved</span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.stats.totalProcessed} Total</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* --- DASHBOARD SECTION --- */}
      {currentStats && consolidatedSummary && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            
            {currentStats.source === 'history' && (
              <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-200 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2"><History size={16} /> <span>Viewing historical data for: <span className="font-bold">{currentStats.fileName}</span></span></div>
                <span className="text-xs bg-blue-100 px-2 py-1 rounded">Processed: {focusDateLabel}</span>
              </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-gray-500 text-xs font-bold uppercase">Total Detected</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{currentStats.totalProcessed}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-green-200 bg-green-50/30 shadow-sm">
                  <p className="text-green-600 text-xs font-bold uppercase">Saved</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{currentStats.saved}</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-orange-500 text-xs font-bold uppercase">Skipped</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{currentStats.skipped}</p>
              </div>
            </div>

            {/* Unmapped SKUs Warning */}
            {currentStats.unmappedSkus && currentStats.unmappedSkus.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertTriangle size={20}/></div>
                    <div className="w-full">
                        <h4 className="font-bold text-red-800">Unmapped SKUs Detected</h4>
                        <p className="text-sm text-red-600 mt-1 mb-3">The following SKUs were found in the PDF but are not mapped in your inventory. These orders were skipped.</p>
                        <div className="bg-white border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {currentStats.unmappedSkus.map((sku, i) => (<li key={i} className="font-mono">{sku}</li>))}
                            </ul>
                        </div>
                    </div>
                </div>
                </div>
            )}

            {/* --- MAIN SPLIT LAYOUT (LEFT LIST / RIGHT DETAILS) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* LEFT: PARTNER LIST */}
              <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden">
                 <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white">
                    <div className="flex items-center gap-2 text-blue-100 text-sm font-medium mb-1"><Package size={16} /> Packaging List</div>
                    <h3 className="text-xl font-bold">{focusDateLabel}</h3>
                    <p className="text-3xl font-extrabold mt-2">{consolidatedSummary.totalOrders} <span className="text-lg font-normal opacity-80">Orders</span></p>
                 </div>
                 <div className="divide-y divide-gray-100">
                    {Object.entries(consolidatedSummary.partners).map(([partner, count]) => (
                        <div 
                          key={partner} 
                         onClick={() => {
  setSelectedPartner(partner);
  setFilterStartDate("");
  setFilterEndDate("");
}}
                          className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${
                              selectedPartner === partner ? 'bg-blue-50 border-l-4 border-blue-600' : 'hover:bg-gray-50 border-l-4 border-transparent'
                          }`}
                        >
                            <span className={`font-medium ${selectedPartner === partner ? 'text-blue-700' : 'text-gray-700'}`}>{partner}</span>
                            <div className="flex items-center gap-3">
                                <span className={`font-bold px-2 py-0.5 rounded ${selectedPartner === partner ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-900'}`}>{count}</span>
                                <ChevronRight size={16} className={selectedPartner === partner ? 'text-blue-500' : 'text-gray-400'}/>
                            </div>
                        </div>
                    ))}
                 </div>
              </div>

              {/* RIGHT: DETAILS PANEL (GRID VIEW) */}
              <div className="lg:col-span-2">
                {selectedPartner ? (
                    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {selectedPartner}
                            </h2>
                            <div className="flex gap-2">
                                <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="text-xs border border-gray-200 rounded p-1.5 text-gray-600 focus:outline-none focus:border-blue-500" />
                                <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="text-xs border border-gray-200 rounded p-1.5 text-gray-600 focus:outline-none focus:border-blue-500" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getFilteredBatchesForPartner(selectedPartner).length > 0 ? (
                                getFilteredBatchesForPartner(selectedPartner).map((batch, idx) => (
                                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                                            <h3 className="text-sm font-bold text-gray-800">{batch.formattedDate}</h3>
                                            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                                                {batch.count} Orders
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-xs text-gray-600">
                                                <span>{selectedPartner}</span>
                                                <span className="font-semibold">{batch.count}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2">Scheduled</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <p className="text-gray-400 text-sm">No batches found for this date range.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                        <Package size={48} className="mb-4 opacity-20" />
                        <p>Select a courier partner from the left to view batch details.</p>
                    </div>
                )}
              </div>
            </div>
        </div>
      )}
    </div>
    </ProtectRoute>
  );
}