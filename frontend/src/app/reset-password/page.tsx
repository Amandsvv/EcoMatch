'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ResetPasswordSchema } from '@/lib/validation';
import {
  Leaf,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError('Password reset token is missing. Please request a new link.');
      setVerifyingToken(false);
      return;
    }

    api.verifyResetToken(token)
      .then(() => {
        setTokenError(null);
      })
      .catch((err: any) => {
        setTokenError(err.message || 'This password reset link is invalid or has expired.');
      })
      .finally(() => {
        setVerifyingToken(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = ResetPasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your passwords');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.resetPassword({ token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (verifyingToken) {
    return (
      <div className="eco-card p-12 shadow-sm text-center space-y-4">
        <Loader2 className="w-8 h-8 anim-spin text-[#1B4332] mx-auto" />
        <p className="text-sm text-[#4A524D]">Verifying reset token...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="eco-card p-8 shadow-sm text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-[#FEF2F2] text-[#991B1B] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-medium text-[#0A0F0D] font-display">
            Invalid or expired link
          </h2>
          <p className="text-sm text-[#4A524D] leading-relaxed">
            {tokenError}
          </p>
        </div>
        <div className="pt-2 space-y-3">
          <Link
            href="/forgot-password"
            className="eco-btn-primary w-full py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            Request a new reset link
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#4A524D] hover:text-[#0A0F0D] font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="eco-card p-8 shadow-sm text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#1B4332] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-medium text-[#0A0F0D] font-display">
            Password reset complete!
          </h2>
          <p className="text-sm text-[#4A524D] leading-relaxed">
            Your password has been changed successfully. You can now use your new password to sign in.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="eco-btn-primary w-full py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            Sign in now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="eco-card p-8 shadow-sm">
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3 text-[#991B1B] text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="eco-input pr-10"
              required
              disabled={loading}
              minLength={8}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A928D] hover:text-[#0A0F0D]"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-[#8A928D] mt-1">
            Must be at least 8 characters long.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
            Confirm new password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              className="eco-input pr-10"
              required
              disabled={loading}
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A928D] hover:text-[#0A0F0D]"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="eco-btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 anim-spin" /> Updating password...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" /> Reset password
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#4A524D] hover:text-[#0A0F0D] font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
            Set new password
          </h1>
          <p className="text-sm text-[#4A524D]">
            Please enter your new password below.
          </p>
        </div>

        {/* Suspense wrapper for useSearchParams */}
        <Suspense
          fallback={
            <div className="eco-card p-12 shadow-sm text-center">
              <Loader2 className="w-8 h-8 anim-spin text-[#1B4332] mx-auto" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
