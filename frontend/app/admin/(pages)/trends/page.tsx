"use client";

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Download, 
  Search, 
  X,
  ArrowUpRight,
  ChevronDown,
  Filter,
  BarChart3,
  Users,
  Package,
  ArrowUpDown,
  ListFilter
} from 'lucide-react';

// --- MOCK DATA ---
const TRENDING_PRODUCTS = [
  { id: 1, name: "Cotton T-Shirt Blue", sku: "SKU-1234", platform: "Meesho", orders: 456, growth: 245, price: 299, image: "👕", date: "2025-01-20" },
  { id: 2, name: "Sports Shoes", sku: "SKU-5678", platform: "Flipkart", orders: 389, growth: 198, price: 1299, image: "👟", date: "2025-01-21" },
  { id: 3, name: "Phone Case", sku: "SKU-9012", platform: "Amazon", orders: 312, growth: 167, price: 199, image: "📱", date: "2025-01-19" },
  { id: 4, name: "Kitchen Knife Set", sku: "SKU-3456", platform: "Meesho", orders: 287, growth: 143, price: 499, image: "🔪", date: "2025-01-22" },
  { id: 5, name: "LED Bulb Pack", sku: "SKU-7890", platform: "Flipkart", orders: 245, growth: 129, price: 349, image: "💡", date: "2025-01-18" },
  { id: 6, name: "Water Bottle", sku: "SKU-2345", platform: "Amazon", orders: 198, growth: 112, price: 249, image: "🧴", date: "2025-01-23" },
  { id: 7, name: "Face Cream", sku: "SKU-6789", platform: "Meesho", orders: 167, growth: 98, price: 249, image: "🧴", date: "2025-01-17" },
  { id: 8, name: "Bluetooth Speaker", sku: "SKU-0123", platform: "Flipkart", orders: 145, growth: 87, price: 1599, image: "🔊", date: "2025-01-16" },
  { id: 9, name: "Yoga Mat", sku: "SKU-4567", platform: "Amazon", orders: 132, growth: 76, price: 599, image: "🧘", date: "2025-01-24" },
  { id: 10, name: "Backpack", sku: "SKU-8901", platform: "Meesho", orders: 121, growth: 65, price: 899, image: "🎒", date: "2025-01-15" },
    { id:11, name: "Sports Shoes", sku: "SKU-5678", platform: "Flipkart", orders: 389, growth: 198, price: 1299, image: "👟", date: "2025-01-21" },
  { id: 12, name: "Phone Case", sku: "SKU-9012", platform: "Amazon", orders: 312, growth: 167, price: 199, image: "📱", date: "2025-01-19" },
  { id: 13, name: "Kitchen Knife Set", sku: "SKU-3456", platform: "Meesho", orders: 287, growth: 143, price: 499, image: "🔪", date: "2025-01-22" },
  ];

const RECENT_BUYERS = [
  { id: 1, name: "Kuldeep", qty: 12, date: "22 Jan 2025" },
  { id: 2, name: "Raj Kumar", qty: 8, date: "21 Jan 2025" },
  { id: 3, name: "Amit Shah", qty: 7, date: "21 Jan 2025" },
  { id: 4, name: "Priya Sharma", qty: 6, date: "20 Jan 2025" },
];

export default function OrderTrendsPage() {
  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [dateRange, setDateRange] = useState("30d");
  const [sortBy, setSortBy] = useState("growth"); // 'growth', 'orders', 'recent'
  const [minOrders, setMinOrders] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // --- FILTER & SORT LOGIC ---
  const processedProducts = useMemo(() => {
    let result = TRENDING_PRODUCTS.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = selectedPlatform === "All" || product.platform === selectedPlatform;
      const matchesMinOrders = minOrders === "" || product.orders >= Number(minOrders);
      
      return matchesSearch && matchesPlatform && matchesMinOrders;
    });

    // Sort Logic
    result.sort((a, b) => {
        if (sortBy === 'growth') return b.growth - a.growth;
        if (sortBy === 'orders') return b.orders - a.orders;
        if (sortBy === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
        return 0;
    });

    return result;
  }, [searchTerm, selectedPlatform, sortBy, minOrders]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans text-slate-800">
      
      {/* --- HEADER --- */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-400 rounded-lg text-white shadow-lg shadow-indigo-200">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Order Trends Dashboard</h1>
              <p className="text-slate-500 text-xs font-medium">Real-time velocity & SKU analytics</p>
            </div>
          </div>
           <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 items-center">
            
            {/* Date Range */}
            
        </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Export */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              {['7d', '30d', '90d'].map((label) => (
                <button
                  key={label}
                  onClick={() => setDateRange(label)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    dateRange === label 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Last {label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block"></div>

            {/* Platform Filter */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Filter size={14} className="text-slate-400" />
              </div>
              <select 
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="appearance-none pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-all shadow-sm"
              >
                <option value="All">Platform: All</option>
                <option value="Meesho">Meesho</option>
                <option value="Flipkart">Flipkart</option>
                <option value="Amazon">Amazon</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
            
            <div className="relative group ">
                <input 
                type="number" 
                placeholder="Min Order." 
                value={minOrders}
                onChange={(e) => setMinOrders(e.target.value)}
                className="w-25 pl-4 p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white transition-all shadow-sm" 
              />
            </div>
            
            <div className="relative group ">
            <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95 ml-auto md:ml-0">
              <Download size={16} /> <span className="hidden sm:inline">Export CSV</span>
            </button>
            </div>
          </div>

        </div>

      

      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT: MAIN TABLE (2/3 Width) */}
        <div className="xl:col-span-2 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-white to-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                
                TOP TRENDING PRODUCTS
              </h3>
              <div className="relative w-64 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search SKU..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-slate-50 focus:bg-white transition-all" 
                />
              </div>
            </div>

            {/* THE TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold bg-slate-50/50">
                    <th className="px-6 py-4 w-16">Rank</th>
                    <th className="px-6 py-4">SKU ID</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Platform</th>
                    <th className="px-6 py-4 text-right">Orders</th>
                    <th className="px-6 py-4 text-right">Growth</th>
                    <th className="px-6 py-4 text-center">Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {processedProducts.map((product, index) => (
                    <tr 
                      key={product.id} 
                      className="hover:bg-indigo-50/30 transition-colors group cursor-default"
                    >
                      {/* Rank */}
                      <td className="px-6 py-4">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index < 3 ? 'bg-slate-900 text-white shadow-md shadow-slate-300' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      
                      {/* SKU ID */}
                      <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                        {product.sku}
                      </td>

                      {/* Product Name */}
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <span className="text-xl">{product.image}</span>
                            <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{product.name}</span>
                         </div>
                      </td>

                      {/* Platform */}
                      <td className="px-6 py-4">
                        <PlatformBadge platform={product.platform} />
                      </td>

                      {/* Orders */}
                      <td className="px-6 py-4 text-right font-bold text-slate-700">
                        {product.orders.toLocaleString()}
                      </td>

                      {/* Growth */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold border border-emerald-100">
                          <TrendingUp size={12} /> +{product.growth}%
                        </div>
                      </td>

                      {/* Chart Button */}
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSelectedProduct(product)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95"
                          title="See detailed trends"
                        >
                          <span className="text-xl"><TrendingUp/></span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {processedProducts.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                    <Package size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No products match your filters.</p>
                </div>
            )}
          </div>
        </div>

        {/* RIGHT: OVERALL TREND GRAPH & LISTS (1/3 Width) */}
        <div className="space-y-6">

  {/* Overall Trend Graph Card */}
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden font-sans">
    {/* Decorative background blob */}
    <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-60"></div>

    {/* Header Section */}
    <div className="flex justify-between items-start mb-6 relative z-10">
      <div>
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg tracking-tight">
          ORDERS TREND OVER TIME <span className="text-slate-400 font-normal text-sm"></span>
        </h3>
      </div>
      <div className="text-right">
        <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1 bg-emerald-50 px-2 py-1 rounded-full mt-1 w-fit ml-auto">
          <TrendingUp size={12} /> +12.5%
        </div>
      </div>
    </div>

    {/* Chart Container */}
    <div className="relative h-64 w-full z-10 flex">
      {/* Y-Axis Labels */}
      <div className="flex flex-col justify-between text-xs text-slate-400 font-mono h-full py-1 pr-4 text-right min-w-[3rem]">
        <span>500</span>
        <span>400</span>
        <span>300</span>
        <span>200</span>
      </div>

      {/* Chart Area */}
      <div className="relative flex-1 h-full border-l border-b border-slate-100">
        {/* Horizontal Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none">
          <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>
          <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>
          <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-200"></div>
          <div className="w-full h-px bg-slate-100 border-t border-dashed border-slate-200 opacity-0"></div>
        </div>

        {/* SVG Bar Chart */}
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          <g fill="#818cf8">
            {/* Bar 1 */}
            <path d="M 2,100 L 2,42.5 A 2.5,2.5 0 0 1 7,42.5 L 7,100 Z" />
            {/* Bar 2 */}
            <path d="M 10,100 L 10,27.5 A 2.5,2.5 0 0 1 15,27.5 L 15,100 Z" />
            {/* Bar 3 */}
            <path d="M 18,100 L 18,32.5 A 2.5,2.5 0 0 1 23,32.5 L 23,100 Z" />
            {/* Bar 4 */}
            <path d="M 26,100 L 26,37.5 A 2.5,2.5 0 0 1 31,37.5 L 31,100 Z" />
            {/* Bar 5 */}
            <path d="M 34,100 L 34,47.5 A 2.5,2.5 0 0 1 39,47.5 L 39,100 Z" />
            {/* Bar 6 */}
            <path d="M 42,100 L 42,57.5 A 2.5,2.5 0 0 1 47,57.5 L 47,100 Z" />
            {/* Bar 7 */}
            <path d="M 50,100 L 50,32.5 A 2.5,2.5 0 0 1 55,32.5 L 55,100 Z" />
            {/* Bar 8 */}
            <path d="M 58,100 L 58,22.5 A 2.5,2.5 0 0 1 63,22.5 L 63,100 Z" />
            {/* Bar 9 */}
            <path d="M 66,100 L 66,77.5 A 2.5,2.5 0 0 1 71,77.5 L 71,100 Z" />
            {/* Bar 10 */}
            <path d="M 74,100 L 74,37.5 A 2.5,2.5 0 0 1 79,37.5 L 79,100 Z" />
            {/* Bar 11 */}
            <path d="M 82,100 L 82,52.5 A 2.5,2.5 0 0 1 87,52.5 L 87,100 Z" />
            {/* Bar 12 */}
            <path d="M 90,100 L 90,42.5 A 2.5,2.5 0 0 1 95,42.5 L 95,100 Z" />
          </g>
        </svg>
      </div>
    </div>

    {/* X-Axis Labels */}
    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2 pl-[3rem]">
      <span>Week1</span>
      <span>Week2</span>
      <span>Week3</span>
      <span>Week4</span>
      <span>Week5</span>
      <span>Week6</span>
      <span>Week7</span>
      <span>Week8</span>
    </div>
  </div>

  {/* Platform Specific Lists */}
  <PlatformTrendList 
    title="Meesho Top 5" 
    platform="Meesho"
    color="text-pink-600" 
    bg="bg-pink-50"
    border="border-pink-100"
    items={TRENDING_PRODUCTS.filter(p => p.platform === 'Meesho').slice(0,5)} 
  />
  <PlatformTrendList 
    title="Flipkart Top 5" 
    platform="Flipkart"
    color="text-blue-600" 
    bg="bg-blue-50"
    border="border-blue-100"
    items={TRENDING_PRODUCTS.filter(p => p.platform === 'Flipkart').slice(0,5)} 
  />
  <PlatformTrendList 
    title="Amazon Top 5" 
    platform="Amazon"
    color="text-orange-600" 
    bg="bg-orange-50"
    border="border-orange-100"
    items={TRENDING_PRODUCTS.filter(p => p.platform === 'Amazon').slice(0,5)} 
  />
</div>



      </div>

      {/* --- PRODUCT DETAIL MODAL --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/80">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-4xl shadow-sm">
                  {selectedProduct.image}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-slate-900">{selectedProduct.name}</h2>
                    <PlatformBadge platform={selectedProduct.platform} />
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="font-mono bg-slate-200/50 px-1.5 py-0.5 rounded text-xs">{selectedProduct.sku}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="font-semibold text-slate-700">₹{selectedProduct.price}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <MetricCard 
                    label="Total Orders" 
                    value={selectedProduct.orders} 
                    icon={<Package size={16} className="text-indigo-500"/>}
                    trend={null}
                />
                <MetricCard 
                    label="Growth Rate" 
                    value={`+${selectedProduct.growth}%`} 
                    icon={<TrendingUp size={16} className="text-emerald-500"/>}
                    trend="positive"
                />
                 <MetricCard 
                    label="Est. Revenue" 
                    value={`₹${(selectedProduct.orders * selectedProduct.price).toLocaleString()}`} 
                    icon={<div className="font-serif italic font-bold text-amber-500">₹</div>}
                    trend={null}
                />
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 size={14} /> Order Trend
                    </h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Last 30 Days</span>
                </div>
                
                {/* Bar Chart */}
                <div className="h-40 bg-white rounded-xl border border-slate-100 flex items-end px-4 pb-0 gap-2 pt-8 relative">
                   <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                        <div className="border-t border-dashed border-slate-100 w-full h-0"></div>
                        <div className="border-t border-dashed border-slate-100 w-full h-0"></div>
                   </div>
                   {Array.from({length: 20}).map((_, i) => {
                       const height = 20 + Math.random() * 80;
                       return (
                        <div 
                            key={i} 
                            className="flex-1 bg-indigo-500 hover:bg-indigo-600 transition-colors rounded-t-sm"
                            style={{ height: `${height}%`, opacity: 0.5 + (i/40) }}
                        ></div>
                       )
                   })}
                </div>
              </div>

              <div>
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users size={14} /> Recent Buyers
                 </h4>
                 <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">User Name</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3 text-right">Last Order Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {RECENT_BUYERS.map((user, i) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-700">{user.name}</td>
                                    <td className="px-4 py-3 text-right text-slate-600 bg-slate-50/50">{user.qty}</td>
                                    <td className="px-4 py-3 text-right text-slate-500 text-xs font-mono">{user.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
                <button 
                    onClick={() => setSelectedProduct(null)} 
                    className="px-6 py-2 bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 rounded-lg text-sm transition-all shadow-sm"
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---

function MetricCard({ label, value, icon, trend }: any) {
    return (
        <div className={`p-4 rounded-xl border ${trend === 'positive' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className={`text-xs font-semibold ${trend === 'positive' ? 'text-emerald-700' : 'text-slate-500'}`}>{label}</span>
            </div>
            <div className={`text-2xl font-bold ${trend === 'positive' ? 'text-emerald-800' : 'text-slate-900'}`}>{value}</div>
        </div>
    )
}

function PlatformBadge({ platform }: { platform: string }) {
const styles =
  {
    Meesho:
      'bg-white text-[#E81C7B] border-[#F5B5D1] shadow-sm shadow-[#F8CADD]',
    
    Flipkart:
      'bg-[#F8D706] text-[#1F74BA]  shadow-sm shadow-[#D4E6F8]',
    
    Amazon:
      'bg-black text-[#FF9900]  shadow-sm shadow-[#FFE6C7]',
  }[platform] || 'bg-slate-50 text-slate-700 border-slate-200';


    return (
        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${styles} inline-block`}>
            {platform}
        </span>
    );
}

function PlatformTrendList({ title, items, color, bg, border, platform }: any) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className={`px-4 py-3 border-b ${border} flex items-center justify-between ${bg}`}>
                <h4 className={`font-bold text-sm ${color} flex items-center gap-2`}>
                   <PlatformBadge platform={platform} /> Top 5
                </h4>
                <ArrowUpRight size={14} className={color} />
            </div>
            <div className="divide-y divide-slate-50">
                {items.length > 0 ? items.map((item: any, i: number) => (
                    <div key={item.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="font-bold text-slate-300 text-xs w-5">#{i+1}</div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{item.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className="font-mono">{item.sku}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span>{item.orders} orders</span>
                            </div>
                        </div>
                        <div className="text-xs font-bold text-emerald-600 flex flex-col items-end bg-emerald-50 px-1.5 py-0.5 rounded">
                            <span>+{item.growth}%</span>
                        </div>
                    </div>
                )) : (
                    <div className="p-4 text-center text-xs text-slate-400">No data available</div>
                )}
            </div>
        </div>
    );
}