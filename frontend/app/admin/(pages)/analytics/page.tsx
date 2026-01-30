import React from 'react';
import { Store, FileText, ExternalLink, Info, ArrowUpRight, Download } from 'lucide-react';

export default function PlatformAnalyticsPage() {
  // Mock Data for the tables
  const recentLabels = [
    { id: '#LBL-4567', platform: 'Meesho', date: '22 Jan 2025', orderId: '#ORD-8901', status: 'Processed', color: 'pink' },
    { id: '#LBL-4566', platform: 'Amazon', date: '21 Jan 2025', orderId: '#ORD-8900', status: 'Processed', color: 'bg-black text-[#FF9900] shadow-sm shadow-[#FFE6C7]' },
    { id: '#LBL-4565', platform: 'Flipkart', date: '21 Jan 2025', orderId: '#ORD-8899', status: 'Processed', color: 'blue' },
    { id: '#LBL-4564', platform: 'Meesho', date: '20 Jan 2025', orderId: '#ORD-8898', status: 'Pending', color: 'pink' },
    { id: '#LBL-4563', platform: 'Amazon', date: '20 Jan 2025', orderId: '#ORD-8897', status: 'Processed', color: 'orange' },
    { id: '#LBL-4562', platform: 'Flipkart', date: '19 Jan 2025', orderId: '#ORD-8896', status: 'Processed', color: 'blue' },
  ];

  return (
    <div className="min-h-screen p-6 md:p-8 font-sans text-slate-800">
      
      {/* Page Title (Optional) */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
        <p className="text-slate-500 text-sm">Detailed breakdown of orders and labels across marketplaces.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ----------------------------------------------------------------------
            SECTION 5: PLATFORM COMPARISON
            ---------------------------------------------------------------------- */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col h-full">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Store size={20} />
              </div>
              Platform Comparison
            </h3>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50 border border-slate-100 px-2 py-1 rounded-full">
              Real-time Data
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-400 uppercase text-[11px] tracking-wider">Metric</th>
                  <th className="px-4 py-3 font-bold bg-white text-[#E81C7B] border-[#F5B5D1] shadow-sm shadow-[#F8CADD]">Meesho</th>
                  <th className="px-4 py-3 font-bold bg-[#F8D706] text-[#1F74BA]  shadow-sm shadow-[#D4E6F8]">Flipkart</th>
                  <th className="px-4 py-3 font-bold bg-black text-[#FF9900]  shadow-sm shadow-[#FFE6C7]">Amazon</th>
                  <th className="px-4 py-3 font-bold text-slate-800 bg-slate-50/50 rounded-tr-lg">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-600">Total Orders</td>
                  <td className="px-4 py-3.5 text-slate-600">25</td>
                  <td className="px-4 py-3.5 text-slate-600">32</td>
                  <td className="px-4 py-3.5 text-slate-600">20</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900 bg-slate-50/30">77</td>
                </tr>
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-600">Labels Uploaded</td>
                  <td className="px-4 py-3.5 text-slate-600">22</td>
                  <td className="px-4 py-3.5 text-slate-600">30</td>
                  <td className="px-4 py-3.5 text-slate-600">18</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900 bg-slate-50/30">70</td>
                </tr>
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-600">Pending Labels</td>
                  <td className="px-4 py-3.5 text-amber-600 font-medium bg-amber-50/10">3</td>
                  <td className="px-4 py-3.5 text-amber-600 font-medium bg-amber-50/10">2</td>
                  <td className="px-4 py-3.5 text-amber-600 font-medium bg-amber-50/10">2</td>
                  <td className="px-4 py-3.5 font-bold text-amber-700 bg-amber-50/30">7</td>
                </tr>
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-600">Delivered</td>
                  <td className="px-4 py-3.5 text-emerald-600 font-medium">20</td>
                  <td className="px-4 py-3.5 text-emerald-600 font-medium">28</td>
                  <td className="px-4 py-3.5 text-emerald-600 font-medium">16</td>
                  <td className="px-4 py-3.5 font-bold text-emerald-700 bg-emerald-50/30">64</td>
                </tr>
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-600">In Transit</td>
                  <td className="px-4 py-3.5 text-slate-500">3</td>
                  <td className="px-4 py-3.5 text-slate-500">2</td>
                  <td className="px-4 py-3.5 text-slate-500">2</td>
                  <td className="px-4 py-3.5 font-bold text-slate-700 bg-slate-50/30">7</td>
                </tr>
                <tr className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-slate-600">Cancelled</td>
                  <td className="px-4 py-3.5 text-rose-500">2</td>
                  <td className="px-4 py-3.5 text-rose-500">2</td>
                  <td className="px-4 py-3.5 text-rose-500">2</td>
                  <td className="px-4 py-3.5 font-bold text-rose-700 bg-rose-50/30">6</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ----------------------------------------------------------------------
            SECTION 5B: RECENT LABELS / INVOICES
            ---------------------------------------------------------------------- */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col h-full">
          
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileText size={20} />
              </div>
              Recent Labels/Invoices
            </h3>
            <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-3 py-3 font-semibold text-slate-400 uppercase text-[11px] tracking-wider">Label ID</th>
                  <th className="px-3 py-3 font-semibold text-slate-400 uppercase text-[11px] tracking-wider">Platform</th>
                  <th className="px-3 py-3 font-semibold text-slate-400 uppercase text-[11px] tracking-wider">Date</th>
                  <th className="px-3 py-3 font-semibold text-slate-400 uppercase text-[11px] tracking-wider">Status</th>
                  <th className="px-3 py-3 font-semibold text-slate-400 uppercase text-[11px] tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentLabels.map((item, index) => (
                  <tr key={index} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-4 font-mono text-xs font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
                      {item.id}
                      <div className="text-[10px] text-slate-400 mt-0.5 font-sans">{item.orderId}</div>
                    </td>
                    <td className="px-3 py-4">
  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
    {
      Meesho: 'bg-white text-[#E81C7B] border-[#F5B5D1] shadow-sm shadow-[#F8CADD]',
      Flipkart: 'bg-[#F8D706] text-[#1F74BA] border-transparent shadow-sm shadow-[#D4E6F8]',
      Amazon: 'bg-black text-[#FF9900] border-transparent shadow-sm shadow-[#FFE6C7]',    
    }[item.platform] || 'bg-slate-50 text-slate-700 border-slate-200'
  }`}>
    {item.platform}
  </span>
</td>
                    <td className="px-3 py-4 text-slate-500 text-xs font-medium">
                      {item.date}
                    </td>
                    <td className="px-3 py-4">
                      {item.status === 'Processed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-right">
                      <button className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="Download Invoice">
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-start gap-2 text-xs text-slate-400">
              <Info size={14} className="mt-0.5 flex-shrink-0 text-indigo-400" />
              <p>
                Invoices uploaded from Meesho, Flipkart, and Amazon are processed automatically via Cropper/Labely.
              </p>
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}