"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, FC } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// ====================================================================
// 1. CONFIGURATION & TYPES
// ====================================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Pre-configured axios instance
export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

export interface User {
  _id: string;
  name: string;
  email: string;
  token: string;         // Access Token (Expires in 1 day)
  refreshToken: string;  // Refresh Token (Expires in 7 days)
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// ====================================================================
// 2. HOOKS
// ====================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusiness must be used within a BusinessProvider');
  return context;
};

// ====================================================================
// 3. GLOBAL PROVIDER COMPONENT
// ====================================================================

export const GlobalProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // --- Business State ---
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businessLoading, setBusinessLoading] = useState(true);

  // ------------------------------------------------------------------
  // A. INITIALIZATION & LOGIN/LOGOUT
  // ------------------------------------------------------------------

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        // Set default header immediately
        api.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
      } catch (error) {
        console.error("Error parsing user from local storage", error);
        localStorage.removeItem('user');
      }
    }
    setAuthLoading(false);
  }, []);

  const login = (userData: User) => {
    // Ensure both tokens are present before saving
    if (!userData.token || !userData.refreshToken) {
        console.warn("Login response missing tokens:", userData);
    }
    
    localStorage.setItem('user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('selectedGstin');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    
    // Clear business state
    setBusinesses([]);
    setSelectedBusiness(null);
    
    router.push('/login');
  };

  // ------------------------------------------------------------------
  // B. AXIOS INTERCEPTOR (THE REFRESH LOGIC)
  // ------------------------------------------------------------------
  
  useEffect(() => {
    // Response interceptor
    const interceptorId = api.interceptors.response.use(
      (response) => response, // If response is successful, just return it
      async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 (Unauthorized) and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true; // Mark as retried so we don't loop infinitely

          try {
            // 1. Get the current user data (needs the refresh token)
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                throw new Error("No user found to refresh");
            }
            const currentUser = JSON.parse(storedUser);

            // 2. Call the backend to get a new token
            // Note: We use axios directly to avoid using the intercepted 'api' instance here
            const { data } = await axios.post(`${API_URL}/api/auth/refresh-token`, {
              refreshToken: currentUser.refreshToken
            });

            // 3. Update the User object with new tokens
            const updatedUser = {
              ...currentUser,
              token: data.accessToken,
              refreshToken: data.refreshToken
            };

            // 4. Save to LocalStorage & State
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            // 5. Update defaults and the original request header
            api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;

            // 6. Retry the original request
            return api(originalRequest);

          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            logout(); // If refresh fails, force logout
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [router]); // Dependencies

  // ------------------------------------------------------------------
  // C. BUSINESS LOGIC
  // ------------------------------------------------------------------

  const fetchBusinesses = async () => {
    setBusinessLoading(true);
    try {
      const res = await api.get('/profiles');
      const data = res.data as Business[];
      setBusinesses(data);

      if (data.length > 0) {
        const lastSelected = localStorage.getItem('selectedGstin');
        const businessToSelect = data.find(b => b.gstin === lastSelected) || data[0];
        setSelectedBusiness(businessToSelect);
        if(businessToSelect) localStorage.setItem('selectedGstin', businessToSelect.gstin);
      } else {
        setSelectedBusiness(null);
      }
    } catch (error) {
      console.error('❌ Failed to fetch businesses:', error);
      setBusinesses([]);
    } finally {
      setBusinessLoading(false);
    }
  };

  const selectBusiness = (gstin: string) => {
    const business = businesses.find(b => b.gstin === gstin);
    if (business) {
      setSelectedBusiness(business);
      localStorage.setItem('selectedGstin', gstin);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBusinesses();
    } else {
      setBusinesses([]);
      setSelectedBusiness(null);
      setBusinessLoading(false);
    }
  }, [user]);

  // ------------------------------------------------------------------
  // D. RENDER
  // ------------------------------------------------------------------

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading: authLoading, login, logout }}>
      <BusinessContext.Provider value={{ businesses, selectedBusiness, selectBusiness, loading: businessLoading, refetch: fetchBusinesses }}>
        {!authLoading && children}
      </BusinessContext.Provider>
    </AuthContext.Provider>
  );
};