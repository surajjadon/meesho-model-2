"use client";

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Download, Calendar, CreditCard, LayoutDashboard } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- SHARED CONFIG ---
const PLANS: any = {
  basic: { name: 'Basic', features: ['100 API calls', 'Basic analytics'] },
  standard: { name: 'Standard', features: ['1,000 API calls', 'Adv. analytics'] },
  pro: { name: 'Pro', features: ['Unlimited API', 'Ent. analytics'] },
};

const CYCLES: any = {
  monthly: { label: 'Monthly', years: 0, months: 1 },
  yearly: { label: 'Yearly', years: 1, months: 0 },
  '2years': { label: '2 Years', years: 2, months: 0 },
  '4years': { label: '4 Years', years: 4, months: 0 },
};

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Params
  const planId = searchParams.get('plan') || 'standard';
  const cycleId = searchParams.get('cycle') || '4years';
  const paymentId = searchParams.get('payment_id') || 'pay_test_123456789';

  const selectedPlan = PLANS[planId];
  const selectedCycle = CYCLES[cycleId];

  // Dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + (selectedCycle?.years || 0));
  endDate.setMonth(endDate.getMonth() + (selectedCycle?.months || 0));

  // Confetti
  useEffect(() => {
    const end = Date.now() + 1000;
    const colors = ['#60A5FA', '#34D399'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  }, []);

  if (!selectedPlan) return null;

  return (
    <div className="min-h-screen w-full bg-[#0B1120] text-white font-sans flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* 1. CLEAN GRID BACKGROUND (Matches Landing) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* 2. SUBTLE GLOW BEHIND CARD */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        
        {/* MAIN CARD */}
        <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
            
            {/* Header Area */}
            <div className="p-8 pb-6 flex flex-col items-center text-center border-b border-white/5">
                
                {/* CSS ANIMATED CHECKMARK */}
                <div className="w-16 h-16 mb-6 relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-75 duration-[2s]"></div>
                    <div className="relative w-16 h-16 bg-gradient-to-tr from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-900/50">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-[draw_0.6s_ease-out_forwards]" style={{ strokeDasharray: 30, strokeDashoffset: 30 }} />
                        </svg>
                        <style jsx>{`
                            @keyframes draw { to { stroke-dashoffset: 0; } }
                        `}</style>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Payment Successful</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                    Thank you for subscribing to the <br/>
                    <span className="text-blue-400 font-medium">{selectedPlan.name} Plan</span>
                </p>
            </div>

            {/* Details Section */}
            <div className="p-6 bg-[#1E293B]/30 space-y-4">
                
                {/* Row 1 */}
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-slate-300">Amount Paid</span>
                    </div>
                    <span className="text-white font-semibold">
                        ₹{selectedPlan.prices?.[cycleId] || '2,832'}
                    </span>
                </div>

                {/* Row 2 */}
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-slate-300">Next Billing Date</span>
                    </div>
                    <span className="text-white font-semibold">
                        {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>

                {/* Transaction ID */}
                <div className="pt-2">
                    <p className="text-xs text-center text-slate-500 mb-1">Transaction ID</p>
                    <p className="text-xs text-center font-mono text-slate-400 bg-black/20 rounded py-1 select-all cursor-pointer hover:text-white transition-colors">
                        {paymentId}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-2 flex flex-col gap-3">
                <button 
                    onClick={() => router.push('/dashboard')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                    <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                </button>
                
                <button className="w-full bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                    <Download className="w-4 h-4" /> Download Receipt
                </button>
            </div>
        </div>
        
        {/* Footer Link */}
        <div className="text-center mt-8 animate-in fade-in duration-1000 delay-500">
             <p 
                onClick={() => router.push('/')}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors flex items-center justify-center gap-1"
             >
                <ArrowRight className="w-3 h-3 rotate-180" /> Back to Home
             </p>
        </div>

      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-white">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}