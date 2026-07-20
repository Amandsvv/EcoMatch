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
      <div className="flex-1 flex flex-col justify-center items-center bg-[#F9FAFB] min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F6FE8]" />
      </div>
    );
  }

  const tabCls = (tab: string) =>
    `flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      activeTab === tab
        ? 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8]'
        : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] border border-transparent'
    }`;

  const inputCls = "w-full bg-white border border-[#D1D5DB] focus:border-[#0F6FE8] rounded-xl px-3 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] outline-none transition-all";

  return (
    <div className="flex-1 flex bg-[#F9FAFB] text-[#111827] min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E5E7EB] bg-white flex flex-col justify-between shrink-0 shadow-sm">
        <div>
          <div className="h-16 border-b border-[#E5E7EB] px-6 flex items-center space-x-2.5">
            <div className="bg-[#EFF6FF] p-2 rounded-lg border border-[#BFDBFE]">
              <Recycle className="h-5 w-5 text-[#0F6FE8]" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>
              EcoMatch
            </span>
          </div>

          <div className="p-6 border-b border-[#E5E7EB]">
            <div className="text-sm font-semibold text-[#111827]">System Admin</div>
            <div className="text-xs text-[#6B7280] truncate mt-0.5">{user?.email}</div>
          </div>

          <nav className="p-4 space-y-1">
            <button onClick={() => setActiveTab('verifications')} className={tabCls('verifications')}>
              <FileText className="h-5 w-5" />
              <span>Verifications Queue</span>
            </button>
            <button onClick={() => setActiveTab('events')} className={tabCls('events')}>
              <ListOrdered className="h-5 w-5" />
              <span>Audit logs / Events</span>
            </button>
            <button onClick={() => setActiveTab('haulers')} className={tabCls('haulers')}>
              <Truck className="h-5 w-5" />
              <span>Haulers Management</span>
            </button>
            <button onClick={() => setActiveTab('businesses')} className={tabCls('businesses')}>
              <TrendingUp className="h-5 w-5" />
              <span>Registered Businesses</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#E5E7EB]">
          <button
            onClick={logout}
            className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-[#6B7280] hover:text-[#991B1B] hover:bg-[#FEF2F2] transition-all group"
          >
            <LogOut className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#E5E7EB] bg-white flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-lg font-bold text-[#111827] uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>
            {activeTab === 'verifications' ? 'Verification Queue' : activeTab === 'events' ? 'Deal Audit Logs' : activeTab === 'haulers' ? 'Haulers Registry' : 'Business Profiles'}
          </h1>
          <span className="text-xs text-[#9CA3AF]">Marketplace Supervisor Console</span>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          {error && (
            <div className="mb-6 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center space-x-3 text-[#991B1B] text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: Verifications Queue */}
          {activeTab === 'verifications' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider">Pending Evidence Approvals</h3>
              {verifications.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E5E7EB] rounded-2xl p-12 text-center text-[#9CA3AF] text-sm">
                  Verification queue is empty. No pending business evidence uploads.
                </div>
              ) : (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden divide-y divide-[#F3F4F6] shadow-sm">
                  {verifications.map((ver) => (
                    <div key={ver.id} className="p-6 flex items-center justify-between gap-4 hover:bg-[#F9FAFB] transition-colors">
                      <div>
                        <span className="text-[10px] font-mono text-[#9CA3AF] block uppercase">VERIFICATION RECORD ID: {ver.id}</span>
                        <div className="text-sm font-semibold text-[#111827] mt-1">Match ID: {ver.matchId}</div>
                        <div className="text-xs text-[#4B5563] mt-0.5">Evidence Type: <span className="font-mono text-[#374151] capitalize">{ver.evidenceType}</span></div>
                        <div className="text-xs text-[#4B5563]">Business ID: {ver.businessId}</div>
                      </div>
                      <div>
                        {!ver.confirmed ? (
                          <button
                            onClick={() => handleConfirmVerification(ver.matchId, ver.businessId)}
                            disabled={submitting}
                            className="bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center disabled:opacity-50"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Confirm Evidence
                          </button>
                        ) : (
                          <span className="text-xs text-[#166534] font-bold bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1 rounded-full">Approved</span>
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
              <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider">System Event Feed</h3>
              <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden divide-y divide-[#F3F4F6] shadow-sm">
                {events.length === 0 ? (
                  <div className="p-8 text-center text-[#9CA3AF] text-sm">No events logged in the database yet.</div>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="p-5 flex items-start space-x-4 hover:bg-[#F9FAFB] transition-colors">
                      <div className="bg-[#EFF6FF] p-2 rounded-lg border border-[#BFDBFE] mt-0.5">
                        <Clock className="h-4 w-4 text-[#0F6FE8]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded uppercase font-mono">{ev.eventType}</span>
                          <span className="text-[10px] text-[#9CA3AF]">{new Date(ev.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-[#374151] leading-relaxed">{ev.description}</p>
                        <div className="text-[10px] text-[#9CA3AF] font-mono">Actor ID: {ev.actorId} | Match ID: {ev.matchId}</div>
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
                <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider">Active Transport Partners</h3>
                {haulers.length === 0 ? (
                  <div className="bg-white border border-dashed border-[#E5E7EB] rounded-2xl p-12 text-center text-[#9CA3AF] text-sm">
                    No haulers registered in system.
                  </div>
                ) : (
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden divide-y divide-[#F3F4F6] shadow-sm">
                    {haulers.map((hl) => (
                      <div key={hl.id} className="p-6 hover:bg-[#F9FAFB] transition-colors">
                        <span className="text-[10px] font-mono text-[#9CA3AF] block uppercase">HAULER ID: {hl.id}</span>
                        <div className="text-sm font-bold text-[#111827] mt-1">{hl.name}</div>
                        <div className="text-xs text-[#4B5563] mt-1">Service Area: <span className="text-[#374151] font-medium">{hl.serviceArea}</span></div>
                        <div className="text-xs text-[#4B5563]">Contact details: <span className="text-[#374151] font-medium">{hl.contact}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Hauler Form */}
              <div className="bg-white border border-[#E5E7EB] p-6 rounded-2xl h-fit space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-2" style={{ fontFamily: 'var(--font-heading)' }}>Add Transport Hauler</h3>
                
                <form onSubmit={handleAddHauler} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-[#6B7280] font-semibold mb-1 uppercase">HAULER COMPANY NAME</label>
                    <input
                      type="text"
                      value={haulerName}
                      onChange={(e) => setHaulerName(e.target.value)}
                      placeholder="Waste Logistics Corp"
                      className={inputCls}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#6B7280] font-semibold mb-1 uppercase">CONTACT CHANNELS</label>
                    <input
                      type="text"
                      value={haulerContact}
                      onChange={(e) => setHaulerContact(e.target.value)}
                      placeholder="dispatch@wastelog.com, 555-9011"
                      className={inputCls}
                      disabled={submitting}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#6B7280] font-semibold mb-1 uppercase">SERVICE ZIP / AREA</label>
                    <input
                      type="text"
                      value={haulerArea}
                      onChange={(e) => setHaulerArea(e.target.value)}
                      placeholder="New York Metropolitan Area"
                      className={inputCls}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-2.5 text-xs font-semibold transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
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
              <h3 className="text-sm font-bold text-[#6B7280] uppercase tracking-wider">Registered SME Profiles</h3>
              {businesses.length === 0 ? (
                <div className="p-8 text-center text-[#9CA3AF] text-sm">No businesses registered.</div>
              ) : (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden divide-y divide-[#F3F4F6] shadow-sm">
                  {businesses.map((bz) => (
                    <div key={bz.id} className="p-6 hover:bg-[#F9FAFB] transition-colors">
                      <span className="text-[10px] font-mono text-[#9CA3AF] block uppercase">BUSINESS ID: {bz.id}</span>
                      <div className="text-sm font-bold text-[#111827] mt-1">{bz.name}</div>
                      <div className="text-xs text-[#4B5563] mt-1 capitalize">Type: <span className="text-[#374151] font-medium">{bz.type.replace('_', ' ')}</span></div>
                      <div className="text-xs text-[#4B5563]">Location coordinates: <span className="text-[#374151] font-mono">({bz.lat}, {bz.lng})</span></div>
                      <div className="text-xs text-[#4B5563]">Street address: <span className="text-[#374151] font-medium">{bz.address}</span></div>
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
