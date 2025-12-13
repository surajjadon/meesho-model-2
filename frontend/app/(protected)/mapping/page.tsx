"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useBusiness, api } from "../../../providers/GlobalProvider";
import { FaLink } from "react-icons/fa";
import {
  Package,
  Settings,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
} from "lucide-react";

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

  // NEW STATE to track which mapping is being edited
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);

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

  // useEffect to auto-calculate manufacturing price
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

  // useEffect to reset SKU check status when user types in the SKU input
  useEffect(() => {
    setSkuCheckStatus("idle");
    setSkuCheckMessage("");
  }, [sku]);

  // Handler for checking SKU availability
  const handleSkuCheck = async () => {
    if (!sku || !selectedBusiness) return;
    setSkuCheckStatus("checking");
    setSkuCheckMessage("Checking...");
    try {
      const { data } = await api.get(`/mappings/check-sku/${sku.trim()}`, {
        params: { gstin: selectedBusiness.gstin },
      });
      if (data.isTaken) {
        // If we are editing, it's okay if the SKU is taken by the item we are currently editing
        const currentMapping = mappings.find((m) => m._id === editingMappingId);
        if (currentMapping && currentMapping.sku === sku.trim()) {
          setSkuCheckStatus("idle"); // It's our own SKU, so it's not an error.
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

  // Function to reset the form and exit editing mode
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

  // Handler to start editing a mapping
  const handleEditClick = (mapping: SkuMapping) => {
    setEditingMappingId(mapping._id);
    setSku(mapping.sku);
    setPackagingCost(String(mapping.packagingCost));
    setSelectedProducts(
      mapping.mappedProducts.map((p) => ({
        id: p.inventoryItem._id,
        quantity: p.quantity,
      }))
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // This function now handles both Create and Update
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
        // UPDATE LOGIC
        const { data } = await api.put(
          `/mappings/${editingMappingId}`,
          mappingData
        );
        setMappings((prev) =>
          prev.map((m) => (m._id === editingMappingId ? data : m))
        );
      } else {
        // CREATE LOGIC
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

  // Handler for deleting an existing mapping
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
        `Are you sure you want to delete the mapping for SKU "${skuToDelete}"? This SKU will become unmapped again.`
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

  // Helper handlers for form inputs
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
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">
          SKU Mapping
        </h1>

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
                      ? `You are editing an existing SKU.`
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
                    <label
                      htmlFor="sku"
                      className="text-sm font-medium text-slate-700"
                    >
                      Enter Sales SKU
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        id="sku"
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
                    <label
                      htmlFor="mfgPrice"
                      className="text-sm font-medium text-slate-700"
                    >
                      Manufacturing Price (₹)
                    </label>
                    <input
                      id="mfgPrice"
                      type="number"
                      value={mfgPrice}
                      readOnly
                      placeholder="Auto-calculated"
                      className="w-full p-2 border rounded-md text-slate-900 placeholder:text-slate-400 bg-slate-100 cursor-not-allowed mt-1"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      This value is automatically calculated from selected
                      inventory items.
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="packagingCost"
                      className="text-sm font-medium text-slate-700"
                    >
                      Packaging Cost (₹)
                    </label>
                    <input
                      id="packagingCost"
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
                        No inventory items found. Please add items on the
                        Inventory page.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {selectedProducts.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2 text-slate-800">
                    Set Quantities for Selected Products
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
                          No SKU mappings have been created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

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
                        No unmapped SKUs found. Great job!
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
    </div>
  );
}
