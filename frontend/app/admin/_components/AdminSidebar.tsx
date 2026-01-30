"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  LogOut,
  ShieldCheck,
  ChartNoAxesCombined
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/trends", label: "Order Trends", icon: TrendingUp },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/audit-logs", label: "System Logs", icon: ShieldCheck },
    { href: "/admin/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  ];

  return (
    <div className="w-64 h-screen bg-[#0F172A] text-white flex flex-col shrink-0 border-r border-slate-800">
      
      {/* HEADER */}
      <div className="p-5 border-b border-slate-700">
        <h2 className="text-lg font-semibold tracking-tight">LabelY Admin</h2>
        <select className="w-full mt-3 px-3 py-2 rounded-md bg-slate-800 text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-600 border border-slate-700">
           <option>Global View</option>
        </select>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-all font-medium
                ${isActive 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"}
              `}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-700 bg-[#0F172A]">
        <p className="text-sm text-slate-400">Logged in as</p>
        <p className="text-sm font-medium text-white mb-1">Administrator</p>
        <p className="text-[10px] text-blue-400 mb-3 uppercase font-bold tracking-wider">
          SUPER ADMIN
        </p>

        <button
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md flex items-center justify-center gap-2 transition-colors text-sm font-medium shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}