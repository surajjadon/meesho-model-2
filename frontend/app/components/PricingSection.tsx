"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ChevronDown, CalendarClock, CreditCard, Sparkles } from 'lucide-react';

// --- IMPORT SHARED DATA ---
import { PLANS, CYCLES, CycleKey, Plan } from './../constants/pricingData'; 

// --- SUB-COMPONENT: INDIVIDUAL PRICING CARD ---

const PricingCard = ({ plan }: { plan: Plan }) => {
  const router = useRouter();
  const [selectedCycle, setSelectedCycle] = useState<CycleKey>('yearly');
  const [paymentMode, setPaymentMode] = useState<'upfront' | 'autopay'>('upfront');
  
  const activeCycle = CYCLES.find((c) => c.id === selectedCycle) || CYCLES[1];

  // RESET LOGIC
  useEffect(() => {
    if (!activeCycle.supportsInstallments) {
        setPaymentMode('upfront');
    }
  }, [selectedCycle, activeCycle.supportsInstallments]);

  // --- MATH FORMULAS ---
  const totalUpfrontPrice = plan.prices[selectedCycle];
  const monthlyEquivalent = Math.round(totalUpfrontPrice / activeCycle.months);
  const basePrice = plan.prices['monthly'] * activeCycle.months;
  const savings = basePrice - totalUpfrontPrice;
  const discountPercent = Math.round((savings / basePrice) * 100);

  // --- TEXT LOGIC ---
  const getButtonText = () => {
    if (activeCycle.billingType === 'onetime') return `Pay One-time ₹${totalUpfrontPrice.toLocaleString()}`;
    if (paymentMode === 'autopay') return `Start Autopay @ ₹${monthlyEquivalent}/mo`;
    if (plan.trialDays && plan.trialDays > 0) return `Start ${plan.trialDays}-Day Free Trial`;
    return `Pay Full Amount ₹${totalUpfrontPrice.toLocaleString()}`;
  };

  const getHelperText = () => {
    if (activeCycle.billingType === 'onetime') return `Single payment. Access expires after ${activeCycle.months} months.`;
    if (paymentMode === 'autopay') return `Commit to 1 year, billed monthly. Cancel anytime.`;
    if (plan.trialDays && plan.trialDays > 0) return `Free for ${plan.trialDays} days, then ₹${totalUpfrontPrice.toLocaleString()} / year.`;
    return `Billed as ₹${totalUpfrontPrice.toLocaleString()} every ${activeCycle.label.toLowerCase()}.`;
  };

  return (
    <div className={`
      relative flex flex-col p-8 rounded-3xl transition-all duration-300 group 
      ${plan.highlight 
        ? 'bg-[#1E293B] border-2 border-blue-500 shadow-2xl shadow-blue-900/20 scale-100 md:scale-105 z-10' 
        : 'bg-slate-800/30 backdrop-blur-md border border-white/10 shadow-lg rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:bg-white/5 hover:shadow-2xl hover:border-blue-500/30'}
    `}>
      
      {/* POPULAR BADGE */}
      {plan.highlight && (
        <div className="absolute -top-4 inset-x-0 flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white uppercase tracking-wider shadow-lg border border-blue-400">
            
            Most Popular
          </span>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
        <p className="text-slate-400 text-sm h-10">
            {plan.id === 'basic' ? 'Essential features for individuals.' : 
             plan.id === 'standard' ? 'Perfect for growing teams & scaling.' : 
             'Advanced tools for large enterprises.'}
        </p>

        {/* --- CONTROLS CONTAINER --- */}
        <div className="space-y-3 mt-2">
            
            {/* 1. CYCLE SELECTOR (Styled Dropdown) */}
            <div className="relative group/select">
                <select 
                    value={selectedCycle}
                    onChange={(e) => setSelectedCycle(e.target.value as CycleKey)}
                    className="w-full appearance-none bg-[#0B1120]/50 border border-white/10 text-white text-sm font-medium rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer hover:border-white/20"
                >
                    {CYCLES.map((cycle) => {
                        const cPrice = plan.prices[cycle.id];
                        const cBase = plan.prices['monthly'] * cycle.months;
                        const cSave = cBase - cPrice;
                        const cPercent = Math.round((cSave / cBase) * 100);

                        return (
                            <option key={cycle.id} value={cycle.id} className="bg-[#0B1120]">
                                {cycle.label} {cPercent > 0 ? `(Save ${cPercent}%)` : ''}
                            </option>
                        )
                    })}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none p-1 bg-white/5 rounded-md border border-white/5 group-hover/select:bg-white/10 transition-colors">
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </div>
            </div>

            {/* 2. PAYMENT MODE TOGGLE (Segmented Control) */}
            {activeCycle.supportsInstallments && (
                 <div className="bg-[#0B1120] p-1 rounded-xl border border-white/10 flex relative">
                    {/* Animated Background slider (Simplified to conditional styles for React) */}
                    
                    <button 
                        onClick={() => setPaymentMode('upfront')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold rounded-lg transition-all duration-200
                        ${paymentMode === 'upfront' 
                            ? 'bg-[#1E293B] text-white shadow-sm ring-1 ring-white/10' 
                            : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <CreditCard className={`w-3.5 h-3.5 ${paymentMode === 'upfront' ? 'text-blue-400' : 'text-slate-600'}`} /> 
                        PAY UPFRONT
                    </button>
                    
                    <button 
                        onClick={() => setPaymentMode('autopay')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold rounded-lg transition-all duration-200
                        ${paymentMode === 'autopay' 
                            ? 'bg-[#1E293B] text-white shadow-sm ring-1 ring-white/10' 
                            : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <CalendarClock className={`w-3.5 h-3.5 ${paymentMode === 'autopay' ? 'text-blue-400' : 'text-slate-600'}`} /> 
                        MONTHLY AUTOPAY
                    </button>
                </div>
            )}
        </div>

        {/* PRICE DISPLAY */}
        <div className="mt-8 flex items-baseline gap-1">
          <span className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            ₹{monthlyEquivalent}
          </span>
          <span className="text-slate-400 font-medium">/mo</span>
        </div>

        {/* SUBTEXT & BADGES */}
        <div className="mt-3 flex flex-col gap-2 min-h-[50px]">
            <div className="text-sm text-slate-500">
                {paymentMode === 'autopay' 
                    ? `Billed monthly for ${activeCycle.label.toLowerCase()}`
                    : (activeCycle.billingType === 'onetime' ? 'One-time payment' : 'Billed as ')
                }
                {paymentMode === 'upfront' && (
                    <span className="text-slate-300 font-semibold"> ₹{totalUpfrontPrice.toLocaleString()}</span>
                )}
                {paymentMode === 'upfront' && activeCycle.billingType === 'recurring' && ` every ${activeCycle.label.toLowerCase()}`}
            </div>

            {/* Savings Badge */}
            {savings > 0 && (
                <div className="self-start inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2.5 py-1 rounded-md">
                    <span>Save ₹{savings.toLocaleString()}</span>
                    <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">-{discountPercent}%</span>
                </div>
            )}
        </div>
      </div>

      {/* DIVIDER */}
      <div className="h-px bg-white/5 w-full mb-8"></div>

      {/* FEATURES LIST */}
      <div className="flex-1 mb-8">
        <ul className="space-y-4">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3 group/item">
              <div className={`
                w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
                ${feature.startsWith('No') ? 'bg-slate-800' : 'bg-blue-500/20'}
              `}>
                  {feature.startsWith('No') ? (
                    <X className="w-3 h-3 text-slate-500" />
                  ) : (
                    <Check className="w-3 h-3 text-blue-400" strokeWidth={3} />
                  )}
              </div>
              <span className={`text-sm transition-colors ${feature.startsWith('No') ? 'text-slate-500' : 'text-slate-300 group-hover/item:text-white'}`}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ACTION BUTTON */}
      <button
        onClick={() => router.push(`/checkout?plan=${plan.id}&cycle=${selectedCycle}&mode=${paymentMode}`)}
        className={`
          w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 transform active:scale-[0.98]
          ${plan.highlight 
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25' 
            : 'bg-white text-[#0B1120] hover:bg-slate-200'}
        `}
      >
        {getButtonText()}
      </button>
      
      {/* HELPER TEXT */}
      <p className="text-center text-[10px] text-slate-500 mt-3 px-1 leading-relaxed">
        {getHelperText()}
      </p>
    </div>
  );
};

// --- MAIN SECTION ---
export default function PricingSection() {
  return (
    <div className="w-full py-24 px-4 md:px-6 relative z-10 border-t border-white/5 ">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
         <div className="absolute top-20 left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
         <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Choose the perfect plan for your needs. Always know what you'll pay.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </div>
  );
}