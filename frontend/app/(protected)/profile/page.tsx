"use client";

import { useState } from "react";
import { api, useBusiness } from "@/providers/GlobalProvider";
import { Trash2, Plus, Building2, Users, Mail, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import InviteUserModal from "../../userManagment/page"; 
import ProtectRoute from "../../components/ProtectRoute";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AccountSchema, AccountFormData } from "./../../Schema/profile.schema"; 
import { handleApiError } from "@/lib/errorHandler";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
// 1️⃣ Import your custom DeleteModal
// Adjust the path below if your component is in a different folder
import DeleteModal from "../../components/modal/DeleteModal"; 

interface IBusinessProfile {
  _id: string;
  accountName: string;
  brandName: string;
  gstin: string;
}

export interface ITeamUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  status: string;
  modules: string[] | Record<string, boolean>;
  gstinvalue: string[];
  phone?: string; 
  gstAccess?: boolean; 
}

// 2️⃣ Define a type for the delete target
type DeleteTarget = {
  type: 'profile' | 'user';
  id: string;
  name: string;
} | null;

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { refetch: refetchBusinessProvider } = useBusiness();

  const [activeTab, setActiveTab] = useState<'business' | 'team'>('business');
  
  // Team Tab State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ITeamUser | null>(null);

  // 3️⃣ Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<AccountFormData>({
    resolver: zodResolver(AccountSchema)
  });

  // --- Queries ---
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
        const { data } = await api.get("/profiles");
        return data as IBusinessProfile[];
    }
  });

  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
        const { data } = await api.get("/team");
        return data as ITeamUser[];
    },
    enabled: activeTab === 'team'
  });

  // --- Mutations ---

  // 1. Add Profile
  const addProfileMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
        const res = await api.post("/profiles", { 
            accountName: data.accountName, 
            brandName: data.brandName, 
            gstin: data.gstin.toUpperCase() 
        });
        return res.data;
    },
    onSuccess: (newProfile) => {
        queryClient.setQueryData(['profiles'], (old: IBusinessProfile[] = []) => [...old, newProfile]);
        reset();
        refetchBusinessProvider();
        toast.success(`Successfully added account: ${newProfile.brandName}`);
    },
    onError: (err) => {
        handleApiError(err, "Failed to add profile.");
        toast.error("Failed to add profile. Please check GSTIN.");
    }
  });

  // 2. Delete Profile
  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
        await api.delete(`/profiles/${profileId}`);
        return profileId;
    },
    onSuccess: (deletedId) => {
        queryClient.setQueryData(['profiles'], (old: IBusinessProfile[] = []) => 
            old.filter(p => p._id !== deletedId)
        );
        refetchBusinessProvider();
        setDeleteTarget(null); // Close modal
        toast.success("Account deleted successfully");
    },
    onError: (err) => {
        handleApiError(err, "Failed to delete profile.");
        toast.error("Failed to delete account.");
    }
  });

  // 3. Revoke User
  const revokeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
        await api.delete(`/team/${userId}`);
        return userId;
    },
    onSuccess: (revokedId) => {
        queryClient.setQueryData(['teamMembers'], (old: ITeamUser[] = []) => 
            old.filter(u => u.id !== revokedId)
        );
        setDeleteTarget(null); // Close modal
        toast.success("User access revoked successfully");
    },
    onError: (err) => {
        handleApiError(err, "Failed to revoke user.");
        toast.error("Failed to revoke user access.");
    }
  });

  // --- Handlers ---

  const onAddProfile = (data: AccountFormData) => {
    const toastId = toast.loading("Adding account...");
    addProfileMutation.mutate(data, {
        onSuccess: () => toast.dismiss(toastId),
        onError: () => toast.dismiss(toastId)
    });
  };

  // 4️⃣ Updated Handlers: Open Modal instead of Toast
  const handleDeleteClick = (profileId: string, profileName: string) => {
    setDeleteTarget({ type: 'profile', id: profileId, name: profileName });
  };

  const handleRevokeClick = (userId: string, userName: string) => {
    setDeleteTarget({ type: 'user', id: userId, name: userName });
  };

  // 5️⃣ Unified Confirm Action
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'profile') {
        deleteProfileMutation.mutate(deleteTarget.id);
    } else {
        revokeUserMutation.mutate(deleteTarget.id);
    }
  };

  const openInviteModal = () => {
    setEditingUser(null);
    setIsInviteModalOpen(true);
  };

  const handleSaveTeamMember = (memberData: any) => {
    setIsInviteModalOpen(false);

    if (memberData) {
        queryClient.setQueryData(['teamMembers'], (old: ITeamUser[] = []) => {
            const exists = old.find(u => u.id === memberData.id);
            if (exists) {
                return old.map(u => u.id === memberData.id ? { ...u, ...memberData } : u);
            } else {
                return [...old, memberData]; 
            }
        });
    }
    queryClient.invalidateQueries({ queryKey: ['teamMembers'] });

    if (editingUser) {
        toast.success("Team member updated.");
    } else {
        toast.success("Invite sent successfully.");
    }
  };

  return (
    <ProtectRoute permission="profile">
    <div className="space-y-6 p-4 md:p-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settings & Profile</h1>
          <p className="text-slate-500 mt-1">Manage business details and team access.</p>
        </div>
        
        <div className="bg-slate-100 p-1 rounded-lg flex space-x-1 w-full md:w-auto">
          <button onClick={() => setActiveTab('business')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all flex-1 md:flex-none justify-center cursor-pointer ${activeTab === 'business' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Building2 size={16} /> Business Profile
          </button>
          <button onClick={() => setActiveTab('team')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all flex-1 md:flex-none justify-center cursor-pointer ${activeTab === 'team' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Users size={16} /> Team Members
          </button>
        </div>
      </div>

      {/* ========================== TAB 1: BUSINESS PROFILE ========================== */}
      {activeTab === 'business' && (
        <div className="space-y-6 fade-in">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Account</h2>
            
            <form onSubmit={handleSubmit(onAddProfile)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                <div>
                    <input 
                        {...register("accountName")}
                        type="text" 
                        placeholder="Account Name" 
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-gray-600
                            ${errors.accountName ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`} 
                    />
                    {errors.accountName && <p className="text-xs text-red-500 mt-1">{errors.accountName.message}</p>}
                </div>
                <div>
                    <input 
                        {...register("brandName")}
                        type="text" 
                        placeholder="Brand Name" 
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-gray-600
                            ${errors.brandName ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`} 
                    />
                    {errors.brandName && <p className="text-xs text-red-500 mt-1">{errors.brandName.message}</p>}
                </div>
                <div className="w-full">
                    <input 
                        {...register("gstin")}
                        type="text" 
                        placeholder="GSTIN (15 Chars)" 
                        maxLength={15}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-mono text-gray-600 uppercase
                            ${errors.gstin ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500'}`} 
                    />
                    {errors.gstin && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle size={10} /> {errors.gstin.message}
                        </p>
                    )}
                </div>
                <button 
                    type="submit" 
                    disabled={addProfileMutation.isPending} 
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed cursor-pointer transition-colors h-[42px]"
                >
                  {addProfileMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Add Account</>}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200"><h2 className="text-xl font-bold text-slate-800">Your Accounts</h2></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr><th className="p-3 font-semibold">Account Name</th><th className="p-3 font-semibold">Brand Name</th><th className="p-3 font-semibold">GSTIN</th><th className="p-3 font-semibold text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {profilesLoading ? ( 
                    Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-3"><div className="h-4 w-32 bg-gray-300 rounded"></div></td>
                          <td className="p-3"><div className="h-4 w-24 bg-gray-300 rounded"></div></td>
                          <td className="p-3"><div className="h-4 w-40 bg-gray-300 rounded"></div></td>
                          <td className="p-3 text-right"><div className="h-8 w-8 bg-gray-200 rounded-full ml-auto"></div></td>
                        </tr>
                    ))
                  ) : profiles.length > 0 ? (
                    profiles.map((profile) => (
                      <tr key={profile._id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">{profile.accountName}</td>
                        <td className="p-3 text-slate-600">{profile.brandName}</td>
                        <td className="p-3 text-slate-600 font-mono">{profile.gstin}</td>
                        <td className="p-3 text-right">
                          {/* 6️⃣ Update Button to use Handler */}
                          <button onClick={() => handleDeleteClick(profile._id, profile.brandName)} className="p-2 rounded-md text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  ) : ( <tr><td colSpan={4} className="text-center py-10 text-slate-500">No accounts found.</td></tr> )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================== TAB 2: TEAM MEMBERS ========================== */}
      {activeTab === 'team' && (
        <div className="space-y-6 fade-in">
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div><h2 className="text-xl font-bold text-slate-800">Team Management</h2><p className="text-sm text-slate-500">Invite users and manage their access permissions.</p></div>
            <button onClick={openInviteModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors cursor-pointer">
              <Mail size={16} /> Invite Member
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="p-3 font-semibold">User</th>
                    <th className="p-3 font-semibold">Role Access</th>
                    <th className="p-3 font-semibold">GST Access</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {teamLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="p-3"><div className="h-4 w-32 bg-gray-300 rounded mb-2"></div><div className="h-3 w-40 bg-gray-100 rounded"></div></td>
                          <td className="p-3"><div className="h-6 w-16 bg-gray-200 rounded-full"></div></td>
                          <td className="p-3"><div className="h-4 w-24 bg-gray-100 rounded"></div></td>
                          <td className="p-3"><div className="h-6 w-16 bg-gray-200 rounded-full"></div></td>
                          <td className="p-3 text-right"><div className="h-4 w-12 bg-gray-200 rounded ml-auto"></div></td>
                        </tr>
                      ))
                  ) : teamMembers.length > 0 ? (
                      teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 group">
                            <td className="p-3">
                                <div className="font-medium text-slate-800">{member.name}</div>
                                <div className="text-xs text-slate-500">{member.email}</div>
                            </td>
                            <td className="p-3">
                                <div className="flex gap-2 flex-wrap">
                                    {member.role !== 'Custom' ? (
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                            member.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 
                                            member.role === 'Manager' ? 'bg-orange-100 text-orange-700' : 
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {member.role}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">Custom</span>
                                    )}
                                </div>
                            </td>
                            <td className="p-3 align-top">
                                <div className="flex flex-wrap gap-1 max-w-[250px]">
                                    {member.gstinvalue && member.gstinvalue.length > 0 ? (
                                        member.gstinvalue.map((gst, idx) => (
                                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                                                {gst}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">No GSTs assigned</span>
                                    )}
                                </div>
                            </td>
                            <td className="p-3">
                                {member.status === 'active' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                        <ShieldCheck size={12} /> Active
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                                        Invited
                                    </span>
                                )}
                            </td>
                            <td className="p-3 text-right text-slate-500">
                                {/* 6️⃣ Update Button to use Handler */}
                                <button onClick={() => handleRevokeClick(member.id, member.name)} className="text-red-600 hover:underline text-xs cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">Revoke</button>
                            </td>
                        </tr>
                      ))
                  ) : (
                      <tr><td colSpan={5} className="text-center py-10 text-slate-500">No team members found. Invite someone to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <InviteUserModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        gstList={profiles} 
        initialData={editingUser as any} 
        onSave={handleSaveTeamMember} 
      />

      {/* 7️⃣ Render Modal */}
      <DeleteModal 
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.name || "this item"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleteProfileMutation.isPending || revokeUserMutation.isPending}
      />

    </div>
    </ProtectRoute>
  );
}