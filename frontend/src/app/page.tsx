'use client';

import Link from 'next/link';
import { ArrowRight, Recycle, Shield, TrendingUp, Handshake } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { token, user } = useAuth();

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#F9FAFB] text-[#111827] min-h-screen">
      {/* Header */}
      <header className="border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-[#EFF6FF] p-2 rounded-lg border border-[#BFDBFE]">
              <Recycle className="h-6 w-6 text-[#0F6FE8]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>
              EcoMatch
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {token ? (
              <Link
                href={user?.role === 'admin' ? '/admin' : '/dashboard'}
                className="bg-[#0F6FE8] hover:bg-[#0A52B0] text-white px-4 h-10 inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all shadow-sm"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[#4B5563] hover:text-[#111827] text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-[#0F6FE8] hover:bg-[#0A52B0] text-white px-4 h-10 inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 bg-[#EFF6FF] px-3 py-1.5 rounded-full border border-[#BFDBFE] text-xs font-semibold text-[#1D4ED8]">
            <span>Now Live: Phase 1b local integration</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F6FE8] animate-ping"></span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#111827] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
            Turn your waste liability into a{' '}
            <span className="text-[#0F6FE8]">
              revenue stream
            </span>
          </h1>

          <p className="text-lg text-[#4B5563] leading-relaxed">
            EcoMatch matches your business&apos;s non-hazardous surplus material with nearby businesses that can reuse it. We classify the surplus, draft the proposals, and coordinate haulers. No disclosure of contact info, fully managed.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-[#0F6FE8] hover:bg-[#0A52B0] text-white px-8 h-12 inline-flex items-center justify-center rounded-xl text-base font-semibold transition-all shadow-md hover:shadow-lg group"
            >
              Start Free Matching
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] hover:text-[#111827] px-8 h-12 inline-flex items-center justify-center rounded-xl text-base font-semibold transition-all shadow-sm"
            >
              Sign in as Registered Business
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          <div className="glass-card p-6 rounded-2xl">
            <div className="bg-[#EFF6FF] p-3 rounded-xl border border-[#BFDBFE] w-fit mb-4">
              <Shield className="h-6 w-6 text-[#0F6FE8]" />
            </div>
            <h3 className="text-lg font-bold text-[#111827] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Non-Hazardous Shield</h3>
            <p className="text-sm text-[#4B5563]">
              Scout Agent deterministically flags and blocks any hazardous materials. Your operations remain safe, clean, and compliant.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="bg-[#F0FDF4] p-3 rounded-xl border border-[#BBF7D0] w-fit mb-4">
              <TrendingUp className="h-6 w-6 text-[#16A34A]" />
            </div>
            <h3 className="text-lg font-bold text-[#111827] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Value Estimator</h3>
            <p className="text-sm text-[#4B5563]">
              Alchemist Agent finds compatible companies nearby and estimates disposal savings for generators and purchase discounts for users.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="bg-[#EEF2FF] p-3 rounded-xl border border-[#C7D2FE] w-fit mb-4">
              <Handshake className="h-6 w-6 text-[#4338CA]" />
            </div>
            <h3 className="text-lg font-bold text-[#111827] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>In-Platform Proposals</h3>
            <p className="text-sm text-[#4B5563]">
              Negotiator Agent drafts balanced, non-pressuring agreements. Control everything inside the platform; no spam, no brokers.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-[#6B7280]">
          <p>© {new Date().getFullYear()} EcoMatch. Built with advanced agentic workflows. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
