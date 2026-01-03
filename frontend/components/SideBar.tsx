"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, api } from "@/providers/GlobalProvider";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Crop,
  Package,
  DollarSign,
  Repeat,
  User,
  LogOut,
  Store,
  Truck,
  Loader2 ,
  ShieldCheck
} from "lucide-react";

// --- API Helper ---
export const getUserData = async (email: string) => {
  try {
    const response = await api.get(`/team/user-details/${encodeURIComponent(email)}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    return null;
  }
};

const SideBar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  
  const [fullUser, setFullUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // FETCH DATA
  useEffect(() => {
    if (!user?.email) return;
    const fetchUser = async () => {
      setLoading(true);
      const data = await getUserData(user.email);
      if (data) setFullUser(data);
      setLoading(false);
    };
    fetchUser();
  }, [user?.email]);

  const salesChannels = [
    { name: "Meesho", active: true },
    { name: "Amazon (coming soon)", active: false },
    { name: "Flipkart", active: false },
    { name: "Myntra", active: false },
  ];

  // --- CONFIGURATION ---
  const navItems = [
    // Public: Everyone sees Dashboard
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
    
    // Modules: Require specific checkboxes
    { href: "/cropper", label: "Cropper", icon: Crop, permission: "cropper" },
    { href: "/orders", label: "Orders", icon: Store, permission: "cropper" },
    { href: "/inventory", label: "Inventory", icon: Package, permission: "inventory" },
    { href: "/mapping", label: "Mapping", icon: Truck, permission: "inventory" },
    { href: "/payments", label: "Payments", icon: DollarSign, permission: "payments" },
    { href: "/returns", label: "Returns / RTO", icon: Repeat, permission: "returns" },

    // Special: Profile (We will handle this logic manually below)
    { href: "/profile", label: "Profile", icon: User, permission: "SPECIAL_RESTRICTED" },
    { 
      href: "/audit-logs", 
      label: "Audit Logs", 
      icon: ShieldCheck, 
      permission:  "SPECIAL_RESTRICTED" // Only admins see this
    },
  ];

  // --- FILTER LOGIC ---
  const visibleNavItems = navItems.filter((item) => {
    // 0. Safety Check
    if (!fullUser) return false;

    // 1. 🔒 SPECIAL RULE: Profile is ONLY for Admin and Owner
    if (item.label === "Profile") {
        return fullUser.role === 'Owner' || fullUser.role === 'Admin';
    }

    // 2. Owner & Admin see EVERYTHING else automatically
    if (fullUser.role === 'Owner' || fullUser.role === 'Admin') return true;

    // 3. Public items (Dashboard)
    if (item.permission === null) return true;

    // 4. Standard Permissions (Check the database checkboxes)
    return fullUser.permissions?.[item.permission];
  });

  return (
    <div className="w-64 h-screen bg-[#0F172A] text-white flex flex-col">
      {/* HEADER */}
      <div className="p-5 border-b border-slate-700">
        <h2 className="text-lg font-semibold">Store Manager</h2>
        <select className="w-full mt-3 px-3 py-2 rounded-md bg-slate-800 text-sm text-white">
          {salesChannels.map((ch) => (
            <option key={ch.name} disabled={!ch.active} className={ch.active ? "" : "opacity-50"}>
              {ch.name}
            </option>
          ))}
        </select>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10 opacity-50">
            <Loader2 className="animate-spin w-6 h-6" />
          </div>
        ) : (
          visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-all
                  ${isActive 
                    ? "bg-blue-600 text-white font-medium" 
                    : "text-gray-300 hover:bg-slate-800 hover:text-white"}
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })
        )}
      </nav>

      {/* USER SECTION */}
      <div className="p-4 border-t border-slate-700">
        <p className="text-sm text-gray-300">Logged in as</p>
        <p className="text-sm font-medium mb-1">
          {fullUser?.name || user?.name || "User"}
        </p>
        {fullUser?.role && (
           <p className="text-xs text-blue-400 mb-3 uppercase font-bold tracking-wider">
             {fullUser.role}
           </p>
        )}

        <button
          onClick={logout}
          className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-md flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default SideBar;