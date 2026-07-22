'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ArrowRight } from 'lucide-react';

export default function EmailVerificationPendingPage() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center min-h-screen px-4" style={{ background: 'var(--eco-bg)' }}>
      <div className="w-full max-w-md eco-card p-8 text-center">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-md flex items-center justify-center mb-4" style={{ background: 'var(--eco-primary)' }}>
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tighter" style={{ color: 'var(--eco-text)' }}>Verify Your Email</h2>
          <p className="text-sm mt-2" style={{ color: 'var(--eco-text-2)' }}>
            A verification link has been sent to your registered email address.
          </p>
        </div>

        <div className="rounded-md p-5 mb-6 text-sm leading-relaxed text-left space-y-3" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)', color: 'var(--eco-text-2)' }}>
          <p>📬 <strong>Next Steps:</strong></p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Check your inbox (and spam/promotions folder) for the verification email.</li>
            <li>Click the link in the email to activate your account.</li>
            <li>Once verified, you will be redirected to the login screen to sign in.</li>
          </ul>
        </div>

        {/* Back to Login Button */}
        <Link
          href="/login"
          className="eco-btn-primary w-full py-3 text-sm"
        >
          Go to Sign In
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
