'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ArrowRight } from 'lucide-react';

export default function VerifyPending() {
  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-100 min-h-screen px-4">
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-900 p-8 rounded-3xl backdrop-blur-md shadow-2xl relative overflow-hidden text-center">
        
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 mb-4">
            <Mail className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Verify Your Email</h2>
          <p className="text-sm text-slate-400 mt-2">
            A verification link has been sent to your registered email address.
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 mb-6 text-sm text-slate-300 leading-relaxed text-left space-y-3">
          <p>
            📬 <strong>Next Steps:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-400">
            <li>Check your inbox (and spam/promotions folder) for the verification email.</li>
            <li>Click the link in the email to activate your account.</li>
            <li>Once verified, you will be redirected to the login screen to sign in.</li>
          </ul>
        </div>

        {/* Back to Login Button */}
        <Link
          href="/login"
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center group"
        >
          Go to Sign In
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
