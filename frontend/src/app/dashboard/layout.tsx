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
      <div className="flex-1 flex flex-col justify-center items-center bg-[#F9FAFB] min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F6FE8]" />
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

  const inputCls = "w-full bg-white border border-[#D1D5DB] focus:border-[#0F6FE8] rounded-xl px-4 py-2.5 text-sm text-[#111827] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-1.5";

  return (
    <div className="flex-1 flex bg-[#F9FAFB] text-[#111827] min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E5E7EB] bg-white flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          {/* Logo */}
          <div className="h-16 border-b border-[#E5E7EB] px-6 flex items-center space-x-2.5">
            <div className="bg-[#EFF6FF] p-2 rounded-lg border border-[#BFDBFE]">
              <Recycle className="h-5 w-5 text-[#0F6FE8]" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>
              EcoMatch
            </span>
          </div>

          {/* Business Info / Profile Menu Trigger */}
          <div ref={menuRef} className="relative p-4 border-b border-[#E5E7EB]">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-full text-left p-3 rounded-xl hover:bg-[#F3F4F6] transition-all flex items-center justify-between group"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#111827] truncate">{user?.businessName || 'Your Business'}</div>
                <div className="text-xs text-[#6B7280] truncate mt-0.5">{user?.email}</div>
                <span className="inline-block bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 uppercase tracking-wide">
                  {user?.role}
                </span>
              </div>
              <Settings className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#4B5563] transition-colors ml-2 shrink-0" />
            </button>

            {/* Profile Dropdown Menu */}
            {menuOpen && (
              <div className="absolute left-4 right-4 bottom-[-135px] bg-white border border-[#E5E7EB] rounded-xl shadow-lg p-1.5 z-50">
                <button
                  onClick={handleOpenEdit}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-[#374151] hover:text-[#111827] hover:bg-[#F3F4F6] transition-all"
                >
                  <User className="h-4 w-4 text-[#0F6FE8]" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setIsDeleteOpen(true);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-[#374151] hover:text-[#991B1B] hover:bg-[#FEF2F2] transition-all"
                >
                  <Trash2 className="h-4 w-4 text-[#DC2626]" />
                  <span>Delete Account</span>
                </button>
                <div className="h-px bg-[#E5E7EB] my-1"></div>
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-all"
                >
                  <LogOut className="h-4 w-4 text-[#9CA3AF]" />
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
                      ? 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8]'
                      : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] border border-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[#E5E7EB] text-center">
          <span className="text-[10px] text-[#9CA3AF]">Click Profile Above for Settings</span>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
          <h1 className="text-lg font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>
            {pathname === '/dashboard' ? 'Business Dashboard' : pathname.includes('/submit') ? 'Submit Surplus' : 'Deal Details'}
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-[#9CA3AF]">Local Dev System</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] p-8 rounded-2xl max-w-md w-full relative shadow-xl">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#374151] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-[#111827] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Edit Business Profile</h2>
            <p className="text-sm text-[#6B7280] mb-6">Update your business details below.</p>

            {actionError && (
              <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs rounded-xl p-3">
                {actionError}
              </div>
            )}

            {actionLoading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#0F6FE8]" />
              </div>
            )}

            {!actionLoading && (
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className={labelCls}>Business Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>Business Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className={`${inputCls} text-[#111827]`}
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
                  <label className={labelCls}>Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-[#E5E7EB] mt-6">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="flex-1 bg-white hover:bg-[#F3F4F6] text-[#374151] rounded-xl py-2.5 text-sm font-semibold transition-all border border-[#E5E7EB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-sm"
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] p-8 rounded-2xl max-w-md w-full relative shadow-xl">
            <button
              onClick={() => setIsDeleteOpen(false)}
              className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#374151] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-[#991B1B] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Delete Account?</h2>
            <p className="text-sm text-[#4B5563] mb-6">
              Are you absolutely sure? This will permanently delete your account and all associated submissions, matches, and certificates. This action cannot be undone.
            </p>

            {actionError && (
              <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs rounded-xl p-3">
                {actionError}
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 bg-white hover:bg-[#F3F4F6] text-[#374151] rounded-xl py-2.5 text-sm font-semibold transition-all border border-[#E5E7EB]"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-sm flex justify-center items-center"
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
