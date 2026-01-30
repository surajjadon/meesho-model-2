"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';

// --- TYPES & INTERFACES ---

type CycleKey = 'monthly' | 'yearly' | '2years' | '4years';

interface Cycle {
  id: CycleKey;
  label: string;
  months: number;
  discountLabel: string | null;
}

interface Plan {
  id: string;
  name: string;
  type: 'basic' | 'standard' | 'pro';
  prices: Record<CycleKey, number>;
  features: string[];
  highlight: boolean;
  badge?: string;
  trialDays?: number;
}

// --- CONFIGURATION DATA (EXACTLY AS PROVIDED) ---

const CYCLES: Cycle[] = [
  { id: 'monthly', label: 'Monthly', months: 1, discountLabel: null },
  { id: 'yearly', label: 'Yearly', months: 12, discountLabel: 'Save 20%' },
  { id: '2years', label: '2 Years', months: 24, discountLabel: 'Save 29%' },
  { id: '4years', label: '4 Years', months: 48, discountLabel: 'Save 41% ⭐' },
];

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    type: 'basic',
    prices: { monthly: 49, yearly: 468, '2years': 840, '4years': 1392 },
    features: ['100 API calls/day', 'Basic analytics', 'Email support', '1 User', 'No Custom Domain'],
    highlight: false,
    trialDays: 7,
  },
  {
    id: 'standard',
    name: 'Standard',
    type: 'standard',
    prices: { monthly: 99, yearly: 948, '2years': 1656, '4years': 2832 },
    features: ['1,000 API calls/day', 'Advanced analytics', 'Priority email support', '5 Users', 'Custom Reports'],
    highlight: true,
    badge: '⭐ POPULAR',
    trialDays: 14,
  },
  {
    id: 'pro',
    name: 'Pro',
    type: 'pro',
    prices: { monthly: 199, yearly: 1908, '2years': 3336, '4years': 5712 },
    features: ['Unlimited API calls', 'Enterprise analytics', '24/7 Priority support', 'Unlimited Users', 'White-label option'],
    highlight: false,
    trialDays: 30,
  },
];

// --- COMPONENT ---

export default function PricingSection() {
  const router = useRouter();
  const [selectedCycle, setSelectedCycle] = useState<CycleKey>('4years');
  
  const activeCycle = CYCLES.find((c) => c.id === selectedCycle)!;

  const handleCheckout = (planId: string) => {
    router.push(`/checkout?plan=${planId}&cycle=${selectedCycle}`);
  };

  return (
    // LIGHT THEME BACKGROUND WITH RELATIVE POSITIONING
    <div className="relative min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden">

      {/* --- ADDED GRID PATTERN HERE --- */}
      <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* ------------------------------- */}

      {/* Added relative and z-10 to ensure content sits above the grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-4">
        
        {/* HEADER */}
        <div className="text-center mb-4 flex gap-55">
            <div className='pt-4'>
                 <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-white hover:text-slate-900 transition-colors font-medium text-sm bg-blue-600 border border-slate-200 px-4 py-2 rounded-lg shadow-sm hover:shadow"
        >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
            </div>
            <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3 flex items-center justify-center gap-2">
            Simple, Transparent Pricing
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-lg">
            Choose the plan that fits your business needs.
          </p>
          </div>
          
        </div>

        {/* BILLING CYCLE SELECTOR */}
        <div className="flex justify-center mb-10 ">
          <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm inline-flex flex-wrap justify-center gap-1">
            {CYCLES.map((cycle) => (
              <button
                key={cycle.id}
                onClick={() => setSelectedCycle(cycle.id)}
                className={`
                  relative px-5 py-2.5 text-sm cursor-pointer font-medium rounded-lg transition-all duration-200
                  ${selectedCycle === cycle.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
                `}
              >
                {cycle.label}
                {cycle.discountLabel && selectedCycle !== cycle.id && (
                  <span className="absolute -top-3 -right-2 bg-green-100 text-green-700 border border-green-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap z-10">
                    {cycle.discountLabel.replace('⭐', '')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* PRICING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            // --- MATH LOGIC ---
            const totalLocationPrice = plan.prices[selectedCycle];
            const monthlyEquivalent = Math.round(totalLocationPrice / activeCycle.months);
            const regularPrice = plan.prices['monthly'] * activeCycle.months;
            const savings = regularPrice - totalLocationPrice;

            return (
              <div 
                key={plan.id}
                className={`
                  relative rounded-2xl border flex flex-col p-8 transition-all duration-300
                  ${plan.highlight 
                    ? 'bg-white border-blue-500 shadow-xl ring-4 ring-blue-500/5 scale-105 z-10' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-lg'}
                `}
              >
                {/* POPULAR BADGE */}
                {plan.highlight && (
                  <div className="absolute top-0 right-0 -mt-3 mr-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white uppercase tracking-wide shadow-md">
                      {plan.badge?.replace('⭐', '')} Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wide mb-2">{plan.name}</h3>
                  
                  {/* PRICE DISPLAY */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-extrabold text-slate-900">₹{monthlyEquivalent}</span>
                    <span className="text-slate-500 font-medium">/mo</span>
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Billed as <span className="text-slate-900 font-semibold">₹{totalLocationPrice.toLocaleString()}</span> every {activeCycle.label.toLowerCase()}
                  </div>

                  {/* SAVINGS BADGE */}
                  {savings > 0 && (
                    <div className="mt-3 inline-block bg-green-100 text-green-700 border border-green-200 text-xs px-2 py-1 rounded-md font-bold">
                      Save ₹{savings.toLocaleString()}
                    </div>
                  )}

                  {/* TRIAL INFO */}
                  {plan.trialDays && selectedCycle !== 'monthly' && (
                    <div className="mt-2 text-xs font-semibold text-blue-600">
                        • {plan.trialDays}-Day Free Trial Included
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100 w-full mb-6"></div>

                {/* FEATURES LIST */}
                <div className="flex-1 mb-8">
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        {feature.startsWith('No') ? (
                           <X className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                        ) : (
                           <div className={`rounded-full p-0.5 mr-3 shrink-0 ${plan.highlight ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                           </div>
                        )}
                        <span className={`text-sm ${feature.startsWith('No') ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-600'}`}>
                            {feature.replace('No ', '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ACTION BUTTON */}
                <button
                  onClick={() => handleCheckout(plan.id)}
                  className={`
                    w-full py-3.5 px-6 rounded-xl font-bold transition-all duration-200 cursor-pointer text-sm
                    ${plan.highlight 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 hover:-translate-y-0.5' 
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300'}
                  `}
                >
                  {/* BUTTON LOGIC */}
                  {selectedCycle === 'monthly'
                    ? `Subscribe to ${plan.name}`
                    : (plan.trialDays ? `Start ${plan.trialDays}-Day Free Trial` : `Choose ${plan.name}`)
                  }
                </button>
                
                {/* HELPER TEXT */}
                <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
                  {selectedCycle === 'monthly' 
                    ? 'Billed monthly. Cancel anytime.' 
                    : `Then ₹${totalLocationPrice.toLocaleString()} / ${activeCycle.label.toLowerCase()}`
                  }
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}