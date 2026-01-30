// app/(protected)/payments/page.tsx
'use client';

import Script from 'next/script';
import { useRazorpay } from '../../../hooks/useRazorpay';
// Assuming you have a UI library, or use standard <button>

export default function PaymentsPage() {
  const { initiatePayment, isLoading } = useRazorpay();

  const handlePay = () => {
    // Pass the amount you want to charge (e.g., 500 INR)
    initiatePayment(500);
  };

  return (
    <div className="p-10 space-y-6">
      {/* Load Razorpay Script Optimally */}
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
        <h1 className="text-2xl font-bold mb-4">Upgrade to Premium</h1>
        <p className="text-gray-600 mb-6">
          Unlock advanced analytics and inventory tools for just ₹500.
        </p>
        
        <div className="flex flex-col gap-4">
          <div className="flex justify-between border-b pb-2">
            <span>Total</span>
            <span className="font-bold">₹500.00</span>
          </div>
          
          <button
            onClick={handlePay}
            disabled={isLoading}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-300 transition"
          >
            {isLoading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
}