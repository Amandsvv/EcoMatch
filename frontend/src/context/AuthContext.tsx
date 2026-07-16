'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  role: 'business' | 'admin';
  businessId?: string;
  businessName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (signupData: any) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load auth data from localStorage
    const savedToken = localStorage.getItem('ecomatch_token');
    const savedUser = localStorage.getItem('ecomatch_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login', '/signup', '/'];
    const isPublicPath = publicPaths.includes(pathname);

    if (!token && !isPublicPath) {
      router.push('/login');
    } else if (token && isPublicPath) {
      if (user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [token, pathname, loading, user, router]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login({ email, password });
      
      const userObj: User = {
        id: response.userId,
        email: response.email,
        role: response.role,
        businessId: response.businessId,
        businessName: response.businessName,
      };

      localStorage.setItem('ecomatch_token', response.token);
      localStorage.setItem('ecomatch_user', JSON.stringify(userObj));
      
      setToken(response.token);
      setUser(userObj);

      if (userObj.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      throw err;
    }
  };

  const signup = async (signupData: any) => {
    try {
      await api.signup(signupData);
      router.push('/verify-pending');
    } catch (err) {
      throw err;
    }
  };


  const logout = () => {
    localStorage.removeItem('ecomatch_token');
    localStorage.removeItem('ecomatch_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const deleteAccount = async () => {
    try {
      await api.deleteAccount();
      logout();
    } catch (err) {
      throw err;
    }
  };

  const updateUser = (updatedUser: Partial<User>) => {
    if (!user) return;
    const newContext = { ...user, ...updatedUser };
    setUser(newContext);
    localStorage.setItem('ecomatch_user', JSON.stringify(newContext));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        logout,
        deleteAccount,
        updateUser,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
