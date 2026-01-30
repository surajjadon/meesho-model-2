"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Check, ShieldCheck, ArrowLeft, Lock, 
  ChevronDown, CheckCircle2, BarChart3, User, LogOut 
} from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';
import { useAuth } from './../../providers/GlobalProvider'; 

// --- IMPORT SHARED DATA ---
import { PLANS, CYCLES, CycleKey } from './../constants/pricingData'; 

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // 1. READ URL PARAMS
  const planId = searchParams.get('plan') || 'standard';
  const initialCycleId = (searchParams.get('cycle') as CycleKey) || 'yearly';
  const paymentMode = searchParams.get('mode') || 'upfront'; // 'upfront' | 'autopay'

  // 2. FIND DATA
  const selectedPlan = PLANS.find(p => p.id === planId) || PLANS[1]; 
  const [selectedCycleKey, setSelectedCycleKey] = useState<CycleKey>(initialCycleId);
  const activeCycle = CYCLES.find(c => c.id === selectedCycleKey) || CYCLES[1];

  // 3. MATH CALCULATIONS
  // Total Contract Value (e.g. 468)
  const totalContractValue = selectedPlan.prices[selectedCycleKey];
  // Monthly Equivalent (e.g. 39)
  const monthlyEquivalent = Math.round(totalContractValue / activeCycle.months);
  
  // LOGIC: What does the user actually pay TODAY?
  let dueToday = 0;
  let chargeDescription = "";

  if (paymentMode === 'autopay' && activeCycle.supportsInstallments) {
      dueToday = monthlyEquivalent;
      chargeDescription = `Pay ₹${dueToday} today, then auto-debited monthly.`;
  } else {
      dueToday = totalContractValue;
      chargeDescription = "GST Inclusive";
  }

  // Base price for savings calc
  const basePrice = selectedPlan.prices['monthly'] * activeCycle.months;
  const savings = basePrice - totalContractValue;

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  const handlePayment = async () => {
    setIsProcessing(true);
    setTimeout(() => { 
        setIsProcessing(false); 
        alert(`Proceeding with payment of ₹${dueToday} (${paymentMode})`); 
    }, 1500);
  };
  
  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <style jsx global>{`
        ::-webkit-scrollbar { display: none; }
        html { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
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
            {user ? (
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="group flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 hover:bg-blue-600 hover:border-blue-500 transition-all cursor-pointer">
                        <User className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </Link>
                    <button onClick={logout} className="group flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/50 transition-all cursor-pointer">
                        <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                    </button>
                </div>
            ) : (
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
    
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* --- LEFT COLUMN: CONFIGURATION --- */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative rounded-2xl bg-[#1E293B]/40 border border-white/5 backdrop-blur-sm overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">{selectedPlan.name} Plan</h2>
                            <p className="text-slate-400 text-sm">
                                {activeCycle.billingType === 'onetime' ? 'Lifetime access for a single payment' : 
                                 paymentMode === 'autopay' ? 'Monthly installments for 1 year commitment' :
                                 'Perfect for scaling your inventory operations'}
                            </p>
                        </div>
                        
                        {/* CYCLE TOGGLE */}
                        <div className="relative">
                            <select 
                                value={selectedCycleKey}
                                onChange={(e) => setSelectedCycleKey(e.target.value as CycleKey)}
                                className="appearance-none bg-[#0F172A] border border-blue-500/30 text-white pl-4 pr-10 py-2.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition-colors cursor-pointer w-full md:w-auto shadow-lg"
                            >
                                {CYCLES.map((cycle) => (
                                    <option key={cycle.id} value={cycle.id}>
                                        {cycle.label} {cycle.discountLabel ? `(${cycle.discountLabel})` : ''}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* FEATURES GRID */}
                    <div className="bg-[#0F172A]/50 rounded-xl p-5 border border-white/5">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">What's included</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                            {selectedPlan.features.map((feature: string, i: number) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <Check className="w-3 h-3 text-blue-400" strokeWidth={3} />
                                    </div>
                                    <span className="text-sm text-slate-300">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* PAYMENT METHOD CARD */}
            <div className="rounded-2xl bg-[#1E293B]/40 border border-white/5 backdrop-blur-sm p-6 md:p-8">
                <h3 className="text-lg font-semibold text-white mb-6">Payment Method</h3>
                <div className="space-y-3">
                    <div 
                        onClick={() => setPaymentMethod('razorpay')}
                        className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 gap-4 ${paymentMethod === 'razorpay' ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.15)]' : 'bg-[#0F172A]/50 border-white/5 hover:border-white/10 hover:bg-[#0F172A]'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${paymentMethod === 'razorpay' ? 'border-blue-500 bg-blue-500' : 'border-slate-600 bg-transparent'}`}>
                                {paymentMethod === 'razorpay' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div>
                                <span className={`block font-medium ${paymentMethod === 'razorpay' ? 'text-white' : 'text-slate-300'}`}>Pay via Razorpay</span>
                                <span className="text-xs text-slate-500">UPI, Credit/Debit Cards, Netbanking</span>
                            </div>
                        </div>
                        {/* Logos */}
                        <div className="flex gap-2 opacity-80 grayscale group-hover:grayscale-0 transition-all duration-300">
                             <div className="h-6 w-10 bg-white rounded flex items-center justify-center p-1 border border-white/10"><img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-full w-auto object-contain" /></div>
                             <div className="h-6 w-10 bg-white rounded flex items-center justify-center p-1 border border-white/10"><img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-full w-auto object-contain" /></div>
                             <div className="h-6 w-10 bg-white rounded flex items-center justify-center p-0.5 border border-white/10"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-full w-auto object-contain" /></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="pt-2">
                <button onClick={() => router.back()} className="group flex items-center cursor-pointer gap-2 text-slate-400 hover:text-white transition-all text-sm pl-1">
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/20 group-hover:bg-white/10 transition-colors"><ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /></div>
                    <span>Changed your mind? <span className="font-medium text-slate-300 group-hover:text-white underline decoration-slate-600 underline-offset-2 group-hover:decoration-white transition-all">Back to Plans</span></span>
                </button>
            </div>
          </div>

          {/* --- RIGHT COLUMN: SUMMARY --- */}
          <div className="lg:col-span-4">
             <div className="sticky top-24">
                 <div className="rounded-2xl bg-[#1E293B] border border-white/10 shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-[#0F172A]/50">
                        <h3 className="text-lg font-bold text-white">Order Summary</h3>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Plan</span>
                            <span className="text-slate-200 font-medium">{selectedPlan.name}</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Billing Cycle</span>
                            <span className="text-slate-200 font-medium">{activeCycle.label}</span>
                        </div>
                        
                        {/* If Autopay is active, show the monthly commitment */}
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>{paymentMode === 'autopay' ? 'Monthly Installment' : 'Total Price'}</span>
                            <span>₹{dueToday.toLocaleString()}</span>
                        </div>
                        
                        {savings > 0 && (
                            <div className="flex justify-between text-sm text-green-400 font-medium">
                                <span>Total Savings</span>
                                <span>- ₹{savings.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="h-px bg-white/10 my-2"></div>

                        <div className="flex justify-between items-end">
                            <span className="text-sm text-slate-300 font-medium">Total due today</span>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white">₹{dueToday.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{chargeDescription}</div>
                            </div>
                        </div>

                        {savings > 0 && (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 mt-4">
                                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                <p className="text-xs text-green-300 font-medium leading-tight">
                                    You are saving <span className="font-bold">₹{savings.toLocaleString()}</span> with this plan.
                                </p>
                            </div>
                        )}
                        
                        <button 
                            onClick={handlePayment}
                            disabled={isProcessing}
                            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Lock className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" /> 
                                    Pay ₹{dueToday.toLocaleString()}
                                </>
                            )}
                        </button>
                    </div>

                    <div className="p-4 bg-[#0F172A]/80 border-t border-white/5 text-center">
                        <div className="flex justify-center gap-3 opacity-70 mb-4">
                            <div className="h-5 w-9 bg-white rounded flex items-center justify-center p-0.5"><img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-full w-auto object-contain" /></div>
                            <div className="h-5 w-9 bg-white rounded flex items-center justify-center p-0.5"><img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-full w-auto object-contain" /></div>
                            <div className="h-5 w-9 bg-white rounded flex items-center justify-center p-0.5"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-full w-auto object-contain" /></div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            Secured by Razorpay. By confirming, you agree to our Terms of Service.
                        </p>
                    </div>
                 </div>
                 
                 <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    <span>30-Day Money-Back Guarantee</span>
                 </div>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-white">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}