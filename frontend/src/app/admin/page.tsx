'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldAlert,
  Truck,
  FileText,
  Building,
  Check,
  AlertTriangle,
  Loader2,
  PlusCircle,
  Activity,
  ExternalLink,
  LogOut,
} from 'lucide-react';

export default function AdminConsoleDashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'verifications' | 'events' | 'haulers' | 'businesses'>('verifications');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.message || 'Failed to add hauler');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader2 className="h-8 w-8 anim-spin text-[var(--eco-accent)]" />
        <span className="text-xs font-semibold text-[var(--eco-text-3)]">Loading admin console...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Admin Header */}
      <div className="eco-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[var(--color-error-mid)]" />
            <h2 className="text-xl font-bold text-[var(--eco-text)] font-display">
              System Admin Console
            </h2>
          </div>
          <p className="text-xs text-[var(--eco-text-2)]">
            Manage verification queues, review system events, register haulers, and audit active businesses.
          </p>
        </div>
        <button
          onClick={logout}
          className="eco-btn-outline text-xs py-2 px-4 inline-flex items-center gap-2 shrink-0 self-start sm:self-auto text-[var(--color-error-mid)] border-[var(--color-error-border)] hover:bg-[var(--color-error-bg)]"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[var(--color-error-bg)] border border-[var(--color-error-border)] flex items-center gap-3 text-[var(--color-error)] text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--eco-border)] overflow-x-auto pb-1">
        {[
          { id: 'verifications', label: 'Verification Queue', icon: FileText, count: verifications.length },
          { id: 'events', label: 'Audit Logs', icon: Activity, count: events.length },
          { id: 'haulers', label: 'Certified Haulers', icon: Truck, count: haulers.length },
          { id: 'businesses', label: 'Businesses', icon: Building, count: businesses.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-[var(--eco-accent)] text-[var(--eco-accent)] bg-[var(--eco-surface)]'
                  : 'border-transparent text-[var(--eco-text-2)] hover:text-[var(--eco-text)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--eco-surface-2)] text-[var(--eco-text-2)]">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Verifications Queue */}
      {activeTab === 'verifications' && (
        <div className="eco-card overflow-hidden">
          <div className="p-4 border-b border-[var(--eco-border)] font-bold text-xs tracking-overline text-[var(--eco-text-2)] font-display">
            Pending Transfer Proof Approvals
          </div>
          {verifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--eco-text-3)]">
              No pending verifications in queue.
            </div>
          ) : (
            <div className="divide-y divide-[var(--eco-border)]">
              {verifications.map((v: any) => (
                <div key={v.id} className="p-5 hover:bg-[var(--eco-surface-2)] transition-colors space-y-3">
                  {/* Header Tag Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--eco-border)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--eco-surface)] text-[var(--eco-text-2)] border border-[var(--eco-border)] font-mono">
                        Match ID: {v.matchId}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded badge-info capitalize">
                        {v.evidenceType?.replace('_', ' ') || 'Proof'} Evidence
                      </span>
                    </div>

                    <div>
                      {v.confirmed ? (
                        <span className="badge-success">Confirmed</span>
                      ) : (
                        <button
                          onClick={() => handleConfirmVerification(v.matchId, v.businessId)}
                          disabled={submitting}
                          className="eco-btn-primary text-xs py-1.5 px-3"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve Proof
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Side-by-Side Business Pairing Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--eco-surface)] p-3 rounded-lg border border-[var(--eco-border)] text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[var(--eco-text-3)] tracking-overline block">SOURCE BUSINESS</span>
                      <span className="font-bold text-[var(--eco-text)] block">{v.sourceBusinessName || 'Source Business'}</span>
                      <span className="text-[10px] text-[var(--eco-text-3)] font-mono truncate block">ID: {v.sourceBusinessId || 'N/A'}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[var(--eco-text-3)] tracking-overline block">TARGET BUSINESS</span>
                      <span className="font-bold text-[var(--eco-text)] block">{v.targetBusinessName || 'Target Business'}</span>
                      <span className="text-[10px] text-[var(--eco-text-3)] font-mono truncate block">ID: {v.targetBusinessId || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Uploaded Proof Link */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[var(--eco-text-2)]">
                      Proof submitted by: <strong className="text-[var(--eco-text)]">{v.submittingBusinessName || v.businessId}</strong>
                    </span>
                    {v.evidenceUrl && (
                      <a
                        href={v.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--eco-accent)] font-semibold hover:underline text-xs inline-flex items-center gap-1"
                      >
                        <span>View Evidence Proof</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Events Log */}
      {activeTab === 'events' && (
        <div className="eco-card overflow-hidden">
          <div className="p-4 border-b border-[var(--eco-border)] font-bold text-xs tracking-overline text-[var(--eco-text-2)] font-display">
            System Event Monitoring Audit
          </div>
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--eco-text-3)]">
              No system events logged.
            </div>
          ) : (
            <div className="divide-y divide-[var(--eco-border)]">
              {events.map((e: any) => (
                <div key={e.id} className="p-4 hover:bg-[var(--eco-surface-2)] transition-colors flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-[var(--eco-text)] capitalize">{e.eventType.replace('_', ' ')}</span>
                    <p className="text-[var(--eco-text-2)]">{e.description || 'No description details'}</p>
                  </div>
                  <span className="text-[10px] text-[var(--eco-text-3)]">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Haulers */}
      {activeTab === 'haulers' && (
        <div className="space-y-6">
          <div className="eco-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--eco-text)] tracking-overline font-display">
              Register Logistics Hauler
            </h3>
            <form onSubmit={handleAddHauler} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={haulerName}
                onChange={(e) => setHaulerName(e.target.value)}
                placeholder="Hauler Company Name"
                className="eco-input text-xs"
                required
              />
              <input
                type="text"
                value={haulerContact}
                onChange={(e) => setHaulerContact(e.target.value)}
                placeholder="Contact Phone / Email"
                className="eco-input text-xs"
                required
              />
              <input
                type="text"
                value={haulerArea}
                onChange={(e) => setHaulerArea(e.target.value)}
                placeholder="Service Area / City"
                className="eco-input text-xs"
                required
              />
              <button type="submit" disabled={submitting} className="eco-btn-primary text-xs py-2 sm:col-span-3">
                <PlusCircle className="h-4 w-4" /> Add Logistics Hauler
              </button>
            </form>
          </div>

          <div className="eco-card overflow-hidden">
            <div className="p-4 border-b border-[var(--eco-border)] font-bold text-xs tracking-overline text-[var(--eco-text-2)] font-display">
              Certified Logistics Haulers
            </div>
            {haulers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--eco-text-3)]">
                No haulers registered.
              </div>
            ) : (
              <div className="divide-y divide-[var(--eco-border)]">
                {haulers.map((h: any) => (
                  <div key={h.id} className="p-4 hover:bg-[var(--eco-surface-2)] transition-colors flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[var(--eco-text)]">{h.name}</span>
                      <p className="text-[var(--eco-text-2)]">{h.contact} • Area: {h.serviceArea}</p>
                    </div>
                    <span className="badge-success">Active Hauler</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Businesses */}
      {activeTab === 'businesses' && (
        <div className="eco-card overflow-hidden">
          <div className="p-4 border-b border-[var(--eco-border)] font-bold text-xs tracking-overline text-[var(--eco-text-2)] font-display">
            Registered Marketplace Businesses
          </div>
          {businesses.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--eco-text-3)]">
              No registered businesses found.
            </div>
          ) : (
            <div className="divide-y divide-[var(--eco-border)]">
              {businesses.map((b: any) => (
                <div key={b.id} className="p-4 hover:bg-[var(--eco-surface-2)] transition-colors flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-[var(--eco-text)]">{b.businessName}</span>
                    <p className="text-[var(--eco-text-2)]">{b.email} • Category: {b.businessType}</p>
                  </div>
                  <span className="badge-primary">Verified Account</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
