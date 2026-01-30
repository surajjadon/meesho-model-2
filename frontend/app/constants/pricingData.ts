// src/constants/pricingData.ts

export type CycleKey = 'monthly' | 'yearly' | '2years' | '4years';
export type BillingType = 'recurring' | 'onetime';

export interface Cycle {
  id: CycleKey;
  label: string;
  months: number;
  billingType: BillingType;
  discountLabel?: string;
  // New flag: Does this cycle allow paying in monthly chunks?
  supportsInstallments?: boolean; 
}

export interface Plan {
  id: string;
  name: string;
  type: 'basic' | 'standard' | 'pro';
  prices: Record<CycleKey, number>;
  features: string[];
  highlight: boolean;
  badge?: string;
  trialDays?: number;
}

// --- SHARED CONFIGURATION ---

export const CYCLES: Cycle[] = [
  { 
    id: 'monthly', 
    label: 'Monthly', 
    months: 1, 
    billingType: 'recurring', 
    discountLabel: '',
    supportsInstallments: false 
  },
  { 
    id: 'yearly', 
    label: 'Yearly', 
    months: 12, 
    billingType: 'recurring', 
    discountLabel: 'Save 20%',
    // ENABLE AUTOPAY FOR YEARLY
    supportsInstallments: true 
  },
  { 
    id: '2years', 
    label: '2 Years', 
    months: 24, 
    billingType: 'onetime', 
    discountLabel: 'Save 29%',
    supportsInstallments: false 
  },
  { 
    id: '4years', 
    label: '4 Years', 
    months: 48, 
    billingType: 'onetime', 
    discountLabel: 'Save 41%',
    supportsInstallments: false 
  },
];

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    type: 'basic',
    prices: { monthly: 49, yearly: 468, '2years': 840, '4years': 1392 },
    features: ['100 API calls/day', 'Basic analytics', 'Email support', '1 User', 'No Custom Domain'],
    highlight: false,
    trialDays: 0, 
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