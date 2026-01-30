"use client";

import React, { useState, useEffect } from 'react';
import { api } from "@/providers/GlobalProvider";
import { 
  X, Shield, Truck, CreditCard, RefreshCw, Settings, CheckSquare, 
  Briefcase, UserCog, Calculator, Package, Edit3, 
  CheckCircle, Loader2, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/errorHandler';

// 1. Import RHF, Zod, and Schema
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TeamInviteSchema } from "./../Schema/team.schema"; 

// --- Types ---
interface IBusinessProfile {
  _id: string;
  accountName: string;
  brandName: string;
  gstin: string;
}

export interface ITeamUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  // Backend returns this structure
  modules: {
    cropper: boolean;
    inventory: boolean;
    payments: boolean;
    returns: boolean;
    admin: boolean;
  };
  gstAccess: {
    allFuture: boolean;
    selectedIds: string[];
  };
  status?: string; 
}

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  gstList: IBusinessProfile[];
  initialData?: ITeamUser | null;
  onSave?: (data: any) => void;
}

// Roles Configuration (Matching your Schema Enums)
const ROLE_PRESETS: Record<string, any> = {
  'ADMIN': { 
    modules: { cropper: true, inventory: true, payments: true, returns: true, admin: true },
    desc: "Full access to all modules and settings."
  },
  'MANAGER': { 
    modules: { cropper: true, inventory: true, payments: false, returns: true, admin: false },
    desc: "Operations focus. Can't see payments or settings."
  },
  'ACCOUNTANT': { 
    modules: { cropper: false, inventory: false, payments: true, returns: false, admin: false },
    desc: "Financial access only. Settlements & Reports."
  },
  'OPERATOR': { 
    modules: { cropper: true, inventory: false, payments: false, returns: true, admin: false },
    desc: "Limited access for packing and returns processing."
  }
};

// Type inference from Zod Schema
type TeamInviteFormValues = z.infer<typeof TeamInviteSchema>;

export default function InviteUserModal({ isOpen, onClose, gstList, initialData, onSave }: InviteUserModalProps) {
  
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  // 2. Initialize React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<TeamInviteFormValues>({
    resolver: zodResolver(TeamInviteSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      role: 'CUSTOM', // Schema expects uppercase
      customRoleName: '',
      permissions: { cropper: false, inventory: false, payments: false, returns: false, admin: false },
      gstAccess: [] // Schema expects Array of GSTIN Strings
    }
  });

  // 3. Watch values for UI rendering
  const currentRole = watch('role');
  const currentPermissions = watch('permissions');
  const currentGstAccess = watch('gstAccess');
  // const currentCustomName = watch('customRoleName'); // For the input value

  // --- EFFECT: Data Initialization ---
  useEffect(() => {
    if (isOpen) {
      setInviteStatus('idle');
      
      if (initialData) {
        // === EDIT MODE ===
        
        // 1. Map Role (Ensure Uppercase for Schema Enum)
        let foundRole = 'CUSTOM';
        const initialRoleUpper = initialData.role.toUpperCase();
        
        // Check if current modules match a preset exactly
        Object.entries(ROLE_PRESETS).forEach(([roleKey, preset]) => {
            // Compare objects roughly
            const presetJson = JSON.stringify(preset.modules);
            const userJson = JSON.stringify(initialData.modules);
            if (presetJson === userJson) {
                foundRole = roleKey;
            }
        });

        // 2. Map IDs to GSTIN Strings (Schema requirement)
        const mappedGstins = gstList
            .filter(gst => initialData.gstAccess.selectedIds.includes(gst._id))
            .map(gst => gst.gstin);

        reset({
            fullName: initialData.name,
            email: initialData.email,
            phone: initialData.phone,
            role: (foundRole === 'CUSTOM' ? 'CUSTOM' : foundRole) as any,
            customRoleName: foundRole === 'CUSTOM' ? initialData.role : '',
            permissions: initialData.modules,
            gstAccess: mappedGstins
        });

      } else {
        // === NEW INVITE MODE ===
        reset({
            fullName: '',
            email: '',
            phone: '',
            role: 'CUSTOM',
            customRoleName: '',
            permissions: { cropper: false, inventory: false, payments: false, returns: false, admin: false },
            gstAccess: []
        });
      }
    }
  }, [isOpen, initialData, gstList, reset]);

  if (!isOpen) return null;

  // --- Logic Handlers ---

  const handleRoleSelect = (roleName: string) => {
    // roleName comes in as 'Admin', 'Manager' (Title Case) -> Convert to UPPER for Schema
    const schemaRole = roleName.toUpperCase();

    if (schemaRole === 'CUSTOM') {
      setValue('role', 'CUSTOM', { shouldValidate: true });
      setValue('customRoleName', '', { shouldValidate: true });
    } else {
      setValue('role', schemaRole as any, { shouldValidate: true });
      setValue('customRoleName', undefined); // Optional in schema, clearer to undefine
      // Apply Preset Permissions
      setValue('permissions', { ...ROLE_PRESETS[schemaRole].modules }, { shouldValidate: true });
    }
  };

  const toggleModule = (key: keyof typeof currentPermissions) => {
    const newPermissions = { ...currentPermissions, [key]: !currentPermissions[key] };
    setValue('permissions', newPermissions, { shouldValidate: true });

    // Check if new config matches a preset
    let matchingRole = 'CUSTOM';
    Object.entries(ROLE_PRESETS).forEach(([roleKey, preset]) => {
      // Simple object comparison
      if (JSON.stringify(preset.modules) === JSON.stringify(newPermissions)) {
        matchingRole = roleKey;
      }
    });
    
    setValue('role', matchingRole as any, { shouldValidate: true });
  };

  const toggleGst = (gstin: string) => {
    const currentList = currentGstAccess || [];
    const newList = currentList.includes(gstin) 
      ? currentList.filter(g => g !== gstin) 
      : [...currentList, gstin];
    
    setValue('gstAccess', newList, { shouldValidate: true });
  };

  // --- SUBMISSION ---
  const onSubmit = async (data: TeamInviteFormValues) => {
    setInviteStatus("sending");

    // Map GSTIN Strings back to IDs for the Backend (if backend requires IDs)
    // The previous code sent `allowedGSTs` as IDs. 
    const selectedIds = gstList
        .filter(g => data.gstAccess.includes(g.gstin))
        .map(g => g._id);

    // Final Role Name for DB
    const dbRoleName = data.role === 'CUSTOM' ? data.customRoleName : capitalize(data.role);

    const payload = {
      id: initialData?.id,
      name: data.fullName,
      email: data.email,
      phone: data.phone,
      role: dbRoleName, 
      permissions: data.permissions, // Zod now passes the Object correctly
      allowedGSTs: selectedIds, // Backend likely needs IDs
      gstAccessAll: false,
      gstinvalue: data.gstAccess, // Backend explicitly asked for this array of strings in previous steps
    };

    try {
      if (initialData) {
        await api.put(`/team/${initialData.id}`, payload);
      } else {
        await api.post("/team/invite", payload);
      }

      if (onSave) onSave(payload);
      setInviteStatus("success");
    } catch (error: any) {
      handleApiError(
        error,
        initialData ? "Failed to save changes." : "Failed to send invitation."
      );
      setInviteStatus("idle");
    }
  };

  // Helper to capitalize for display/payload if needed (ADMIN -> Admin)
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  return (
    <div className="fixed inset-0 z-50 text-gray-600 flex items-center justify-center bg-black/20 backdrop-blur-md p-4 transition-all">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {inviteStatus === 'success' ? (
           <div className="flex flex-col items-center justify-center py-12 px-6 text-center h-full min-h-[400px]">
             <div className="bg-green-100 p-4 rounded-full mb-6 animate-in zoom-in duration-300">
               <CheckCircle className="text-green-600 w-16 h-16" />
             </div>
             <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {initialData ? "Changes Saved!" : "Invitation Sent!"}
             </h3>
             <p className="text-gray-500 mb-8 max-w-md">
               {initialData ? "User permissions updated." : `We have sent an email to the user.`}
             </p>
             <button onClick={onClose} className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer shadow-lg hover:shadow-xl">
               Done & Close
             </button>
           </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{initialData ? "Edit Team Member" : "Invite Team Member"}</h3>
                    <p className="text-xs text-gray-500">{initialData ? "Modify permissions." : "Define access and invite via email."}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200 cursor-pointer"><X size={20} /></button>
            </div>

            {/* FORM START */}
            <form onSubmit={handleSubmit(onSubmit)} className="contents">
                <div className={`p-6 overflow-y-auto space-y-8 custom-scrollbar relative ${inviteStatus === 'sending' ? 'opacity-50 pointer-events-none' : ''}`}>
                    
                    {/* User Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name <span className="text-red-500">*</span></label>
                            <input 
                                type="text" 
                                placeholder="e.g. Ramesh Kumar" 
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm transition-all text-gray-600 ${errors.fullName ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`} 
                                {...register("fullName")}
                            />
                            {errors.fullName && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.fullName.message}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone <span className="text-red-500">*</span></label>
                            <input 
                                type="tel" 
                                placeholder="e.g. 9876543210" 
                                maxLength={10} 
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm transition-all text-gray-600 ${errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`} 
                                {...register("phone")}
                            />
                            {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.phone.message}</p>}
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Login ID) <span className="text-red-500">*</span></label>
                            <input 
                                type="email" 
                                placeholder="e.g. ramesh@company.com" 
                                disabled={!!initialData} 
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm transition-all text-gray-600 ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'} ${initialData ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`} 
                                {...register("email")}
                            />
                            {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.email.message}</p>}
                        </div>
                    </div>
                    
                    <hr className="border-gray-100" />
                    
                    {/* Role Selection */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Role</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <RoleCard label="Admin" active={currentRole === 'ADMIN'} icon={<UserCog size={20} />} onClick={() => handleRoleSelect('Admin')} />
                            <RoleCard label="Manager" active={currentRole === 'MANAGER'} icon={<Briefcase size={20} />} onClick={() => handleRoleSelect('Manager')} />
                            <RoleCard label="Accountant" active={currentRole === 'ACCOUNTANT'} icon={<Calculator size={20} />} onClick={() => handleRoleSelect('Accountant')} />
                            <RoleCard label="Operator" active={currentRole === 'OPERATOR'} icon={<Package size={20} />} onClick={() => handleRoleSelect('Operator')} />
                            <RoleCard label="Custom" active={currentRole === 'CUSTOM'} icon={<Edit3 size={20} />} onClick={() => handleRoleSelect('Custom')} />
                        </div>
                        
                        {currentRole === 'CUSTOM' && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Custom Role Name</label>
                                <input 
                                    type="text" 
                                    autoFocus 
                                    placeholder="e.g. Senior Intern..." 
                                    className={`w-full px-3 py-2 border-2 border-blue-100 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-blue-900 placeholder-blue-300 ${errors.customRoleName ? 'border-red-500' : ''}`} 
                                    {...register("customRoleName")}
                                />
                                {errors.customRoleName && <p className="text-xs text-red-500 mt-1">{errors.customRoleName.message}</p>}
                            </div>
                        )}
                    </div>

                    {/* Permission Matrix */}
                    <div className={`p-4 rounded-xl border transition-colors ${currentRole === 'CUSTOM' ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Permission Matrix</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <PermissionCheckbox label="Order Processing" desc="Access Cropper & Orders" icon={<Truck size={18} />} checked={currentPermissions?.cropper} onChange={() => toggleModule('cropper')} />
                            <PermissionCheckbox label="Inventory Manager" desc="Stock & SKU Mappings" icon={<Shield size={18} />} checked={currentPermissions?.inventory} onChange={() => toggleModule('inventory')} />
                            <PermissionCheckbox label="Finance & Payments" desc="Settlements & Reports" icon={<CreditCard size={18} />} checked={currentPermissions?.payments} onChange={() => toggleModule('payments')} />
                            <PermissionCheckbox label="Returns / RTO" desc="Process Returns" icon={<RefreshCw size={18} />} checked={currentPermissions?.returns} onChange={() => toggleModule('returns')} />
                            <PermissionCheckbox label="Admin Settings" desc="Manage GSTs & Team" icon={<Settings size={18} />} checked={currentPermissions?.admin} onChange={() => toggleModule('admin')} isDanger={true} />
                        </div>
                    </div>
                    
                    {/* GST Scope */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">GST Access Scope</h4>
                        </div>
                        {/* Zod Validation Error for GST Array */}
                        {errors.gstAccess && (
                            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-600 font-semibold animate-in fade-in">
                                <AlertCircle size={14} /> {errors.gstAccess.message || "Select at least one GST account."}
                            </div>
                        )}
                        
                        <div className={`space-y-2 max-h-40 overflow-y-auto ${errors.gstAccess ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                            {gstList.length > 0 ? gstList.map((gst) => (
                                <div key={gst._id} onClick={() => toggleGst(gst.gstin)} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${currentGstAccess?.includes(gst.gstin) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-bold text-gray-600">{gst.gstin}</div>
                                        <p className="text-sm font-medium text-gray-900">{gst.brandName}</p>
                                    </div>
                                    {currentGstAccess?.includes(gst.gstin) && <CheckSquare className="text-blue-600" size={18} />}
                                </div>
                            )) : ( <p className="text-sm text-gray-400 italic">No GST accounts found.</p> )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" disabled={inviteStatus === 'sending'}>Cancel</button>
                    <button type="submit" disabled={inviteStatus === 'sending'} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                        {inviteStatus === 'sending' ? ( <> <Loader2 className="animate-spin" size={16} /> Saving... </> ) : ( initialData ? "Save Changes" : "Send Invite" )}
                    </button>
                </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Helpers (Unchanged)
const RoleCard = ({ label, icon, active, onClick }: any) => (
  <div onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${active ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-100 hover:border-gray-300 bg-white text-gray-500 hover:bg-gray-50'}`}>
    <div className={`mb-1 ${active ? 'text-blue-600' : 'text-gray-400'}`}>{icon}</div>
    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-center">{label}</span>
  </div>
);
const PermissionCheckbox = ({ label, desc, icon, checked, onChange, isDanger }: any) => (
  <div onClick={onChange} className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all select-none bg-white ${checked ? (isDanger ? 'border-red-500 ring-1 ring-red-500' : 'border-blue-500 ring-1 ring-blue-500') : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
    <div className={`mt-0.5 ${checked ? (isDanger ? 'text-red-600' : 'text-blue-600') : 'text-gray-400'}`}>{icon}</div>
    <div>
      <h5 className={`text-sm font-semibold ${checked ? (isDanger ? 'text-red-700' : 'text-blue-700') : 'text-gray-700'}`}>{label}</h5>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </div>
  </div>
);