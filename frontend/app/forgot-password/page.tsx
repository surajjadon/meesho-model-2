"use client";

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../providers/GlobalProvider';
import AuthLayout from '../components/AuthLayout';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ResetPasswordFormSchema, ResetPasswordFormData } from "./../Schema/forgotpassword.schema";
import { PasswordStrength } from '../components/PasswordStrength'; 
import { handleApiError } from '@/lib/errorHandler';
// 1. Import React Query
import { useMutation } from '@tanstack/react-query';

const ForgotPasswordPage = () => {
  const router = useRouter();

  // --- State Management ---
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  
  // Step 2 Data
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Local Error State (Optional: You can also use mutation.error)
  const [serverError, setServerError] = useState('');

  // --- FORM 1: Request OTP (Zod Integrated) ---
  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    getValues, 
    formState: { errors: requestErrors }
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(ResetPasswordFormSchema),
    defaultValues: { email: '' }
  });

  // --- MUTATION 1: Request OTP ---
  const requestOtpMutation = useMutation({
    mutationFn: async (data: ResetPasswordFormData) => {
        return api.post('/auth/forgot-password', { email: data.email });
    },
    onSuccess: () => {
        setServerError('');
        setStep('reset');
    },
    onError: (err: any) => {
        const msg = err.response?.data?.message || 'Failed to send OTP. Please check email.';
        setServerError(msg);
        handleApiError(err, "Failed to send OTP.");
    }
  });

  // --- MUTATION 2: Reset Password ---
  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: any) => {
        return api.post('/auth/reset-password', payload);
    },
    onSuccess: () => {
        setServerError('');
        setStep('success');
    },
    onError: (err: any) => {
        handleApiError(err, "Failed to reset password.");
        setServerError("Failed to reset password. Invalid OTP or expired session.");
    }
  });

  // --- Handlers ---

  const onRequestSubmit = (data: ResetPasswordFormData) => {
    requestOtpMutation.mutate(data);
  };

  const handleResetPassword = (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    // Frontend Validation
    if (otp.length < 6) {
        setServerError("Please enter a valid 6-digit OTP");
        return;
    }
    if (newPassword.length < 8) {
        setServerError("Password must be at least 8 characters");
        return;
    }
    if (newPassword !== confirmPassword) {
        setServerError("Passwords do not match");
        return;
    }

    // Trigger Mutation
    resetPasswordMutation.mutate({ 
        email: getValues('email'), 
        otp, 
        newPassword 
    });
  };

  const LoadingSpinner = () => (
    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
  );

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto fade-in">
        
        {/* --- Back Button --- */}
        {step === 'request' && (
            <Link href="/login" className="text-sm text-gray-500 cursor-pointer hover:text-gray-900 mb-6 flex items-center gap-1 w-fit transition-colors">
            <i className="fa-solid fa-arrow-left"></i> Back to Login
            </Link>
        )}

        {/* --- VIEW 1: Request OTP --- */}
        {step === 'request' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-500 mb-8">Enter your email and we&apos;ll send you a code.</p>

            <form onSubmit={handleSubmitRequest(onRequestSubmit)} className="space-y-5" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">Email address</label>
                <input 
                  {...registerRequest("email")}
                  type="email" 
                  id="email" 
                  placeholder="rahul@labely.in" 
                  className={`w-full border rounded-lg px-4 py-2.5 outline-none transition text-gray-900 
                    ${requestErrors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}
                  `}
                />
                {requestErrors.email && (
                  <p className="mt-1 text-xs text-red-500">{requestErrors.email.message}</p>
                )}
              </div>

              {serverError && (
                <div className="p-3 bg-red-50 text-red-500 text-sm rounded-lg flex items-center animate-pulse">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i> {serverError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={requestOtpMutation.isPending}
                className="w-full flex justify-center items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {requestOtpMutation.isPending ? <LoadingSpinner /> : 'Send OTP Code'}
              </button>
            </form>
          </>
        )}

        {/* --- VIEW 2: Verify OTP & New Password --- */}
        {step === 'reset' && (
          <div className="fade-in">
             <button 
                onClick={() => setStep('request')} 
                className="text-sm text-gray-500 hover:text-gray-900 cursor-pointer mb-6 flex items-center gap-1"
             >
                <i className="fa-solid fa-arrow-left"></i> Change Email
             </button>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Set New Password</h1>
            <p className="text-gray-500 mb-6">OTP sent to <span className="font-semibold text-gray-800">{getValues('email')}</span></p>

            <form onSubmit={handleResetPassword} className="space-y-5">
              
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter 6-digit Code</label>
                <input 
                    type="text" 
                    maxLength={6} 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="• • • • • •" 
                    className="w-full text-center text-xl tracking-[0.5em] font-bold border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900"
                />
              </div>

              {/* New Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required 
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900"
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)} 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                </div>
                
                <PasswordStrength password={newPassword} />
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                    className={`w-full border rounded-lg px-4 py-2.5 outline-none transition text-gray-900 ${
                        confirmPassword && newPassword !== confirmPassword 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                    }`}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {serverError && (
                <div className="p-3 bg-red-50 text-red-500 text-sm rounded-lg flex items-center animate-pulse">
                  <i className="fa-solid fa-circle-exclamation mr-2"></i> {serverError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={resetPasswordMutation.isPending}
                className="w-full flex justify-center items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {resetPasswordMutation.isPending ? <LoadingSpinner /> : 'Reset Password'}
              </button>
            </form>
          </div>
        )}

        {/* --- VIEW 3: Success Message --- */}
        {step === 'success' && (
          <div className="text-center py-8 fade-in">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <i className="fa-solid fa-check text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Password Reset!</h3>
            <p className="text-gray-500 mb-6">
              Your password has been successfully updated. You can now log in with your new credentials.
            </p>
            <Link 
              href="/login"
              className="inline-block w-full bg-blue-600 cursor-pointer hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200"
            >
              Back to Login
            </Link>
          </div>
        )}

      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;