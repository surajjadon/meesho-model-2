"use client";

import { useEffect, useState } from "react";
import { api } from "@/providers/GlobalProvider";
import ProtectRoute from "@/components/ProtectRoute";
import { 
  Search, Filter, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, Download
} from "lucide-react";

// --- Types ---
interface ILog {
  _id: string;
  userName: string;
  action: string;
  resource: string;
  details: string;
  createdAt: string;
  userId?: { 
    email: string; 
    role: string; 
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<ILog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [filterResource, setFilterResource] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Build query params
      const params: any = {};
      if (filterResource) params.resource = filterResource;
      if (filterAction) params.action = filterAction;

      const { data } = await api.get('/team/audit-logs', { params });
      setLogs(data);
    } catch (error) {
      console.error("Failed logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterResource, filterAction]);

  // --- Helpers for Styling ---
  const getActionStyle = (action: string) => {
    switch(action.toUpperCase()) {
      case 'INVITE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'CREATE': return 'bg-green-100 text-green-700 border-green-200';
      case 'REVOKE': 
      case 'DELETE': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'UPDATE': 
      case 'EDIT':   return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PROCESS': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Client-side search filtering
  const filteredLogs = logs.filter(log => 
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectRoute permission="admin">
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* --- Header Section --- */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldCheck className="text-blue-600" /> Security Audit Logs
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Track who did what. Monitor team activity and data access.
              </p>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-white px-3 py-1 rounded-full border shadow-sm">
                 {logs.length} Events Logged
               </span>
            </div>
          </div>

          {/* --- Toolbar Section --- */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
            
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search by user or details..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                
                {/* Resource Filter */}
                <select 
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  value={filterResource}
                  onChange={(e) => setFilterResource(e.target.value)}
                >
                  <option value="">All Modules</option>
                  <option value="Team">Team</option>
                  <option value="Cropper">Cropper</option>
                  <option value="Inventory">Inventory</option>
                </select>
                
                {/* Action Filter */}
                <select 
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                >
                  <option value="">All Actions</option>
                  <option value="INVITE">Invites</option>
                  <option value="UPDATE">Updates</option>
                  <option value="REVOKE">Revokes</option>
                  <option value="PROCESS">Processing</option>
                </select>
              </div>

              <button 
                onClick={fetchLogs} 
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* --- Data Table --- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase text-xs tracking-wider">User</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase text-xs tracking-wider">Action</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase text-xs tracking-wider">Module</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase text-xs tracking-wider w-1/3">Details</th>
                    <th className="px-6 py-4 font-semibold text-slate-600 uppercase text-xs tracking-wider text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400">Loading activity...</td></tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400">No logs found matching your filters.</td></tr>
                  ) : filteredLogs.map((log) => (
                    <tr key={log._id} className="group hover:bg-slate-50/80 transition-colors">
                      
                      {/* User Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {log.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{log.userName}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">
                              {log.userId?.role || 'Unknown Role'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide ${getActionStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Module */}
                      <td className="px-6 py-4 text-slate-600 font-medium">
                         {log.resource}
                      </td>

                      {/* Details */}
                      <td className="px-6 py-4 text-slate-600">
                         <p className="truncate max-w-sm" title={log.details}>
                           {log.details}
                         </p>
                      </td>

                      {/* Time */}
                      <td className="px-6 py-4 text-slate-400 text-xs text-right tabular-nums whitespace-nowrap">
                         {formatDate(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </ProtectRoute>
  );
}