"use client";

import { useState, useEffect, FormEvent } from "react";
import { api, useBusiness } from "@/providers/GlobalProvider";
import { Trash2, Plus, Building2, Users, Mail, ShieldCheck, Loader2 } from "lucide-react";
import InviteUserModal, { ITeamUser } from "./../../userManagment/page"; // Ensure this import path is correct for your folder structure
import ProtectRoute from "./../../../components/ProtectRoute"
interface IBusinessProfile {
  _id: string;
  accountName: string;
  brandName: string;
  gstin: string;
}

export default function ProfilePage() {
  // --- Global State ---
  const [activeTab, setActiveTab] = useState<'business' | 'team'>('business');
  const [profiles, setProfiles] = useState<IBusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- Business Tab State ---
  const [newAccountName, setNewAccountName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newGstin, setNewGstin] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --- Team Tab State ---
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ITeamUser | null>(null);
  const [teamMembers, setTeamMembers] = useState<ITeamUser[]>([]); // 🚀 No mock data
  const [teamLoading, setTeamLoading] = useState(false);

  const { refetch } = useBusiness();

  // --- Fetch Business Profiles ---
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/profiles");
        setProfiles(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch profiles.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  // --- NEW: Fetch Team Members when Tab Changes ---
  useEffect(() => {
    if (activeTab === 'team') {
        const fetchTeam = async () => {
            try {
                setTeamLoading(true);
                const { data } = await api.get("/team"); // 🚀 Fetching real data
                setTeamMembers(data);
            } catch (err: any) {
                console.error("Failed to fetch team:", err);
                setError("Failed to load team members.");
            } finally {
                setTeamLoading(false);
            }
        };
        fetchTeam();
    }
  }, [activeTab]);

  const clearMessages = (timeout = 3000) => {
    setTimeout(() => { setError(""); setSuccess(""); }, timeout);
  };

  const handleAddProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const { data } = await api.post("/profiles", { accountName: newAccountName, brandName: newBrandName, gstin: newGstin });
      setProfiles([...profiles, data]);
      setSuccess(`Successfully added account: ${data.brandName}`);
      setNewAccountName(""); setNewBrandName(""); setNewGstin("");
      refetch(); clearMessages();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add profile.");
      clearMessages(5000);
    } finally { setIsAdding(false); }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    try {
      await api.delete(`/profiles/${profileId}`);
      setProfiles(profiles.filter((p) => p._id !== profileId));
      setSuccess("Account deleted successfully.");
      refetch(); clearMessages();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete profile.");
      clearMessages(5000);
    }
  };

  // --- TEAM HANDLERS ---
  const openInviteModal = () => {
    setEditingUser(null);
    setIsInviteModalOpen(true);
  };

  const handleEditUser = (user: ITeamUser) => {
    setEditingUser(user);
    setIsInviteModalOpen(true);
  };

  const handleRevokeUser = async (userId: string) => {
    if(!window.confirm("Are you sure you want to revoke access for this user?")) return;
    
    try {
        await api.delete(`/team/${userId}`); // 🚀 Real API Call
        setTeamMembers(prev => prev.filter(u => u.id !== userId));
        setSuccess("User access revoked successfully.");
        clearMessages();
    } catch (err: any) {
        setError(err.response?.data?.message || "Failed to revoke user.");
        clearMessages();
    }
  };

  const handleSaveTeamMember = (memberData: any) => {
    // The Modal handles the API call. This just updates the local list.
    if (editingUser) {
        setTeamMembers(prev => prev.map(u => u.id === memberData.id ? { ...u, ...memberData } : u));
        setSuccess("Team member updated.");
    } else {
        // Since we don't have the new ID immediately without a refetch, we can either:
        // 1. Refetch the whole list (safer)
        // 2. Add it optimistically (faster, but might miss ID)
        
        // Let's re-trigger the fetch to be safe and get the real DB ID
        api.get("/team").then(res => setTeamMembers(res.data));
        setSuccess("Invite sent successfully.");
    }
    clearMessages();
  };

  return (
    <ProtectRoute permission="profile">
    <div className="space-y-6 p-4 md:p-6">
      
      {/* Header & Tabs */}
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

      {/* Global Alerts */}
      {error && <div className="p-3 text-red-700 bg-red-100 border-l-4 border-red-500 rounded-md">{error}</div>}
      {success && <div className="p-3 text-green-700 bg-green-100 border-l-4 border-green-500 rounded-md">{success}</div>}

      {/* ========================== TAB 1: BUSINESS PROFILE ========================== */}
      {activeTab === 'business' && (
        <div className="space-y-6 fade-in">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Account</h2>
            <form onSubmit={handleAddProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <input type="text" placeholder="Account Name (e.g., Meesho Store)" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600" />
                <input type="text" placeholder="Brand Name" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600" />
                <input type="text" placeholder="GSTIN" value={newGstin} onChange={(e) => setNewGstin(e.target.value.toUpperCase())} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-600" maxLength={15} />
                <button type="submit" disabled={isAdding} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed cursor-pointer transition-colors text-white">
                  <Plus size={16} /> {isAdding ? "Adding..." : "Add Account"}
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
                  {loading ? ( <tr><td colSpan={4} className="text-center py-10 text-slate-500">Loading accounts...</td></tr> ) : profiles.length > 0 ? (
                    profiles.map((profile) => (
                      <tr key={profile._id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">{profile.accountName}</td>
                        <td className="p-3 text-slate-600">{profile.brandName}</td>
                        <td className="p-3 text-slate-600 font-mono">{profile.gstin}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleDeleteProfile(profile._id)} className="p-2 rounded-md text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"><Trash2 size={16} /></button>
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
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* LOADING STATE */}
                  {teamLoading ? (
                      <tr><td colSpan={4} className="text-center py-10 text-slate-500"><div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin" size={20} /> Loading Team...</div></td></tr>
                  ) : teamMembers.length > 0 ? (
                      /* REAL DATA MAPPING */
                      teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50">
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
                                <button onClick={() => handleRevokeUser(member.id)} className="text-red-600 hover:underline text-xs cursor-pointer">Revoke</button>
                            </td>
                        </tr>
                      ))
                  ) : (
                      <tr><td colSpan={4} className="text-center py-10 text-slate-500">No team members found. Invite someone to get started.</td></tr>
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
        initialData={editingUser} 
        onSave={handleSaveTeamMember} 
      />

    </div>
    </ProtectRoute>
  );
}