"use client";

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, api } from '@/providers/GlobalProvider';
import { handleApiError } from '@/lib/errorHandler';
// 1. Import Hook
import { useMutation } from '@tanstack/react-query';

export default function GoogleCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const hasRun = useRef(false); 

  // --- 2. Define the Mutation ---
  const googleLoginMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data } = await api.post('/auth/google/callback', { code }, {
         withCredentials: true 
      });
      return data;
    },
    onSuccess: (data) => {
      // Login successful -> Update Global State
      login(data);
      // Redirect to Dashboard
      router.push('/dashboard');
    },
    onError: (error) => {
      handleApiError(error, "Google authentication failed.");
      // Send error back to login page
      router.push('/login?error=google_failed');
    }
  });

  // --- 3. Trigger on Mount ---
  useEffect(() => {
    const code = searchParams.get('code');
    
    // Only run if we have a code and haven't run yet (Strict Mode Safety)
    if (code && !hasRun.current) {
      hasRun.current = true; 
      googleLoginMutation.mutate(code);
    }
  }, [searchParams, googleLoginMutation]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Loading Spinner */}
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        
        {/* Status Text */}
        <p className="text-gray-500 font-medium">
            {googleLoginMutation.isError ? "Authentication failed..." : "Verifying your Google account..."}
        </p>
      </div>
    </div>
  );
}