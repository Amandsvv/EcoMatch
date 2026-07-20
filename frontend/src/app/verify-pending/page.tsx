'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ArrowRight } from 'lucide-react';

export default function VerifyPending() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-[#F9FAFB] min-h-screen px-4">
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] p-8 rounded-2xl shadow-md text-center">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#EFF6FF] p-3 rounded-2xl border border-[#BFDBFE] mb-4">
            <Mail className="h-10 w-10 text-[#0F6FE8]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Verify Your Email</h2>
          <p className="text-sm text-[#6B7280] mt-2">
            A verification link has been sent to your registered email address.
          </p>
        </div>

        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 mb-6 text-sm text-[#374151] leading-relaxed text-left space-y-3">
          <p>
            📬 <strong>Next Steps:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#4B5563]">
            <li>Check your inbox (and spam/promotions folder) for the verification email.</li>
            <li>Click the link in the email to activate your account.</li>
            <li>Once verified, you will be redirected to the login screen to sign in.</li>
          </ul>
        </div>

        {/* Back to Login Button */}
        <Link
          href="/login"
          className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center group"
        >
          Go to Sign In
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
