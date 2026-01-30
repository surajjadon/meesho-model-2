"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from "@/providers/GlobalProvider";
import AuthLayout from '../components/AuthLayout';
import { handleApiError } from '@/lib/errorHandler';
// 1. Import React Query
import { useMutation } from '@tanstack/react-query';

export default function JoinTeamPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  // Form State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Local Validation Error (Separate from API error)
  const [validationError, setValidationError] = useState('');

  // --- 2. Define Mutation ---
  const acceptInviteMutation = useMutation({
    mutationFn: async (payload: any) => {
        return api.post('/auth/accept-invite', payload);
    },
    onSuccess: () => {
        // Redirect to login after 3 seconds
        setTimeout(() => router.push('/dashboard'), 3000);
    },
    onError: (err) => {
        handleApiError(err, "Failed to activate account.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    // 1. Client-side Validation
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match");
      return;
    }

    if (!token) {
        setValidationError("Invalid or missing invitation token.");
        return;
    }

    // 2. Trigger Mutation
    acceptInviteMutation.mutate({ token, password });
  };

  // --- Invalid Token View ---
  if (!token) {
    return (
        <AuthLayout>
            <div className="text-center fade-in">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-link-slash text-2xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
                <p className="text-gray-500 mb-6">This invitation link is invalid or has expired.</p>
                <button 
                    onClick={() => router.push('/login')}
                    className="text-blue-600 font-medium hover:text-blue-700"
                >
                    <i className="fa-solid fa-arrow-left mr-2"></i> Go to Login
                </button>
            </div>
        </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto fade-in">
        
        {/* SUCCESS STATE (Managed by Mutation) */}
        {acceptInviteMutation.isSuccess ? (
          <div className="text-center py-8 bg-green-50 rounded-xl border border-green-200 fade-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-check text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-green-800 mb-2">Welcome to the Team!</h2>
            <p className="text-sm text-green-700 px-4">
              Your account has been activated successfully. <br/>
              Redirecting you to login...
            </p>
            <div className="mt-6">
                <i className="fa-solid fa-circle-notch fa-spin text-green-600 text-2xl"></i>
            </div>
          </div>
        ) : (
          /* FORM STATE */
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join the Team</h1>
            <p className="text-gray-500 mb-8">Set a password to activate your account.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              {/* Validation or API Error Message */}
              {(validationError || acceptInviteMutation.isError) && (
                <div className="p-3 bg-red-50 text-red-500 text-sm rounded-lg flex items-center">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i> 
                  {validationError || "Failed to activate account. The link may be expired."}
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={acceptInviteMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {acceptInviteMutation.isPending ? (
                    <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i> Activating...
                    </>
                ) : (
                    <>
                        <i className="fa-solid fa-lock"></i> Activate Account
                    </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}