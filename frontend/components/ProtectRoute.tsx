"use client";

import { useEffect, useState } from "react";
import { useAuth, api } from "@/providers/GlobalProvider";
import { Loader2, ShieldAlert, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- Types ---
interface ProtectRouteProps {
  children: React.ReactNode;
  permission: string; // e.g., 'cropper', 'inventory', 'payments'
}

// --- The Fetch Logic (reusing your snippet) ---
const getUserData = async (email: string) => {
  try {
    const response = await api.get(`/team/user-details/${encodeURIComponent(email)}`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    return null;
  }
};

export default function ProtectRoute({ children, permission }: ProtectRouteProps) {
  const { user } = useAuth(); // Basic session user
  const router = useRouter();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      // 1. If no session, wait or redirect (handled by useAuth usually, but safe to check)
      if (!user?.email) return;

      setLoading(true);

      // 2. Fetch Full Permissions from DB
      const fullUser = await getUserData(user.email);

      if (!fullUser) {
        setLoading(false);
        return; // Failed to load
      }

      // 3. Authorization Logic
      // Rule A: Owners and Admins can see EVERYTHING
      if (fullUser.role === 'Owner' || fullUser.role === 'Admin') {
        setIsAuthorized(true);
      } 
      // Rule B: Check specific permission flag
      else if (fullUser.permissions && fullUser.permissions[permission] === true) {
        setIsAuthorized(true);
      } 
      // Rule C: Denied
      else {
        setIsAuthorized(false);
      }

      setLoading(false);
    };

    checkAccess();
  }, [user, permission]);

  // --- Render: Loading State ---
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Verifying permissions...</p>
      </div>
    );
  }

  // --- Render: Access Denied State ---
  if (!isAuthorized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Restricted</h1>
          <p className="text-slate-500 mb-6">
            You do not have permission to view the <strong>{permission}</strong> module. 
            Please contact your administrator or business owner to request access.
          </p>
          <div className="flex gap-3 justify-center">
             <Link href="/dashboard" className="px-6 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors">
               Go Dashboard
             </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Render: Authorized Content ---
  return <>{children}</>;
}