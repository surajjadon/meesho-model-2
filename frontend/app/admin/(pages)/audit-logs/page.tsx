"use client";

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  MoreHorizontal,
  Calendar,
  ChevronDown
} from 'lucide-react';

// --- MOCK DATA ---
const MOCK_LOGS = [
  { id: 1, user: { name: "Kuldeep Gaur", role: "OWNER", avatar: "K" }, action: "PROCESS", module: "Reports", details: "Generated P&L Summary for GSTIN: 23AALCT0236F1Z...", time: "Jan 26, 08:31 AM", ip: "192.168.1.1" },
  { id: 2, user: { name: "Raj Kumar", role: "MANAGER", avatar: "R" }, action: "UPDATE", module: "Inventory", details: "Bulk updated stock for 24 SKUs via CSV upload.", time: "Jan 26, 08:22 AM", ip: "192.168.1.4" },
  { id: 3, user: { name: "Kuldeep Gaur", role: "OWNER", avatar: "K" }, action: "DELETE", module: "Users", details: "Terminated user account: temporary_staff_01", time: "Jan 26, 07:52 AM", ip: "192.168.1.1" },
  { id: 4, user: { name: "Amit Shah", role: "ADMIN", avatar: "A" }, action: "CREATE", module: "Business", details: "Added new business profile: ede (23AALCT0236F1Z0)", time: "Jan 26, 06:19 AM", ip: "10.0.0.55" },
  { id: 5, user: { name: "System", role: "BOT", avatar: "S" }, action: "SYNC", module: "Orders", details: "Auto-synced 94 orders from Meesho API.", time: "Jan 24, 11:12 AM", ip: "Server" },
  { id: 6, user: { name: "Kuldeep Gaur", role: "OWNER", avatar: "K" }, action: "LOGIN", module: "Auth", details: "Successful login via Google OAuth.", time: "Jan 24, 09:00 AM", ip: "192.168.1.1" },
  { id: 7, user: { name: "Raj Kumar", role: "MANAGER", avatar: "R" }, action: "EXPORT", module: "Orders", details: "Exported 'Jan_Sales.xlsx' (154 rows).", time: "Jan 23, 04:30 PM", ip: "192.168.1.4" },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState(MOCK_LOGS);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* --- PAGE HEADER --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="text-indigo-600" size={24} />
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Audit Logs</h1>
           </div>
           <p className="text-slate-500 text-sm ml-8">Track who did what. Monitor team activity and data access.</p>
        </div>
        
        <div className="flex items-center gap-2">
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 shadow-sm">
                {logs.length} EVENTS LOGGED
            </span>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2">
                <Download size={16} /> Export Logs
            </button>
        </div>
      </div>

      {/* --- FILTERS BAR --- */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Search by user, IP, or details..." 
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all" 
            />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <FilterDropdown label="All Modules" />
            <FilterDropdown label="All Actions" />
            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
                <Calendar size={14} className="text-slate-500 mr-2" />
                <span className="text-xs font-medium text-slate-600">Last 7 Days</span>
                <ChevronDown size={14} className="text-slate-400 ml-2" />
            </div>
            <button 
                onClick={handleRefresh}
                className={`p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all ${isLoading ? 'animate-spin text-indigo-600' : ''}`}
            >
                <RefreshCw size={18} />
            </button>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Module</th>
                        <th className="px-6 py-4 w-1/3">Details</th>
                        <th className="px-6 py-4 text-right">Time</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                            {/* USER */}
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                                        log.user.role === 'OWNER' ? 'bg-indigo-600' : 
                                        log.user.role === 'BOT' ? 'bg-slate-500' : 'bg-blue-500'
                                    }`}>
                                        {log.user.avatar}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">{log.user.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{log.user.role}</div>
                                    </div>
                                </div>
                            </td>

                            {/* ACTION */}
                            <td className="px-6 py-4">
                                <ActionBadge action={log.action} />
                            </td>

                            {/* MODULE */}
                            <td className="px-6 py-4 text-slate-600 font-medium">
                                {log.module}
                            </td>

                            {/* DETAILS */}
                            <td className="px-6 py-4">
                                <p className="text-slate-600 line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                                    {log.details}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">IP: {log.ip}</p>
                            </td>

                            {/* TIME */}
                            <td className="px-6 py-4 text-right whitespace-nowrap text-slate-500">
                                {log.time}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
             <span className="text-xs text-slate-500 font-medium">Showing recent 7 events</span>
             <div className="flex gap-2">
                <button className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded text-xs font-medium hover:bg-slate-50 shadow-sm disabled:opacity-50">Previous</button>
                <button className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded text-xs font-medium hover:bg-slate-50 shadow-sm">Next</button>
             </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function FilterDropdown({ label }: { label: string }) {
    return (
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shadow-sm">
            <Filter size={14} className="text-slate-400" />
            {label}
            <ChevronDown size={14} className="text-slate-400 ml-1" />
        </button>
    );
}

function ActionBadge({ action }: { action: string }) {
    const styles = {
        'CREATE': 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'UPDATE': 'bg-amber-50 text-amber-700 border-amber-100',
        'DELETE': 'bg-rose-50 text-rose-700 border-rose-100',
        'PROCESS': 'bg-indigo-50 text-indigo-700 border-indigo-100',
        'LOGIN': 'bg-slate-100 text-slate-700 border-slate-200',
        'EXPORT': 'bg-blue-50 text-blue-700 border-blue-100',
        'SYNC': 'bg-purple-50 text-purple-700 border-purple-100',
    }[action] || 'bg-slate-50 text-slate-700 border-slate-100';

    return (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${styles}`}>
            {action}
        </span>
    );
}