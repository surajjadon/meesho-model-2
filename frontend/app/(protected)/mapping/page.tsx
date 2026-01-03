"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useBusiness, api } from "../../../providers/GlobalProvider";
import { FaLink, FaHistory, FaTimes, FaSave } from "react-icons/fa"; // Added FaSave
import {
  Package,
  Settings,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  History,
  X, // Added X for cancel icon
} from "lucide-react";
import ProtectRoute from "@/components/ProtectRoute";
// Interfaces for data shapes
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
}

// Interface for History
interface HistoryRecord {
  _id: string;
  manufacturingPrice: number;
  packagingCost: number;
updatedAt: string;
}

export default function MappingPage() {
  const { selectedBusiness, loading: businessLoading } = useBusiness();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mappings, setMappings] = useState<SkuMapping[]>([]);
  const [mustMappedSkus, setMustMappedSkus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "mapping" | "mustMapped" | "unmapped"
  >("mapping");

  // Form State
  const [sku, setSku] = useState("");
  const [mfgPrice, setMfgPrice] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<
    { id: string; quantity: number }[]
  >([]);
  const [skuCheckStatus, setSkuCheckStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [skuCheckMessage, setSkuCheckMessage] = useState("");

  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);

  // --- HISTORY MODAL STATE ---
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [selectedHistorySku, setSelectedHistorySku] = useState("");

  // --- NEW: HISTORY EDITING STATE ---
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editHistoryForm, setEditHistoryForm] = useState({ mfg: "", pkg: "" });

  // Main data fetching function
  const fetchPageData = async () => {
    if (selectedBusiness) {
      setLoading(true);
      setError("");
      try {
        const [invRes, mapRes, unmappedRes] = await Promise.all([
          api.get("/inventory", { params: { gstin: selectedBusiness.gstin } }),
          api.get("/mappings", { params: { gstin: selectedBusiness.gstin } }),
          api.get("/mappings/unmapped", {
            params: { gstin: selectedBusiness.gstin },
          }),
        ]);
        setInventory(invRes.data);
        setMappings(mapRes.data);
        setMustMappedSkus(unmappedRes.data);
      } catch (err) {
        setError("Failed to fetch page data.");
      } finally {
        setLoading(false);
      }
    } else {
      setInventory([]);
      setMappings([]);
      setMustMappedSkus([]);
    }
  };

  useEffect(() => {
    fetchPageData();
  }, [selectedBusiness]);

  useEffect(() => {
    if (selectedProducts.length === 0) {
      setMfgPrice("0.00");
      return;
    }
    const totalCost = selectedProducts.reduce((acc, selectedProduct) => {
      const inventoryItem = inventory.find(
        (item) => item._id === selectedProduct.id
      );
      const itemPrice = inventoryItem?.price || 0;
      return acc + itemPrice * selectedProduct.quantity;
    }, 0);
    setMfgPrice(totalCost.toFixed(2));
  }, [selectedProducts, inventory]);

  useEffect(() => {
    setSkuCheckStatus("idle");
    setSkuCheckMessage("");
  }, [sku]);

  const handleSkuCheck = async () => {
    if (!sku || !selectedBusiness) return;
    setSkuCheckStatus("checking");
    setSkuCheckMessage("Checking...");
    try {
      const { data } = await api.get(`/mappings/check-sku/${sku.trim()}`, {
        params: { gstin: selectedBusiness.gstin },
      });
      if (data.isTaken) {
        const currentMapping = mappings.find((m) => m._id === editingMappingId);
        if (currentMapping && currentMapping.sku === sku.trim()) {
          setSkuCheckStatus("idle");
          setSkuCheckMessage("");
        } else {
          setSkuCheckStatus("taken");
          setSkuCheckMessage(`SKU is already in use.`);
        }
      } else {
        setSkuCheckStatus("available");
        setSkuCheckMessage("SKU is available!");
      }
    } catch (err) {
      setSkuCheckStatus("idle");
      setSkuCheckMessage("Could not verify SKU.");
    }
  };

  const resetForm = () => {
    setSku("");
    setMfgPrice("");
    setPackagingCost("");
    setSelectedProducts([]);
    setSkuCheckStatus("idle");
    setSkuCheckMessage("");
    setEditingMappingId(null);
    setError("");
  };

  const handleEditClick = (mapping: SkuMapping) => {
    setEditingMappingId(mapping._id);
    setSku(mapping.sku);
    setPackagingCost(String(mapping.packagingCost));
    setSelectedProducts(
      mapping.mappedProducts
        .map((p) => ({
          id: p.inventoryItem?._id,
          quantity: p.quantity,
        }))
        .filter((p) => p.id)
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- FETCH HISTORY HANDLER ---
  const handleHistoryClick = async (mapping: SkuMapping) => {
    setSelectedHistorySku(mapping.sku);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryData([]);
    setEditingHistoryId(null); // Reset edit mode when opening

    try {
      const { data } = await api.get(`/mappings/history/${mapping._id}`);
      setHistoryData(data);
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- NEW: START EDITING HISTORY ROW ---
  const startEditingHistory = (record: HistoryRecord) => {
    setEditingHistoryId(record._id);
    setEditHistoryForm({
      mfg: record.manufacturingPrice.toString(),
      pkg: record.packagingCost.toString(),
    });
  };

  // --- NEW: CANCEL EDITING HISTORY ---
  const cancelHistoryEdit = () => {
    setEditingHistoryId(null);
    setEditHistoryForm({ mfg: "", pkg: "" });
  };

  // --- NEW: SAVE HISTORY EDIT ---
  const saveHistoryEdit = async (historyId: string) => {
    try {
      await api.put(`/mappings/history/${historyId}`, {
        manufacturingPrice: editHistoryForm.mfg,
        packagingCost: editHistoryForm.pkg,
      });

      // Update local state immediately to reflect changes
      setHistoryData((prev) =>
        prev.map((item) =>
          item._id === historyId
            ? {
                ...item,
                manufacturingPrice: parseFloat(editHistoryForm.mfg),
                packagingCost: parseFloat(editHistoryForm.pkg),
              }
            : item
        )
      );
      setEditingHistoryId(null);
    } catch (error) {
      alert("Failed to update history record.");
    }
  };

  const handleSubmitMapping = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !sku || selectedProducts.length === 0) {
      setError("SKU and at least one product selection are required.");
      return;
    }
    setError("");

    const mappingData = {
      gstin: selectedBusiness.gstin,
      sku: sku.trim(),
      manufacturingPrice: parseFloat(mfgPrice),
      packagingCost: parseFloat(packagingCost) || 0,
      mappedProducts: selectedProducts.map((p) => ({
        inventoryItem: p.id,
        quantity: p.quantity,
      })),
    };

    try {
      if (editingMappingId) {
        const { data } = await api.put(
          `/mappings/${editingMappingId}`,
          mappingData
        );
        setMappings((prev) =>
          prev.map((m) => (m._id === editingMappingId ? data : m))
        );
      } else {
        if (skuCheckStatus === "taken") {
          setError("This SKU is already in use. Please choose another one.");
          return;
        }
        const { data } = await api.post("/mappings", mappingData);
        setMappings((prev) => [data, ...prev]);
        setMustMappedSkus((prev) =>
          prev.filter(
            (s) => s.trim().toLowerCase() !== sku.trim().toLowerCase()
          )
        );
      }
      resetForm();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          `Failed to ${editingMappingId ? "update" : "create"} mapping.`
      );
    }
  };

  const handleDeleteMapping = async (
    mappingId: string,
    skuToDelete: string
  ) => {
    if (!selectedBusiness) {
      setError("No business selected. Cannot perform delete.");
      return;
    }
    if (
      window.confirm(
        `Are you sure? This will delete the mapping and ALL price history for "${skuToDelete}".`
      )
    ) {
      try {
        await api.delete(`/mappings/${mappingId}`, {
          data: { gstin: selectedBusiness.gstin },
        });
        setMappings((prev) => prev.filter((m) => m._id !== mappingId));
        setMustMappedSkus((prev) => [...new Set([...prev, skuToDelete])]);
        setError("");
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to delete mapping.");
      }
    }
  };

  const handleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.some((p) => p.id === productId)
        ? prev.filter((p) => p.id !== productId)
        : [...prev, { id: productId, quantity: 1 }]
    );
  };
  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    );
  };
  const handleMustMapClick = (skuToMap: string) => {
    setSku(skuToMap);
    setActiveTab("mapping");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (businessLoading)
    return <div className="p-8">Loading business data...</div>;
  if (!selectedBusiness)
    return (
      <div className="p-4 m-4 bg-yellow-100 text-yellow-800 rounded-md">
        Please select a business to manage SKU mappings.
      </div>
    );

  return (
    <ProtectRoute permission="inventory">
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100 relative">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">
          SKU Mapping
        </h1>

        {/* --- Header Processing Section --- */}
        {selectedBusiness && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Inventory Processing
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Process all pending orders and update inventory for mapped
                  SKUs
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    const response = await api.post(
                      "/orders/process-inventory",
                      { gstin: selectedBusiness.gstin }
                    );
                    alert(
                      `✅ ${response.data.message}\n\nOrders Processed: ${response.data.results.ordersProcessed}\nItems Updated: ${response.data.results.itemsUpdated}`
                    );
                    window.location.reload();
                  } catch (error: any) {
                    alert(
                      `❌ Failed to process inventory: ${
                        error.response?.data?.message || error.message
                      }`
                    );
                  }
                }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Settings className="w-4 h-4" />
                Process Inventory
              </button>
            </div>
          </div>
        )}

        {/* --- Tabs --- */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab("mapping")}
              className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
                activeTab === "mapping"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Product Mapping
            </button>
            <button
              onClick={() => setActiveTab("mustMapped")}
              className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
                activeTab === "mustMapped"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Must Mapped SKUs ({mustMappedSkus.length})
            </button>
            <button
              onClick={() => setActiveTab("unmapped")}
              className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
                activeTab === "unmapped"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Unmapped Catalog
            </button>
          </nav>
        </div>

        {error && (
          <div
            className="p-3 mb-4 text-red-700 bg-red-100 border-l-4 border-red-500 rounded-md"
            onClick={() => setError("")}
          >
            {error} <small>(click to dismiss)</small>
          </div>
        )}
        {loading && <p>Loading data...</p>}

        {activeTab === "mapping" && (
          <>
            {/* --- Form --- */}
            <form
              onSubmit={handleSubmitMapping}
              className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingMappingId
                      ? "Update SKU Mapping"
                      : "Create New Mapping"}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {editingMappingId
                      ? `Updating will archive current prices to history.`
                      : "Link a sales SKU to your inventory items."}
                  </p>
                </div>
                {editingMappingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm font-semibold text-red-600 hover:text-red-800"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Enter Sales SKU
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="e.g., TSHIRT-BLUE-L"
                        className="flex-grow p-2 border rounded-md text-slate-900 placeholder:text-slate-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleSkuCheck}
                        disabled={!sku || skuCheckStatus === "checking"}
                        className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-300 flex items-center gap-2"
                      >
                        <Search size={16} />
                        {skuCheckStatus === "checking"
                          ? "Checking..."
                          : "Check"}
                      </button>
                    </div>
                    {skuCheckMessage && (
                      <div
                        className={`flex items-center gap-1 mt-2 text-xs font-semibold ${
                          skuCheckStatus === "available"
                            ? "text-green-600"
                            : skuCheckStatus === "taken"
                            ? "text-red-600"
                            : "text-slate-500"
                        }`}
                      >
                        {skuCheckStatus === "available" && (
                          <CheckCircle size={14} />
                        )}
                        {skuCheckStatus === "taken" && <XCircle size={14} />}
                        {skuCheckMessage}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Manufacturing Price (₹)
                    </label>
                    <input
                      type="number"
                      value={mfgPrice}
                      readOnly
                      placeholder="Auto-calculated"
                      className="w-full p-2 border rounded-md text-slate-900 placeholder:text-slate-400 bg-slate-100 cursor-not-allowed mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Auto-calculated from selected inventory items.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Packaging Cost (₹)
                    </label>
                    <input
                      type="number"
                      value={packagingCost}
                      onChange={(e) => setPackagingCost(e.target.value)}
                      placeholder="Enter packaging cost"
                      className="w-full p-2 border rounded-md text-slate-900 placeholder:text-slate-400 mt-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700">
                    Select Inventory Products
                  </label>
                  <div className="border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1">
                    {inventory.length > 0 ? (
                      inventory.map((item) => (
                        <label
                          key={item._id}
                          className="flex items-center gap-3 p-2 rounded-md cursor-pointer has-[:checked]:bg-blue-50 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProducts.some(
                              (p) => p.id === item._id
                            )}
                            onChange={() => handleProductSelection(item._id)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-slate-700 text-sm">
                            {item.title}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 p-4 text-center">
                        No inventory items found.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {selectedProducts.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2 text-slate-800">
                    Set Quantities
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {selectedProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded-lg"
                      >
                        <span className="flex-1 text-slate-700 font-medium">
                          {inventory.find((i) => i._id === p.id)?.title}
                        </span>
                        <input
                          type="number"
                          value={p.quantity}
                          onChange={(e) =>
                            handleQuantityChange(p.id, parseInt(e.target.value))
                          }
                          className="w-20 p-1 border rounded-md text-center text-slate-900"
                          min="1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg flex items-center gap-2 text-white font-semibold disabled:bg-green-300"
                  disabled={
                    skuCheckStatus === "checking" ||
                    (skuCheckStatus === "taken" && !editingMappingId)
                  }
                >
                  <FaLink />
                  {editingMappingId ? "Update Mapping" : "Map Products"}
                </button>
              </div>
            </form>

            {/* --- Table Section --- */}
            <div className="mt-12">
              <h2 className="text-xl font-bold text-slate-800 mb-4">
                Existing SKU Mappings ({mappings.length})
              </h2>
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">
                        SKU
                      </th>
                      <th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">
                        Mapped Products
                      </th>
                      <th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">
                        Costs
                      </th>
                      <th className="p-3 text-center text-xs font-bold text-slate-600 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading && !mappings.length ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center p-8 text-slate-500"
                        >
                          Loading mappings...
                        </td>
                      </tr>
                    ) : mappings.length > 0 ? (
                      mappings.map((mapping) => (
                        <tr key={mapping._id} className="hover:bg-slate-50">
                          <td className="p-3 align-top">
                            <p className="font-mono font-semibold text-indigo-600">
                              {mapping.sku}
                            </p>
                          </td>
                          <td className="p-3 align-top">
                            <div className="space-y-1">
                              {mapping.mappedProducts.map((p, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center text-slate-700"
                                >
                                  <span>
                                    {p.inventoryItem?.title || "Item not found"}
                                  </span>
                                  <span className="font-semibold text-slate-500 ml-4">
                                    x {p.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 align-top text-slate-600">
                            <div>
                              <strong>Mfg:</strong> ₹
                              {mapping.manufacturingPrice.toFixed(2)}
                            </div>
                            <div>
                              <strong>Pkg:</strong> ₹
                              {mapping.packagingCost.toFixed(2)}
                            </div>
                          </td>
                          <td className="p-3 align-top text-center">
                            <div className="flex justify-center items-center gap-1">
                              {/* --- HISTORY BUTTON --- */}
                              <button
                                onClick={() => handleHistoryClick(mapping)}
                                className="p-2 text-slate-400 hover:bg-purple-100 hover:text-purple-600 rounded-full"
                                title="View Price History"
                              >
                                <History size={16} />
                              </button>

                              <button
                                onClick={() => handleEditClick(mapping)}
                                className="p-2 text-slate-400 hover:bg-blue-100 hover:text-blue-600 rounded-full"
                                title="Update Mapping"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteMapping(mapping._id, mapping.sku)
                                }
                                className="p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded-full"
                                title="Delete Mapping"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center p-8 text-slate-500"
                        >
                          No SKU mappings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* --- Must Mapped Section --- */}
        {activeTab === "mustMapped" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-800">
                Must Mapped SKUs
              </h2>
              <p className="text-slate-500 text-sm">
                Click "Map SKU" to pre-fill the form and resolve the mapping.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left text-slate-600 font-semibold uppercase">
                      SKU
                    </th>
                    <th className="p-3 text-left text-slate-600 font-semibold uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mustMappedSkus.length > 0 ? (
                    mustMappedSkus.map((skuStr, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3 font-mono">{skuStr}</td>
                        <td className="p-2">
                          <button
                            onClick={() => handleMustMapClick(skuStr)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1 rounded-md"
                          >
                            Map SKU
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="text-center py-8 text-slate-500"
                      >
                        No unmapped SKUs found.
                      </td>
                    </tr>
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

      {/* --- HISTORY POPUP MODAL (UPDATED) --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Price History
                </h3>
                <p className="text-sm text-slate-500 font-mono">
                  SKU: {selectedHistorySku}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {historyLoading ? (
                <div className="text-center py-8 text-slate-500">
                  Loading history...
                </div>
              ) : historyData.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                  {historyData.map((record, index) => (
                    <div key={index} className="relative pl-6">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></div>
                      <div className="flex justify-between items-end mb-1">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {new Date(record.updatedAt).toLocaleString()}
                        </div>
                        {editingHistoryId !== record._id && (
                          <button
                            onClick={() => startEditingHistory(record)}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Edit size={12} /> Edit
                          </button>
                        )}
                      </div>

                      <div
                        className={`p-3 rounded-lg border flex flex-col sm:flex-row gap-4 sm:gap-6 ${
                          editingHistoryId === record._id
                            ? "bg-blue-50 border-blue-200"
                            : "bg-slate-50 border-slate-100"
                        }`}
                      >
                        {editingHistoryId === record._id ? (
                          // --- EDIT MODE ---
                          <>
                            <div className="flex-1">
                              <label className="block text-xs text-slate-500 mb-1">
                                Mfg Price
                              </label>
                              <input
                                type="number"
                                value={editHistoryForm.mfg}
                                onChange={(e) =>
                                  setEditHistoryForm({
                                    ...editHistoryForm,
                                    mfg: e.target.value,
                                  })
                                }
                                className="w-full p-1 text-sm border rounded"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-slate-500 mb-1">
                                Pkg Cost
                              </label>
                              <input
                                type="number"
                                value={editHistoryForm.pkg}
                                onChange={(e) =>
                                  setEditHistoryForm({
                                    ...editHistoryForm,
                                    pkg: e.target.value,
                                  })
                                }
                                className="w-full p-1 text-sm border rounded"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <button
                                onClick={() => saveHistoryEdit(record._id)}
                                className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                                title="Save"
                              >
                                <FaSave size={14} />
                              </button>
                              <button
                                onClick={cancelHistoryEdit}
                                className="p-2 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </>
                        ) : (
                          // --- VIEW MODE ---
                          <>
                            <div>
                              <span className="block text-xs text-slate-400">
                                Mfg Price
                              </span>
                              <span className="font-mono font-medium text-slate-700">
                                ₹{record.manufacturingPrice.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400">
                                Pkg Cost
                              </span>
                              <span className="font-mono font-medium text-slate-700">
                                ₹{record.packagingCost.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-xs text-slate-400">
                                Total
                              </span>
                              <span className="font-mono font-bold text-indigo-600">
                                ₹
                                {(
                                  record.manufacturingPrice +
                                  record.packagingCost
                                ).toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  No history found. This SKU has not been updated yet.
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
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