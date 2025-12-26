"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from "@/providers/GlobalProvider"; 
import { Lock, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function JoinTeamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setStatus('submitting');
    try {
      // Send the token and new password to your backend
      await api.post('/auth/accept-invite', { token, password });
      setStatus('success');
      
      // Redirect to login after 3 seconds
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.response?.data?.message || "Invalid or expired token.");
    }
  };

  if (!token) return <div className="p-10 text-center">Invalid invitation link.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {status === 'success' ? (
          <div className="text-center animate-in fade-in zoom-in">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">Account Verified!</h2>
            <p className="text-gray-500 mt-2">Password set successfully. Redirecting to login...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Join the Team</h2>
              <p className="text-gray-500 mt-1">Set a password to activate your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                  <AlertTriangle size={16} /> {errorMsg}
                </div>
              )}

              <button 
                type="submit" 
                disabled={status === 'submitting'}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all flex justify-center items-center gap-2"
              >
                {status === 'submitting' ? <Loader2 className="animate-spin" /> : <Lock size={18} />}
                Activate Account
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}