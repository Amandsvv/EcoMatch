'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Recycle, LayoutDashboard, PlusCircle, LogOut, Loader2, Award } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

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

          {/* Business Info */}
          <div className="p-6 border-b border-slate-900/60">
            <div className="text-sm font-semibold text-white truncate">{user?.businessName || 'Your Business'}</div>
            <div className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</div>
            <span className="inline-block bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 uppercase tracking-wide">
              {user?.role}
            </span>
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

        {/* Logout */}
        <div className="p-4 border-t border-slate-900">
          <button
            onClick={logout}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all group"
          >
            <LogOut className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            <span>Logout</span>
          </button>
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
    </div>
  );
}
