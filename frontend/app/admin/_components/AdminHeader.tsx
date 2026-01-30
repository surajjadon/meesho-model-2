"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { 
  Search, 
  Bell, 
  X, 
  Check, 
  Menu,
  LogOut,
  User,
  Settings,
  LayoutGrid,
  ChevronRight
} from "lucide-react";

// --- Types ---
type NotificationType = "info" | "alert" | "success";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  time: string;
}

export default function AdminHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // --- Search State ---
  const [searchQuery, setSearchQuery] = useState("");

  // --- Notification State ---
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // --- Profile Dropdown State ---
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Mock Admin Notifications
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "1", title: "New User Registration", message: "User #1249 just signed up.", type: "info", read: false, time: "2m ago" },
    { id: "2", title: "High Failure Rate", message: "Login failures detected from IP 192.168...", type: "alert", read: false, time: "1h ago" },
    { id: "3", title: "Backup Complete", message: "Daily database backup finished successfully.", type: "success", read: true, time: "5h ago" },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // --- Helpers ---
  const getPageTitle = () => {
    // Splits /admin/users -> ["", "admin", "users"]
    const pathSegments = pathname.split("/");
    const currentPage = pathSegments[pathSegments.length - 1];
    if (!currentPage || currentPage === "admin") return "Overview";
    
    // Capitalize: "users" -> "Users"
    return currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
  };

  // --- Handlers ---
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Admin searching for:", searchQuery);
      // router.push(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const clearSearch = () => setSearchQuery("");

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    console.log("Logging out...");
    router.push('/login');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-40 border-b border-slate-200/60">
      
      {/* --- LEFT: Breadcrumbs & Menu Toggle --- */}
      <div className="flex items-center gap-3 text-slate-500 overflow-hidden shrink-0">
        {/* Mobile Menu Button */}
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          <Menu size={20} />
        </button>

        {/* Icon Box */}
       <div className="p-2 bg-slate-100 rounded-lg border border-slate-200 text-slate-600 hidden sm:block">
          <LayoutGrid size={18} />
        </div>
        
        {/* Breadcrumb Text */}
        <div className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
          <span className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" onClick={() => router.push('/admin/dashboard')}>
            Admin
          </span>
          <ChevronRight size={16} className="text-slate-300 pt-0.5" />
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
            placeholder="Search users, orders, or system logs..."
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

      {/* --- RIGHT: Actions & Profile --- */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        
        {/* Mobile Search Icon */}
        <button className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
          <Search size={20} />
        </button>

        {/* Notifications System */}
        <div className="relative" ref={notificationRef}>
          <div className="border-r border-slate-200 pr-4">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
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
                <h3 className="font-semibold text-slate-800">System Alerts</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <Check size={14} /> Mark all read
                  </button>
                )}
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div key={notif.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-indigo-50/30' : ''}`}>
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
                    No new alerts
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* --- Admin Profile Dropdown (Replaces Business Selector) --- */}
        <div className="relative" ref={profileRef}>
           <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
            >
                <div className="hidden text-right sm:block">
                    <div className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Administrator</div>
                    <div className="text-[10px] text-indigo-500 font-medium uppercase tracking-wider">Super Admin</div>
                </div>
                <div className="w-9 h-9 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold border border-indigo-200 shadow-sm">
                    A
                </div>
            </button>

            {/* Profile Menu */}
            {showProfileMenu && (
                <div className="absolute right-0 top-full mt-3 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="p-1.5 space-y-0.5">
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors">
                            <User size={16} /> My Profile
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors">
                            <Settings size={16} /> Settings
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}