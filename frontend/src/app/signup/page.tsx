'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Recycle, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { SignupSchema } from '@/lib/validation';

export default function Signup() {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('restaurant');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      email,
      password,
      businessName,
      businessType,
      address,
      area,
      state,
      pincode,
      phone,
    };

    const validation = SignupSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please fill in all fields correctly');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await signup(payload);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check inputs.');
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-white border border-[#D1D5DB] focus:border-[#0F6FE8] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-1.5";

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-[#F9FAFB] min-h-screen py-12 px-4">
      <div className="w-full max-w-lg bg-white border border-[#E5E7EB] p-8 rounded-2xl shadow-md">

        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#EFF6FF] p-3 rounded-2xl border border-[#BFDBFE] mb-3">
            <Recycle className="h-8 w-8 text-[#0F6FE8]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Create Business Profile</h2>
          <p className="text-sm text-[#6B7280] mt-1">Get started with industrial symbiosis matching</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-start space-x-3 text-[#991B1B] text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className={inputCls}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Green Brewery Inc"
                className={inputCls}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className={labelCls}>Business Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className={`${inputCls} text-[#111827]`}
                disabled={loading}
              >
                <option value="restaurant">Restaurant / Café</option>
                <option value="brewery">Brewery / Distillery</option>
                <option value="bakery">Bakery / Food Manufacturer</option>
                <option value="farm">Composting / Farming</option>
                <option value="factory">Manufacturing / Textiles</option>
                <option value="recycling_center">Recycling / Hauler</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-0199"
              className={inputCls}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Street Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Broadway"
              className={inputCls}
              disabled={loading}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Area / Locality</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Manhattan"
                className={inputCls}
                disabled={loading}
                required
              />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="NY"
                className={inputCls}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Pincode / ZIP Code</label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="10006"
              className={inputCls}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group pt-3"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Register Business
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Redirect */}
        <div className="mt-6 text-center text-sm text-[#6B7280] border-t border-[#E5E7EB] pt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-[#0F6FE8] hover:text-[#0A52B0] font-semibold transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
