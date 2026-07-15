'use client';

import Link from 'next/link';
import { ArrowRight, Recycle, Shield, TrendingUp, Handshake } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { token, user } = useAuth();

  return (
    <div className="flex-1 flex flex-col justify-between bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <Recycle className="h-6 w-6 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              EcoMatch
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {token ? (
              <Link
                href={user?.role === 'admin' ? '/admin' : '/dashboard'}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 h-10 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 h-10 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
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
          <div className="inline-flex items-center space-x-2 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10 text-xs font-semibold text-emerald-400">
            <span>Now Live: Phase 1b local integration</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Turn your waste liability into a{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              revenue stream
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed">
            EcoMatch matches your business's non-hazardous surplus material with nearby businesses that can reuse it. We classify the surplus, draft the proposals, and coordinate haulers. No disclosure of contact info, fully managed.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-8 h-12 inline-flex items-center justify-center rounded-lg text-base font-semibold transition-all shadow-xl shadow-emerald-500/20 border border-emerald-400/20 group"
            >
              Start Free Matching
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-8 h-12 inline-flex items-center justify-center rounded-lg text-base font-semibold transition-all"
            >
              Sign in as Registered Business
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl backdrop-blur-sm hover:border-slate-800 transition-colors">
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 w-fit mb-4">
              <Shield className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Non-Hazardous Shield</h3>
            <p className="text-sm text-slate-400">
              Scout Agent deterministically flags and blocks any hazardous materials. Your operations remain safe, clean, and compliant.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl backdrop-blur-sm hover:border-slate-800 transition-colors">
            <div className="bg-teal-500/10 p-3 rounded-xl border border-teal-500/20 w-fit mb-4">
              <TrendingUp className="h-6 w-6 text-teal-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Value Estimator</h3>
            <p className="text-sm text-slate-400">
              Alchemist Agent finds compatible companies nearby and estimates disposal savings for generators and purchase discounts for users.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl backdrop-blur-sm hover:border-slate-800 transition-colors">
            <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 w-fit mb-4">
              <Handshake className="h-6 w-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">In-Platform Proposals</h3>
            <p className="text-sm text-slate-400">
              Negotiator Agent drafts balanced, non-pressuring agreements. Control everything inside the platform; no spam, no brokers.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} EcoMatch. Built with advanced agentic workflows. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
