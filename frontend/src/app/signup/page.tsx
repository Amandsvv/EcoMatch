'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { SignupSchema } from '@/lib/validation';
import { Leaf, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function UserSignupPage() {
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
    const payload = { email, password, businessName, businessType, address, area, state, pincode, phone };
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

  return (
    <div className="bg-[#F4F3F0] text-[#0A0F0D] min-h-screen flex flex-col justify-center items-center py-16 px-4">
      <div className="w-full max-w-xl space-y-8">

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
        <div className="space-y-1">
          <h1 className="text-3xl font-medium text-[#0A0F0D] font-display">
            Register your business
          </h1>
          <p className="text-sm text-[#4A524D]">
            All accounts are reviewed by our admin team before matching activates.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3 text-[#991B1B] text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Form Layout */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
                Business name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Brewing"
                className="eco-input"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
                Business type
              </label>
              <select
                value={businessType}
                onChange={e => setBusinessType(e.target.value)}
                className="eco-input"
                disabled={loading}
              >
                <option value="restaurant">Restaurant / Food Service</option>
                <option value="brewery">Brewery / Distillery</option>
                <option value="farm">Farm / Agriculture</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="construction">Construction / C&amp;D</option>
                <option value="textile">Textile / Apparel</option>
                <option value="other">Other Industry</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
                Business email
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
                Phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Phone number"
                className="eco-input"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="eco-input"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
              Street address
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Industrial Ave"
              className="eco-input"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
                City / Area
              </label>
              <input
                type="text"
                value={area}
                onChange={e => setArea(e.target.value)}
                placeholder="City or Area"
                className="eco-input"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={e => setState(e.target.value)}
                placeholder="State"
                className="eco-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="w-full sm:w-1/2">
            <label className="block text-xs font-semibold text-[#0A0F0D] mb-1.5">
              ZIP / Pincode
            </label>
            <input
              type="text"
              value={pincode}
              onChange={e => setPincode(e.target.value)}
              placeholder="Pincode"
              className="eco-input"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="eco-btn-primary w-full py-3.5 text-sm font-semibold mt-4"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 anim-spin mr-2" /> Creating business account...</>
            ) : (
              'Create business account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-[#4A524D]">
          Already registered?{' '}
          <Link href="/login" className="text-[#1B4332] font-semibold underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
