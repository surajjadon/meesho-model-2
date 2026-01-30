"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBusiness } from "@/providers/GlobalProvider";
import { 
  Briefcase, 
  ChevronDown, 
  Bell, 
  Search,
  LayoutGrid,
  ChevronRight,
  X,
  Check,
  Info,
  AlertCircle
} from "lucide-react";

// --- Types for Notifications ---
type NotificationType = "info" | "alert" | "success";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  time: string;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { businesses, selectedBusiness, selectBusiness, loading } = useBusiness();
  
  // --- Search State ---
  const [searchQuery, setSearchQuery] = useState("");

  // --- Notification State ---
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Mock Data (Replace with API call later)
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "1", title: "Low Inventory", message: "Item SKU-123 is below threshold.", type: "alert", read: false, time: "10m ago" },
    { id: "2", title: "New Order", message: "Order #9982 received from Amazon.", type: "success", read: false, time: "1h ago" },
    { id: "3", title: "System Update", message: "Maintenance scheduled for Sunday.", type: "info", read: true, time: "1d ago" },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // --- Helpers ---
  const getPageTitle = () => {
    const path = pathname.split("/")[1];
    if (!path) return "Overview";
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  // --- Handlers ---
  const handleBusinessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectBusiness(e.target.value);
  };

  // 1. Search Logic
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Pushes to a search page with the query param
      router.push(`/${encodeURIComponent(searchQuery)}`);
      setShowNotifications(false); // Close dropdown if open
    }
  };

  const clearSearch = () => setSearchQuery("");

  // 2. Notification Logic
  const toggleNotifications = () => setShowNotifications(!showNotifications);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (id: string) => {
    // Mark specific as read and navigate if needed
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-slate-200/60">
      
      {/* --- LEFT: Breadcrumbs --- */}
      <div className="flex items-center gap-3 text-slate-500 overflow-hidden shrink-0">
        <div className="p-2 bg-slate-100 rounded-lg border border-slate-200 text-slate-600 hidden sm:block">
          <LayoutGrid size={18} />
        </div>
        
        <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          <span className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" onClick={() => router.push('/')}>
            Labely
          </span>
          <ChevronRight size={24} className="text-slate-500 pt-1" />
          <span className="text-slate-900 font-semibold tracking-tight">
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* --- CENTER: Functional Search Bar --- */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <form onSubmit={handleSearchSubmit} className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
            <Search size={18} />
          </div>
          
          <input
            type="text"
            name="search"
            placeholder="Search orders, inventory, or customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full bg-slate-50 border border-slate-200 
              text-slate-700 text-sm font-medium 
              pl-10 pr-10 py-2.5 rounded-xl 
              placeholder:text-slate-400
              focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:bg-white
              transition-all duration-200
            "
          />

          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-all"
            >
              <X size={14} />
            </button>
          )}
        </form>
      </div>

      {/* --- RIGHT: Actions & Business Selector --- */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        
        {/* Mobile Search Icon */}
        <button 
          onClick={() => router.push('/search')} 
          className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
          <Search size={20} />
        </button>

        {/* --- Notifications System --- */}
        <div className="relative" ref={notificationRef}>
          <div className="border-r border-slate-200 pr-4">
            <button 
              onClick={toggleNotifications}
              className={`p-2 rounded-full transition-all relative ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-4 top-full mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <Check size={14} /> Mark all read
                  </button>
                )}
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif.id)}
                      className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className={`mt-1 shrink-0 w-2 h-2 rounded-full ${!notif.read ? 'bg-indigo-500' : 'bg-transparent'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm ${!notif.read ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{notif.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    <Bell size={24} className="mx-auto mb-2 text-slate-300" />
                    No new notifications
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                  View All History
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- Business Selector --- */}
        <div className="relative group min-w-[160px] sm:min-w-[180px]">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 pointer-events-none z-10">
            {loading ? (
              <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
            ) : (
              <Briefcase size={16} />
            )}
          </div>

          <select
            id="business-selector"
            value={selectedBusiness?.gstin || ""}
            onChange={handleBusinessChange}
            disabled={loading || businesses.length === 0}
            className="
              appearance-none w-full bg-slate-50 border border-slate-200 
              text-slate-700 text-sm font-medium 
              pl-10 pr-10 py-2.5 rounded-xl 
              hover:bg-white hover:border-indigo-300 hover:shadow-sm hover:ring-2 hover:ring-indigo-50
              focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
              transition-all duration-200 cursor-pointer truncate
              disabled:opacity-70 disabled:cursor-not-allowed
            "
          >
            {businesses.length > 0 ? (
              businesses.map((business) => (
                <option key={business._id} value={business.gstin}>
                  {business.brandName}
                </option>
              ))
            ) : (
              <option value="">No Business Found</option>
            )}
          </select>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
            <ChevronDown size={16} />
          </div>
        </div>

      </div>
    </div>
  );
}