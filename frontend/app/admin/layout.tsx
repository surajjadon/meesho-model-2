"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/GlobalProvider";
import { Loader2 } from "lucide-react";
// Import the Admin specific components
import AdminSidebar from "./_components/AdminSidebar";
import AdminHeader from "./_components/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login"); // Adjust if you have a specific /admin/login route
    }
  }, [isAuthenticated, loading, router]);

  // --- Loading Screen (Exact Design Match) ---
  if (loading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white relative overflow-hidden">
        {/* Loading Grid Background */}
        <div className="absolute inset-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        
        <div className="relative flex flex-col items-center gap-3 z-10">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  // --- Main Layout ---
  return (
    <div className="flex h-screen w-full overflow-hidden font-sans text-slate-900 bg-white selection:bg-indigo-100 selection:text-indigo-700 relative">
      
      {/* --- PROFESSIONAL GRID BACKGROUND --- */}
      {/* This creates the subtle dot pattern across the entire admin app */}
      <div className="absolute inset-0 z-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      {/* Sidebar Area */}
      {/* Note: Wrapper styling is minimal here because AdminSidebar has its own Dark Theme styling */}
      <aside className="h-full shrink-0 z-30 relative shadow-xl">
        <AdminSidebar />
      </aside>

      {/* Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
        
        {/* Header - Glassmorphism Effect */}
        <header className="shrink-0 z-20 bg-white/70 backdrop-blur-md border-b border-slate-200/60 sticky top-0 transition-all duration-200">
          <AdminHeader />
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent p-4 sm:p-6 lg:p-8">
          {/* Content Container with Animation */}
          <div className="max-w-[1920px] mx-auto w-full animate-in fade-in slide-in-from-bottom-3 duration-500 ease-out">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}