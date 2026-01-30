"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation'; 
import { useAuth, api } from '../../providers/GlobalProvider';
import AuthLayout from '../components/AuthLayout';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginFormSchema, LoginFormData } from "./../Schema/login.schema"
import { handleApiError } from '@/lib/errorHandler';
// 1. Import React Query
import { useMutation } from '@tanstack/react-query';

const LoginPage = () => {
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState(''); 
  
  const { login } = useAuth();
  const searchParams = useSearchParams();

  // Initialize React Hook Form
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Handle errors from Google Callback (URL params)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'google_failed') {
      setServerError('Google login failed. Please try again.');
    }
  }, [searchParams]);

  // --- MUTATION 1: Standard Login ---
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
        // Return the response so we can access .data in onSuccess
        return api.post('/auth/login', { 
            email: data.email, 
            password: data.password 
        });
    },
    onSuccess: (response) => {
        login(response.data);
    },
    onError: (err: any) => {
        // Set local error state for display
        handleApiError(err, "Login failed.");
        setServerError(err.response?.data?.message || "Login failed. Please check your credentials.");
    }
  });

  // --- MUTATION 2: Google Login Init ---
  const googleLoginMutation = useMutation({
    mutationFn: async () => {
        const { data } = await api.get('/auth/google/url', {
             withCredentials: true 
        });
        return data;
    },
    onSuccess: (data) => {
        // Redirect user to Google
        window.location.href = data.url;
    },
    onError: (err: any) => {
        handleApiError(err, "Failed to initialize Google Login.");
        setServerError("Failed to connect to Google.");
    }
  });

  // --- Handlers ---
  
  const onSubmit = (data: LoginFormData) => {
    setServerError('');
    loginMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    setServerError('');
    googleLoginMutation.mutate();
  };

  // Unified loading state
  const isLoading = loginMutation.isPending || googleLoginMutation.isPending;

  return (
    <AuthLayout>
      <div className="w-full max-w-md mx-auto fade-in">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h1>
        <p className="text-gray-500 mb-8">Enter your email to manage your Meesho sales.</p>

        {/* Server-side Error Display */}
        {serverError && (
          <div className="mb-4 p-3 bg-red-50 text-red-500 text-sm rounded-lg flex items-center animate-pulse">
            <i className="fa-solid fa-circle-exclamation mr-2"></i> {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          
          {/* EMAIL FIELD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">Email address</label>
            <input 
              {...register("email")}
              type="email" 
              id="email" 
              placeholder="rahul@labely.in" 
              className={`w-full border rounded-lg px-4 py-2.5 outline-none transition text-gray-900
                ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}
              `}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* PASSWORD FIELD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">Password</label>
            <div className="relative">
              <input 
                {...register("password")}
                type={showPassword ? "text" : "password"} 
                id="password" 
                className={`w-full border rounded-lg px-4 py-2.5 outline-none transition text-gray-900
                  ${errors.password ? 'border-red-500 focus:ring-red-200' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}
                `}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* REMEMBER ME & FORGOT PASSWORD */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input type="checkbox" id="remember" className="h-4 w-4 text-blue-600 cursor-pointer border-gray-300 rounded focus:ring-blue-500"/>
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-500 cursor-pointer">Remember me</label>
            </div>
            
            <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500 cursor-pointer hover:underline">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition duration-200 shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                </div>
            ) : 'Log in to Dashboard'}
          </button>
        </form>


        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
        </div>
        
        <button 
          type="button" 
          onClick={handleGoogleLogin} 
          disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 cursor-pointer bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition duration-200 hover:shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {googleLoginMutation.isPending ? (
             <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          ) : (
            <>
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </>
          )}
        </button>

        <div className="mt-8 text-center text-sm text-gray-500">
          Don't have an account? <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer hover:underline">Create free account</Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;