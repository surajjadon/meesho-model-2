"use client";

import Link from "next/link";
import Script from "next/script"; 
import { useAuth, api } from "@/providers/GlobalProvider";
import { usePathname } from "next/navigation";
// FIXED IMPORT PATH
import { useRazorpay } from "@/hooks/useRazorpay"; 
import {
  LayoutDashboard, Crop, Package, DollarSign, Repeat, 
  User, LogOut, Store, Truck, ShieldCheck, Zap 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const SidebarSkeleton = () => {
  return (
    <div className="px-4 py-5 space-y-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 px-4 py-2 rounded-lg ${i === 2 ? "bg-blue-600/30" : ""}`}>
          <div className="w-4 h-4 rounded-sm bg-slate-600/60 animate-pulse" />
          <div className="h-3 w-28 rounded bg-slate-600/50 animate-pulse" />
        </div>
      ))}
    </div>
  );
};

const SideBar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  
  // FIXED: Now this works because the hook exports 'initiatePayment'
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();

  const { data: fullUser, isLoading } = useQuery({
    queryKey: ['sidebarPermissions', user?.email],
    queryFn: async () => {
        const response = await api.get(`/team/user-details/${encodeURIComponent(user!.email)}`);
        return response.data;
    },
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 5,
    retry: 1
  });

  const salesChannels = [
    { name: "Meesho", active: true },
    { name: "Amazon (coming soon)", active: false },
    { name: "Flipkart", active: false },
    { name: "Myntra", active: false },
  ];

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
    { href: "/cropper", label: "Cropper", icon: Crop, permission: "cropper" },
    { href: "/orders", label: "Orders", icon: Store, permission: "cropper" },
    { href: "/inventory", label: "Inventory", icon: Package, permission: "inventory" },
    { href: "/mapping", label: "Mapping", icon: Truck, permission: "inventory" },
    { href: "/payments", label: "Payments", icon: DollarSign, permission: "payments" },
    { href: "/returns", label: "Returns / RTO", icon: Repeat, permission: "returns" },
    { href: "/profile", label: "Profile", icon: User, permission: "SPECIAL_RESTRICTED" },
    { href: "/audit-logs", label: "Audit Logs", icon: ShieldCheck, permission: "SPECIAL_RESTRICTED" },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (!fullUser) return false;
    if (item.permission === "SPECIAL_RESTRICTED") return fullUser.role === 'Owner' || fullUser.role === 'Admin';
    if (fullUser.role === 'Owner' || fullUser.role === 'Admin') return true;
    if (item.permission === null) return true;
    return fullUser.permissions?.[item.permission];
  });

  return (
    <div className="w-64 h-screen bg-[#0F172A] text-white flex flex-col">
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

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

      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        {isLoading ? (
          <SidebarSkeleton/>
        ) : (
          visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-all
                  ${isActive ? "bg-blue-600 text-white font-medium" : "text-gray-300 hover:bg-slate-800 hover:text-white"}
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })
        )}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-3">
        <div>
            <p className="text-sm text-gray-300">Logged in as</p>
            <p className="text-sm font-medium mb-1">{fullUser?.name || user?.name || "User"}</p>
            {fullUser?.role && (
                <p className="text-xs text-blue-400 uppercase font-bold tracking-wider">{fullUser.role}</p>
            )}
        </div>

        <button
          onClick={() => initiatePayment(500)} 
          disabled={isPaymentLoading}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white py-2 px-3 rounded-md flex items-center justify-center gap-2 text-sm font-medium shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPaymentLoading ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-white" />
              Upgrade Plan
            </>
          )}
        </button>

        <button
          onClick={logout}
          className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default SideBar;