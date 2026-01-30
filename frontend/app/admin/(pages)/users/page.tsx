"use client";

import React, { useState, useMemo } from 'react';
import { 
  Search, Download, Eye, UserPlus, CheckCircle, 
  XCircle, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, 
  Trash2, X, FileText, ShoppingBag, Package, Crown, Star, Users
} from 'lucide-react';

// --- MOCK DATA GENERATOR ---
const generateMockUsers = (count: number) => {
  return Array.from({ length: count }).map((_, i) => {
    // Logic for filtering simulation
    const isPaid = Math.random() > 0.6; // 40% are paid
    const isLoyal = isPaid && Math.random() > 0.5; // 50% of paid are loyal (>2 months)
    
    // Set dates based on loyalty
    // Current assumed date: Jan 2026
    const regDate = isLoyal 
      ? '15 Oct 2025' // > 2 months ago
      : isPaid 
        ? '10 Jan 2026' // Recent paid
        : '21 Jan 2026'; // Recent free

    return {
      id: `#10${i + 4}`,
      name: `User ${i + 4}`,
      email: `user${i + 4}@example.com`,
      phone: `+91-98765${(10000 + i).toString().substring(1)}`,
      registered: regDate,
      isPaid: isPaid, // New field for logic
      isLoyal: isLoyal, // New field for logic
      meesho: Math.floor(Math.random() * 50),
      flipkart: Math.floor(Math.random() * 50),
      amazon: Math.floor(Math.random() * 30),
      get total() { return this.meesho + this.flipkart + this.amazon },
      get labels() { return Math.floor(this.total * 0.9) },
      status: Math.random() > 0.2 ? 'Active' : 'Inactive'
    };
  });
};

const INITIAL_DATA = [
    { id: '#101', name: 'Kuldeep Gaur', email: 'kuldeep@mail.com', phone: '+91-9876543210', registered: '21 Jan 2025', isPaid: false, isLoyal: false, meesho: 25, flipkart: 32, amazon: 20, total: 77, labels: 70, status: 'Active' },
    { id: '#102', name: 'Raj Kumar', email: 'raj@mail.com', phone: '+91-9876543211', registered: '20 Oct 2025', isPaid: true, isLoyal: true, meesho: 12, flipkart: 15, amazon: 8, total: 35, labels: 33, status: 'Inactive' },
    { id: '#103', name: 'Amit Shah', email: 'amit@mail.com', phone: '+91-9876543212', registered: '19 Jan 2026', isPaid: true, isLoyal: false, meesho: 45, flipkart: 38, amazon: 29, total: 112, labels: 108, status: 'Active' },
    ...generateMockUsers(60)
];

export default function UsersPage() {
  const [data, setData] = useState(INITIAL_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('All'); // 'All', 'Free', 'Paid', 'Loyal'
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // --- MODAL STATES ---
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null); // For View Details
  
  const ITEMS_PER_PAGE = 11;

  // --- FILTER & SORT LOGIC ---
  const filteredData = useMemo(() => {
    return data.filter(user => {
      // 1. Search Logic
      const matchesSearch = 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.phone.includes(searchTerm);
      
      // 2. Tab/Category Logic
      let matchesTab = true;
      if (currentTab === 'Free') {
        matchesTab = !user.isPaid; // Free / Signup users
      } else if (currentTab === 'Paid') {
        matchesTab = user.isPaid; // Any paid subscription
      } else if (currentTab === 'Loyal') {
        matchesTab = user.isLoyal; // Paid > 2 months
      }

      return matchesSearch && matchesTab;
    });
  }, [data, searchTerm, currentTab]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- HANDLERS ---
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleDelete = (id: string) => {
      if(confirm(`Are you sure you want to delete user ${id}?`)) {
          setData(prev => prev.filter(u => u.id !== id));
      }
  };

  const handleAddUser = (newUser: any) => {
    const lastId = data.length > 0 ? parseInt(data[data.length - 1].id.replace('#', '')) : 100;
    const userToAdd = {
        ...newUser,
        id: `#${lastId + 1}`,
        registered: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        meesho: 0, flipkart: 0, amazon: 0, total: 0, labels: 0, status: 'Active',
        isPaid: false, isLoyal: false
    };
    setData(prev => [userToAdd, ...prev]);
    setIsAddUserModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20 relative min-h-screen p-6 bg-slate-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage registered users, track orders, and view account status.</p>
        </div>
        <button 
          onClick={() => setIsAddUserModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm shadow-indigo-200 transition-colors flex items-center gap-2"
        >
            <UserPlus size={18} /> Add User
        </button>
      </div>

      {/* NEW: TAB NAVIGATION & CONTROLS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-100 scrollbar-hide">
            {[
                { id: 'All', label: 'All Users', icon: Users, count: data.length },
                { id: 'Free', label: 'Free / Signup', icon: UserPlus, count: data.filter(u => !u.isPaid).length },
                { id: 'Paid', label: 'Paid Users', icon: Crown, count: data.filter(u => u.isPaid).length },
                { id: 'Loyal', label: 'Loyal (>2 Months)', icon: Star, count: data.filter(u => u.isLoyal).length },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => { setCurrentTab(tab.id); setCurrentPage(1); }}
                    className={`
                        flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 whitespace-nowrap
                        ${currentTab === tab.id 
                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }
                    `}
                >
                    <tab.icon size={16} className={currentTab === tab.id ? 'text-indigo-600' : 'text-slate-400'} />
                    {tab.label}
                    <span className={`text-xs px-2 py-0.5 rounded-full ml-1 ${currentTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        {tab.count}
                    </span>
                </button>
            ))}
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/30">
            <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" placeholder="Search by name, email, or phone..." 
                    value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white focus:bg-white transition-all" 
                />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium flex items-center gap-2 transition-colors shadow-sm ml-auto">
                    <Download size={16} /> <span className="hidden sm:inline">Export</span>
                </button>
            </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        <SortableHeader label="ID" sortKey="id" currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="User" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Registered" sortKey="registered" currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Meesho" sortKey="meesho" center currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Flipkart" sortKey="flipkart" center currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Amazon" sortKey="amazon" center currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Total" sortKey="total" center currentSort={sortConfig} onSort={handleSort} />
                        <SortableHeader label="Labels" sortKey="labels" center currentSort={sortConfig} onSort={handleSort} />
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/60 transition-colors group">
                            <td className="px-6 py-4 text-slate-600 font-medium">
                                {user.id}
                                {user.isLoyal && <Star size={12} className="inline ml-1 text-amber-500 fill-amber-500" />}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-200 shrink-0">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-900 truncate flex items-center gap-1">
                                            {user.name}
                                            {user.isPaid && <Crown size={12} className="text-indigo-500" />}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600 text-xs">{user.registered}</td>
                            <td className="px-6 py-4 text-center font-semibold text-[#E81C7B]">{user.meesho}</td>
                            <td className="px-6 py-4 text-center font-semibold text-[#1F74BA]">{user.flipkart}</td>
                            <td className="px-6 py-4 text-center font-semibold text-[#FF9900]">{user.amazon}</td>
                            <td className="px-6 py-4 text-center"><span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded text-xs">{user.total}</span></td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center w-full">
                                    <span className="text-xs font-semibold text-slate-700 mb-1">{user.labels}</span>
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${(user.labels / user.total) > 0.9 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((user.labels / (user.total || 1)) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {user.status === 'Active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                    {user.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button 
                                        onClick={() => setSelectedUser(user)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" 
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(user.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {paginatedData.length === 0 && (
                        <tr>
                            <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                                No users found in this category.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        
        {/* PAGINATION */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-700">{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="font-bold text-slate-700">{Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)}</span> of <span className="font-bold text-slate-700">{sortedData.length}</span>
            </span>
            <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 shadow-sm flex items-center gap-1"><ChevronLeft size={14} /> Previous</button>
                <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                        <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-7 h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{i + 1}</button>
                    ))}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 shadow-sm flex items-center gap-1">Next <ChevronRight size={14} /></button>
            </div>
        </div>
      </div>

      {/* --- ADD USER MODAL --- */}
      {isAddUserModalOpen && (
        <AddUserModal onClose={() => setIsAddUserModalOpen(false)} onAdd={handleAddUser} />
      )}

      {/* --- VIEW USER DETAILS SIDE SHEET --- */}
      {selectedUser && (
        <UserDetailSheet 
            user={selectedUser} 
            onClose={() => setSelectedUser(null)} 
        />
      )}

    </div>
  );
}

// --- SUB-COMPONENTS (Kept exactly as you provided + minor tweaks for logic) ---

function SortableHeader({ label, sortKey, center, currentSort, onSort }: any) {
    const isActive = currentSort?.key === sortKey;
    return (
        <th className={`px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none group ${center ? 'text-center' : ''}`} onClick={() => onSort(sortKey)}>
            <div className={`flex items-center gap-1 ${center ? 'justify-center' : ''}`}>
                {label}
                <div className={`text-slate-400 ${isActive ? 'text-indigo-600' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isActive ? (currentSort.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : (<ArrowUpDown size={12} />)}
                </div>
            </div>
        </th>
    );
}

function AddUserModal({ onClose, onAdd }: any) {
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-900">Add New User</h2>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <input type="text" placeholder="Full Name" className="w-full px-3 py-2 border rounded-lg text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <input type="email" placeholder="Email Address" className="w-full px-3 py-2 border rounded-lg text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    <input type="tel" placeholder="Phone Number" className="w-full px-3 py-2 border rounded-lg text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    <button onClick={() => onAdd(form)} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Create Account</button>
                </div>
            </div>
        </div>
    );
}

// --- CUSTOM SVG GRAPH COMPONENT (Same as provided) ---
function SimpleLineChart({ data }: { data: any[] }) {
    if(!data || data.length === 0) return null;
    
    const height = 150;
    const width = 600;
    const padding = 20;
    const maxVal = Math.max(...data.map(d => Math.max(d.meesho, d.flipkart, d.amazon))) || 10;
    
    // Scale functions
    const getX = (i: number) => padding + (i * (width - 2 * padding) / (data.length - 1));
    const getY = (val: number) => height - padding - (val * (height - 2 * padding) / maxVal);
    
    // Create paths
    const createPath = (key: string) => {
        return data.map((d, i) => 
            `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[key])}`
        ).join(' ');
    };

    return (
        <div className="w-full h-[200px] flex flex-col justify-center select-none">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(t => (
                    <line key={t} x1={padding} y1={getY(maxVal * t)} x2={width - padding} y2={getY(maxVal * t)} stroke="#e2e8f0" strokeWidth="1" />
                ))}
                
                {/* Lines */}
                <path d={createPath('meesho')} fill="none" stroke="#E81C7B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={createPath('flipkart')} fill="none" stroke="#1F74BA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d={createPath('amazon')} fill="none" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots (Only show on hover usually, but fixed here for visual) */}
                {data.map((d, i) => (
                   <g key={i}>
                       {i % 4 === 0 && ( // Show only some dots to avoid clutter
                           <>
                             <circle cx={getX(i)} cy={getY(d.meesho)} r="2" fill="#E81C7B" />
                             <circle cx={getX(i)} cy={getY(d.flipkart)} r="2" fill="#1F74BA" />
                             <circle cx={getX(i)} cy={getY(d.amazon)} r="2" fill="#FF9900" />
                           </>
                       )}
                   </g>
                ))}
            </svg>
            <div className="flex justify-between px-2 text-[10px] text-slate-400 mt-2">
                <span>30 Days Ago</span>
                <span>15 Days Ago</span>
                <span>Today</span>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-[#E81C7B]"></span> Meesho</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-[#1F74BA]"></span> Flipkart</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-[#FF9900]"></span> Amazon</div>
            </div>
        </div>
    );
}

// --- UPDATED SUB-COMPONENT: User Details Sheet ---
function UserDetailSheet({ user, onClose }: { user: any, onClose: () => void }) {
    // Generate detailed mock data specific to this user view
    const detailedInfo = useMemo(() => {
        // Generate last 20 orders based on user's stats
        const orders = [];
        const platforms = ['Meesho', 'Flipkart', 'Amazon'];
        const tools = ['Cropper', 'Labely'];
        const statuses = ['Delivered', 'In Transit', 'Processing', 'Cancelled'];
        
        for(let i=0; i<20; i++) {
            const platform = platforms[Math.floor(Math.random() * 3)];
            orders.push({
                id: `#ORD-${8900 - i}`,
                platform: platform,
                date: new Date(Date.now() - i * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                processing: tools[Math.floor(Math.random() * 2)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                label: Math.random() > 0.3 ? 'Uploaded' : 'Pending',
                color: platform === 'Meesho' ? '#E81C7B' : platform === 'Flipkart' ? '#1F74BA' : '#FF9900'
            });
        }

        // Generate Trend Data for graph (last 30 days)
        const trendData = Array.from({ length: 30 }).map((_, i) => ({
            day: i,
            meesho: Math.floor(Math.random() * 10),
            flipkart: Math.floor(Math.random() * 12),
            amazon: Math.floor(Math.random() * 8),
        }));

        return { orders, trendData };
    }, [user.id]);

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            {/* Slide-in Panel (Expanded Width) */}
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                           USER DETAILS - {user.name.split(' ')[0]} <span className="text-slate-400 font-normal">({user.id})</span>
                           {user.isPaid && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">PAID</span>}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                    
                    {/* SECTION 1: Basic Information */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                             <FileText size={14} /> Basic Information
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                                <InfoRow label="Name" value={user.name} />
                                <InfoRow label="Email" value={user.email} />
                                <InfoRow label="Phone" value={user.phone} />
                                <InfoRow label="Registration Date" value={user.registered} />
                                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 border-dashed">
                                    <span className="text-slate-500">Status</span>
                                    <span className={`flex items-center gap-1.5 font-medium ${user.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                        {user.status}
                                    </span>
                                </div>
                                <InfoRow label="Subscription" value={user.isLoyal ? 'Loyal Member (>2mo)' : user.isPaid ? 'Paid Member' : 'Free / Signup'} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: Order Statistics Summary */}
                    <div className="space-y-3">
                         <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                             <ShoppingBag size={14} /> Order Statistics (By Platform)
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard 
                                title="MEESHO ORDERS" 
                                value={user.meesho} 
                                total={user.total} 
                                color="text-[#E81C7B]" 
                                borderColor="border-[#E81C7B]/20" 
                                bgColor="bg-[#E81C7B]/5"
                            />
                            <StatCard 
                                title="FLIPKART ORDERS" 
                                value={user.flipkart} 
                                total={user.total} 
                                color="text-[#1F74BA]" 
                                borderColor="border-[#1F74BA]/20" 
                                bgColor="bg-[#1F74BA]/5"
                            />
                            <StatCard 
                                title="AMAZON ORDERS" 
                                value={user.amazon} 
                                total={user.total} 
                                color="text-[#FF9900]" 
                                borderColor="border-[#FF9900]/20" 
                                bgColor="bg-[#FF9900]/5"
                            />
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-800 text-white flex flex-col justify-between">
                                <span className="text-[10px] font-bold opacity-70 uppercase">Total Orders</span>
                                <div className="text-2xl font-bold">{user.total}</div>
                                <div className="h-4"></div>
                            </div>
                        </div>
                        
                        {/* Stats Footer */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-center text-xs gap-2">
                             <div className="flex items-center gap-2 text-slate-600">
                                 <span className="font-semibold">Processing Through:</span> 
                                 <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">Cropper & Labely</span>
                             </div>
                             <div className="flex items-center gap-2 text-slate-600">
                                 <span className="font-semibold">Labels Uploaded:</span> 
                                 <span className="text-indigo-600 font-bold">{user.labels} / {user.total} orders</span>
                             </div>
                        </div>
                    </div>

                    {/* SECTION 3: Order Trends Graph */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <ArrowUp size={14} /> Order Trends - User Wise
                            </div>
                            <select className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 focus:outline-none">
                                <option>Last 30 days</option>
                                <option>Last 7 days</option>
                            </select>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <SimpleLineChart data={detailedInfo.trendData} />
                        </div>
                    </div>

                    {/* SECTION 4: Recent Orders List */}
                    <div className="space-y-3 pb-10">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                             <Package size={14} /> Recent Orders
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Order ID</th>
                                        <th className="px-4 py-3">Platform</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Processing</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Label</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {detailedInfo.orders.map((order, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-700">{order.id}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold" style={{ color: order.color }}>{order.platform}</span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{order.date}</td>
                                            <td className="px-4 py-3 text-slate-600">{order.processing}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                                    order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                    {order.status === 'Delivered' && <CheckCircle size={10} />}
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                 <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                     order.label === 'Uploaded' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-500'
                                                 }`}>
                                                     {order.label}
                                                 </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-2 text-center bg-slate-50 border-t border-slate-200">
                                <button className="text-xs text-indigo-600 font-medium hover:underline">View All Orders</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Helper for Info Row in Section 1
function InfoRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 border-dashed">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium text-slate-900">{value}</span>
        </div>
    );
}

// Helper for Stat Card in Section 2
function StatCard({ title, value, total, color, borderColor, bgColor }: any) {
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
    return (
        <div className={`p-4 rounded-xl border ${borderColor} ${bgColor} flex flex-col justify-between`}>
            <span className={`text-[10px] font-bold ${color} opacity-70 uppercase`}>{title}</span>
            <div className={`text-2xl font-bold ${color} my-1`}>{value}</div>
            <span className={`text-[10px] ${color} font-medium`}>{percentage}% of total</span>
        </div>
    );
}