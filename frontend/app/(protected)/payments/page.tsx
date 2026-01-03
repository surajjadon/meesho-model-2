"use client";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PaymentsDashboard from './PaymentsDashboard';
import ProfitLossDashboard from './ProfitLossDashboard';
import ProtectRoute from "@/components/ProtectRoute";
export default function PaymentsPageLayout() {
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'payments';

    return (
        
            <ProtectRoute permission="payments">
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <h1 className="text-2xl font-bold text-slate-800">
                        {activeTab === 'payments' ? 'Payments Dashboard' : 'P&L Analysis'}
                    </h1>
                    
                    {/* Pill Tabs */}
                    <div className="flex items-center gap-2">
                        <Link
                            href="/payments?tab=payments"
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'payments'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            Payments
                        </Link>
                        <Link
                            href="/payments?tab=pl"
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                activeTab === 'pl'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                        >
                            Profit / Loss
                        </Link>
                    </div>
                </div>
            </div>

            {/* Render Content */}
            {activeTab === 'payments' && <PaymentsDashboard />}
            {activeTab === 'pl' && <ProfitLossDashboard />}
        </div>
        </ProtectRoute>
    );
}