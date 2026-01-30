"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/providers/GlobalProvider"; // Adjust path to your auth provider
import { Loader2 } from "lucide-react";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Loading Check
    if (loading) return;

    // 2. Security Check
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // 3. Auto-Redirect: If user hits exactly "/admin", go to Dashboard
    if (pathname === '/admin' || pathname === '/admin/') {
      router.push('/admin/dashboard');
    }
  }, [isAuthenticated, loading, router, pathname]);

  // --- Loading Screen (While verifying admin session) ---
  if (loading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        <div className="relative flex flex-col items-center gap-3 z-10">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Verifying secure access...
          </p>
        </div>
      </div>
    );
  }

  // --- Main Admin Wrapper ---
  return (
    <div className="min-h-screen w-full font-sans text-slate-900 bg-white selection:bg-indigo-100 selection:text-indigo-700 relative">
       {/* Global Admin Background Pattern (Applied to ALL admin pages) */}
       <div className="fixed inset-0 z-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
       
       {/* Content Injection */}
       <div className="relative z-10 h-full">
          {children}
       </div>
    </div>
  );
}