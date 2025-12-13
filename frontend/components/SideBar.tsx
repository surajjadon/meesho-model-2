"use client";

import Link from "next/link";
import { useAuth } from "@/providers/GlobalProvider";
import { usePathname } from "next/navigation";

import {
    LayoutDashboard,
    Crop,
    Package,
    BarChart,
    DollarSign,
    Repeat,
    User,
    Settings,
    LogOut,
    Store,
    Truck,
} from "lucide-react";

const SideBar = () => {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    const salesChannels = [
        { name: "Meesho", active: true },
        { name: "Amazon (coming soon)", active: false },
        { name: "Flipkart", active: false },
        { name: "Myntra", active: false },
    ];

    const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/cropper", label: "Cropper", icon: Crop },
        { href: "/inventory", label: "Inventory", icon: Package },
        { href: "/mapping", label: "Mapping", icon: Truck },
        { href: "/orders", label: "Orders", icon: Store },
        // { href: "/reports", label: "Reports", icon: BarChart },
        { href: "/payments", label: "Payments", icon: DollarSign },
        // { href: "/profit-loss", label: "Profit / Loss", icon: Truck },
        { href: "/returns", label: "Returns / RTO", icon: Repeat },
        { href: "/profile", label: "Profile", icon: User },
        // { href: "/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="w-64 h-screen bg-[#0F172A] text-white flex flex-col">
            
            {/* HEADER */}
            <div className="p-5 border-b border-slate-700">
                <h2 className="text-lg font-semibold">Store Manager</h2>

                {/* Sales Channel Dropdown */}
                <select
                    className="w-full mt-3 px-3 py-2 rounded-md bg-slate-800 text-sm text-white"
                    disabled={false}
                >
                    {salesChannels.map((ch) => (
                        <option
                            key={ch.name}
                            disabled={!ch.active}
                            className={ch.active ? "" : "opacity-50"}
                        >
                            {ch.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 px-4 py-5 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm
                                transition-all
                                ${isActive
                                    ? "bg-blue-600 text-white font-medium"
                                    : "text-gray-300 hover:bg-slate-800 hover:text-white"
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* USER SECTION */}
            <div className="p-4 border-t border-slate-700">
                <p className="text-sm text-gray-300">Logged in as</p>
                <p className="text-sm font-medium mb-3">
                    {user?.name || "User"}
                </p>

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
