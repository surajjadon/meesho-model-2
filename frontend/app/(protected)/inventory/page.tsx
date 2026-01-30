"use client";
import ProtectRoute from "@/app/components/ProtectRoute";
import React, {
  useEffect,
  useState,
  useMemo,
  ChangeEvent,
  KeyboardEvent,
  useRef,
  useCallback,
} from "react";
import { useBusiness, api } from "../../../providers/GlobalProvider";
import {
  Filter,
  ChevronDown,
  Package,
  Boxes,
  TriangleAlert,
  PackageX,
  FileUp,
  X,
  Edit,
  Plus,
  Save,
  Trash2,
  AlertTriangle,
  Loader2, // Added for loading states
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { InventoryItemSchema } from "./../../Schema/inventory.schema";
import { handleApiError } from "@/lib/errorHandler";
// 1. Import React Query Hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DeleteModal from "../../components/modal/DeleteModal";

// ==========================================
// 1. INTERFACES (Unchanged)
// ==========================================
interface IInventoryItem {
  _id: string;
  title: string;
  category?: string;
  price?: number;
  stock?: number;
  hsnCode?: string;
  variation?: string;
  gstin?: string;
  featuredImage?: string;
}

interface IStockHistory {
  _id: string;
  change: number;
  previousStock: number;
  newStock: number;
  reason: "Manual Update" | "Order Fulfillment" | "Initial Stock";
  costPrice: number;
  availableStock: number;
  batchid: number | string;
  updatedAt: string;
}

const generateBatchId = () => {
  return `BATCH-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};


// ==========================================
// 3. HISTORY MODAL (Unchanged)
// ==========================================
const HistoryModal = ({
  isOpen,
  onClose,
  title,
  stockHistory,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  stockHistory: IStockHistory[];
  loading: boolean;
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"batch" | "stock" | "price" | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [localHistory, setLocalHistory] = useState<IStockHistory[]>([]);

  useEffect(() => {
    setLocalHistory(stockHistory);
  }, [stockHistory]);

  if (!isOpen) return null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const startEditing = (id: string, field: "batch" | "stock" | "price", currentValue: any) => {
    setEditingId(id);
    setEditingField(field);
    setEditValue(String(currentValue));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValue("");
  };

  const handleSaveBatch = async (historyId: string) => {
    const oldHistory = [...localHistory];
    setLocalHistory((prev) =>
      prev.map((h) =>
        h._id === historyId ? { ...h, batchid: editValue } : h
      )
    );
    cancelEditing();
    try {
      await api.patch(`/inventory/stock-history/${historyId}`, {
        batchid: editValue,
      });
    } catch (err: any) {
      setLocalHistory(oldHistory);
      handleApiError(err, "Failed to update history");
    }
  };

  const handleSaveStock = async (historyId: string) => {
    const oldHistory = [...localHistory];
    const numValue = Number(editValue);
    if(isNaN(numValue)) return;

    setLocalHistory((prev) =>
      prev.map((h) =>
        h._id === historyId ? { ...h, availableStock: numValue } : h
      )
    );
    cancelEditing();
    try {
      await api.patch(`/inventory/stock-history-Stock/${historyId}`, {
        availableStock: numValue,
      });
    } catch (err: any) {
      setLocalHistory(oldHistory);
      handleApiError(err, "Failed to update history");
    }
  };

  const handleSavePrice = async (historyId: string) => {
    const oldHistory = [...localHistory];
    const numValue = Number(editValue);
    if(isNaN(numValue)) return;

    setLocalHistory((prev) =>
      prev.map((h) =>
        h._id === historyId ? { ...h, costPrice: numValue } : h
      )
    );
    cancelEditing();
    try {
      await api.patch(`/inventory/stock-history-Price/${historyId}`, {
        costPrice: numValue,
      });
    } catch (err: any) {
      setLocalHistory(oldHistory);
      handleApiError(err, "Failed to update history");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, historyId: string) => {
    if (e.key === "Enter") {
      if (editingField === "batch") handleSaveBatch(historyId);
      if (editingField === "stock") handleSaveStock(historyId);
      if (editingField === "price") handleSavePrice(historyId);
    }
    if (e.key === "Escape") cancelEditing();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-8 relative flex flex-col max-h-[90vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-red-500 cursor-pointer"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-semibold text-slate-800 mb-4">
          History Log of {title}
        </h2>

        {loading ? (
          <div className="text-center py-8 text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={20} /> Loading history...
          </div>
        ) : localHistory.length > 0 ? (
          <div className="overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Batch ID</th>
                  <th className="p-3 text-center font-semibold text-slate-600">Available</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Consumed</th>
                  <th className="p-3 text-left font-semibold text-slate-600">Cost Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {localHistory.map((entry) => (
                  <tr key={entry._id}>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {formatDate(entry.updatedAt)}
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        {editingId === entry._id && editingField === "batch" ? (
                          <input
                            autoFocus
                            className="border px-2 py-1 rounded text-sm w-32 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, entry._id)}
                            onBlur={() => handleSaveBatch(entry._id)}
                          />
                        ) : (
                          <>
                            <span>{entry.batchid}</span>
                            <button
                              className="text-blue-600 text-xs hover:text-blue-800 cursor-pointer"
                              onClick={() => startEditing(entry._id, "batch", entry.batchid)}
                            >
                              <Edit size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-green-600">
                      <div className="flex items-center justify-center gap-2">
                        {editingId === entry._id && editingField === "stock" ? (
                          <input
                            autoFocus
                            type="number"
                            className="border px-2 py-1 rounded text-sm w-20 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, entry._id)}
                            onBlur={() => handleSaveStock(entry._id)}
                          />
                        ) : (
                          <>
                            <span>{entry.availableStock}</span>
                            <button
                              className="text-blue-600 text-xs hover:text-blue-800 cursor-pointer"
                              onClick={() => startEditing(entry._id, "stock", entry.availableStock)}
                            >
                              <Edit size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">
                      {entry.newStock - entry.availableStock}
                    </td>
                    <td className="p-3 text-slate-500 italic">
                      <div className="flex items-center gap-2">
                          {editingId === entry._id && editingField === "price" ? (
                          <div className="relative">
                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                            <input
                                autoFocus
                                type="number"
                                className="border pl-4 pr-2 py-1 rounded text-sm w-24 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, entry._id)}
                                onBlur={() => handleSavePrice(entry._id)}
                            />
                          </div>
                        ) : (
                          <>
                            <span>₹{entry.costPrice ?? 0}</span>
                            <button
                              className="text-blue-600 text-xs hover:text-blue-800 cursor-pointer"
                              onClick={() => startEditing(entry._id, "price", entry.costPrice ?? 0)}
                            >
                              <Edit size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">
            No stock history found.
          </p>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. STAT CARD (Unchanged)
// ==========================================
const StatCard = ({
  title,
  value,
  description,
  icon,
  colorClass = "text-slate-500",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  colorClass?: string;
}) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
    <div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-3xl font-bold text-slate-800 my-2">{value}</p>
    </div>
    <div className="flex justify-between items-end mt-2">
      <p className={`text-sm ${colorClass}`}>{description}</p>
      <div className="text-slate-400">{icon}</div>
    </div>
  </div>
);

// ==========================================
// 5. STATUS BADGE (Unchanged)
// ==========================================
const StatusBadge = ({
  status,
}: {
  status: { text: string; color: string };
}) => (
  <span
    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${status.color}`}
  >
    {status.text}
  </span>
);

// ==========================================
// 6. RESTOCK SUGGESTIONS (Unchanged)
// ==========================================
const RestockSuggestions = ({
  items,
  lowStockThreshold,
}: {
  items: IInventoryItem[];
  lowStockThreshold: number;
}) => (
  <div className=" bg-white p-6 rounded-xl shadow-lg border border-slate-200">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-bold text-slate-800">Restock suggestions</h3>
      <div className="text-sm text-slate-600 flex items-center gap-2 cursor-pointer">
        Next 14 days <ChevronDown size={16} />
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-2 text-left font-semibold text-slate-500">
              SKU
            </th>
            <th className="py-2 px-2 text-left font-semibold text-slate-500">
              Product
            </th>
            <th className="py-2 px-2 text-left font-semibold text-slate-500">
              Current stock
            </th>
            <th className="py-2 pl-2 text-left font-semibold text-slate-500">
              Suggestion
            </th>
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 3).map((item) => (
            <tr
              key={item._id}
              className="border-b last:border-b-0 hover:bg-slate-50"
            >
              <td className="py-3 pr-2 text-slate-500 font-mono">
                {item.hsnCode || "N/A"}
              </td>
              <td className="py-3 px-2 text-slate-800 font-medium">
                {item.title}
              </td>
              <td className="py-3 px-2 text-slate-600">{item.stock}</td>
              <td className="py-3 pl-2">
                {(item.stock || 0) < lowStockThreshold / 2 ? (
                  <button className="bg-red-500 text-white text-xs font-bold py-1 px-3 rounded-md cursor-pointer">
                    Order{" "}
                    {Math.ceil(
                      (lowStockThreshold * 2 - (item.stock || 0)) / 5
                    ) * 5}{" "}
                    units
                  </button>
                ) : (
                  <button className="bg-orange-400 text-white text-xs font-bold py-1 px-3 rounded-md cursor-pointer">
                    Order{" "}
                    {Math.max(
                      Math.ceil((lowStockThreshold - (item.stock || 0)) / 5) *
                        5,
                      5
                    )}{" "}
                    units
                  </button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center py-6 text-slate-500">
                No restock suggestions.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// ==========================================
// 7. ADD ITEM MODAL (Unchanged)
// ==========================================
const AddItemModal = ({
  isOpen,
  onClose,
  onCreate,
  // Added helper prop for loading state
  loading: parentLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (itemData: any) => void;
  loading?: boolean;
}) => {
  const [form, setForm] = useState({
    title: "",
    category: "",
    price: "",
    stock: "",
    hsnCode: "",
    variation: "",
    batchid: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [localLoading, setLocalLoading] = useState(false); // Kept for local validation logic
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setForm({
        title: "",
        category: "",
        price: "",
        stock: "",
        hsnCode: "",
        variation: "",
        batchid: "",
      });
      setFile(null);
      setLocalLoading(false);
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name;
    let schemaName = fieldName;
    if (fieldName === "batchid") schemaName = "batchId";
    if (fieldName === "hsnCode") schemaName = "hsnOrSku";
    
    if (errors[schemaName]) {
        setErrors(prev => ({...prev, [schemaName]: undefined} as any));
    }

    setForm((prev) => ({ ...prev, [fieldName]: e.target.value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (errors.image) {
          setErrors(prev => ({...prev, image: undefined} as any));
      }
      setFile(e.target.files?.[0] || null);
  }

  const handleSubmit = async () => {
    setErrors({});
    setLocalLoading(true);

    const validationData = {
        title: form.title,
        category: form.category || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        stock: form.stock ? parseInt(form.stock) : undefined,
        batchId: form.batchid,
        hsnOrSku: form.hsnCode || undefined,
        variation: form.variation || undefined,
        image: file || undefined
    };

    const validationResult = InventoryItemSchema.safeParse(validationData);

    if (!validationResult.success) {
        const newErrors: Record<string, string> = {};
        validationResult.error.issues.forEach(issue => {
            if (issue.path[0]) {
                newErrors[issue.path[0].toString()] = issue.message;
            }
        });
        setErrors(newErrors);
        setLocalLoading(false);
        return;
    }

    const payload: any = {
      ...form,
      featuredImageFile: file || null,
    };
    // Call parent handler
    onCreate(payload);
    setLocalLoading(false);
  };

  const isLoading = parentLoading || localLoading;

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-gray-600">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-600">
            Add New Inventory Item
          </h2>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 text-gray-600 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Title */}
          <div className="col-span-1">
             <input
                name="title"
                placeholder="Title *"
                value={form.title}
                onChange={handleChange}
                className={`border p-2 rounded w-full ${errors.title ? "border-red-500 bg-red-50" : ""}`}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Category */}
          <div className="col-span-1">
            <input
                name="category"
                placeholder="Category"
                value={form.category}
                onChange={handleChange}
                className={`border p-2 rounded w-full ${errors.category ? "border-red-500 bg-red-50" : ""}`}
            />
             {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>

          {/* Price */}
          <div className="col-span-1">
             <input
                name="price"
                placeholder="Price"
                type="number"
                value={form.price}
                onChange={handleChange}
                className={`border p-2 rounded w-full ${errors.price ? "border-red-500 bg-red-50" : ""}`}
            />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>

          {/* Stock */}
          <div className="col-span-1">
            <input
                name="stock"
                placeholder="Stock"
                type="number"
                value={form.stock}
                onChange={handleChange}
                className={`border p-2 rounded w-full ${errors.stock ? "border-red-500 bg-red-50" : ""}`}
            />
            {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
          </div>

          {/* Batch ID */}
          <div className="col-span-2">
            <input
                name="batchid"
                placeholder="Batch ID *"
                value={form.batchid}
                onChange={handleChange}
                className={`border p-2 rounded w-full ${errors.batchId ? "border-red-500 bg-red-50" : ""}`}
            />
            {errors.batchId && <p className="text-red-500 text-xs mt-1">{errors.batchId}</p>}
          </div>

          {/* HSN / SKU */}
          <div className="col-span-2">
             <input
                name="hsnCode"
                placeholder="HSN / SKU"
                value={form.hsnCode}
                onChange={handleChange}
                className={`border p-2 rounded w-full ${errors.hsnOrSku ? "border-red-500 bg-red-50" : ""}`}
            />
            {errors.hsnOrSku && <p className="text-red-500 text-xs mt-1">{errors.hsnOrSku}</p>}
          </div>

          {/* Variation */}
          <div className="col-span-2">
            <input
                name="variation"
                placeholder="Variation"
                value={form.variation}
                onChange={handleChange}
                className={`border p-2 rounded w-full ${errors.variation ? "border-red-500 bg-red-50" : ""}`}
            />
            {errors.variation && <p className="text-red-500 text-xs mt-1">{errors.variation}</p>}
          </div>

          {/* Image */}
          <div className="col-span-2">
            <label className={`cursor-pointer flex items-center gap-2 text-slate-700 border border-dashed rounded p-2 ${errors.image ? "border-red-500 bg-red-50" : "border-slate-300"}`}>
              <FileUp size={18} />
              Upload image
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
              />
            </label>
            {file && <p className="text-xs text-slate-500 mt-1">{file.name}</p>}
            {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="bg-slate-200 px-4 py-2 rounded cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer disabled:bg-blue-300 flex items-center gap-2"
          >
             {isLoading && <Loader2 className="animate-spin" size={16} />}
            {isLoading ? "Adding..." : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 8. MAIN PAGE COMPONENT (REFACTORED)
// ==========================================
export default function InventoryPage() {
  const { selectedBusiness, loading: businessLoading } = useBusiness();
  const queryClient = useQueryClient(); // Init Client
  
  // Local UI State (Unchanged)
  const [activeTab, setActiveTab] = useState("All inventory");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- STATE: Editing Row (Unchanged) ---
  const [editingRow, setEditingRow] = useState<{
    id: string;
    stock: string;
    price: string;
  } | null>(null);

  // --- STATE: Delete Modal (Unchanged) ---
  const [itemToDelete, setItemToDelete] = useState<IInventoryItem | null>(null);

  // --- STATE: History (Slightly modified to hold ID for Query) ---
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedItemTitle, setSelectedItemTitle] = useState("");
  // We track the ID to trigger the History Query
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const lowStockThreshold = 20;
  const stockInputRef = useRef<HTMLInputElement>(null);

  // --- 8.1 FETCH INVENTORY (Replaced useEffect with useQuery) ---
  const { data: inventory = [], isLoading: inventoryLoading } = useQuery<IInventoryItem[]>({

    queryKey: ["inventory", selectedBusiness?.gstin],
    queryFn: async () => {
        const res = await api.get("/inventory", {
            params: { gstin: selectedBusiness?.gstin },
        });
        return (res.data || []).filter((item: any) => item !== null);
    },
    enabled: !!selectedBusiness?.gstin,
  });

  // --- 8.2 FETCH HISTORY (Replaced manual handler logic with useQuery) ---
  // This query runs automatically when `historyItemId` is set and modal is open
  const { data: itemStockHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["history", historyItemId],
    queryFn: async () => {
        const res = await api.get(`/inventory/${historyItemId}/history`);
        return res.data || [];
    },
    enabled: !!historyItemId && historyModalOpen,
  });

  // --- 8.3 MUTATIONS (Replacing manual api calls + state updates) ---
  
  // Edit Mutation
const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
        return api.put(`/inventory/${id}`, payload);
    },
    onSuccess: () => {
        // 1. Broad Invalidation: Refetch ANY query starting with "inventory"
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        // 2. Close edit mode
        setEditingRow(null); 
        toast.success("Item updated successfully");
    },
    onError: (err) => handleApiError(err, "Failed to save changes.")
  });

  // Delete Mutation
const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
        return api.delete(`/inventory/${id}?gstin=${selectedBusiness?.gstin}`);
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["inventory"] }); // <--- Fixed
        setItemToDelete(null); 
        toast.success("Item deleted");
    },
    onError: (err) => handleApiError(err, "Failed to delete inventory item.")
  });

  // Create Mutation
const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
         return api.post("/inventory", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["inventory"] }); // <--- Fixed
        setAddModalOpen(false); 
        toast.success("Item created successfully");
    },
    onError: (err) => handleApiError(err, "Failed to create inventory item.")
  });

  // --- HANDLERS (Same structure, but triggering mutations) ---

  const handleStartEditing = (item: IInventoryItem) => {
    setEditingRow({
      id: item._id,
      stock: String(item.stock || 0),
      price: String(item.price || 0),
    });
    setTimeout(() => {
      if (stockInputRef.current) stockInputRef.current.focus();
    }, 0);
  };

  const handleCancelEditing = () => {
    setEditingRow(null);
  };

  const handleEditingChange = (field: "stock" | "price", value: string) => {
    if (!editingRow) return;
    setEditingRow({ ...editingRow, [field]: value });
  };

  const handleSaveEditing = async () => {
    if (!editingRow || !selectedBusiness?.gstin) return;
    const newStockInput = parseInt(editingRow.stock);
    const newPriceInput = parseFloat(editingRow.price);

    if (isNaN(newStockInput) || newStockInput < 0 || isNaN(newPriceInput) || newPriceInput < 0) {
      toast.error("Invalid Input", {
         description: "Please enter valid non-negative numbers for Stock and Price.",
      });
      return;
    }

    const itemId = editingRow.id;
    const batchId = generateBatchId();

    const payload = {
      stock: newStockInput,
      price: newPriceInput,
      gstin: selectedBusiness.gstin,
      batchid: batchId,
    };

    // Trigger Mutation
    editMutation.mutate({ id: itemId, payload });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveEditing();
    else if (e.key === "Escape") handleCancelEditing();
  };

  const handleDeleteClick = (item: IInventoryItem) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !selectedBusiness?.gstin) return;
    deleteMutation.mutate(itemToDelete._id);
  };

  // --- 8.4 COMPUTED STATS (Unchanged) ---
  const stats = useMemo(() => {
    const validItems = inventory.filter((i: any) => i !== null && i !== undefined);
    return {
      totalSKUs: validItems.length,
      unitsInStock: validItems.reduce((sum: number, item: any) => sum + (item.stock || 0), 0),
      lowStockSKUs: validItems.filter((item: any) => (item.stock || 0) > 0 && (item.stock || 0) <= lowStockThreshold).length,
      outOfStockSKUs: validItems.filter((item: any) => (item.stock || 0) <= 0).length,
    };
  }, [inventory, lowStockThreshold]);

  // FIX: Explicitly typing the categories mapping to solve the TypeScript error
  const categories = useMemo(
    () => {
        const validItems = inventory.filter((i: any) => i && i.category);
        const uniqueCats = new Set(validItems.map((i: any) => i.category as string));
        return ["All", ...Array.from(uniqueCats)];
    },
    [inventory]
  );

  const getStatus = useCallback((item: IInventoryItem) => {
    if (!item) return { text: "Unknown", key: "unknown", color: "bg-gray-100 text-gray-800" };
    const stock = item.stock || 0;
    if (stock <= 0) return { text: "Out of stock", key: "out-of-stock", color: "bg-red-100 text-red-800" };
    if (stock <= lowStockThreshold) return { text: "Low stock", key: "low-stock", color: "bg-orange-100 text-orange-800" };
    return { text: "In stock", key: "in-stock", color: "bg-green-100 text-green-800" };
  }, [lowStockThreshold]);

  const filteredInventory = useMemo(() => {
    return inventory
      .filter((item: any) => {
        if (!item) return false;
        if (activeTab === "Low stock") return getStatus(item).key === "low-stock";
        if (activeTab === "Out of stock") return getStatus(item).key === "out-of-stock";
        return true;
      })
      .filter((item: any) => statusFilter === "All" || getStatus(item).key === statusFilter)
      .filter((item: any) => categoryFilter === "All" || item.category === categoryFilter);
  }, [inventory, activeTab, statusFilter, categoryFilter]);

  // --- 8.5 HANDLERS: History & Modals (Preserving Logic) ---
  const handleViewHistory = async (item: IInventoryItem) => {
    if (!item) return;
    setSelectedItemTitle(item.title);
    setHistoryItemId(item._id); // Triggers the history useQuery
    setHistoryModalOpen(true);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0)
      setSelectedFile(e.target.files[0]);
  };

  const handleImport = () => {
    if (selectedFile)
     toast.info("Import feature coming soon!", {  
      description: "We're working hard to bring this feature to you.",
    });
  };

  const handleOpenAddModal = () => setAddModalOpen(true);

  const handleCreateItem = async (itemData: any) => {
    if (!selectedBusiness) return;
    const formData = new FormData();
    formData.append("gstin", selectedBusiness.gstin);
    Object.entries(itemData).forEach(([key, value]) => {
      if (key === "featuredImageFile" || key === "gstin") return;
      if (value !== null && value !== undefined && value !== "") {
        formData.append(key, String(value));
      }
    });
    if (itemData.featuredImageFile) {
      formData.append("featuredImage", itemData.featuredImageFile);
    }
    createMutation.mutate(formData);
  };

  if (businessLoading)
    return <div className="p-8 text-center">Loading business data...</div>;
  if (!selectedBusiness)
    return (
      <div className="p-4 m-4 bg-yellow-100 text-yellow-800 rounded-md">
        Please add and select a business on the Profile page.
      </div>
    );

  const isEditMode = editingRow !== null;

  return (
    <ProtectRoute permission="inventory">
      <div className=" min-h-screen w-full p-6 lg:p-8 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-autohide">
        {/* HEADER */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
              <p className="text-slate-500 mt-1">
                Track stock levels and restock before you run out
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenAddModal}
                className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> Add item
              </button>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200/80 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Filter size={16} /> Filter & import inventory
          </div>
          <div className="w-px h-6 bg-slate-200 hidden md:block"></div>

          <div className="relative">
            <select
              onChange={(e) => setStatusFilter(e.target.value)}
              value={statusFilter}
              className="appearance-none bg-slate-100/80 border-none rounded-md py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-500"
            >
              <option value="All">Status: All</option>
              <option value="in-stock">In stock</option>
              <option value="low-stock">Low stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>

          <div className="relative">
            <select
              onChange={(e) => setCategoryFilter(e.target.value)}
              value={categoryFilter}
              className="appearance-none bg-slate-100/80 border-none rounded-md py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-600"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "Category: All" : cat}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>

          <div className="flex-grow"></div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              id="inventory-file-upload"
              className="hidden"
              onChange={handleFileSelect}
              accept=".csv, .xlsx"
            />
            <label
              htmlFor="inventory-file-upload"
              className="border border-slate-300 rounded-md py-1.5 px-4 text-slate-600 cursor-pointer hover:bg-slate-50 truncate max-w-[150px]"
            >
              {selectedFile ? selectedFile.name : "Choose file"}
            </label>
            <button
              onClick={handleImport}
              disabled={!selectedFile || inventoryLoading}
              className="bg-blue-500 text-white font-semibold py-2 px-5 rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <FileUp size={16} /> Import inventory
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total SKUs"
            value={stats.totalSKUs}
            description="Across all channels"
            icon={<Boxes size={24} />}
          />
          <StatCard
            title="Units in stock"
            value={stats.unitsInStock.toLocaleString("en-IN")}
            description="Available to sell"
            icon={<Package size={24} />}
          />
          <StatCard
            title="Low stock SKUs"
            value={stats.lowStockSKUs}
            description="Below safety threshold"
            icon={<TriangleAlert size={24} />}
            colorClass="text-orange-600"
          />
          <StatCard
            title="Out of stock SKUs"
            value={stats.outOfStockSKUs}
            description="Need urgent restock"
            icon={<PackageX size={24} />}
            colorClass="text-red-600"
          />
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {["All inventory", "Low stock", "Out of stock"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 text-sm font-medium cursor-pointer ${
                activeTab === tab
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* SUGGESTIONS & CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">
              Stock by category
            </h3>
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400">
              Bar / donut chart placeholder
            </div>
          </div>
          <div className="lg:col-span-2">
            <RestockSuggestions
              items={inventory.filter(
                (item: any) => item && getStatus(item).key === "low-stock"
              )}
              lowStockThreshold={lowStockThreshold}
            />
          </div>
        </div>

        {/* INVENTORY TABLE */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">
              Inventory Details
            </h2>
            {isEditMode && (
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">
                Editing Mode Active
              </span>
            )}
          </div>
          {inventoryLoading ? (
            <div className="p-8 flex justify-center">
               <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left font-semibold text-slate-600">
                      SKU
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-600">
                      PRODUCT
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-600">
                      CATEGORY
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-600">
                      TOTAL STOCK
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-600">
                      AVERAGE PRICE
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-600">
                      STATUS
                    </th>
                    <th className="p-3 text-center font-semibold text-slate-600">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInventory.map((item: any) => {
                    const isEditing = editingRow?.id === item._id;

                    return (
                      <tr
                        key={item._id}
                        className={`hover:bg-slate-100 ${
                          isEditing ? "bg-blue-50" : ""
                        }`}
                      >
                        {/* Static Info (Always Visible) */}
                        <td
                          className="p-3 font-mono text-slate-500 cursor-pointer"
                          onClick={() => handleViewHistory(item)}
                        >
                          {item.hsnCode || "N/A"}
                        </td>
                        <td
                          className="p-3 font-medium text-slate-800 cursor-pointer"
                          onClick={() => handleViewHistory(item)}
                        >
                          {item.title}{" "}
                          {item.variation && (
                            <span className="text-slate-500">
                              ({item.variation})
                            </span>
                          )}
                        </td>
                        <td
                          className="p-3 text-slate-600 cursor-pointer"
                          onClick={() => handleViewHistory(item)}
                        >
                          {item.category}
                        </td>

                        {/* Editable Stock Column */}
                        <td className="p-3 text-slate-800">
                          {isEditing ? (
                            <input
                              ref={stockInputRef}
                              type="number"
                              min={0}
                              value={editingRow?.stock || ""}
                              onChange={(e) =>
                                handleEditingChange("stock", e.target.value)
                              }
                              onKeyDown={handleKeyDown}
                              className="w-24 p-2 border rounded-md border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none bg-white shadow-sm"
                              placeholder="Stock"
                            />
                          ) : (
                            <span className="font-semibold text-slate-700">
                              {item.stock ?? 0}
                            </span>
                          )}
                        </td>

                        {/* Editable Price Column */}
                        <td className="p-3 text-slate-800">
                          {isEditing ? (
                            <div className="relative w-28">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                                ₹
                              </span>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editingRow?.price || ""}
                                onChange={(e) =>
                                  handleEditingChange("price", e.target.value)
                                }
                                onKeyDown={handleKeyDown}
                                className="w-full pl-5 p-2 border rounded-md border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none bg-white shadow-sm"
                                placeholder="Price"
                              />
                            </div>
                          ) : (
                            <span className="font-medium">
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                              }).format(item.price || 0)}
                            </span>
                          )}
                        </td>

                        {/* Status (Always Visible) */}
                        <td
                          className="p-3 cursor-pointer"
                          onClick={() => handleViewHistory(item)}
                        >
                          <StatusBadge status={getStatus(item)} />
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={handleSaveEditing}
                                className="p-2 text-green-600 bg-white border border-green-200 hover:bg-green-50 rounded shadow-sm transition-colors cursor-pointer"
                                title="Save"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={handleCancelEditing}
                                className="p-2 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded shadow-sm transition-colors cursor-pointer"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                                <button
                                disabled={isEditMode}
                                onClick={() => handleStartEditing(item)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                    isEditMode
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                }`}
                                title="Edit Row"
                                >
                                <Edit size={16} />
                                </button>
                                
                                {/* DELETE BUTTON - Triggers Modal */}
                                <button
                                disabled={isEditMode}
                                onClick={() => handleDeleteClick(item)}
                                className={`p-1 rounded-full transition-colors cursor-pointer ${
                                    isEditMode
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                }`}
                                aria-label="Delete inventory item"
                                >
                                <Trash2 size={16} />
                                </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-12 text-slate-500"
                      >
                        No inventory items match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 py-4">
          Inventory is synced from your latest Excel imports and sales activity.
          Use filters above to focus on specific warehouses or categories.
        </p>

        <HistoryModal
          isOpen={historyModalOpen}
          onClose={() => {
              setHistoryModalOpen(false);
              setHistoryItemId(null); // Clear ID on close
          }}
          title={selectedItemTitle}
          stockHistory={itemStockHistory}
          loading={historyLoading}
        />

        <AddItemModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onCreate={handleCreateItem}
          loading={createMutation.isPending}
        />

        {/* --- 9. RENDER DELETE MODAL --- */}
        <DeleteModal 
            isOpen={!!itemToDelete}
            onClose={() => setItemToDelete(null)}
            onConfirm={handleConfirmDelete}
            itemName={itemToDelete?.title || ""}
            loading={deleteMutation.isPending}
        />
      </div>
    </ProtectRoute>
  );
}