'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Recycle, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const verified = params.get('verified');
      const urlToken = params.get('token');
      const urlUser = params.get('user');

      if (verified === 'true') {
        if (urlToken && urlUser) {
          setSuccessMessage('Email verified successfully! Logging you in...');
          setTimeout(() => {
            localStorage.setItem('ecomatch_token', urlToken);
            localStorage.setItem('ecomatch_user', urlUser);
            window.location.href = '/dashboard';
          }, 1500);
        } else {
          setSuccessMessage('Email verified successfully! You can now log in.');
        }
      }
      
      const errorParam = params.get('error');
      if (errorParam) {
        setError(errorParam);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-[#F9FAFB] min-h-screen px-4">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] p-8 rounded-2xl shadow-md">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#EFF6FF] p-3 rounded-2xl border border-[#BFDBFE] mb-3">
            <Recycle className="h-8 w-8 text-[#0F6FE8]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Welcome Back</h2>
          <p className="text-sm text-[#6B7280] mt-1">Sign in to your EcoMatch account</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 flex items-start space-x-3 text-[#166534] text-sm">
            <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-start space-x-3 text-[#991B1B] text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-white border border-[#D1D5DB] focus:border-[#0F6FE8] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder-[#9CA3AF] transition-all outline-none"
              disabled={loading}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-[#374151] uppercase tracking-wider">
                Password
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border border-[#D1D5DB] focus:border-[#0F6FE8] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder-[#9CA3AF] transition-all outline-none"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Redirect */}
        <div className="mt-8 text-center text-sm text-[#6B7280] border-t border-[#E5E7EB] pt-6">
          New to EcoMatch?{' '}
          <Link href="/signup" className="text-[#0F6FE8] hover:text-[#0A52B0] font-semibold transition-colors">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
