"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useBusiness, api } from "@/providers/GlobalProvider";
import {
  Search,
  Trash2,
  Eye,
  Truck,
  User,
  ScanLine,
  CheckCircle,
  Loader2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Package,
  Calendar,
  ChevronDown,
} from "lucide-react";

// --- Interfaces ---
interface IReturnOrder {
  _id: string;
  subOrderNo: string;
  awbNumber?: string;
  orderDate: string; 
  dispatchDate?: string;
  productName: string;
  supplierSku: string;
  liveOrderStatus: string;
  returnType: "RTO" | "CustomerReturn";
  receivedStatus: "Pending" | "Received";
  verificationStatus: string;
  updatedAt: string;
}

interface ISummary {
  totalRTO: number;
  pendingRTO: number;
  receivedRTO: number;
  totalCustomerReturns: number;
  pendingCustomerReturns: number;
  receivedCustomerReturns: number;
  missingOrders: number;
  missingAWB: number;
}

// --- Helper Functions ---

const getStatusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "pending") return "bg-orange-100 text-orange-700 border border-orange-200";
  if (s === "received") return "bg-green-100 text-green-700 border border-green-200";
  if (s.includes("rto")) return "bg-blue-100 text-blue-700 border border-blue-200";
  if (s.includes("return")) return "bg-purple-100 text-purple-700 border border-purple-200";
  return "bg-gray-100 text-gray-700 border border-gray-200";
};

// Helper to safely parse date and check for 1970/Invalid
const parseDate = (dateString: string | undefined) => {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  
  // Check if Invalid
  if (isNaN(date.getTime())) return null;
  
  // Check if it defaulted to Epoch (1970) - usually happens with null/0 input
  if (date.getFullYear() === 1970) return null;

  return date;
};

const getDaysSinceOrder = (orderDate: string): number => {
  const date = parseDate(orderDate);
  if (!date) return 0; // Return 0 if date is invalid
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// --- Components ---

const OverviewCard = ({
  title,
  value,
  subValue,
  icon: Icon,
  variant = "blue",
}: {
  title: string;
  value: number | string;
  subValue: string;
  icon: React.ElementType;
  variant?: "blue" | "orange" | "green" | "red";
}) => {
  const variants = {
    blue: { iconBg: "bg-blue-50 text-blue-600", badge: "bg-blue-50 text-blue-700" },
    orange: { iconBg: "bg-orange-50 text-orange-600", badge: "bg-orange-50 text-orange-700" },
    green: { iconBg: "bg-green-50 text-green-600", badge: "bg-green-50 text-green-700" },
    red: { iconBg: "bg-red-50 text-red-600", badge: "bg-red-50 text-red-700" },
  };
  const theme = variants[variant];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900">{typeof value === "number" ? value.toLocaleString() : value}</h3>
        </div>
        <div className={`p-2.5 rounded-xl ${theme.iconBg}`}><Icon size={20} strokeWidth={2} /></div>
      </div>
      <div className={`self-start px-3 py-1.5 rounded-lg text-xs font-medium ${theme.badge}`}>{subValue}</div>
    </div>
  );
};

const TabButton = ({ active, href, icon: Icon, label }: { active: boolean; href: string; icon: React.ElementType; label: string }) => (
  <Link
    href={href}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      active ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
    }`}
  >
    <Icon size={16} /> {label}
  </Link>
);

// --- Main Page ---
export default function ReturnsManagerPage() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "rto";
  const { selectedBusiness } = useBusiness();
  
  const [returns, setReturns] = useState<IReturnOrder[]>([]);
  const [summary, setSummary] = useState<ISummary>({
    totalRTO: 0, pendingRTO: 0, receivedRTO: 0,
    totalCustomerReturns: 0, pendingCustomerReturns: 0, receivedCustomerReturns: 0,
    missingOrders: 0, missingAWB: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [rtoSubTab, setRtoSubTab] = useState<"pending" | "received">("pending");
  const [customerSubTab, setCustomerSubTab] = useState<"pending" | "received">("pending");

  // --- Fetch Logic ---
  const fetchSummary = async () => {
    if (!selectedBusiness) return;
    try {
      const res = await api.get("/returns/summary", { params: { gstin: selectedBusiness.gstin } });
      setSummary(res.data);
    } catch (err) { console.error("Error fetching summary:", err); }
  };

  const fetchReturns = async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const params: any = { gstin: selectedBusiness.gstin };

      if (activeTab === "missing") params.tab = "missing";
      else if (activeTab === "rto") {
        params.returnType = "RTO";
        params.receivedStatus = rtoSubTab === "pending" ? "Pending" : "Received";
      } else if (activeTab === "customer") {
        params.returnType = "CustomerReturn";
        params.receivedStatus = customerSubTab === "pending" ? "Pending" : "Received";
      }

      if (searchQuery) params.search = searchQuery;
      const res = await api.get("/returns", { params });
      setReturns(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSummary(); }, [selectedBusiness]);
  useEffect(() => { fetchReturns(); }, [selectedBusiness, activeTab, rtoSubTab, customerSubTab, searchQuery]);

  const renderSummaryCards = () => {
    if (activeTab === "missing") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <OverviewCard title="Missing Orders" value={summary.missingOrders} subValue="Pending > 30 days" icon={AlertTriangle} variant="red" />
          <OverviewCard title="Missing AWB" value={summary.missingAWB} subValue="Requires Mapping" icon={ScanLine} variant="orange" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <OverviewCard 
          title={activeTab === "customer" ? "Total Returns" : "Total RTO"} 
          value={activeTab === "customer" ? summary.totalCustomerReturns : summary.totalRTO} 
          subValue={activeTab === "customer" ? "Customer Requests" : "RTO Initiated"} 
          icon={activeTab === "customer" ? RotateCcw : Truck} variant="blue" 
        />
        <OverviewCard 
          title={activeTab === "customer" ? "Pending Returns" : "Pending RTO"} 
          value={activeTab === "customer" ? summary.pendingCustomerReturns : summary.pendingRTO} 
          subValue="Awaiting action / In transit" icon={Clock} variant="orange" 
        />
        <OverviewCard 
          title={activeTab === "customer" ? "Received Returns" : "Received RTO"} 
          value={activeTab === "customer" ? summary.receivedCustomerReturns : summary.receivedRTO} 
          subValue="Processed at warehouse" icon={CheckCircle} variant="green" 
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Returns & RTO Manager</h1>
          <p className="text-slate-500 mt-1">Track RTO orders and customer returns effortlessly.</p>
        </div>
        <div className="flex gap-3">
            <Link href="/returns/scanner" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors">
               <ScanLine size={16} /> Scanner
            </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-2">
        <h2 className="text-lg font-bold text-slate-800 mb-4">
            {activeTab === 'customer' ? 'Customer Returns Overview' : activeTab === 'missing' ? 'Missing Orders Overview' : 'Returns & RTO Overview'}
        </h2>
        {renderSummaryCards()}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-2 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-1">
          <TabButton active={activeTab === "rto"} href="/returns?tab=rto" icon={Truck} label="RTO Orders" />
          <TabButton active={activeTab === "customer"} href="/returns?tab=customer" icon={RotateCcw} label="Customer Returns" />
          <TabButton active={activeTab === "missing"} href="/returns?tab=missing" icon={AlertTriangle} label="Missing" />
        </div>

        <div className="p-5 space-y-5">
          {/* Sub Tabs & Filter Info */}
          {activeTab !== "missing" && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex bg-slate-100 p-1 rounded-lg self-start">
                {activeTab === "rto" ? (
                  <>
                    <button onClick={() => setRtoSubTab("pending")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${rtoSubTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Pending / Expected RTO</button>
                    <button onClick={() => setRtoSubTab("received")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${rtoSubTab === "received" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Received RTO</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setCustomerSubTab("pending")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${customerSubTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Pending Returns</button>
                    <button onClick={() => setCustomerSubTab("received")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${customerSubTab === "received" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Received Returns</button>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "missing" && (
             <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                <AlertTriangle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <h4 className="text-sm font-bold text-red-800">Attention Required</h4>
                  <p className="text-sm text-red-600 mt-1">These orders have exceeded the expected return window (30+ days).</p>
                </div>
             </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors"><Trash2 size={15} /> <span>Delete selected</span></button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400"><Loader2 className="animate-spin mb-3" size={32} /><p className="text-sm">Loading data...</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="p-4 w-10"><input type="checkbox" className="rounded border-slate-300" /></th>
                  <th className="py-3 px-4 font-medium">Suborder No / AWB</th>
                  <th className="py-3 px-4 font-medium">Order Date</th>
                  <th className="py-3 px-4 font-medium">Product Details</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  {activeTab === 'missing' && <th className="py-3 px-4 font-medium">Days Pending</th>}
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.length === 0 ? (
                  <tr><td colSpan={8} className="py-16 text-center text-slate-400"><Package size={48} className="mb-3 opacity-20 mx-auto" /><p>No records found</p></td></tr>
                ) : (
                  returns.map((item) => {
                    const dateObj = parseDate(item.orderDate);
                    const daysPending = getDaysSinceOrder(item.orderDate);
                    
                    return (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4"><input type="checkbox" className="rounded border-slate-300" /></td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                             <span className="font-medium text-slate-900">{item.subOrderNo}</span>
                             {item.awbNumber ? <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 w-fit">{item.awbNumber}</span> : <span className="text-[10px] text-red-500 font-medium">Missing AWB</span>}
                          </div>
                        </td>
                        
                        {/* ✅ SAFE DATE RENDERING */}
                        <td className="p-4 text-slate-600">
                           <div className="flex flex-col">
                             {dateObj ? (
                               <>
                                 <div className="flex items-center gap-1.5 font-medium text-slate-900">
                                    <Calendar size={14} className="text-slate-400" />
                                    {dateObj.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' })}
                                 </div>
                                 <div className="text-xs text-slate-400 pl-5 mt-0.5">
                                     {dateObj.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}
                                 </div>
                               </>
                             ) : (
                               <span className="text-xs text-slate-300 italic bg-slate-50 px-2 py-1 rounded">
                                 Invalid / Missing Date
                               </span>
                             )}
                           </div>
                        </td>

                        <td className="p-4">
                          <div className="max-w-[200px]">
                            <p className="text-slate-900 truncate font-medium">{item.supplierSku}</p>
                            <p className="text-slate-500 text-xs truncate">{item.productName}</p>
                          </div>
                        </td>
                        <td className="p-4">
                           <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${item.returnType === 'RTO' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                              {item.returnType === "RTO" ? <Truck size={12} /> : <RotateCcw size={12} />} 
                              {item.returnType === "RTO" ? "RTO" : "Return"}
                           </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadge(item.receivedStatus)}`}>{item.receivedStatus}</span>
                        </td>
                        
                        {activeTab === "missing" && (
                          <td className="p-4">
                             {dateObj ? (
                               <span className={`font-bold ${daysPending > 60 ? 'text-red-600' : 'text-orange-600'}`}>{daysPending} days</span>
                             ) : (
                               <span className="text-slate-300 text-xs">-</span>
                             )}
                          </td>
                        )}

                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded"><Eye size={16} /></button>
                             <button className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}