'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Recycle, LayoutDashboard, PlusCircle, LogOut, Loader2, Settings, User, Trash2, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, deleteAccount, updateUser, loading } = useAuth();
  const pathname = usePathname();

  // Menu and Modals State
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Edit Form Fields
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('restaurant');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-100 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Submit Surplus', href: '/dashboard/submit', icon: PlusCircle },
  ];

  // Open Edit Profile modal and fetch latest info
  const handleOpenEdit = async () => {
    setMenuOpen(false);
    setActionError(null);
    if (!user?.businessId) return;

    setIsEditOpen(true);
    setActionLoading(true);
    try {
      const data = await api.getBusinessProfile(user.businessId);
      setEditName(data.name || '');
      setEditType(data.type || 'restaurant');
      setEditPhone(data.phone || '');
      setEditAddress(data.address || '');
    } catch (err: any) {
      setActionError(err.message || 'Failed to load business profile');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit profile edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.businessId) return;

    setActionError(null);
    setActionLoading(true);
    try {
      await api.updateProfile(user.businessId, {
        name: editName,
        type: editType,
        phone: editPhone,
        address: editAddress,
      });
      // Update name in local Auth context
      updateUser({ businessName: editName });
      setIsEditOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm delete account
  const handleDeleteAccount = async () => {
    setActionError(null);
    setActionLoading(true);
    try {
      await deleteAccount();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete account');
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex bg-slate-950 text-slate-100 min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="h-16 border-b border-slate-900 px-6 flex items-center space-x-2">
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <Recycle className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              EcoMatch
            </span>
          </div>

          {/* Business Info / Profile Menu Trigger */}
          <div ref={menuRef} className="relative p-4 border-b border-slate-900/60">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-full text-left p-3 rounded-2xl hover:bg-slate-900/40 transition-all flex items-center justify-between group"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">{user?.businessName || 'Your Business'}</div>
                <div className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</div>
                <span className="inline-block bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 uppercase tracking-wide">
                  {user?.role}
                </span>
              </div>
              <Settings className="h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors ml-2 shrink-0" />
            </button>

            {/* Profile Dropdown Menu */}
            {menuOpen && (
              <div className="absolute left-4 right-4 bottom-[-135px] bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-md">
                <button
                  onClick={handleOpenEdit}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all"
                >
                  <User className="h-4 w-4 text-emerald-400" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setIsDeleteOpen(true);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-red-400 hover:bg-red-500/5 transition-all"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                  <span>Delete Account</span>
                </button>
                <div className="h-[1px] bg-slate-800/60 my-1"></div>
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info instead of redundant logout button */}
        <div className="p-4 border-t border-slate-900 text-center">
          <span className="text-[10px] text-slate-600">Click Profile Above for Settings</span>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="text-lg font-bold text-white">
            {pathname === '/dashboard' ? 'Business Dashboard' : pathname.includes('/submit') ? 'Submit Surplus' : 'Deal Details'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-500">Local Dev System</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full relative shadow-2xl">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-2">Edit Business Profile</h2>
            <p className="text-sm text-slate-400 mb-6">Update your business details below.</p>

            {actionError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3">
                {actionError}
              </div>
            )}

            {actionLoading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              </div>
            )}

            {!actionLoading && (
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Business Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm transition-all outline-none text-slate-300"
                  >
                    <option value="restaurant">Restaurant / Café</option>
                    <option value="brewery">Brewery / Distillery</option>
                    <option value="bakery">Bakery / Food Manufacturer</option>
                    <option value="farm">Composting / Farming</option>
                    <option value="factory">Manufacturing / Textiles</option>
                    <option value="recycling_center">Recycling / Hauler</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-slate-800/60 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl py-2.5 text-sm font-semibold transition-all border border-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full relative shadow-2xl">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-red-500 mb-2">Delete Account?</h2>
            <p className="text-sm text-slate-400 mb-6">
              Are you absolutely sure? This will permanently delete your account and all associated submissions, matches, and certificates. This action cannot be undone.
            </p>

            {actionError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl p-3">
                {actionError}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl py-2.5 text-sm font-semibold transition-all border border-slate-800"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-650 hover:bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-red-500/10 flex justify-center items-center"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Delete Forever'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

