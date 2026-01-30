"use client";

import React, { useState } from 'react';
import Link from "next/link";
import { 
  Users, 
  Package, 
  FileText, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  X,
  Settings,
  UserCog,
  Calendar,
  Filter
} from 'lucide-react';

export default function AdminDashboard() {
  const [showAdminTools, setShowAdminTools] = useState(true);
  const [dateRange, setDateRange] = useState('30d'); // State for visual feedback

  return (
    <div className="space-y-6 relative min-h-screen pb-20">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time insights and performance metrics.</p>
        </div>
        
        {/* DATE RANGE FILTER CONTROLS */}
        <div className="flex flex-col sm:flex-row gap-3">
            
            {/* Quick Filters (Pill Style) */}
            <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm self-start sm:self-auto">
                {['Today', '7d', '30d', '90d'].map((label) => (
                    <button
                        key={label}
                        onClick={() => setDateRange(label)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            dateRange === label 
                            ? 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        {label === 'Today' ? 'Today' : `Last ${label}`}
                    </button>
                ))}
            </div>

            {/* Custom Date Inputs */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm px-3 py-1.5 self-start sm:self-auto">
                <Calendar size={14} className="text-slate-400 mr-2" />
                <input 
                    type="date" 
                    className="text-xs font-medium border-none focus:ring-0 text-slate-600 bg-transparent p-0 w-24 cursor-pointer" 
                />
                <span className="text-slate-300 px-2 text-xs">to</span>
                <input 
                    type="date" 
                    className="text-xs font-medium border-none focus:ring-0 text-slate-600 bg-transparent p-0 w-24 cursor-pointer" 
                />
                <div className="w-px h-4 bg-slate-200 mx-2"></div>
                <button className="text-indigo-600 hover:text-indigo-700">
                    <Filter size={14} />
                </button>
            </div>

        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value="1,247" trend="+12.5%" trendUp={true} icon={<Users size={20} className="text-indigo-600" />} bg="bg-indigo-50" subtext="vs. last month" />
        <StatCard title="Active Users" value="856" trend="+5.2%" trendUp={true} icon={<Activity size={20} className="text-emerald-600" />} bg="bg-emerald-50" subtext="active now" />
        <StatCard title="Total Orders" value="5,645" trend="-2.4%" trendUp={false} icon={<Package size={20} className="text-blue-600" />} bg="bg-blue-50" subtext="vs. last month" />
        <StatCard title="Labels Uploaded" value="5,234" trend="+8.1%" trendUp={true} icon={<FileText size={20} className="text-orange-600" />} bg="bg-orange-50" subtext="92% success rate" />
      </div>

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2/3 Width) */}
        <div className="xl:col-span-2 space-y-6">
            
            {/* Platform Distribution */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[320px]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Platform Orders</h3>
                        <p className="text-xs text-slate-500">Order volume distribution across channels</p>
                    </div>
                    <button className="text-indigo-600 text-xs font-medium hover:text-indigo-700 flex items-center gap-1">
                        View Report <ArrowRight size={14} />
                    </button>
                </div>
                
                <div className="space-y-8">
                  {/* Meesho */}
                  <PlatformBar
                    label="Meesho"
                    count="2,145"
                    percent={38}
                    color="bg-[#E81C7B]"
                    icon={<div className="flex items-center justify-center w-8 h-5 rounded-full bg-white text-[#E81C7B] font-bold">M</div>}
                  />
                  {/* Flipkart */}
                  <PlatformBar
                    label="Flipkart"
                    count="2,189"
                    percent={39}
                    color="bg-[#1F74BA]"
                    icon={<div className="flex items-center justify-center w-8 h-5 rounded-full bg-[#F8D706] text-[#1F74BA] font-bold">F</div>}
                  />
                  {/* Amazon */}
                  <PlatformBar
                    label="Amazon"
                    count="1,311"
                    percent={23}
                    color="bg-[#FF9900]"
                    icon={<div className="flex items-center justify-center w-8 h-5 rounded-full bg-[#111111] text-[#FF9900] font-bold">A</div>}
                  />
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN (1/3 Width) */}
        <div className="space-y-6">
            
            {/* Top Trending */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[320px]">
                <div className="flex items-center gap-2 mb-4 shrink-0">
                    <div className="p-1.5 bg-rose-50 rounded text-rose-500">
                        <TrendingUp size={18} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Top Trending</h3>
                </div>

                {/* Scroll Container for List */}
                <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-2">
                    <TrendingItem rank={1} name="Cotton T-Shirt" growth="+24%" platform="Meesho" />
                    <TrendingItem rank={2} name="Wireless Earbuds" growth="+18%" platform="Flipkart" />
                    <TrendingItem rank={3} name="Running Shoes" growth="+15%" platform="Amazon" />
                    <TrendingItem rank={4} name="Smart Watch" growth="+12%" platform="Flipkart" />
                    <TrendingItem rank={5} name="Denim Jeans" growth="+9%" platform="Meesho" />
                    <TrendingItem rank={6} name="Leather Wallet" growth="+8%" platform="Amazon" />
                    <TrendingItem rank={7} name="Sunglasses" growth="+7%" platform="Flipkart" />
                    <TrendingItem rank={8} name="Backpack" growth="+6%" platform="Meesho" />
                </div>

                <Link
                  href="/admin/trends"
                  className="w-full mt-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium hover:bg-slate-50 transition-colors shrink-0 text-center block"
                >
                  View All Trends
                </Link>
            </div>
        </div>
      </div>

      {/* --- FLOATING ADMIN TOOLS WIDGET --- */}
      {showAdminTools && (
        <div className="fixed bottom-6 right-6 z-50 w-80 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-5 rounded-2xl shadow-2xl text-white border border-white/10 relative overflow-hidden">
                <button 
                    onClick={() => setShowAdminTools(false)}
                    className="absolute top-3 right-3 text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                    <X size={16} />
                </button>

                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <UserCog size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">Admin Tools</h3>
                        <p className="text-[11px] text-indigo-100 font-medium">Quick Access</p>
                    </div>
                </div>
                
                <p className="text-indigo-100 text-xs mb-4 leading-relaxed">
                    Quickly manage user access or configure global system settings.
                </p>
                
                <div className="flex gap-2">
                    <Link href="/admin/users" className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-xs font-bold transition-colors border border-white/10 flex items-center justify-center gap-2">
                        <Users size={14} /> Users
                    </Link>
                    <Link href="/admin/settings" className="flex-1 bg-white text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg flex items-center justify-center gap-2">
                        <Settings size={14} /> Settings
                    </Link>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS (UNCHANGED) ---
function StatCard({ title, value, trend, trendUp, icon, bg, subtext }: any) {
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-lg ${bg}`}>
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                    trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                    {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trend}
                </div>
            </div>
            <div className="space-y-1">
                <h3 className="text-sm font-medium text-slate-500">{title}</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">{value}</span>
                </div>
                <p className="text-xs text-slate-400">{subtext}</p>
            </div>
        </div>
    );
}

function PlatformBar({ label, count, percent, color, icon }: any) {
    return (
        <div className="group">
            <div className="flex justify-between text-sm mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-slate-100 text-slate-600">
                        {icon}
                    </div>
                    <span className="font-medium text-slate-700">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{count}</span>
                    <span className="text-xs text-slate-400">({percent}%)</span>
                </div>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${color} rounded-full transition-all duration-1000 ease-out group-hover:opacity-80`} 
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
        </div>
    );
}

function TrendingItem({ rank, name, growth, platform }: any) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                #{rank}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{name}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{platform}</div>
            </div>
            <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                {growth}
            </div>
        </div>
    );
}