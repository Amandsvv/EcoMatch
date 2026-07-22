'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Leaf,
  LayoutDashboard,
  PlusCircle,
  ShieldAlert,
  LogOut,
  UserCheck,
  Building,
  CheckCircle,
  X,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, updateUser, deleteAccount } = useAuth();
  const pathname = usePathname();

  // Profile modal states
  const [profileOpen, setProfileOpen] = useState(false);
  const [editName, setEditName] = useState(user?.businessName || '');
  const [updateMsg, setUpdateMsg] = useState('');

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ businessName: editName });
    setUpdateMsg('Profile updated!');
    setTimeout(() => {
      setUpdateMsg('');
      setProfileOpen(false);
    }, 1200);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
    } catch {
      setDeleteLoading(false);
    }
  };

  const isLinkActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-[#F4F3F0] text-[#0A0F0D]">
      {/* ── STICKY TOP NAVBAR ──────────────────────────────────── */}
      <nav className="bg-[#F4F3F0] border-b border-[#E2DFD7] sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1B4332] flex items-center justify-center">
              <Leaf className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg text-[#0A0F0D] tracking-tight font-display">
              EcoMatch
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-6 text-sm font-semibold">
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                isLinkActive('/dashboard')
                  ? 'text-[#1B4332] bg-[#EBF5EF]'
                  : 'text-[#4A524D] hover:text-[#0A0F0D]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </Link>

            <Link
              href="/dashboard/submit"
              className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                isLinkActive('/dashboard/submit')
                  ? 'text-[#1B4332] bg-[#EBF5EF]'
                  : 'text-[#4A524D] hover:text-[#0A0F0D]'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Surplus</span>
            </Link>

            {user?.role === 'admin' && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                  isLinkActive('/admin')
                    ? 'text-[#1B4332] bg-[#EBF5EF]'
                    : 'text-[#4A524D] hover:text-[#0A0F0D]'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>

          {/* User Account Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditName(user?.businessName || '');
                setProfileOpen(true);
              }}
              className="text-xs font-semibold text-[#4A524D] hover:text-[#0A0F0D] py-1.5 px-3 rounded-md border border-[#E2DFD7] bg-white flex items-center gap-1.5 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{user?.businessName || 'Profile'}</span>
            </button>

            <button
              onClick={logout}
              className="text-xs font-semibold text-[#991B1B] hover:bg-[#FEF2F2] py-1.5 px-3 rounded-md border border-[#FECACA] transition-colors flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* ── PROFILE MODAL ────────────────────────────────────────── */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="eco-card w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
              <h3 className="font-bold text-lg text-[#0A0F0D] font-display flex items-center gap-2">
                <Building className="w-5 h-5 text-[#1B4332]" />
                Business Settings
              </h3>
              <button onClick={() => setProfileOpen(false)} className="text-[#8E9792] hover:text-[#0A0F0D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateMsg && (
              <div className="p-3 bg-[#F0FDF4] text-[#166534] text-xs font-semibold rounded-md flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {updateMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[#4A524D]">
                  Business Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="eco-input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#4A524D]">
                  Registered Email
                </label>
                <input
                  type="text"
                  value={user?.email || ''}
                  disabled
                  className="eco-input bg-[#EBE9E4] text-[#8E9792] cursor-not-allowed"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button type="submit" className="eco-btn-primary flex-1 py-2.5 text-xs">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setDeleteOpen(true);
                  }}
                  className="px-3 py-2.5 text-xs text-[#991B1B] hover:bg-[#FEF2F2] rounded-md transition-colors border border-[#FECACA]"
                >
                  Delete Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE ACCOUNT MODAL ─────────────────────────────────── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="eco-card w-full max-w-md p-6 space-y-5 border-[#FECACA]">
            <div className="flex items-center gap-3 text-[#991B1B]">
              <ShieldAlert className="w-8 h-8" />
              <div>
                <h3 className="font-bold text-lg text-[#0A0F0D] font-display">
                  Delete Account?
                </h3>
                <p className="text-xs text-[#4A524D]">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-[#4A524D] leading-relaxed bg-[#FEF2F2] p-3 rounded-md border border-[#FECACA]">
              All active surplus listings, deal records, and matches tied to this account will be erased from our marketplace.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="w-full py-2.5 text-xs font-semibold text-white bg-[#991B1B] hover:bg-red-800 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Everything'}
              </button>
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={deleteLoading}
                className="w-full py-2.5 text-xs font-semibold text-[#4A524D] bg-[#EBE9E4] hover:bg-[#E2DFD7] rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
