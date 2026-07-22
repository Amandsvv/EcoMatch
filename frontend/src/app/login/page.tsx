'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LoginSchema } from '@/lib/validation';
import { Leaf, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function UserLoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your input');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F4F3F0] text-[#0A0F0D] min-h-screen flex flex-col justify-center items-center py-16 px-4">
      <div className="w-full max-w-md space-y-8">

        {/* Top Logo */}
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#1B4332] flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-[#0A0F0D] font-display">EcoMatch</span>
          </Link>
        </div>

        {/* Header */}
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-medium text-[#0A0F0D] font-display">
            Welcome back
          </h1>
          <p className="text-sm text-[#4A524D]">
            Sign in to access your business marketplace account.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3 text-[#991B1B] text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="eco-card p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
                Business email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="eco-input"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="eco-input"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="eco-btn-primary w-full py-3.5 text-sm font-semibold"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 anim-spin mr-2" /> Signing in...</>
              ) : (
                'Sign in to dashboard'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#4A524D]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#1B4332] font-semibold underline">
            Register as business
          </Link>
        </p>
      </div>
    </div>
  );
}
