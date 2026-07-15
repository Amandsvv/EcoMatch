'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Recycle, 
  ShieldAlert, 
  Truck, 
  FileText, 
  TrendingUp, 
  ListOrdered, 
  LogOut, 
  Check, 
  AlertTriangle, 
  Loader2, 
  PlusCircle,
  Clock
} from 'lucide-react';

export default function AdminConsole() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'verifications' | 'events' | 'haulers' | 'businesses'>('verifications');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin states
  const [verifications, setVerifications] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [haulers, setHaulers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);

  // Add hauler form state
  const [haulerName, setHaulerName] = useState('');
  const [haulerContact, setHaulerContact] = useState('');
  const [haulerArea, setHaulerArea] = useState('');

  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    // Guard: only fetch once per mount, not on every state change
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchAdminData();
  }, [user, authLoading]);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vers, evs, hls, bizs] = await Promise.all([
        api.getAdminVerifications(),
        api.getAdminEvents(),
        api.getAdminHaulers(),
        api.getAdminBusinesses(),
      ]);
      setVerifications(vers || []);
      setEvents(evs || []);
      setHaulers(hls || []);
      setBusinesses(bizs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVerification = async (matchId: string, businessId: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await api.confirmVerification(matchId, { businessId });
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm verification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddHauler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!haulerName || !haulerContact || !haulerArea) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.createAdminHauler({
        name: haulerName,
        contact: haulerContact,
        serviceArea: haulerArea,
      });
      setHaulerName('');
      setHaulerContact('');
      setHaulerArea('');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to create hauler');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-950 text-slate-100 min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-slate-950 text-slate-100 min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 border-b border-slate-900 px-6 flex items-center space-x-2">
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <Recycle className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              EcoMatch
            </span>
          </div>

          <div className="p-6 border-b border-slate-900/60">
            <div className="text-sm font-semibold text-white">System Admin</div>
            <div className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</div>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('verifications')}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'verifications'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>Verifications Queue</span>
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'events'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <ListOrdered className="h-5 w-5" />
              <span>Audit logs / Events</span>
            </button>
            <button
              onClick={() => setActiveTab('haulers')}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'haulers'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <Truck className="h-5 w-5" />
              <span>Haulers Management</span>
            </button>
            <button
              onClick={() => setActiveTab('businesses')}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'businesses'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              <TrendingUp className="h-5 w-5" />
              <span>Registered Businesses</span>
            </button>
          </nav>
        </div>

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
        <header className="h-16 border-b border-slate-900 bg-slate-950 flex items-center justify-between px-8">
          <h1 className="text-lg font-bold text-white uppercase tracking-wider">
            {activeTab === 'verifications' ? 'Verification Queue' : activeTab === 'events' ? 'Deal Audit Logs' : activeTab === 'haulers' ? 'Haulers Registry' : 'Business Profiles'}
          </h1>
          <span className="text-xs text-slate-500">Marketplace Supervisor Console</span>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 text-red-400 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: Verifications Queue */}
          {activeTab === 'verifications' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pending Evidence Approvals</h3>
              {verifications.length === 0 ? (
                <div className="bg-slate-900/20 border border-slate-900 border-dashed rounded-3xl p-12 text-center text-slate-500 text-sm">
                  Verification queue is empty. No pending business evidence uploads.
                </div>
              ) : (
                <div className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden divide-y divide-slate-900">
                  {verifications.map((ver) => (
                    <div key={ver.id} className="p-6 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">VERIFICATION RECORD ID: {ver.id}</span>
                        <div className="text-sm font-semibold text-white mt-1">Match ID: {ver.matchId}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Evidence Type: <span className="font-mono text-slate-300 capitalize">{ver.evidenceType}</span></div>
                        <div className="text-xs text-slate-400">Business ID: {ver.businessId}</div>
                      </div>
                      <div>
                        {!ver.confirmed ? (
                          <button
                            onClick={() => handleConfirmVerification(ver.matchId, ver.businessId)}
                            disabled={submitting}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Confirm Evidence
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-full">Approved</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Audit Logs / Deal Events */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">System Event Feed</h3>
              <div className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden divide-y divide-slate-900">
                {events.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No events logged in the database yet.</div>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="p-5 flex items-start space-x-4">
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-900/60 mt-0.5">
                        <Clock className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded uppercase font-mono">{ev.eventType}</span>
                          <span className="text-[10px] text-slate-500">{new Date(ev.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{ev.description}</p>
                        <div className="text-[10px] text-slate-500 font-mono">Actor ID: {ev.actorId} | Match ID: {ev.matchId}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Haulers Registry */}
          {activeTab === 'haulers' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Haulers List */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Transport Partners</h3>
                {haulers.length === 0 ? (
                  <div className="bg-slate-900/20 border border-slate-900 border-dashed rounded-3xl p-12 text-center text-slate-500 text-sm">
                    No haulers registered in system.
                  </div>
                ) : (
                  <div className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden divide-y divide-slate-900">
                    {haulers.map((hl) => (
                      <div key={hl.id} className="p-6">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">HAULER ID: {hl.id}</span>
                        <div className="text-sm font-bold text-white mt-1">{hl.name}</div>
                        <div className="text-xs text-slate-400 mt-1">Service Area: <span className="text-slate-300 font-medium">{hl.serviceArea}</span></div>
                        <div className="text-xs text-slate-400">Contact details: <span className="text-slate-300 font-medium">{hl.contact}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Hauler Form */}
              <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl h-fit space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-900 pb-2">Add Transport Hauler</h3>
                
                <form onSubmit={handleAddHauler} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-1">HAULER COMPANY NAME</label>
                    <input
                      type="text"
                      value={haulerName}
                      onChange={(e) => setHaulerName(e.target.value)}
                      placeholder="Waste Logistics Corp"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs outline-none"
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-1">CONTACT CHANNELS</label>
                    <input
                      type="text"
                      value={haulerContact}
                      onChange={(e) => setHaulerContact(e.target.value)}
                      placeholder="dispatch@wastelog.com, 555-9011"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs outline-none"
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-semibold mb-1">SERVICE ZIP / AREA</label>
                    <input
                      type="text"
                      value={haulerArea}
                      onChange={(e) => setHaulerArea(e.target.value)}
                      placeholder="New York Metropolitan Area"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs outline-none"
                      disabled={submitting}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2 text-xs font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Hauler
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 4: Registered Businesses */}
          {activeTab === 'businesses' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Registered SME Profiles</h3>
              {businesses.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No businesses registered.</div>
              ) : (
                <div className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden divide-y divide-slate-900">
                  {businesses.map((bz) => (
                    <div key={bz.id} className="p-6">
                      <span className="text-[10px] font-mono text-slate-500 block uppercase">BUSINESS ID: {bz.id}</span>
                      <div className="text-sm font-bold text-white mt-1">{bz.name}</div>
                      <div className="text-xs text-slate-400 mt-1 capitalize">Type: <span className="text-slate-300 font-medium">{bz.type.replace('_', ' ')}</span></div>
                      <div className="text-xs text-slate-400">Location coordinates: <span className="text-slate-300 font-mono">({bz.lat}, {bz.lng})</span></div>
                      <div className="text-xs text-slate-400">Street address: <span className="text-slate-300 font-medium">{bz.address}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
