"use client";

import { useAuth, api } from "@/providers/GlobalProvider";
import { Loader2, ShieldAlert, ChevronLeft } from "lucide-react";
import Link from "next/link";
// 1. Import React Query
import { useQuery } from "@tanstack/react-query";

// --- Types ---
interface ProtectRouteProps {
  children: React.ReactNode;
  permission: string; // e.g., 'cropper', 'inventory', 'payments'
}

export default function ProtectRoute({ children, permission }: ProtectRouteProps) {
  const { user } = useAuth();
  
  // --- 2. QUERY: Fetch Permissions ---
  const { data: fullUser, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.email], // Unique key for caching
    queryFn: async () => {
        const response = await api.get(`/team/user-details/${encodeURIComponent(user!.email)}`);
        return response.data;
    },
    enabled: !!user?.email, // Only fetch when user exists
    staleTime: 1000 * 60 * 5, // Cache results for 5 minutes
    retry: 1
  });

  // --- 3. Authorization Logic ---
  // Derive state directly from the data (no useEffect needed)
  const isOwnerOrAdmin = fullUser?.role === 'Owner' || fullUser?.role === 'Admin';
  const hasSpecificPermission = fullUser?.permissions?.[permission] === true;
  const isAuthorized = fullUser ? (isOwnerOrAdmin || hasSpecificPermission) : false;

  // --- Render: Loading State ---
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium animate-pulse">Verifying access rights...</p>
      </div>
    );
  }

  // --- Render: Access Denied State ---
  if (!isAuthorized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4 animate-in fade-in zoom-in duration-300">
        <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl text-center max-w-lg border border-slate-100">
          
          {/* Icon */}
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50/50">
            <ShieldAlert size={40} />
          </div>
          
          {/* Text */}
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">Access Restricted</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            You do not have permission to view the <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{permission}</span> module. 
            <br className="hidden md:block" /> Please contact your administrator to request access.
          </p>
          
          {/* Action */}
          <div className="flex justify-center">
             <Link 
               href="/dashboard" 
               className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
             >
               <ChevronLeft size={18} />
               Back to Dashboard
             </Link>
          </div>

        </div>
      </div>
    );
  }

  // --- Render: Authorized Content ---
  return <>{children}</>;
}