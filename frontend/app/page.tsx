"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../providers/GlobalProvider';
import { 
  BarChart3, User, LogOut, Rocket, Play, 
  PieChart, Box, RotateCcw, ArrowRight 
} from 'lucide-react';
import PricingSection from './components/PricingSection';
export default function Home() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen w-full max-w-[100vw] bg-[#0B1120] text-white font-sans overflow-x-hidden selection:bg-blue-500 selection:text-white relative">
      
      {/* Background Layer (Uses utility from globals.css) */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0"></div>

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-[#0B1120]/70 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600 blur opacity-40"></div>
                <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
              <span className="text-base md:text-lg font-bold tracking-tight text-white group-hover:text-blue-100 transition-colors">
                Lebely
              </span>
            </div>

            <div className="flex items-center gap-4">
            {/* --- AUTH CONDITIONAL RENDERING --- */}
            {user ? (
                <div className="flex items-center gap-3">
                    {/* Dashboard Link */}
                    <Link 
                        href="/dashboard" 
                        title="Go to Dashboard"
                        className="group flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 hover:bg-blue-600 hover:border-blue-500 transition-all cursor-pointer"
                    >
                        <User className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </Link>

                    {/* Sign Out Button */}
                    <button 
                        onClick={logout}
                        title="Sign Out"
                        className="group flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-all cursor-pointer"
                    >
                        <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                    </button>
                </div>
            ) : (
                // IF LOGGED OUT
                <>
                    <Link href="/login" className="hidden md:block text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer hover:tracking-wide duration-300">
                        Log in
                    </Link>
                    
                    <Link href="/register" className="cursor-pointer px-4 py-1 md:py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs md:text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 group hover:-translate-y-0.5">
                        Sign Up
                    </Link>
                </>
            )}
            </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <div className="relative pt-38 pb-10 md:pt-44 px-4 md:px-6 z-10 w-full max-w-[100vw] overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[80%] md:w-[800px] h-[300px] md:h-[500px] bg-blue-600/15 rounded-full blur-[60px] md:blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/20 border border-blue-500/20 text-blue-300 text-[10px] md:text-xs font-medium mb-6 md:mb-8 hover:bg-blue-900/40 transition-colors cursor-pointer group">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>v2.0 Live: Automated Returns</span>
            <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 md:mb-8 leading-[1.1]">
            Inventory management <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-200 to-purple-400">
              on autopilot.
            </span>
          </h1>

          <p className="text-base md:text-xl text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-2">
            Stop losing money on hidden returns. We track net ROI, automate reconciliation, and prevent inventory leaks for Meesho & Amazon sellers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 md:mb-20 w-full px-4">
            <Link href="/dashboard" className="cursor-pointer w-full sm:w-auto px-8 py-3.5 md:py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 group hover:-translate-y-0.5">
              <Rocket className="w-5 h-5" />
              Go to Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <button className="cursor-pointer w-full sm:w-auto px-8 py-3.5 md:py-4 bg-slate-800/30 backdrop-blur-md border border-white/10 shadow-lg text-white font-medium rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
              <Play className="w-5 h-5 text-gray-400" />
              Watch Demo
            </button>
          </div>
        </div>

        {/* --- DASHBOARD MOCKUP --- */}
        <div className="max-w-5xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 px-2 md:px-0">
            <div className="rounded-xl border border-white/10 bg-[#0F172A] overflow-hidden shadow-2xl transition-transform duration-500 md:perspective-1200 md:rotate-x-5 md:hover-3d-lift">
                <div className="h-8 md:h-10 bg-[#1E293B] border-b border-white/5 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5 md:gap-2">
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/50"></div>
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/50"></div>
                    </div>
                    <div className="hidden sm:block mx-auto bg-[#0B1120] px-12 md:px-32 py-1 rounded-md text-[10px] text-gray-500 font-mono">lebely.com/dashboard</div>
                </div>

                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#0B1120]">
                    <div className="hidden md:block col-span-2 space-y-4 pt-2">
                        <div className="flex items-center gap-3 text-blue-400 font-bold text-sm"><PieChart size={16} /> Overview</div>
                        <div className="flex items-center gap-3 text-gray-500 text-sm"><Box size={16} /> Inventory</div>
                        <div className="flex items-center gap-3 text-gray-500 text-sm"><RotateCcw size={16} /> Returns</div>
                    </div>

                    <div className="col-span-1 md:col-span-10">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
                            <div className="p-4 rounded-lg bg-[#1E293B]/50 border border-white/5 flex flex-row sm:flex-col justify-between items-center sm:items-start">
                                <p className="text-gray-400 text-xs mb-1">Total Revenue</p>
                                <p className="text-lg md:text-xl font-bold text-white">₹4,29,000</p>
                            </div>
                            <div className="p-4 rounded-lg bg-[#1E293B]/50 border border-white/5 flex flex-row sm:flex-col justify-between items-center sm:items-start">
                                <p className="text-gray-400 text-xs mb-1">Net Profit</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-lg md:text-xl font-bold text-green-400">₹82,400</p>
                                    <span className="text-[10px] bg-green-900/30 text-green-400 px-1 rounded">+12%</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-[#1E293B]/50 border border-white/5 relative overflow-hidden flex flex-row sm:flex-col justify-between items-center sm:items-start">
                                <p className="text-gray-400 text-xs mb-1">Loss Alerts</p>
                                <p className="text-lg md:text-xl font-bold text-red-400">3 SKUs</p>
                            </div>
                        </div>

                        {/* Chart Bars - Using style for dynamic height to ensure reliability */}
                        <div className="h-48 md:h-64 rounded-lg bg-[#1E293B]/30 border border-white/5 p-4 flex items-end justify-between gap-1 md:gap-2">
                            {[35, 55, 45, 70, 60, 85, 95, 75, 65, 80, 50, 90].map((h, i) => (
                                <div 
                                    key={i} 
                                    className="w-full bg-blue-600/20 rounded-t hover:bg-blue-500 transition-all cursor-pointer relative group" 
                                    style={{ height: `${h}%` }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* --- TRUST LOGOS --- */}
        <div className="border-y border-white/5 bg-[#0B1120] relative z-20 py-6 md:py-6 ">
            <p className="text-center text-xs md:text-sm text-gray-500 mb-6 font-medium tracking-wide">TRUSTED BY 2,000+ SELLERS ON</p>
            
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 px-4">
                <div className="relative h-16 w-32 grayscale-0 opacity-100 transition-all">
                    <Image src="/amazon.png" alt="Amazon" fill className="object-contain" />
                </div>
                <div className="relative h-16 w-32 grayscale-0 opacity-100 transition-all">
                    <Image src="/meesho.png" alt="Meesho" fill className="object-contain" />
                </div>
                <div className="relative h-10 w-24 grayscale-0 opacity-100 transition-all">
                    <Image src="/flikart.png" alt="Flipkart" fill className="object-contain" />
                </div>
            </div>
        </div>
<PricingSection />
      {/* --- FEATURES GRID --- */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Feature 1: Profit */}
            <div className="bg-slate-800/30 backdrop-blur-md border border-white/10 shadow-lg p-6 md:p-8 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:bg-white/5 hover:shadow-2xl hover:border-blue-500/30">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 md:mb-6 relative">
                     <Image src="/profit.png" alt="Profit" width={48} height={48} className="object-contain opacity-90" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Exact Profit Tracking</h3>
                <p className="text-gray-400 leading-relaxed text-sm">Automatically calculate net profit after shipping, returns, and platform fees. Know exactly what you make.</p>
            </div>
            
            {/* Feature 2: Loss */}
            <div className="bg-slate-800/30 backdrop-blur-md border border-white/10 shadow-lg p-6 md:p-8 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:bg-white/5 hover:shadow-2xl hover:border-red-500/30">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 md:mb-6 relative">
                    <Image src="/loss.png" alt="Loss" width={48} height={48} className="object-contain opacity-90" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Negative Margin Alerts</h3>
                <p className="text-gray-400 leading-relaxed text-sm">Get instant notifications when a SKU starts losing money so you can adjust pricing immediately.</p>
            </div>
            
            {/* Feature 3: Auto */}
            <div className="bg-slate-800/30 backdrop-blur-md border border-white/10 shadow-lg p-6 md:p-8 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:bg-white/5 hover:shadow-2xl hover:border-green-500/30">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-4 md:mb-6 relative">
                    <Image src="/auto.png" alt="Auto" width={48} height={48} className="object-contain opacity-90" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3">Auto-Reconciliation</h3>
                <p className="text-gray-400 leading-relaxed text-sm">We automatically match returns with orders to identify missing inventory or courier fraud instantly.</p>
            </div>
        </div>
        </div>

      {/* --- FOOTER & MARQUEE --- */}
        <div className="border-t border-white/5 bg-[#0B1120] relative z-20">
        <div className="py-4 md:py-6 overflow-hidden bg-[#0A0F1E] border-b border-white/5">
            <div className="w-full overflow-hidden relative">
                <div className="flex gap-8 animate-marquee w-max">
                    {/* Data mapped TWICE for seamless infinite loop */}
                    {[
                        { name: "Rajesh J.", text: "saved ₹12,000 on returns today.", color: "bg-green-500" },
                        { name: "Fashion Hub", text: "synced 4,500 SKUs.", color: "bg-blue-500" },
                        { name: "Amit K.", text: "detected 3 missing items.", color: "bg-purple-500" },
                        { name: "Mohit D.", text: "synced 8,000 SKUs.", color: "bg-yellow-500" },
                        // Duplicated
                        { name: "Rajesh J.", text: "saved ₹12,000 on returns today.", color: "bg-green-500" },
                        { name: "Fashion Hub", text: "synced 4,500 SKUs.", color: "bg-blue-500" },
                        { name: "Amit K.", text: "detected 3 missing items.", color: "bg-purple-500" },
                        { name: "Mohit D.", text: "synced 8,000 SKUs.", color: "bg-yellow-500" },
                    ].map((item, index) => (
                        <div key={index} className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 whitespace-nowrap">
                            <span className={`w-2 h-2 rounded-full ${item.color} animate-pulse`}></span>
                            <b>{item.name}</b> {item.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        {/* Footer Bottom Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col md:flex-row items-center justify-between text-gray-500 text-sm gap-4">
            <div className="flex items-center gap-2">
                <div className="bg-blue-600/20 text-blue-500 w-6 h-6 rounded flex items-center justify-center text-xs">
                    <BarChart3 size={14} />
                </div>
                <span className="font-semibold text-gray-400">Lebely Inc.</span>
            </div>
            <p className="text-center md:text-left">© 2026 All rights reserved.</p>
            <div className="flex gap-6">
                <Link href="#" className="hover:text-white transition-colors cursor-pointer">Privacy</Link>
                <Link href="#" className="hover:text-white transition-colors cursor-pointer">Terms</Link>
                <Link href="#" className="hover:text-white transition-colors cursor-pointer">Contact</Link>
            </div>
        </div>
        </div>

    </main>
  );
}