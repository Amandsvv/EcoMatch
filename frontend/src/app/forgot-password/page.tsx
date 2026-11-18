'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ForgotPasswordSchema } from '@/lib/validation';
import { Leaf, ArrowLeft, Loader2, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = ForgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please enter a valid email address');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset link. Please try again.');
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
            Forgot password?
          </h1>
          <p className="text-sm text-[#4A524D]">
            {submitted
              ? 'Check your inbox for password reset instructions.'
              : 'Enter your registered email and we’ll send you a link to reset your password.'}
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3 text-[#991B1B] text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Card */}
        <div className="eco-card p-8 shadow-sm">
          {submitted ? (
            <div className="text-center space-y-5">
              <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#1B4332] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[#0A0F0D]">Reset link sent</h3>
                <p className="text-sm text-[#4A524D] leading-relaxed">
                  If an account exists for <strong className="text-[#0A0F0D]">{email}</strong>, you will receive an email shortly with a secure link to reset your password.
                </p>
                <p className="text-xs text-[#8A928D] pt-1">
                  The link will expire in 1 hour. Be sure to check your spam or junk folder if you don't see it.
                </p>
              </div>

              <div className="pt-2 space-y-3">
                <Link
                  href="/login"
                  className="eco-btn-primary w-full py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to sign in
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="text-xs text-[#1B4332] font-semibold hover:underline block mx-auto"
                >
                  Send to a different email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
                  Business email address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="eco-input"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="eco-btn-primary w-full py-3.5 text-sm font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 anim-spin" /> Sending link...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" /> Send reset link
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
          )}
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
