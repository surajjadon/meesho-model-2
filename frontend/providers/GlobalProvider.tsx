"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, FC } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// ====================================================================
// 1. AUTHENTICATION CONTEXT
// ====================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface User {
  _id: string;
  name: string;
  email: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ====================================================================
// 2. BUSINESS CONTEXT
// ====================================================================

interface Business {
  _id: string;
  gstin: string;
  accountName: string;
  brandName: string;
}

interface BusinessContextType {
  businesses: Business[];
  selectedBusiness: Business | null;
  selectBusiness: (gstin: string) => void;
  loading: boolean;
  refetch: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within a BusinessProvider');
  return context;
};

// ====================================================================
// 3. COMBINED GLOBAL PROVIDER (THE SOLUTION)
// ====================================================================

// Pre-configured axios instance that automatically uses the base URL
export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

// This is the component you will use in your layout.tsx
export const GlobalProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // --- Business State ---
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);

  // --- Auth Logic ---
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser: User = JSON.parse(storedUser);
      setUser(parsedUser);
      // FIX: Set the default authorization header for the 'api' instance
      api.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
    }
    setAuthLoading(false);
  }, []);

  const login = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('selectedGstin'); // Also clear selected business
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    // Clear business state on logout
    setBusinesses([]);
    setSelectedBusiness(null);
    router.push('/login');
  };
  
  // --- Business Logic with Auth Dependency ---
  const fetchBusinesses = async () => {
    setBusinessLoading(true);
    try {
      // FIX: Use the pre-configured 'api' instance which already has the token
      const res = await api.get('/profiles');
      const data = res.data as Business[];
      setBusinesses(data);

      if (data.length > 0) {
        const lastSelected = localStorage.getItem('selectedGstin');
        const businessToSelect = data.find(b => b.gstin === lastSelected) || data[0];
        setSelectedBusiness(businessToSelect);
        // Ensure the selected GSTIN is stored for future sessions
        if(businessToSelect) localStorage.setItem('selectedGstin', businessToSelect.gstin);
      } else {
        setSelectedBusiness(null);
      }
    } catch (error) {
      console.error('❌ Failed to fetch businesses:', error);
      setBusinesses([]); // Clear businesses on error
    } finally {
      setBusinessLoading(false);
    }
  };

  // FIX: This useEffect now correctly handles the dependency.
  // It runs when the component mounts AND anytime the `user` object changes.
  useEffect(() => {
    if (user) {
      // If user logs in, fetch their businesses.
      fetchBusinesses();
    } else {
      // If user logs out (or is not logged in), clear the business state.
      setBusinesses([]);
      setSelectedBusiness(null);
      setBusinessLoading(false);
    }
  }, [user]); // Dependency array

  const selectBusiness = (gstin: string) => {
    const business = businesses.find(b => b.gstin === gstin);
    if (business) {
      setSelectedBusiness(business);
      localStorage.setItem('selectedGstin', gstin);
    }
  };

  // --- Rendering the Nested Providers ---
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading: authLoading, login, logout }}>
      <BusinessContext.Provider value={{ businesses, selectedBusiness, selectBusiness, loading: businessLoading, refetch: fetchBusinesses }}>
        {/* Only render children when auth state is confirmed to prevent flashes */}
        {!authLoading && children}
      </BusinessContext.Provider>
    </AuthContext.Provider>
  );
};