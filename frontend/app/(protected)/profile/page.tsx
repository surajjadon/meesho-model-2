"use client";

import { useState, useEffect, FormEvent } from "react";
import { api, useBusiness } from "@/providers/GlobalProvider";
import { Trash2, Plus } from "lucide-react";

interface IBusinessProfile {
  _id: string;
  accountName: string;
  brandName: string;
  gstin: string;
}

export default function ProfilePage() {
  const [profiles, setProfiles] = useState<IBusinessProfile[]>([]);
  const [newAccountName, setNewAccountName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newGstin, setNewGstin] = useState("");

  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get the refetch function from the context
  const { refetch } = useBusiness();

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

  const clearMessages = (timeout = 3000) => {
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, timeout);
  };

  const handleAddProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsAdding(true);

    try {
      const { data } = await api.post("/profiles", {
        accountName: newAccountName,
        brandName: newBrandName,
        gstin: newGstin,
      });
      setProfiles([...profiles, data]);
      setSuccess(`Successfully added account: ${data.brandName}`);
      setNewAccountName("");
      setNewBrandName("");
      setNewGstin("");
      refetch(); // Refetch business list in the global context
      clearMessages();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add profile.");
      clearMessages(5000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this account? This action cannot be undone."
      )
    )
      return;

    setError("");
    setSuccess("");
    try {
      await api.delete(`/profiles/${profileId}`);
      setProfiles(profiles.filter((p) => p._id !== profileId));
      setSuccess("Account deleted successfully.");
      refetch(); // Refetch business list in the global context
      clearMessages();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete profile.");
      clearMessages(5000);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">User Profile</h1>
        <p className="text-slate-500 mt-1">
          Manage your business accounts and GSTINs.
        </p>
      </div>

      {/* --- Add New Account Form --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Add New Account
        </h2>
        <form onSubmit={handleAddProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Account Name (e.g., My Meesho Store)"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Brand Name (e.g., Hemant's Apparel)"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="GSTIN"
              value={newGstin}
              onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              maxLength={15}
            />
            <button
              type="submit"
              disabled={isAdding}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} />
              {isAdding ? "Adding..." : "Add Account"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="mt-4 p-3 text-red-700 bg-red-100 border-l-4 border-red-500 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 text-green-700 bg-green-100 border-l-4 border-green-500 rounded-md">
          {success}
        </div>
      )}

      {/* --- Your Accounts List --- */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Your Accounts</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="p-3 font-semibold">Account Name</th>
                <th className="p-3 font-semibold">Brand Name</th>
                <th className="p-3 font-semibold">GSTIN</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-500">
                    Loading accounts...
                  </td>
                </tr>
              ) : profiles.length > 0 ? (
                profiles.map((profile) => (
                  <tr key={profile._id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">
                      {profile.accountName}
                    </td>
                    <td className="p-3 text-slate-600">{profile.brandName}</td>
                    <td className="p-3 text-slate-600 font-mono">
                      {profile.gstin}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteProfile(profile._id)}
                        className="p-2 rounded-md text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-500">
                    No accounts found. Add one using the form above to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
