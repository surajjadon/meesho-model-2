"use client";

import { useBusiness } from "../providers/GlobalProvider";
import { Briefcase } from "lucide-react";

export default function Header() {
  // Get all necessary data and functions from our global business context
  const { businesses, selectedBusiness, selectBusiness, loading } = useBusiness();

  // Handle the change event from the select dropdown
  const handleBusinessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGstin = e.target.value;
    // This function from the GlobalProvider will update the state for the whole app
    selectBusiness(newGstin);
  };

  return (
    // ✅ FIXED: Absolute positioning to float top-right
    <header className="absolute top-4 right-6 z-50 flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <Briefcase className="w-4 h-4 text-slate-500" />
        <label htmlFor="business-selector" className="sr-only">
          Current Business:
        </label>
        
        {loading ? (
          <div className="text-xs text-slate-500 font-medium">Loading...</div>
        ) : (
          <select
            id="business-selector"
            value={selectedBusiness?.gstin || ""}
            onChange={handleBusinessChange}
            disabled={businesses.length === 0}
            className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer min-w-[150px]"
          >
            {businesses.length > 0 ? (
              businesses.map((business) => (
                <option key={business._id} value={business.gstin}>
                  {business.brandName}
                </option>
              ))
            ) : (
              <option value="">No Business Found</option>
            )}
          </select>
        )}
    </header>
  );
}