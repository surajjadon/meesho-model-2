"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useBusiness, api } from "../../../providers/GlobalProvider";
import { FaLink, FaTimes, FaSave } from "react-icons/fa";
import { toast } from "sonner";
import {
  Search, CheckCircle, XCircle, Trash2, Edit, History, X,
  AlertTriangle, Calendar, Loader2, Clock
} from "lucide-react";
import ProtectRoute from "@/app/components/ProtectRoute";
import { ProductMappingSchema } from "./../../Schema/mapping.schema"; 
// Removed handleApiError import
import DeleteModal from "../../components/modal/DeleteModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// --- INTERFACES ---
interface InventoryItem {
  _id: string;
  title: string;
  price?: number;
}
interface MappedProduct {
  inventoryItem: { _id: string; title: string };
  quantity: number;
}
interface SkuMapping {
  _id: string;
  sku: string;
  manufacturingPrice: number;
  packagingCost: number;
  mappedProducts: MappedProduct[];
  validFrom?: string;
  validTill?: string;
  expiryStatus?: "active" | "expired" | "expiring_soon";
  daysLeft?: number;
}

interface HistoryRecord {
  _id: string;
  manufacturingPrice: number;
  packagingCost: number;
  updatedAt: string;
  validFrom?: string;
  validTill?: string;
  mappedProducts?: {
    inventoryItem: { _id: string; title: string } | string;
    quantity: number;
  }[];
}

type MappingFormValues = z.infer<typeof ProductMappingSchema>;

// --- SKELETON COMPONENTS ---
const InventorySkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-3 p-2 border border-gray-200 rounded-md">
        <div className="w-4 h-4 bg-gray-300 rounded"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      </div>
    ))}
  </div>
);

const TableRowSkeleton = () => (
  <>
    {[1, 2, 3, 4, 5].map((i) => (
      <tr key={i} className="animate-pulse border-b border-slate-100">
        <td className="p-4"><div className="h-5 bg-gray-300 rounded w-32 mb-2"></div><div className="h-3 bg-gray-200 rounded w-20"></div></td>
        <td className="p-4"><div className="h-4 bg-gray-300 rounded w-48 mb-1"></div><div className="h-4 bg-gray-300 rounded w-40"></div></td>
        <td className="p-4"><div className="h-4 bg-gray-300 rounded w-24 mb-1"></div><div className="h-4 bg-gray-300 rounded w-20"></div></td>
        <td className="p-4 flex justify-center gap-2"><div className="w-8 h-8 bg-gray-300 rounded-full"></div><div className="w-8 h-8 bg-gray-300 rounded-full"></div></td>
      </tr>
    ))}
  </>
);

export default function MappingPage() {
  const { selectedBusiness, loading: businessLoading } = useBusiness();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  // 1️⃣ FIX: Race Condition Guard
  const skuCheckRequestRef = useRef(0);

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<"mapping" | "mustMapped" | "unmapped" | "expirations">("mapping");
  const [selectedProducts, setSelectedProducts] = useState<{ id: string; quantity: number }[]>([]);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  
  // SKU Check State
  const [skuCheckStatus, setSkuCheckStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [skuCheckMessage, setSkuCheckMessage] = useState("");

  // History & Sync State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistorySku, setSelectedHistorySku] = useState("");
  const [historyMappingId, setHistoryMappingId] = useState<string | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editHistoryForm, setEditHistoryForm] = useState({ mfg: "", pkg: "", validFrom: "", validTill: "" });
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; sku: string; } | null>(null);

  // --- 2. RHF INITIALIZATION ---
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError, // 3️⃣ FIX: Imported setError
    formState: { errors: formErrors }
  } = useForm({
    resolver: zodResolver(ProductMappingSchema),
    defaultValues: {
      salesSku: "",
      manufacturingPrice: 0,
      packagingCost: 0,
      validFrom: new Date(),
      inventoryProductIds: [] 
    }
  });

  const watchedSku = watch("salesSku");
  const watchedMfgPrice = watch("manufacturingPrice");

  // --- REACT QUERY ---
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', selectedBusiness?.gstin],
    queryFn: async () => {
      const res = await api.get("/inventory", { params: { gstin: selectedBusiness?.gstin } });
      return res.data as InventoryItem[];
    },
    enabled: !!selectedBusiness?.gstin,
  });

  const { data: mappings = [], isLoading: mappingsLoading } = useQuery({
    queryKey: ['mappings', selectedBusiness?.gstin],
    queryFn: async () => {
      const res = await api.get("/mappings", { params: { gstin: selectedBusiness?.gstin } });
      return res.data as SkuMapping[];
    },
    enabled: !!selectedBusiness?.gstin,
  });

  const { data: mustMappedSkus = [] } = useQuery({
    queryKey: ['unmapped', selectedBusiness?.gstin],
    queryFn: async () => {
      const res = await api.get("/mappings/unmapped", { params: { gstin: selectedBusiness?.gstin } });
      return res.data as string[];
    },
    enabled: !!selectedBusiness?.gstin,
  });

  const { data: historyData = [], isLoading: historyLoading } = useQuery({
    queryKey: ['mappingHistory', historyMappingId],
    queryFn: async () => {
      const res = await api.get(`/mappings/history/${historyMappingId}`);
      return res.data as HistoryRecord[];
    },
    enabled: !!historyMappingId && showHistoryModal,
  });

  const pageLoading = inventoryLoading || mappingsLoading;

  // --- MUTATIONS ---
  const syncMutation = useMutation({
    mutationFn: async () => api.post("/orders/process-inventory", { gstin: selectedBusiness?.gstin }),
    onMutate: () => {
        setSyncStatus("syncing");
        setSyncMessage("Syncing inventory...");
    },
    onSuccess: (response) => {
      const { ordersProcessed,  ordersSkipped } = response.data.results;
      setSyncStatus("success");
      setSyncMessage(`Auto-Sync Complete: Processed ${ordersProcessed} orders, ${ordersSkipped} orders Skipped.`);
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
      queryClient.invalidateQueries({ queryKey: ['unmapped'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setTimeout(() => { setSyncStatus("idle"); setSyncMessage(""); }, 5000);
    },
    // 👇 UPDATED: Backend Error Message
    onError: (err: any) => {
      setSyncStatus("error");
      const backendErrorMessage = err.response?.data?.error || err.message || "Auto-sync failed.";
      
       toast.error("Auto-sync failed.", { description: backendErrorMessage });
    }
  });

  const saveMappingMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingMappingId) {
        return api.put(`/mappings/${editingMappingId}`, data);
      } else {
        return api.post("/mappings", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
      queryClient.invalidateQueries({ queryKey: ['unmapped'] });
      resetForm();
      syncMutation.mutate(); 
    },
    // 👇 UPDATED: Backend Error Message
    onError: (err: any) => {
      const backendErrorMessage = err.response?.data?.error || err.message || `Failed to ${editingMappingId ? "update" : "create"} mapping.`;
      toast.error("Mapping failed.", { description: backendErrorMessage });
    }
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      return api.delete(`/mappings/${mappingId}`, { data: { gstin: selectedBusiness?.gstin } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
      queryClient.invalidateQueries({ queryKey: ['unmapped'] });
      toast.success("Mapping deleted successfully");
      syncMutation.mutate(); 
    },
    // 👇 UPDATED: Backend Error Message
    onError: (err: any) => {
      const backendErrorMessage = err.response?.data?.error || err.message || "Failed to delete mapping.";
      toast.error("Delete failed.", { description: backendErrorMessage });
    }
  });

  const updateHistoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return api.put(`/mappings/history/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappingHistory', historyMappingId] });
      setEditingHistoryId(null);
      toast.success("History updated successfully");
    },
    // 👇 UPDATED: Backend Error Message
    onError: (err: any) => {
        const backendErrorMessage = err.response?.data?.error || err.message || "Failed to update history record.";
        toast.error("Update Failed", { description: backendErrorMessage });
    }
  });

  // --- EFFECTS ---
  useEffect(() => {
    const skuParam = searchParams.get('sku');
    if (skuParam) {
      setValue("salesSku", skuParam);
      setActiveTab("mapping");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [searchParams, setValue]);

  const lastSyncedGstin = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedBusiness?.gstin) return;
    if (lastSyncedGstin.current === selectedBusiness.gstin) return;
    lastSyncedGstin.current = selectedBusiness.gstin;
    syncMutation.mutate();
  }, [selectedBusiness?.gstin]);

  useEffect(() => {
    if (selectedProducts.length === 0) {
      setValue("manufacturingPrice", 0);
      return;
    }
    const totalCost = selectedProducts.reduce((acc, selectedProduct) => {
      const inventoryItem = inventory.find((item) => item._id === selectedProduct.id);
      const itemPrice = inventoryItem?.price || 0;
      return acc + itemPrice * selectedProduct.quantity;
    }, 0);
    setValue("manufacturingPrice", parseFloat(totalCost.toFixed(2)));
    setValue("inventoryProductIds", selectedProducts.map(p => p.id), { shouldValidate: true });
  }, [selectedProducts, inventory, setValue]);

  useEffect(() => {
    setSkuCheckStatus("idle");
    setSkuCheckMessage("");
  }, [watchedSku]);

  // --- HANDLERS ---

  // 1️⃣ FIX: SKU Check Race Condition Logic
  const handleSkuCheck = async () => {
    const currentSku = watchedSku?.trim();
    if (!currentSku || !selectedBusiness) return;

    // Increment request ID
    const requestId = ++skuCheckRequestRef.current;

    setSkuCheckStatus("checking");
    setSkuCheckMessage("Checking...");

    try {
      const { data } = await api.get(`/mappings/check-sku/${currentSku}`, {
        params: { gstin: selectedBusiness.gstin },
      });

      // Ignore stale response
      if (requestId !== skuCheckRequestRef.current) return;

      const currentMapping = mappings.find((m) => m._id === editingMappingId);

      if (data.isTaken && currentMapping?.sku !== currentSku) {
        setSkuCheckStatus("taken");
        setSkuCheckMessage("SKU is already in use.");
      } else {
        setSkuCheckStatus("available");
        setSkuCheckMessage("SKU is available!");
      }
    } catch (err: any) {
      // Ignore stale response
      if (requestId !== skuCheckRequestRef.current) return;
      setSkuCheckStatus("idle");
      // 👇 UPDATED: Backend Error Message
      const backendErrorMessage = err.response?.data?.error || err.message || "Failed to check SKU.";
      toast.error("SKU Check failed.", { description: backendErrorMessage });
    }
  };

  const resetForm = () => {
    reset({
        salesSku: "",
        manufacturingPrice: 0,
        packagingCost: 0,
        validFrom: new Date(),
        inventoryProductIds: []
    });
    setSelectedProducts([]);
    setSkuCheckStatus("idle");
    setSkuCheckMessage("");
    setEditingMappingId(null);
    toast.success("Reset successful");
  };

  const handleEditClick = (mapping: SkuMapping) => {
    setActiveTab("mapping");
    setEditingMappingId(mapping._id);
    
    // Set RHF values
    setValue("salesSku", mapping.sku);
    setValue("packagingCost", mapping.packagingCost);
    setValue("validFrom",  mapping.validFrom ? new Date(mapping.validFrom) : new Date);
    
    // 2️⃣ FIX: Reset SKU check on edit
    setSkuCheckStatus("idle");
    setSkuCheckMessage("");

    const products = mapping.mappedProducts
      .map((p) => ({ id: p.inventoryItem?._id, quantity: p.quantity }))
      .filter((p) => p.id);
    setSelectedProducts(products);
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleHistoryClick = (mapping: SkuMapping) => {
    setSelectedHistorySku(mapping.sku);
    setHistoryMappingId(mapping._id); 
    setShowHistoryModal(true);
    setEditingHistoryId(null);
  };

  // --- SUBMIT HANDLER ---
  const onSubmit = async (data: MappingFormValues) => {
    if (!selectedBusiness) {
      toast.error("No business selected.");
      return;
    }

    // 3️⃣ FIX: Block Submission & Show Error if SKU is Taken
    if (!editingMappingId && skuCheckStatus === "taken") {
        setError("salesSku", {
            type: "manual",
            message: "This SKU is already in use."
        });
        return;
    }

    let formattedValidFrom = undefined;
    if (data.validFrom) {
        const now = new Date();
        const selectedDate = new Date(data.validFrom);
        selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        formattedValidFrom = selectedDate.toISOString();
    }

    const mappingData = {
      gstin: selectedBusiness.gstin,
      sku: data.salesSku.trim(),
      manufacturingPrice: data.manufacturingPrice,
      packagingCost: data.packagingCost || 0,
      mappedProducts: selectedProducts.map((p) => ({ inventoryItem: p.id, quantity: p.quantity })),
      validFrom: formattedValidFrom,
    };

    saveMappingMutation.mutate(mappingData);
  };

  // --- Helpers ---
  const handleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.some((p) => p.id === productId)
        ? prev.filter((p) => p.id !== productId)
        : [...prev, { id: productId, quantity: 1 }]
    );
  };
  
  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p))
    );
  };
  
  const handleMustMapClick = (skuToMap: string) => {
    setValue("salesSku", skuToMap);
    setActiveTab("mapping");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEditingHistory = (record: HistoryRecord) => {
    setEditingHistoryId(record._id);
    setEditHistoryForm({
      mfg: record.manufacturingPrice.toString(),
      pkg: record.packagingCost.toString(),
      validFrom: record.validFrom ? new Date(record.validFrom).toISOString().split("T")[0] : "",
      validTill: record.validTill ? new Date(record.validTill).toISOString().split("T")[0] : "",
    });
  };

  const cancelHistoryEdit = () => {
    setEditingHistoryId(null);
    setEditHistoryForm({ mfg: "", pkg: "", validFrom: "", validTill: "" });
  };

  const saveHistoryEdit = (historyId: string) => {
    updateHistoryMutation.mutate({
      id: historyId,
      data: {
        manufacturingPrice: editHistoryForm.mfg,
        packagingCost: editHistoryForm.pkg,
        validFrom: editHistoryForm.validFrom,
        validTill: editHistoryForm.validTill,
      }
    });
  };

  const handleDeleteMapping = (mappingId: string, skuToDelete: string) => {
    if (!selectedBusiness) {
      toast.error("No business selected.");
      return;
    }
     setDeleteTarget({ id: mappingId, sku: skuToDelete });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
  };

  const isInfinite = (dateStr?: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    return d.getFullYear() > 2100;
  };

  const expiringMappings = mappings.filter(
    (m) => m.expiryStatus === "expired" || m.expiryStatus === "expiring_soon"
  );

  if (businessLoading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading business data...</div>;
  if (!selectedBusiness) return <div className="p-4 m-4 bg-yellow-100 text-yellow-800 rounded-md">Please select a business to manage SKU mappings.</div>;

  return (
    <ProtectRoute permission="inventory">
      <div className=" min-h-screen text-gray-600 w-full p-6 lg:p-8 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-autohide">
       <div className="w-full px-2 py-1 sm:px-2 lg:px-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">SKU Mapping</h1>

          {syncStatus !== "idle" && (
            <div className={`mb-6 rounded-lg px-4 py-3 shadow-sm border flex items-center gap-3 transition-all duration-300 ${syncStatus === "syncing" ? "bg-blue-50 border-blue-200 text-blue-700" : syncStatus === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              {syncStatus === "syncing" && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
              {syncStatus === "success" && <CheckCircle className="w-5 h-5 text-green-600" />}
              {syncStatus === "error" && <XCircle className="w-5 h-5 text-red-600" />}
              
              <div className="flex-1">
                <p className="text-sm font-medium">{syncStatus === "syncing" ? "Auto-Syncing..." : syncStatus === "success" ? "Sync Successful" : "Sync Error"}</p>
                {syncMessage && <p className="text-xs opacity-90">{syncMessage}</p>}
              </div>
            </div>
          )}

          {/* --- Tabs --- */}
          <div className="border-b border-slate-200 mb-6">
            <nav className="flex space-x-4">
              <button onClick={() => setActiveTab("mapping")} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === "mapping" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>Product Mapping</button>
              <button onClick={() => setActiveTab("mustMapped")} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === "mustMapped" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>Must Mapped SKUs ({mustMappedSkus.length})</button>
              <button onClick={() => setActiveTab("unmapped")} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === "unmapped" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-500 hover:text-slate-700"}`}>Unmapped Catalog</button>
              <button onClick={() => setActiveTab("expirations")} className={`px-3 py-2 font-medium text-sm rounded-t-lg flex items-center gap-2 ${activeTab === "expirations" ? "border-b-2 border-red-600 text-red-600" : "text-slate-500 hover:text-red-600"}`}>
                Expiry Alerts
                {expiringMappings.length > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{expiringMappings.length}</span>}
              </button>
            </nav>
          </div>
          {activeTab === "mapping" && (
            <>
              {/* --- Form --- */}
              <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{editingMappingId ? "Update SKU Mapping" : "Create New Mapping"}</h2>
                    <p className="text-slate-500 text-sm">{editingMappingId ? `Updating will archive current prices to history.` : "Link a sales SKU to your inventory items."}</p>
                  </div>
                  {editingMappingId && <button type="button" onClick={resetForm} className="text-sm font-semibold text-red-600 hover:text-red-800">Cancel Edit</button>}
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT COLUMN */}
                  <div className="space-y-4">
                    
                    {/* --- SKU Field --- */}
                    <div>
                      <label className="text-sm font-medium text-slate-700">Enter Sales SKU</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input 
                            type="text" 
                            placeholder="e.g., TSHIRT-BLUE-L" 
                            className={`flex-grow p-2 border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${formErrors.salesSku ? "border-red-500 focus:ring-red-200" : "border-slate-300 focus:ring-blue-200"}`} 
                            {...register("salesSku")}
                        />
                        <button type="button" onClick={handleSkuCheck} disabled={!watchedSku || skuCheckStatus === "checking"} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-300 flex items-center gap-2">
                          <Search size={16} /> {skuCheckStatus === "checking" ? "Checking..." : "Check"}
                        </button>
                      </div>
                      
                      {formErrors.salesSku && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-red-600 font-medium animate-pulse">
                             <AlertTriangle size={12} /> {formErrors.salesSku.message}
                          </div>
                      )}

                      {skuCheckMessage && !formErrors.salesSku && <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${skuCheckStatus === "available" ? "text-green-600" : skuCheckStatus === "taken" ? "text-red-600" : "text-slate-500"}`}>{skuCheckStatus === "available" && <CheckCircle size={14} />}{skuCheckStatus === "taken" && <XCircle size={14} />}{skuCheckMessage}</div>}
                    </div>

                    {/* --- Mfg Price Field --- */}
                    <div>
                      <label className="text-sm font-medium text-slate-700">Manufacturing Price (₹)</label>
                      <input 
                        type="number" 
                        value={watchedMfgPrice} 
                        readOnly 
                        placeholder="Auto-calculated" 
                        className="w-full p-2 border rounded-md text-slate-900 placeholder:text-slate-400 bg-slate-100 cursor-not-allowed mt-1" 
                      />
                      {formErrors.manufacturingPrice && <p className="text-red-500 text-xs mt-1">{formErrors.manufacturingPrice.message}</p>}
                      <p className="text-xs text-slate-500 mt-1">Auto-calculated from selected inventory items.</p>
                    </div>

                    {/* --- Packaging Cost Field --- */}
                    <div>
                      <label className="text-sm font-medium text-slate-700">Packaging Cost (₹)</label>
                      <input 
                        type="number" 
                        placeholder="Enter packaging cost" 
                        className={`w-full p-2 border rounded-md text-slate-900 placeholder:text-slate-400 mt-1 focus:outline-none focus:ring-2 ${formErrors.packagingCost ? "border-red-500 focus:ring-red-200" : "border-slate-300 focus:ring-blue-200"}`} 
                        {...register("packagingCost", { valueAsNumber: true })}
                      />
                      {formErrors.packagingCost && <p className="text-red-500 text-xs mt-1">{formErrors.packagingCost.message}</p>}
                    </div>

                    {/* --- Date Field --- */}
<div>
  <label className="text-sm font-medium text-slate-700">Valid From</label>
  <input
    type="date"
    className={`w-full p-2 border rounded-md text-slate-900 mt-1 focus:outline-none focus:ring-2 ${
      formErrors.validFrom
        ? "border-red-500 focus:ring-red-200"
        : "border-slate-300 focus:ring-blue-200"
    }`}
    value={
      watch("validFrom")
        // Fix: Cast as 'any' or 'string | Date' to satisfy TypeScript
        ? new Date(watch("validFrom") as string | Date).toISOString().split("T")[0]
        : ""
    }
    onChange={(e) =>
      setValue(
        "validFrom",
        e.target.value ? new Date(e.target.value) : new Date(),
        { shouldValidate: true }
      )
    }
  />
  {formErrors.validFrom && (
    <p className="text-red-500 text-xs mt-1">{formErrors.validFrom.message}</p>
  )}
</div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="font-semibold text-slate-700">Select Inventory Products</label>
                        {formErrors.inventoryProductIds && (
                            <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded border border-red-200">
                                {formErrors.inventoryProductIds.message}
                            </span>
                        )}
                    </div>
                    
                    <div className={`border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1 transition-colors ${formErrors.inventoryProductIds ? "border-red-300 bg-red-50/10" : "border-slate-200"}`}>
                      {pageLoading ? (
                        <InventorySkeleton /> 
                      ) : inventory.length > 0 ? (
                        inventory.map((item) => (
                          <label key={item._id} className="flex items-center gap-3 p-2 rounded-md cursor-pointer has-[:checked]:bg-blue-50 hover:bg-slate-50 transition-colors">
                            <input type="checkbox" checked={selectedProducts.some((p) => p.id === item._id)} onChange={() => handleProductSelection(item._id)} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                            <span className="text-slate-700 text-sm">{item.title}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 p-4 text-center">No inventory items found.</p>
                      )}
                    </div>
                  </div>
                </div>
                {selectedProducts.length > 0 && (
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-2 text-slate-800">Set Quantities</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {selectedProducts.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded-lg">
                          <span className="flex-1 text-slate-700 font-medium">{inventory.find((i) => i._id === p.id)?.title}</span>
                          <input type="number" value={p.quantity} onChange={(e) => handleQuantityChange(p.id, parseInt(e.target.value))} className="w-20 p-1 border rounded-md text-center text-slate-900" min="1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pt-4">
                  <button 
                    type="submit" 
                    className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg flex items-center gap-2 text-white font-semibold disabled:bg-green-300" 
                    // 4️⃣ FIX: Disable logic ensures check is performed for new mappings
                    disabled={
                      skuCheckStatus === "checking" || 
                      (!editingMappingId && skuCheckStatus === "idle") || 
                      (skuCheckStatus === "taken" && !editingMappingId) || 
                      saveMappingMutation.isPending
                    }
                  >
                    {saveMappingMutation.isPending ? <Loader2 className="animate-spin" /> : <FaLink />} 
                    {editingMappingId ? "Update Mapping & Sync" : "Map Products & Sync"}
                  </button>
                </div>
              </form>

              {/* ... Table and other tabs remain unchanged ... */}
              <div className="mt-12">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Existing SKU Mappings ({mappings.length})</h2>
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">SKU & Validity</th>
                        <th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">Mapped Products</th>
                        <th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">Costs</th>
                        <th className="p-3 text-center text-xs font-bold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pageLoading ? (
                        <TableRowSkeleton />
                      ) : mappings.length > 0 ? (
                        mappings.map((mapping) => (
                          <tr key={mapping._id} className="hover:bg-slate-50">
                            <td className="p-3 align-top">
                              <p className="font-mono font-semibold text-indigo-600 text-base">{mapping.sku}</p>
                              
                              <div className="mt-2 text-xs flex flex-col gap-1 text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} className="text-green-500"/> 
                                    <span className="font-medium">Started:</span> {formatDateTime(mapping.validFrom)}
                                </span>
                              </div>

                              {mapping.expiryStatus === 'expired' && <span className="inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">EXPIRED</span>}
                              {mapping.expiryStatus === 'expiring_soon' && <span className="inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">EXPIRING</span>}
                            </td>
                            <td className="p-3 align-top">
                              <div className="space-y-1">
                                {mapping.mappedProducts.map((p, index) => (
                                  <div key={index} className="flex justify-between items-center text-slate-700 bg-slate-50/50 p-1 rounded">
                                    <span>{p.inventoryItem?.title || "Item not found"}</span>
                                    <span className="font-semibold text-slate-500 ml-4">x {p.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 align-top text-slate-600">
                              <div><strong>Mfg:</strong> ₹{mapping.manufacturingPrice.toFixed(2)}</div>
                              <div><strong>Pkg:</strong> ₹{mapping.packagingCost.toFixed(2)}</div>
                              <div className="mt-1 pt-1 border-t border-slate-200 text-xs font-bold text-slate-800">
                                Total: ₹{(mapping.manufacturingPrice + mapping.packagingCost).toFixed(2)}
                              </div>
                            </td>
                            <td className="p-3 align-top text-center">
                              <div className="flex justify-center items-center gap-1">
                                <button onClick={() => handleHistoryClick(mapping)} className="p-2 text-slate-400 hover:bg-purple-100 hover:text-purple-600 rounded-full transition-colors" title="View Price History"><History size={16} /></button>
                                <button onClick={() => handleEditClick(mapping)} className="p-2 text-slate-400 hover:bg-blue-100 hover:text-blue-600 rounded-full transition-colors" title="Update Mapping"><Edit size={16} /></button>
                                <button onClick={() => handleDeleteMapping(mapping._id, mapping.sku)} className="p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors" title="Delete Mapping"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={4} className="text-center p-8 text-slate-500">No SKU mappings yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "mustMapped" && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-slate-800">Must Mapped SKUs</h2>
                <p className="text-slate-500 text-sm mt-1">Click <span className="font-bold text-slate-700">Map SKU</span> to pre-fill the form and resolve the mapping.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">SKU</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mustMappedSkus.length > 0 ? (
                      mustMappedSkus.map((skuStr, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-slate-700 font-medium">{skuStr}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleMustMapClick(skuStr)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-md shadow-sm transition-colors">
                              Map SKU
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={2} className="text-center py-8 text-slate-500">No unmapped SKUs found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === "expirations" && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="text-red-500" /> Expiring & Expired SKUs</h2>
                <p className="text-slate-500 text-sm mt-1">These SKUs have pricing that is either expired or expiring within 3 days. Please update their validity.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4 text-left font-semibold text-slate-600">SKU Details</th>
                      <th className="p-4 text-left font-semibold text-slate-600">Status</th>
                      <th className="p-4 text-left font-semibold text-slate-600">Validity Date</th>
                      <th className="p-4 text-center font-semibold text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {expiringMappings.length > 0 ? (
                      expiringMappings.map((mapping) => (
                        <tr key={mapping._id} className="hover:bg-red-50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-800 font-mono">{mapping.sku}</div>
                            <div className="text-xs text-slate-500 mt-1">Current Price: ₹{(mapping.manufacturingPrice + mapping.packagingCost).toFixed(2)}</div>
                          </td>
                          <td className="p-4">
                            {mapping.expiryStatus === 'expired' ? (
                               <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><XCircle size={12} /> Expired</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200"><AlertTriangle size={12} /> Expiring Soon</span>
                            )}
                          </td>
                          <td className="p-4">
                             <div className="text-slate-700 font-medium flex items-center gap-2"><Calendar size={14} className="text-slate-400"/>{mapping.validTill ? new Date(mapping.validTill).toLocaleDateString() : 'N/A'}</div>
                             <div className={`text-xs mt-1 ml-6 font-semibold ${mapping.daysLeft && mapping.daysLeft < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                {mapping.daysLeft !== undefined && mapping.daysLeft !== null ? mapping.daysLeft < 0 ? `${Math.abs(mapping.daysLeft)} days overdue` : `${mapping.daysLeft} days remaining` : ''}
                             </div>
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleEditClick(mapping)} className="bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 font-medium px-4 py-2 rounded-lg text-xs shadow-sm transition-all flex items-center justify-center gap-2 mx-auto">
                              <Edit size={14} /> Renew / Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500"><div className="flex flex-col items-center justify-center gap-2"><CheckCircle className="text-green-500 w-10 h-10 mb-2" /><p className="font-medium text-slate-700">All Good!</p><p className="text-xs">No expiring SKUs found. Everything is up to date.</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === "unmapped" && (
            <div className="text-center p-8 bg-white rounded-xl">
              <p>Unmapped Catalog tab content goes here.</p>
            </div>
          )}
        </div>

        {/* --- HISTORY POPUP MODAL --- */}
        {showHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Mapping History</h3>
                  <p className="text-sm text-slate-500 font-mono">SKU: {selectedHistorySku}</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600"><FaTimes size={20} /></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {historyLoading ? (
                <div className="space-y-6 py-4 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-gray-300 mt-2" />
                        <div className="flex-1 w-px bg-gray-200" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-gray-300 rounded" />
                        <div className="rounded-xl border bg-white p-4 space-y-4">
                          <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2"><div className="h-3 w-20 bg-gray-300 rounded" /><div className="h-4 w-16 bg-gray-300 rounded" /></div>
                            <div className="space-y-2"><div className="h-3 w-20 bg-gray-300 rounded" /><div className="h-4 w-16 bg-gray-300 rounded" /></div>
                            <div className="space-y-2"><div className="h-3 w-20 bg-gray-300 rounded" /><div className="h-4 w-20 bg-gray-300 rounded" /></div>
                          </div>
                          <div className="h-px bg-gray-200" />
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2"><div className="h-3 w-24 bg-gray-300 rounded" /><div className="h-4 w-20 bg-gray-300 rounded" /></div>
                            <div className="space-y-2"><div className="h-3 w-24 bg-gray-300 rounded" /><div className="h-4 w-20 bg-gray-300 rounded" /></div>
                          </div>
                        </div>
                      </div>
                      <div className="h-5 w-12 bg-gray-300 rounded mt-6" />
                    </div>
                  ))}
                </div>
                ) : historyData.length > 0 ? (
                  <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                    {historyData.map((record, index) => (
                      <div key={index} className="relative pl-6">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></div>
                        <div className="flex justify-between items-end mb-1">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{new Date(record.updatedAt).toLocaleString()}</div>
                          {editingHistoryId !== record._id && (
                            <button onClick={() => startEditingHistory(record)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Edit size={12} /> Edit</button>
                          )}
                        </div>

                        <div className={`p-3 rounded-lg border ${editingHistoryId === record._id ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100"}`}>
                          {editingHistoryId === record._id ? (
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1"><label className="block text-xs text-slate-500 mb-1">Mfg Price</label><input type="number" value={editHistoryForm.mfg} onChange={(e) => setEditHistoryForm({...editHistoryForm, mfg: e.target.value})} className="w-full p-1 text-sm border rounded" /></div>
                                <div className="flex-1"><label className="block text-xs text-slate-500 mb-1">Pkg Cost</label><input type="number" value={editHistoryForm.pkg} onChange={(e) => setEditHistoryForm({...editHistoryForm, pkg: e.target.value})} className="w-full p-1 text-sm border rounded" /></div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1"><label className="block text-xs text-slate-500 mb-1">Valid From</label><input type="date" value={editHistoryForm.validFrom} onChange={(e) => setEditHistoryForm({...editHistoryForm, validFrom: e.target.value})} className="w-full p-1 text-sm border rounded" /></div>
                                <div className="flex-1"><label className="block text-xs text-slate-500 mb-1">Valid Till</label><input type="date" value={editHistoryForm.validTill} onChange={(e) => setEditHistoryForm({...editHistoryForm, validTill: e.target.value})} className="w-full p-1 text-sm border rounded" /></div>
                              </div>
                              <div className="flex justify-end items-center gap-2 pt-2">
                                <button onClick={() => saveHistoryEdit(record._id)} className="p-2 bg-green-600 text-white rounded hover:bg-green-700" title="Save"><FaSave size={14} /></button>
                                <button onClick={cancelHistoryEdit} className="p-2 bg-slate-200 text-slate-600 rounded hover:bg-slate-300" title="Cancel"><X size={14} /></button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-2">
                                <div><span className="block text-xs text-slate-400">Mfg Price</span><span className="font-mono font-medium text-slate-700">₹{typeof record.manufacturingPrice === "number" ? record.manufacturingPrice.toFixed(2) : "0.00"}</span></div>
                                <div><span className="block text-xs text-slate-400">Pkg Cost</span><span className="font-mono font-medium text-slate-700">₹{record.packagingCost.toFixed(2)}</span></div>
                                <div><span className="block text-xs text-slate-400">Total</span><span className="font-mono font-bold text-indigo-600">₹{(record.manufacturingPrice + record.packagingCost).toFixed(2)}</span></div>
                              </div>
                              {(record.validFrom || record.validTill) && (
                                <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 pt-2 border-t border-slate-100 mt-1">
                                  {record.validFrom && <div><span className="block text-xs text-slate-400">Valid From</span><span className="text-xs font-medium text-slate-600">{new Date(record.validFrom).toLocaleDateString()}</span></div>}
                                  {record.validTill && <div><span className="block text-xs text-slate-400">Valid Till</span><span className="text-xs font-medium text-slate-600">{isInfinite(record.validTill) ? 'Active (Infinite)' : new Date(record.validTill).toLocaleDateString()}</span></div>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">No history found. This SKU has not been updated yet.</div>
                )}
              </div>
              <div className="p-4 bg-slate-50 border-t text-right">
                <button onClick={() => setShowHistoryModal(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">Close</button>
              </div>
            </div>
          </div>
        )}
      {deleteTarget && (
  <DeleteModal
    isOpen={!!deleteTarget}
    itemName={deleteTarget.sku}
    loading={deleteMappingMutation.isPending}
    onClose={() => setDeleteTarget(null)}
    onConfirm={() => {
      if (!deleteTarget) return;
      deleteMappingMutation.mutate(deleteTarget.id,{
         onSuccess: () => setDeleteTarget(null),
      });
    }}
  />
)}
      </div>
    </ProtectRoute>
  );
}