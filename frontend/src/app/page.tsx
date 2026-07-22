'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Leaf,
  Sparkles,
  TrendingUp,
  Recycle,
  Truck,
  Lock,
  FileCheck,
} from 'lucide-react';

const CATEGORIES = [
  { id: '1', name: 'Organic Biomass',    url: 'https://images.pexels.com/photos/20756428/pexels-photo-20756428.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { id: '2', name: 'Paper / Cardboard',  url: 'https://images.unsplash.com/photo-1528323273322-d81458248d40?w=600&auto=format&fit=crop' },
  { id: '3', name: 'Wood / Timber',      url: 'https://images.unsplash.com/photo-1546484475-7f7bd55792da?w=600&auto=format&fit=crop' },
  { id: '4', name: 'Compost / Nutrients', url: 'https://images.pexels.com/photos/5503338/pexels-photo-5503338.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { id: '5', name: 'Inert / C&D',        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop' },
  { id: '6', name: 'Textiles / Fibrous', url: 'https://images.pexels.com/photos/9784001/pexels-photo-9784001.jpeg?auto=compress&cs=tinysrgb&w=600' },
];

export default function MarketplaceLandingPage() {
  const [impact] = useState({ co2e_kg: 14250, dollars_saved: 9800, waste_tons: 18, matches: 6 });

  return (
    <div className="bg-[#F4F3F0] text-[#0A0F0D] min-h-screen">
      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav className="bg-[#F4F3F0] border-b border-[#E2DFD7] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1B4332] flex items-center justify-center">
              <Leaf className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg text-[#0A0F0D] tracking-tight font-display">
              EcoMatch
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-[#4A524D] hover:text-[#0A0F0D] transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="eco-btn-primary text-xs py-2 px-4">
              Sign up as business
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION (2 COLUMNS) ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column Text */}
          <div className="lg:col-span-7 space-y-6">
            <p className="tracking-overline">
              B2B CIRCULAR ECONOMY MARKETPLACE
            </p>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium text-[#0A0F0D] leading-[1.1] tracking-tight font-display">
              Turn your disposal costs into{' '}
              <span className="text-[#1B4332]">local revenue.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#4A524D] max-w-xl leading-relaxed">
              EcoMatch&apos;s Scout, Alchemist &amp; Negotiator agents match your surplus materials with nearby businesses that pay to reuse them — dedicated haulage, verified impact, zero contact leaks.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link href="/signup" className="eco-btn-primary py-3.5 px-6 text-sm text-center">
                Sign up as business
                <ArrowRight className="w-4 h-4 ml-1 inline" />
              </Link>
              <a href="#how-it-works" className="eco-btn-outline py-3.5 px-6 text-sm text-center">
                How it works
              </a>
            </div>
          </div>

          {/* Right Column Image & Floating Impact Badge */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            <div className="eco-card overflow-hidden rounded-2xl shadow-sm border border-[#E2DFD7]">
              <img
                src="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&auto=format&fit=crop"
                alt="Industrial recycling operation"
                className="w-full h-[260px] sm:h-[360px] lg:h-[420px] object-cover"
              />
            </div>

            {/* Floating Stats Badge */}
            <div className="mt-4 lg:mt-0 lg:absolute lg:-bottom-6 lg:-left-6 eco-card p-4 shadow-md border border-[#E2DFD7] max-w-xs w-full">
              <span className="tracking-overline text-[10px] block mb-1">
                VERIFIED IMPACT TO DATE
              </span>
              <p className="text-2xl font-extrabold text-[#0A0F0D] font-display">
                {impact.co2e_kg > 0 ? `${impact.co2e_kg.toLocaleString()} kg` : '0 kg'}
              </p>
              <p className="text-xs text-[#8E9792] mt-0.5">
                CO₂e avoided across {impact.matches} verified deals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── IMPACT STATS BAR ───────────────────────────────────── */}
      <section className="bg-[#EBE9E4] border-y border-[#E2DFD7] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
            <div>
              <span className="tracking-overline text-[10px] block mb-1">CO₂E AVOIDED</span>
              <p className="text-2xl font-bold text-[#0A0F0D] font-display">
                {impact.co2e_kg > 0 ? `${impact.co2e_kg.toLocaleString()} kg` : '0 kg'}
              </p>
            </div>
            <div>
              <span className="tracking-overline text-[10px] block mb-1">DISPOSAL COSTS SAVED</span>
              <p className="text-2xl font-bold text-[#0A0F0D] font-display">
                ${impact.dollars_saved.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="tracking-overline text-[10px] block mb-1">WASTE DIVERTED</span>
              <p className="text-2xl font-bold text-[#0A0F0D] font-display">
                {impact.waste_tons} t
              </p>
            </div>
            <div>
              <span className="tracking-overline text-[10px] block mb-1">VERIFIED DEALS</span>
              <p className="text-2xl font-bold text-[#0A0F0D] font-display">
                {impact.matches}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS SECTION ───────────────────────────────── */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="space-y-3 mb-12">
          <p className="tracking-overline">HOW IT WORKS</p>
          <h2 className="text-3xl sm:text-4xl font-medium text-[#0A0F0D] font-display max-w-lg">
            Three steps from surplus to signed certificate.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="eco-card p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#EBF5EF] text-[#1B4332] flex items-center justify-center">
                <Recycle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#8E9792] font-display">01</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0A0F0D] mb-1.5 font-display">
                List your surplus
              </h3>
              <p className="text-xs text-[#4A524D] leading-relaxed">
                Describe the material, quantity, and current disposal cost. Scout agent classifies composition and checks safety.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="eco-card p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#EBF5EF] text-[#1B4332] flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#8E9792] font-display">02</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0A0F0D] mb-1.5 font-display">
                AI matches &amp; drafts
              </h3>
              <p className="text-xs text-[#4A524D] leading-relaxed">
                Alchemist finds nearby consumers. Negotiator drafts tailored, non-binding proposal for both dashboards.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="eco-card p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#EBF5EF] text-[#1B4332] flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#8E9792] font-display">03</span>
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0A0F0D] mb-1.5 font-display">
                Local pickup &amp; impact
              </h3>
              <p className="text-xs text-[#4A524D] leading-relaxed">
                Assigned haulers handle logistics. Dual pickup verification triggers audited CO₂e certificate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SUPPORTED CATEGORIES SECTION ──────────────────────── */}
      <section className="bg-[#EBE9E4] py-20 border-t border-[#E2DFD7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-3 mb-12">
            <p className="tracking-overline">SUPPORTED CATEGORIES</p>
            <h2 className="text-3xl sm:text-4xl font-medium text-[#0A0F0D] font-display">
              Six non-hazardous streams. Zero regulated waste.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="category-card-replica">
                <img src={cat.url} alt={cat.name} loading="lazy" />
                <div className="category-card-replica-footer">
                  <span className="tracking-overline text-[10px] block mb-1">
                    CATEGORY {cat.id}
                  </span>
                  <h3 className="font-bold text-base text-[#0A0F0D] font-display">
                    {cat.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SAFETY & PRIVACY SECTION ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="space-y-3 mb-12">
          <p className="tracking-overline">SAFETY &amp; PRIVACY</p>
          <h2 className="text-3xl sm:text-4xl font-medium text-[#0A0F0D] font-display">
            Engineered for compliance.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#EBF5EF] text-[#1B4332] flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#0A0F0D] font-display">Zero hazardous waste</h3>
            <p className="text-xs text-[#4A524D] leading-relaxed">
              Scout agent runs a deterministic hazard check. Regulated chemical waste is automatically rejected.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#EBF5EF] text-[#1B4332] flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#0A0F0D] font-display">No contact leak</h3>
            <p className="text-xs text-[#4A524D] leading-relaxed">
              Phone numbers, email addresses, and locations are strictly locked until both parties explicitly accept proposal terms.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#EBF5EF] text-[#1B4332] flex items-center justify-center mb-3">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-[#0A0F0D] font-display">Auditable certificates</h3>
            <p className="text-xs text-[#4A524D] leading-relaxed">
              Calculated using EPA WARM methodologies with cited emission factors for ESG and corporate reporting.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-[#EBE9E4] border-t border-[#E2DFD7] py-8 text-xs text-[#4A524D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#1B4332] flex items-center justify-center text-white">
              <Leaf className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-[#0A0F0D] font-display">EcoMatch</span>
            <span>&copy; {new Date().getFullYear()} EcoMatch</span>
          </div>

          <div className="flex items-center gap-6 text-[#4A524D] font-medium">
            <Link href="/login" className="hover:text-[#0A0F0D]">Login</Link>
            <Link href="/signup" className="hover:text-[#0A0F0D]">Sign up</Link>
            <Link href="/admin" className="hover:text-[#0A0F0D]">Admin portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
