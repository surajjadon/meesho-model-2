"use client";

import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  // Define testimonials as data to easily map and duplicate them
 const testimonials = [
  {
    initials: "RJ",
    bgColor: "from-blue-500 to-blue-700",
    name: "Rajesh J.",
    company: "Jaipur Kurtis",
    rating: "5.0",
    quote: "\"Found 200+ lost orders in the first scan. This software paid for itself in one day.\"",
  },
  {
    initials: "MD",
    bgColor: "from-purple-500 to-purple-700",
    name: "Mohit D.",
    company: "Fashion Hub",
    rating: "4.9",
    quote: "\"Best tool for Meesho. The loss alerts helped me stop selling negative-margin products instantly.\"",
  },
  {
    initials: "AK",
    bgColor: "from-green-500 to-green-700",
    name: "Amit K.",
    company: "Urban Ethnic Wear",
    rating: "5.0",
    quote: "\"Finally understood where my profits were leaking. Very simple and extremely accurate.\"",
  },
  {
    initials: "PS",
    bgColor: "from-pink-500 to-pink-700",
    name: "Pooja S.",
    company: "Style Street",
    rating: "4.8",
    quote: "\"Earlier I guessed my margins. Now I know them. This tool saved me hours every week.\"",
  },
  {
    initials: "VK",
    bgColor: "from-orange-500 to-orange-700",
    name: "Vikas K.",
    company: "Trendy Closet",
    rating: "5.0",
    quote: "\"The profit–loss breakdown is super clear. I fixed pricing mistakes within minutes.\"",
  },
  {
    initials: "NS",
    bgColor: "from-teal-500 to-teal-700",
    name: "Neha S.",
    company: "Elite Fashion",
    rating: "4.9",
    quote: "\"A must-have for any serious Meesho seller. It feels like having a finance manager.\"",
  },
];


  return (
    <div className="h-screen w-full flex overflow-hidden bg-white font-sans text-gray-900">
      {/* GLOBAL STYLES & ICONS */}
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Animations */
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .slide-up-1 { animation: slideUp 0.6s ease-out both; animation-delay: 0.1s; }
        .slide-up-2 { animation: slideUp 0.6s ease-out both; animation-delay: 0.2s; }
        .slide-up-3 { animation: slideUp 0.6s ease-out both; animation-delay: 0.3s; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* Marquee */
        @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-container { mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
        .marquee-content { display: flex; gap: 1.5rem; animation: scroll 70s linear infinite; width: max-content; }
        .marquee-content:hover { animation-play-state: paused; }

        /* Custom Gradients */
        .bg-grid-slate {
            background-size: 40px 40px;
            background-image: linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
        }
      `}</style>

      {/* LEFT COLUMN (Login/Register Form) */}
      <div className="w-full lg:w-[45%] h-full flex flex-col p-8 lg:p-12 overflow-y-auto no-scrollbar relative z-20 bg-white/50 bg-grid-slate fade-in">
        
        {/* Header / Logo */}
        <div className="flex items-center gap-3 mb-8 flex-shrink-0 group cursor-pointer">
          <div className="relative">
             <div className="absolute inset-0 bg-blue-600 blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform">
               <i className="fa-solid fa-chart-simple text-sm"></i>
             </div>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Lebely</span>
        </div>

        {/* Dynamic Form Content */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          {children}
        </div>
      </div>

      {/* RIGHT COLUMN (Marketing) */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#0B1120] relative flex-col justify-center px-16 overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Floating Notification - Moved UP (top-8 instead of top-12) */}
        <div className="absolute top-6 right-12 bg-[#1E293B]/90 backdrop-blur-md border border-white/10 text-white p-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce-slow z-20 hover:scale-105 transition-transform cursor-default">
          <div className="text-red-400">
             <i className="fa-regular fa-bell text-xl"></i>
          </div>
          <div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Alert Detected</p>
            <p className="text-sm font-semibold text-gray-100">SKU-2900 Negative Margin</p>
          </div>
        </div>

        <div className="z-10 w-full max-w-2xl pt-2">
          <h2 className="text-5xl font-bold text-white leading-[1.15] mb-6 slide-up-1">
            Stop losing money on <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">hidden returns.</span>
          </h2>
          
          <p className="text-gray-400 text-lg mb-10 leading-relaxed slide-up-2">
            Join 2,000+ Meesho sellers who use Lebely to track net ROI, automate reconciliation, and prevent inventory leaks.
          </p>

          {/* FEATURE PILLS (Horizontal Line) */}
          <div className="flex flex-row flex-wrap items-center gap-3 slide-up-3 mb-12 pt-2">
             
             {/* Feature 1 */}
             <div className="flex items-center gap-3 p-2 pr-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm cursor-default group">
                 <div className="w-9 h-9 rounded-lg  flex items-center justify-center">
                     <img src="/profit.png" alt="Profit" className="w-5 h-5 object-contain opacity-100" />
                 </div>
                 <span className="text-gray-200 font-medium text-sm">Exact Profit Tracking</span>
             </div>

             {/* Feature 2 */}
             <div className="flex items-center gap-3 p-2 pr-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm cursor-default group">
                 <div className="w-9 h-9 rounded-lg  flex items-center justify-center">
                     <img src="/loss.png" alt="Loss" className="w-5 h-5 object-contain opacity-100" />
                 </div>
                 <span className="text-gray-200 font-medium text-sm">Negative Margin Alerts</span>
             </div>

             {/* Feature 3 */}
             <div className="flex items-center gap-3 p-2 pr-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm cursor-default group">
                 <div className="w-9 h-9 rounded-lg  flex items-center justify-center">
                     <img src="/auto.png" alt="Auto" className="w-5 h-5 object-contain opacity-90" />
                 </div>
                 <span className="text-gray-200 font-medium text-sm">Auto-Reconciliation</span>
             </div>
          </div>
        </div>

        {/* Testimonials Marquee - FIXED for infinite loop */}
        <div className="w-full z-10 pt-8">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Trusted by top sellers</p>
          <div className="marquee-container w-full overflow-hidden">
            <div className="marquee-content pb-4">
              
              {/* Original and Duplicated Testimonials for smooth loop */}
              {[...testimonials, ...testimonials].map((testi, index) => (
                <div key={index} className="w-[400px] p-5 rounded-2xl bg-[#131b2e]/80 border border-white/5 backdrop-blur-md shadow-xl flex-shrink-0">
                   <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${testi.bgColor} text-white flex items-center justify-center font-bold text-sm shadow-lg`}>
                        {testi.initials}
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-semibold">{testi.name}</h4>
                        <p className="text-xs text-gray-400">{testi.company}</p>
                      </div>
                      <div className="ml-auto text-yellow-400 text-xs"><i className="fa-solid fa-star"></i> {testi.rating}</div>
                   </div>
                   <p className="text-gray-300 text-sm italic">{testi.quote}</p>
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;