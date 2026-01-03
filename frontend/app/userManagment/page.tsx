"use client";

import React, { useState, useEffect } from 'react';
import { api } from "@/providers/GlobalProvider"; 
import { 
  X, Shield, Truck, CreditCard, RefreshCw, Settings, CheckSquare, 
  Briefcase, UserCog, Calculator, Package, Edit3, 
  CheckCircle, Loader2, AlertCircle 
} from 'lucide-react';

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

// 1. Define Standard Roles
const ROLE_PRESETS: Record<string, any> = {
  'Admin': { 
    modules: { cropper: true, inventory: true, payments: true, returns: true, admin: true },
    desc: "Full access to all modules and settings."
  },
  'Manager': { 
    modules: { cropper: true, inventory: true, payments: false, returns: true, admin: false },
    desc: "Operations focus. Can't see payments or settings."
  },
  'Accountant': { 
    modules: { cropper: false, inventory: false, payments: true, returns: false, admin: false },
    desc: "Financial access only. Settlements & Reports."
  },
  'Operator': { 
    modules: { cropper: true, inventory: false, payments: false, returns: true, admin: false },
    desc: "Limited access for packing and returns processing."
  }
};

export default function InviteUserModal({ isOpen, onClose, gstList, initialData, onSave }: InviteUserModalProps) {
  
  const initialFormData = {
    name: '',
    email: '',
    phone: '',
    modules: { cropper: false, inventory: false, payments: false, returns: false, admin: false },
    gstAccess: { allFuture: false, selectedIds: [] as string[] }
  };

  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [selectedRole, setSelectedRole] = useState<string>('Custom');
  const [customRoleName, setCustomRoleName] = useState<string>('');
  const [formData, setFormData] = useState(initialFormData);
  
  // 🟢 CHANGE 1: Added 'gst' to error state
  const [errors, setErrors] = useState({ name: '', email: '', phone: '', gst: '' });

  // --- EFFECT: Handle Edit Mode vs Invite Mode ---
  useEffect(() => {
    if (isOpen) {
      setInviteStatus('idle');
      setErrors({ name: '', email: '', phone: '', gst: '' }); // Reset errors

      if (initialData) {
        // === EDIT MODE ===
        setFormData({
            name: initialData.name,
            email: initialData.email,
            phone: initialData.phone,
            modules: initialData.modules,
            gstAccess: initialData.gstAccess
        });

        let foundRole = 'Custom';
        Object.entries(ROLE_PRESETS).forEach(([role, preset]) => {
            if (JSON.stringify(preset.modules) === JSON.stringify(initialData.modules)) {
                foundRole = role;
            }
        });
        
        if (foundRole === 'Custom') {
             setCustomRoleName(initialData.role === 'Custom' ? '' : initialData.role);
        }
        setSelectedRole(foundRole);

      } else {
        // === NEW INVITE MODE ===
        setFormData(initialFormData);
        setSelectedRole('Custom');
        setCustomRoleName('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // --- Logic Handlers ---
  const validateForm = () => {
    let isValid = true;
    const newErrors = { name: '', email: '', phone: '', gst: '' };

    if (!formData.name.trim()) { newErrors.name = 'Full Name is required.'; isValid = false; }
    
    const phoneRegex = /^[0-9]{10}$/;
    if (!formData.phone.trim()) { newErrors.phone = 'Phone number is required.'; isValid = false; }
    else if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) { newErrors.phone = 'Enter valid 10-digit number.'; isValid = false; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) { newErrors.email = 'Email is required.'; isValid = false; }
    else if (!emailRegex.test(formData.email)) { newErrors.email = 'Enter valid email.'; isValid = false; }

    // 🟢 CHANGE 2: Added GST Validation Check
    if (formData.gstAccess.selectedIds.length === 0) {
        newErrors.gst = 'Please select at least one GST account.';
        isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (field: string, value: string) => {
    if (errors[field as keyof typeof errors]) setErrors(prev => ({ ...prev, [field]: '' }));
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoleSelect = (roleName: string) => {
    setSelectedRole(roleName);
    if (roleName === 'Custom') {
      setCustomRoleName('');
    } else {
      setCustomRoleName('');
      setFormData(prev => ({ ...prev, modules: { ...ROLE_PRESETS[roleName].modules } }));
    }
  };

  const toggleModule = (key: keyof typeof formData.modules) => {
    setFormData(prev => {
      const newModules = { ...prev.modules, [key]: !prev.modules[key] };
      let matchingRole = 'Custom';
      Object.entries(ROLE_PRESETS).forEach(([role, preset]) => {
        if (JSON.stringify(preset.modules) === JSON.stringify(newModules)) matchingRole = role;
      });
      setSelectedRole(matchingRole);
      return { ...prev, modules: newModules };
    });
  };

  const toggleGst = (id: string) => {
    // 🟢 Clear error if user selects something
    if (errors.gst) setErrors(prev => ({ ...prev, gst: '' }));

    setFormData(prev => {
      const currentIds = prev.gstAccess.selectedIds;
      const newIds = currentIds.includes(id) ? currentIds.filter(x => x !== id) : [...currentIds, id];
      return { ...prev, gstAccess: { ...prev.gstAccess, selectedIds: newIds, allFuture: false } };
    });
  };

 // --- 🚀 THE IMPORTANT PART: REAL API CALL ---
  const handleSaveOrSend = async () => {
    if (!validateForm()) return;

    setInviteStatus('sending');
    const finalRoleName = selectedRole === 'Custom' ? customRoleName || 'Custom User' : selectedRole;
    
    // 1️⃣ Calculate the 'gstinvalue' array
    const calculatedGstinValues = gstList
      .filter((gst) => formData.gstAccess.selectedIds.includes(gst._id))
      .map((gst) => gst.gstin);

    const payload = {
        id: initialData?.id, 
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: finalRoleName,
        permissions: formData.modules,
        allowedGSTs: formData.gstAccess.selectedIds,
        gstAccessAll: false, 
        gstinvalue: calculatedGstinValues 
    };

    try {
        if (initialData) {
            await api.put(`/team/${initialData.id}`, payload);
        } else {
            await api.post('/team/invite', payload);
        }

        if (onSave) onSave(payload);
        setInviteStatus('success');

    } catch (error: any) {
        console.error("Failed:", error);
        const errorMsg = error.response?.data?.message || "Failed to process request.";
        alert(errorMsg);
        setInviteStatus('idle');
    }
  };
  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-4 transition-all">
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
               {initialData ? "User permissions updated." : `We have sent an email to ${formData.email}.`}
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

            <div className={`p-6 overflow-y-auto space-y-8 custom-scrollbar relative ${inviteStatus === 'sending' ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* User Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="e.g. Ramesh Kumar" className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm transition-all text-gray-600 ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`} value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                        {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone <span className="text-red-500">*</span></label>
                        <input type="tel" placeholder="e.g. 9876543210" maxLength={10} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm transition-all text-gray-600 ${errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`} value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                        {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.phone}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Login ID) <span className="text-red-500">*</span></label>
                        <input type="email" placeholder="e.g. ramesh@company.com" disabled={!!initialData} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm transition-all text-gray-600 ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-500'} ${initialData ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`} value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                        {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.email}</p>}
                    </div>
                </div>
                <hr className="border-gray-100" />
                {/* Role Selection */}
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Role</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <RoleCard label="Admin" active={selectedRole === 'Admin'} icon={<UserCog size={20} />} onClick={() => handleRoleSelect('Admin')} />
                        <RoleCard label="Manager" active={selectedRole === 'Manager'} icon={<Briefcase size={20} />} onClick={() => handleRoleSelect('Manager')} />
                        <RoleCard label="Accountant" active={selectedRole === 'Accountant'} icon={<Calculator size={20} />} onClick={() => handleRoleSelect('Accountant')} />
                        <RoleCard label="Operator" active={selectedRole === 'Operator'} icon={<Package size={20} />} onClick={() => handleRoleSelect('Operator')} />
                        <RoleCard label="Custom" active={selectedRole === 'Custom'} icon={<Edit3 size={20} />} onClick={() => handleRoleSelect('Custom')} />
                    </div>
                    {selectedRole === 'Custom' && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Custom Role Name</label>
                            <input type="text" autoFocus placeholder="e.g. Senior Intern..." className="w-full px-3 py-2 border-2 border-blue-100 bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-blue-900 placeholder-blue-300" value={customRoleName} onChange={(e) => setCustomRoleName(e.target.value)} />
                        </div>
                    )}
                </div>
                {/* Permission Matrix */}
                <div className={`p-4 rounded-xl border transition-colors ${selectedRole === 'Custom' ? 'bg-blue-50/30 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Permission Matrix</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <PermissionCheckbox label="Order Processing" desc="Access Cropper & Orders" icon={<Truck size={18} />} checked={formData.modules.cropper} onChange={() => toggleModule('cropper')} />
                        <PermissionCheckbox label="Inventory Manager" desc="Stock & SKU Mappings" icon={<Shield size={18} />} checked={formData.modules.inventory} onChange={() => toggleModule('inventory')} />
                        <PermissionCheckbox label="Finance & Payments" desc="Settlements & Reports" icon={<CreditCard size={18} />} checked={formData.modules.payments} onChange={() => toggleModule('payments')} />
                        <PermissionCheckbox label="Returns / RTO" desc="Process Returns" icon={<RefreshCw size={18} />} checked={formData.modules.returns} onChange={() => toggleModule('returns')} />
                        <PermissionCheckbox label="Admin Settings" desc="Manage GSTs & Team" icon={<Settings size={18} />} checked={formData.modules.admin} onChange={() => toggleModule('admin')} isDanger={true} />
                    </div>
                </div>
                
                {/* GST Scope */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        {/* 🟢 CHANGE 3: Added Required Star and Error Message next to header */}
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">GST Access Scope <span className="text-red-500">*</span></h4>
                            {errors.gst && (
                                <span className="text-[10px] text-red-500 font-medium flex items-center gap-1 animate-pulse bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                    <AlertCircle size={10} /> {errors.gst}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* 🟢 CHANGE 4: Added red border conditionally if error exists */}
                    <div className={`space-y-2 max-h-40 overflow-y-auto p-1 ${errors.gst ? 'border border-red-300 rounded-lg bg-red-50/30' : ''}`}>
                        {gstList.length > 0 ? gstList.map((gst) => (
                            <div key={gst._id} onClick={() => toggleGst(gst._id)} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${formData.gstAccess.selectedIds.includes(gst._id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                                <div className="flex items-center space-x-3">
                                    <div className="bg-gray-100 px-2 py-1 rounded text-xs font-mono font-bold text-gray-600">{gst.gstin}</div>
                                    <p className="text-sm font-medium text-gray-900">{gst.brandName}</p>
                                </div>
                                {formData.gstAccess.selectedIds.includes(gst._id) && <CheckSquare className="text-blue-600" size={18} />}
                            </div>
                        )) : ( <p className="text-sm text-gray-400 italic">No GST accounts found.</p> )}
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" disabled={inviteStatus === 'sending'}>Cancel</button>
                <button onClick={handleSaveOrSend} disabled={inviteStatus === 'sending'} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                    {inviteStatus === 'sending' ? ( <> <Loader2 className="animate-spin" size={16} /> Saving... </> ) : ( initialData ? "Save Changes" : "Send Invite" )}
                </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helpers (No Changes here)
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