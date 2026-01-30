"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth, api } from '../../providers/GlobalProvider';
import AuthLayout from '../components/AuthLayout';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterFormSchema, RegisterFormData } from "./../Schema/register.schema";
import { PasswordStrength } from '../components/PasswordStrength';
import { AxiosError } from 'axios';
import { handleApiError } from '@/lib/errorHandler';

const RegisterPage = () => {
  const { login } = useAuth();
  const searchParams = useSearchParams();

  // --- UI State ---
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // --- OTP State ---
  const [otpInput, setOtpInput] = useState('');
  const [resendTimer, setResendTimer] = useState(30);

  // --- Status Messages ---
  const [serverError, setServerError] = useState(''); 
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Initialize Hook Form
  const { 
    register, 
    handleSubmit, 
    getValues, 
    watch, // <--- Added watch
    formState: { errors } 
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  // 2. Watch password for real-time validation
  const passwordValue = watch("password");

  // --- Timer Logic ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'google_failed') {
      setServerError('Google signup failed. Please try again.');
    }
  }, [searchParams]);

  // --- HANDLERS ---
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setServerError('');
      const { data } = await api.get('/auth/google/url', { withCredentials: true });
      window.location.href = data.url;
    } catch (err: unknown) {
     handleApiError(err, "Failed to initialize Google Signup.");
      setLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setServerError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await api.post('/auth/register', { 
        name: data.name, 
        email: data.email, 
        password: data.password 
      });
      setResendTimer(30); 
      setStep('otp');
    } catch (err: unknown) {
      handleApiError(err, "Registration failed. Please try again.");

    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpInput.length < 6) {
        setServerError('Please enter a valid 6-digit OTP.');
        return;
    }
    setServerError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/verify-otp', { 
        email: getValues("email"), 
        otp: otpInput 
      });
      login(data); 
    } catch (err: unknown) {
     handleApiError(err, "OTP verification failed. Please try again.");
      setLoading(false); 
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    setServerError('');
    setSuccessMessage('');

    try {
      const { data } = await api.post('/auth/resend-otp', { email: getValues("email") });
      setResendTimer(30); 
      setSuccessMessage(data.message || 'OTP resent successfully.');
    } catch (err: unknown) {
      handleApiError(err, "Failed to resend OTP.");
    } finally {
      setLoading(false);
    }
  };

  const LoadingSpinner = () => (
    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
  );

  return (
    <AuthLayout>
        <div className="w-full max-w-md mx-auto">
            
            {/* --- STEP 1: REGISTRATION FORM --- */}
            {step === 'details' && (
                <div className="fade-in">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
                    <p className="text-gray-500 mb-6">Start tracking your profits today.</p>

                    {serverError && (
                        <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-lg flex items-center animate-pulse">
                            <i className="fa-solid fa-circle-exclamation mr-2"></i> {serverError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onRegisterSubmit)} className="space-y-4" noValidate>
                        {/* NAME */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">Full Name</label>
                            <input 
                                {...register("name")}
                                type="text" 
                                id="name" 
                                placeholder="Ex. Rahul Sharma" 
                                className={`w-full border rounded-lg px-4 py-2.5 outline-none transition text-gray-900 
                                  ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}
                                `}
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                        </div>

                        {/* EMAIL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email address</label>
                            <input 
                                {...register("email")}
                                type="email" 
                                id="email" 
                                placeholder="rahul@labely.in" 
                                className={`w-full border rounded-lg px-4 py-2.5 outline-none transition text-gray-900 
                                  ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}
                                `}
                            />
                             {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                        </div>

                        {/* PASSWORD */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="signup-pass">Create Password</label>
                            <div className="relative">
                                <input 
                                    {...register("password")}
                                    type={showPassword ? "text" : "password"} 
                                    id="signup-pass" 
                                    className={`w-full border rounded-lg px-4 py-2.5 outline-none transition text-gray-900 
                                      ${errors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}
                                    `}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            
                            {/* NEW: Password Strength Meter */}
                            <PasswordStrength password={passwordValue} />

                            {/* Standard Zod Error (optional if using meter, but good for submit feedback) */}
                            {errors.password && <p className="text-xs text-red-500 mt-2">{errors.password.message}</p>}
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirm-pass">Confirm Password</label>
                            <div className="relative">
                                <input 
                                    {...register("confirmPassword")}
                                    type={showConfirmPassword ? "text" : "password"} 
                                    id="confirm-pass" 
                                    className={`w-full border rounded-lg px-4 py-2.5 outline-none transition text-gray-900 
                                      ${errors.confirmPassword ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500'}
                                    `}
                                />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <LoadingSpinner /> : 'Sign Up & Send OTP'}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or register with</span></div>
                    </div>
                    
                    <button 
                        type="button" 
                        onClick={handleGoogleLogin} 
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 cursor-pointer bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition duration-200 hover:shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                        Sign Up with Google
                    </button>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        Already have an account? <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">Log in</Link>
                    </div>
                </div>
            )}

            {/* --- STEP 2: OTP VERIFICATION --- */}
            {step === 'otp' && (
                <div className="fade-in">
                    <button 
                        onClick={() => { setStep('details'); setServerError(''); setSuccessMessage(''); }} 
                        className="text-sm cursor-pointer text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1"
                    >
                        <i className="fa-solid fa-arrow-left cursor-pointer"></i> Back
                    </button>
                    
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify OTP</h1>
                    <p className="text-gray-500 mb-8">
                        We sent a code to <span className="font-medium text-gray-800">{getValues("email")}</span>
                    </p>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Enter 6-digit Code</label>
                            
                            <input 
                                type="text" 
                                maxLength={6} 
                                value={otpInput}
                                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="• • • • • •" 
                                className={`w-full text-center text-2xl tracking-[0.5em] font-bold border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition text-gray-900 ${serverError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                            />
                            
                            {serverError && (
                                <p className="text-red-500 text-sm mt-2 flex items-center justify-center animate-pulse">
                                    <i className="fa-solid fa-circle-exclamation mr-1"></i> {serverError}
                                </p>
                            )}

                            {successMessage && !serverError && (
                                <p className="text-green-600 text-sm mt-2 flex items-center justify-center animate-bounce">
                                    <i className="fa-solid fa-circle-check mr-1"></i> {successMessage}
                                </p>
                            )}
                        </div>

                        <button 
                            onClick={handleVerifyOtp} 
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading && otpInput.length >= 6 ? (
                                <>
                                    <LoadingSpinner /> Verifying...
                                </>
                            ) : 'Verify & Create Account'}
                        </button>
                        
                        <p className="text-center text-sm text-gray-500">
                            Didn&apos;t receive code?{' '}
                            <button 
                                type="button" 
                                onClick={handleResendOtp}
                                disabled={resendTimer > 0 || loading}
                                className={`font-medium transition ${
                                    resendTimer > 0 
                                        ? 'text-gray-400 cursor-not-allowed' 
                                        : 'text-blue-600 hover:underline cursor-pointer'
                                }`}
                            >
                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                            </button>
                        </p>
                    </div>
                </div>
            )}
        </div>
    </AuthLayout>
  );
};

export default RegisterPage;
