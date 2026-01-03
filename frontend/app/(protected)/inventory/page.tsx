"use client";
import ProtectRoute from "@/components/ProtectRoute";
import React, {
  useEffect,
  useState,
  useMemo,
  ChangeEvent,
  KeyboardEvent,
  useRef,
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
  PackagePlus,
  Plus,
  Save,
} from "lucide-react";

// ==========================================
// 1. INTERFACES
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
  notes?: string;
  createdAt: string;
}

interface IPriceHistory {
  _id: string;
  change: number;
  previousPrice: number;
  newPrice: number;
  reason: string;
  notes?: string;
  createdAt: string;
}

// ==========================================
// 2. HISTORY MODAL
// ==========================================
const HistoryModal = ({
  isOpen,
  onClose,
  title,
  stockHistory,
  priceHistory,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  stockHistory: IStockHistory[];
  priceHistory: IPriceHistory[];
  loading: boolean;
}) => {
  const [activeHistoryTab, setActiveHistoryTab] = useState<'stock' | 'price'>('stock');

  useEffect(() => {
    if (isOpen) setActiveHistoryTab('stock');
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const getReasonIcon = (reason: string) => {
    if (reason.includes("Initial")) return <PackagePlus size={16} className="text-green-500" />;
    if (reason.includes("Manual")) return <Edit size={16} className="text-yellow-500" />;
    return <Edit size={16} className="text-slate-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 relative flex flex-col max-h-[90vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-red-500 z-10"
        >
          <X size={24} />
        </button>

        <div className="flex-shrink-0 mb-4">
          <h2 className="text-2xl font-semibold text-slate-800 mb-1">History Log</h2>
          <p className="text-slate-600 font-medium mb-4">{title}</p>
          
          <div className="flex space-x-4 border-b border-slate-200">
            <button
              className={`pb-2 px-4 font-medium text-sm transition-colors cursor-pointer ${
                activeHistoryTab === 'stock'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveHistoryTab('stock')}
            >
              Stock History
            </button>
            <button
              className={`pb-2 px-4 font-medium text-sm transition-colors  ${
                activeHistoryTab === 'price'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setActiveHistoryTab('price')}
            >
              Price History
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading history...</div>
          ) : activeHistoryTab === 'stock' ? (
            stockHistory.length > 0 ? (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Reason</th>
                    <th className="p-3 text-center font-semibold text-slate-600">Change</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Stock Level</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stockHistory.map((entry) => (
                    <tr key={entry._id}>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                      <td className="p-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          {getReasonIcon(entry.reason)} {entry.reason}
                        </div>
                      </td>
                      <td className={`p-3 text-center font-bold ${entry.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {entry.change > 0 ? `+${entry.change}` : entry.change}
                      </td>
                      <td className="p-3 text-slate-600">
                        {entry.previousStock} → <span className="font-bold text-slate-800">{entry.newStock}</span>
                      </td>
                      <td className="p-3 text-slate-500 italic">{entry.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-slate-500 py-8">No stock history found.</p>
            )
          ) : (
            priceHistory.length > 0 ? (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Reason</th>
                    <th className="p-3 text-center font-semibold text-slate-600">Change</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Price Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {priceHistory.map((entry) => (
                    <tr key={entry._id}>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                      <td className="p-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                           {getReasonIcon(entry.reason)} {entry.reason}
                         </div>
                      </td>
                      <td className={`p-3 text-center font-bold ${entry.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {entry.change > 0 ? `+${formatCurrency(entry.change)}` : formatCurrency(entry.change)}
                      </td>
                      <td className="p-3 text-slate-600">
                        {formatCurrency(entry.previousPrice)} → <span className="font-bold text-slate-800">{formatCurrency(entry.newPrice)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-slate-500 py-8">No price history found.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. STAT CARD
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
// 4. STATUS BADGE
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
// 5. RESTOCK SUGGESTIONS
// ==========================================
const RestockSuggestions = ({
  items,
  lowStockThreshold,
}: {
  items: IInventoryItem[];
  lowStockThreshold: number;
}) => (
  <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
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
                  <button className="bg-red-500 text-white text-xs font-bold py-1 px-3 rounded-md">
                    Order{" "}
                    {Math.ceil(
                      (lowStockThreshold * 2 - (item.stock || 0)) / 5
                    ) * 5}{" "}
                    units
                  </button>
                ) : (
                  <button className="bg-orange-400 text-white text-xs font-bold py-1 px-3 rounded-md">
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
// 6. ADD ITEM MODAL
// ==========================================
const AddItemModal = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (itemData: any) => void;
}) => {
  const [form, setForm] = useState({
    title: "",
    category: "",
    price: "",
    stock: "",
    hsnCode: "",
    variation: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm({
        title: "",
        category: "",
        price: "",
        stock: "",
        hsnCode: "",
        variation: "",
      });
      setFile(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        ...form,
        featuredImageFile: file || null,
      };
      onCreate(payload);
      onClose();
    } catch (err) {
      console.error("Modal submit error", err);
      alert("Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 text-gray-600">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-600">Add New Inventory Item</h2>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 text-gray-600 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            name="title"
            placeholder="Title *"
            value={form.title}
            onChange={handleChange}
            className="border p-2 rounded"
          />
          <input
            name="category"
            placeholder="Category"
            value={form.category}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="price"
            placeholder="Price"
            value={form.price}
            onChange={handleChange}
            className="border p-2 rounded"
          />
          <input
            name="stock"
            placeholder="Stock"
            value={form.stock}
            onChange={handleChange}
            className="border p-2 rounded"
          />

          <input
            name="hsnCode"
            placeholder="HSN / SKU"
            value={form.hsnCode}
            onChange={handleChange}
            className="border p-2 rounded col-span-2"
          />
          <input
            name="variation"
            placeholder="Variation"
            value={form.variation}
            onChange={handleChange}
            className="border p-2 rounded col-span-2"
          />

          <div className="col-span-2">
            <label className="cursor-pointer flex items-center gap-2 text-slate-700">
              <FileUp size={18} />
              Upload image
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="image/*"
              />
            </label>
            {file && <p className="text-xs text-slate-500 mt-1">{file.name}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="bg-slate-200 px-4 py-2 rounded cursor-pointer">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer"
          >
            {loading ? "Adding..." : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 7. MAIN PAGE COMPONENT
// ==========================================
export default function InventoryPage() {
  const { selectedBusiness, loading: businessLoading } = useBusiness();
  const [inventory, setInventory] = useState<IInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All inventory");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- STATE: Editing Row ---
  // We store the values of the row currently being edited here
  const [editingRow, setEditingRow] = useState<{
    id: string;
    stock: string;
    price: string;
  } | null>(null);

  // --- STATE: History ---
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [itemStockHistory, setItemStockHistory] = useState<IStockHistory[]>([]);
  const [itemPriceHistory, setItemPriceHistory] = useState<IPriceHistory[]>([]);
  const [selectedItemTitle, setSelectedItemTitle] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);

  const lowStockThreshold = 20;

  // Refs for auto-focusing inputs
  const stockInputRef = useRef<HTMLInputElement>(null);

  // --- 7.1 FETCH INVENTORY ---
  const fetchInventory = async () => {
    if (!selectedBusiness) {
      setInventory([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/inventory", {
        params: { gstin: selectedBusiness.gstin },
      });
      // Safety filter for nulls
      const validData = (res.data || []).filter((item: any) => item !== null);
      setInventory(validData);
    } catch (err) {
      console.error("Failed to fetch inventory", err);
      setError("Failed to fetch inventory.");
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedBusiness]);

  // --- 7.2 HANDLERS: Row Editing Logic ---

  // Start editing a row
  const handleStartEditing = (item: IInventoryItem) => {
    setEditingRow({
        id: item._id,
        stock: String(item.stock || 0),
        price: String(item.price || 0)
    });
    // Focus the stock input after render
    setTimeout(() => {
        if(stockInputRef.current) stockInputRef.current.focus();
    }, 0);
  };

  // Cancel editing
  const handleCancelEditing = () => {
    setEditingRow(null);
  };

  // Handle typing in input fields
  const handleEditingChange = (field: 'stock' | 'price', value: string) => {
    if(!editingRow) return;
    setEditingRow({ ...editingRow, [field]: value });
  };

  // Save changes to backend
  const handleSaveEditing = async () => {
    if (!editingRow || !selectedBusiness?.gstin) return;

    const newStock = parseInt(editingRow.stock);
    const newPrice = parseFloat(editingRow.price);

    // Validation
    if (isNaN(newStock) || newStock < 0 || isNaN(newPrice) || newPrice < 0) {
        alert("Please enter valid non-negative numbers for Stock and Price.");
        return;
    }

    const itemId = editingRow.id;
    const originalItem = inventory.find(i => i._id === itemId);

    // Prepare Payload
    const payload = {
        stock: newStock,
        price: newPrice,
        gstin: selectedBusiness.gstin
    };

    // LOGGING FOR DEBUGGING
    console.log("📤 Sending Payload to Backend:", payload);

    try {
        // Optimistic UI Update
        setInventory(prev => prev.map(item => 
            item._id === itemId ? { ...item, stock: newStock, price: newPrice } : item
        ));

        // API Call
        const { data } = await api.put(`/inventory/${itemId}`, payload);

        // Confirm with backend data
        if (data && data._id) {
            setInventory(prev => prev.map(item => item._id === itemId ? data : item));
        }

        // Close Edit Mode
        setEditingRow(null);

    } catch (err: any) {
        console.error("Save failed", err);
        alert(err?.response?.data?.message || "Failed to update item.");
        // Revert on failure
        if(originalItem) {
            setInventory(prev => prev.map(item => item._id === itemId ? originalItem : item));
        }
    }
  };

  // Keyboard navigation (Enter to save, Escape to cancel)
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleSaveEditing();
    } else if (e.key === 'Escape') {
        handleCancelEditing();
    }
  };

  // --- 7.3 COMPUTED STATS ---
  const stats = useMemo(() => {
    const validItems = inventory.filter((i) => i !== null && i !== undefined);

    return {
      totalSKUs: validItems.length,
      unitsInStock: validItems.reduce((sum, item) => sum + (item.stock || 0), 0),
      lowStockSKUs: validItems.filter(
        (item) => (item.stock || 0) > 0 && (item.stock || 0) <= lowStockThreshold
      ).length,
      outOfStockSKUs: validItems.filter((item) => (item.stock || 0) <= 0).length,
    };
  }, [inventory, lowStockThreshold]);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
            inventory
                .filter((i) => i && i.category)
                .map((i) => i.category!)
        )
      ),
    ],
    [inventory]
  );

  const getStatus = (item: IInventoryItem) => {
    if (!item) return { text: "Unknown", key: "unknown", color: "bg-gray-100 text-gray-800" };
    
    const stock = item.stock || 0;
    if (stock <= 0) return { text: "Out of stock", key: "out-of-stock", color: "bg-red-100 text-red-800" };
    if (stock <= lowStockThreshold) return { text: "Low stock", key: "low-stock", color: "bg-orange-100 text-orange-800" };
    return { text: "In stock", key: "in-stock", color: "bg-green-100 text-green-800" };
  };

  const filteredInventory = useMemo(() => {
    return inventory
      .filter((item) => {
        if (!item) return false;
        if (activeTab === "Low stock") return getStatus(item).key === "low-stock";
        if (activeTab === "Out of stock") return getStatus(item).key === "out-of-stock";
        return true;
      })
      .filter((item) => statusFilter === "All" || getStatus(item).key === statusFilter)
      .filter((item) => categoryFilter === "All" || item.category === categoryFilter);
  }, [inventory, activeTab, statusFilter, categoryFilter]);

  // --- 7.4 HANDLERS: History & Modals ---
  const handleViewHistory = async (item: IInventoryItem) => {
    if (!item) return;
    setSelectedItemTitle(item.title);
    setHistoryModalOpen(true);
    setHistoryLoading(true);

    try {
      const [stockRes, priceRes] = await Promise.all([
        api.get(`/inventory/${item._id}/history`),
        api.get(`/inventory/${item._id}/price-history`)
      ]);
      setItemStockHistory(stockRes.data || []);
      setItemPriceHistory(priceRes.data || []);
    } catch (err) {
      console.error("Failed to fetch history", err);
      setItemStockHistory([]);
      setItemPriceHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0)
      setSelectedFile(e.target.files[0]);
  };

  const handleImport = () => {
    if (selectedFile)
      alert(`Importing ${selectedFile.name}... (This is a placeholder action)`);
  };

  const handleOpenAddModal = () => setAddModalOpen(true);

  const handleCreateItem = async (itemData: any) => {
    if (!selectedBusiness) {
      alert("No business selected");
      return;
    }

    try {
      setLoading(true);
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

      const { data } = await api.post("/inventory", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data && data._id) {
        setInventory((prev) => [data, ...prev]);
      }
      setAddModalOpen(false);
    } catch (err: any) {
      console.error("Failed to create item", err);
      alert(err?.response?.data?.message || "Failed to create item");
    } finally {
      setLoading(false);
    }
  };

  if (businessLoading)
    return <div className="p-8 text-center">Loading business data...</div>;
  if (!selectedBusiness)
    return (
      <div className="p-4 m-4 bg-yellow-100 text-yellow-800 rounded-md">
        Please add and select a business on the Profile page.
      </div>
    );

  return (
    <ProtectRoute permission="inventory">
      <div className="bg-slate-100 min-h-screen w-full p-6 lg:p-8 space-y-6">
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
            <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              onChange={(e) => setCategoryFilter(e.target.value)}
              value={categoryFilter}
              className="appearance-none bg-slate-100/80 border-none rounded-md py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-600 text-gray-600"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "Category: All" : cat}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
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
              disabled={!selectedFile || loading}
              className="bg-blue-500 text-white font-semibold py-2 px-5 rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileUp size={16} /> Import inventory
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total SKUs" value={stats.totalSKUs} description="Across all channels" icon={<Boxes size={24} />} />
          <StatCard title="Units in stock" value={stats.unitsInStock.toLocaleString("en-IN")} description="Available to sell" icon={<Package size={24} />} />
          <StatCard title="Low stock SKUs" value={stats.lowStockSKUs} description="Below safety threshold" icon={<TriangleAlert size={24} />} colorClass="text-orange-600" />
          <StatCard title="Out of stock SKUs" value={stats.outOfStockSKUs} description="Need urgent restock" icon={<PackageX size={24} />} colorClass="text-red-600" />
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {["All inventory", "Low stock", "Out of stock"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 text-sm font-medium ${
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
            <h3 className="font-bold text-slate-800 mb-4">Stock by category</h3>
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400">
              Bar / donut chart placeholder
            </div>
          </div>
          <div className="lg:col-span-2">
            <RestockSuggestions
              items={inventory.filter((item) => item && getStatus(item).key === "low-stock")}
              lowStockThreshold={lowStockThreshold}
            />
          </div>
        </div>

        {/* INVENTORY TABLE */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200">
          <div className="p-4">
            <h2 className="text-xl font-bold text-slate-800">
              Inventory Details
            </h2>
          </div>
          {loading ? (
            <p className="p-4 text-center">Loading inventory...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left font-semibold text-slate-600">SKU</th>
                    <th className="p-3 text-left font-semibold text-slate-600">PRODUCT</th>
                    <th className="p-3 text-left font-semibold text-slate-600">CATEGORY</th>
                    <th className="p-3 text-left font-semibold text-slate-600">STOCK</th>
                    <th className="p-3 text-left font-semibold text-slate-600">PRICE</th>
                    <th className="p-3 text-left font-semibold text-slate-600">STATUS</th>
                    <th className="p-3 text-center font-semibold text-slate-600">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInventory.map((item) => {
                    const isEditing = editingRow?.id === item._id;
                    return (
                      <tr
                        key={item._id}
                        className={`hover:bg-slate-100 ${isEditing ? 'bg-blue-50' : ''}`}
                      >
                        <td className="p-3 font-mono text-slate-500 cursor-pointer" onClick={() => !isEditing && handleViewHistory(item)}>
                          {item.hsnCode || "N/A"}
                        </td>
                        <td className="p-3 font-medium text-slate-800 cursor-pointer" onClick={() => !isEditing && handleViewHistory(item)}>
                          {item.title} {item.variation && <span className="text-slate-500">({item.variation})</span>}
                        </td>
                        <td className="p-3 text-slate-600 cursor-pointer" onClick={() => !isEditing && handleViewHistory(item)}>
                          {item.category}
                        </td>

                        {/* --- STOCK COLUMN --- */}
                        <td className="p-3 font-semibold text-slate-800">
                          {isEditing ? (
                            <input
                              ref={stockInputRef}
                              type="number"
                              min={0}
                              value={editingRow?.stock || ""}
                              onChange={(e) => handleEditingChange('stock', e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="w-24 p-1 border rounded-md border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                              placeholder="Stock"
                            />
                          ) : (
                            <span>{item.stock ?? 0}</span>
                          )}
                        </td>

                        {/* --- PRICE COLUMN --- */}
                        <td className="p-3 font-medium text-slate-800">
                          {isEditing ? (
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={editingRow?.price || ""}
                                onChange={(e) => handleEditingChange('price', e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-24 pl-5 p-1 border rounded-md border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none"
                                placeholder="Price"
                              />
                            </div>
                          ) : (
                            <span>
                              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(item.price || 0)}
                            </span>
                          )}
                        </td>

                        <td className="p-3 cursor-pointer" onClick={() => !isEditing && handleViewHistory(item)}>
                          <StatusBadge status={getStatus(item)} />
                        </td>

                        {/* --- ACTIONS COLUMN --- */}
                        <td className="p-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={handleSaveEditing}
                                className="p-1 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                                title="Save Changes"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={handleCancelEditing}
                                className="p-1 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartEditing(item)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                              title="Edit Row"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
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
          onClose={() => setHistoryModalOpen(false)}
          title={selectedItemTitle}
          stockHistory={itemStockHistory}
          priceHistory={itemPriceHistory}
          loading={historyLoading}
        />

        <AddItemModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onCreate={handleCreateItem}
        />
      </div>
    </ProtectRoute>
  );
}
