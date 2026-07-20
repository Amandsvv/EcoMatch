'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PlusCircle,
  ArrowRight,
  Recycle,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Trash2,
  LogOut,
  X,
  MessageSquare,
} from 'lucide-react';

interface Submission {
  id: string;
  rawDescription: string;
  disposalCostPerUnit: number;
  disposalFrequency: string;
  status: string;
  createdAt: string;
  classification?: {
    primaryCategory: string;
    confidence: number;
    hazardFlag: boolean;
    followupQuestion?: string;
  };
  match?: {
    id: string;
    targetBusinessId: string;
    matchRationale: string;
    matchConfidence: number;
    distanceKm: number;
    status: string;
  };
}

// Confirm-delete modal component
function DeleteConfirmModal({
  submission,
  onConfirm,
  onCancel,
  deleting,
}: {
  submission: Submission;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-2.5">
              <Trash2 className="h-5 w-5 text-[#DC2626]" />
            </div>
            <h3 className="font-bold text-[#111827] text-base" style={{ fontFamily: 'var(--font-heading)' }}>Delete Submission?</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-[#9CA3AF] hover:text-[#374151] transition-colors p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-[#4B5563] leading-relaxed">
          This will permanently delete:{' '}
          <span className="text-[#111827] font-medium">
            &ldquo;{submission.rawDescription.slice(0, 80)}{submission.rawDescription.length > 80 ? '…' : ''}&rdquo;
          </span>
          . This action cannot be undone.
        </p>

        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#374151] bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] border border-[#FECACA] transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>{deleting ? 'Deleting…' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [incomingMatches, setIncomingMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Stats
  const [activeDealsCount, setActiveDealsCount] = useState(0);
  const [co2Saved, setCo2Saved] = useState(0);
  const [dollarsSaved, setDollarsSaved] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch incoming matches (where this user is the TARGET) separately
  useEffect(() => {
    if (!user?.businessId) return;
    api.getMatchesForBusiness(user.businessId)
      .then((bizMatches: any[]) => {
        const targetMatches = (bizMatches || []).filter(
          (m: any) => m.targetBusinessId === user.businessId
        );
        setIncomingMatches(targetMatches);
      })
      .catch(() => {
        // Non-critical — hide section if it fails
      });
  }, [user?.businessId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSubmissions();
      setSubmissions(data || []);

      let activeCount = 0;
      let co2 = 0;
      let dollars = 0;

      for (const sub of data || []) {
        if (sub.status === 'match_proposed' || sub.status === 'both_accepted') {
          activeCount++;
        }
        if (sub.status === 'verified' && sub.match?.id) {
          try {
            const cert = await api.getCertificate(sub.match.id);
            if (cert) {
              co2 += cert.co2eAvoidedKg;
              dollars += cert.dollarsSaved;
            }
          } catch {
            // Ignore certificate fetch errors for stats
          }
        }
      }

      setActiveDealsCount(activeCount);
      setCo2Saved(co2);
      setDollarsSaved(dollars);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteSubmission(deleteTarget.id);
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete submission');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            <Clock className="h-3.5 w-3.5" />
            <span>Classifying</span>
          </span>
        );
      case 'needs_followup':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Clarification Needed</span>
          </span>
        );
      case 'hazard_detected':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Blocked (Hazardous)</span>
          </span>
        );
      case 'low_confidence':
      case 'no_match_found':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>No Match Found</span>
          </span>
        );
      case 'match_proposed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Match Proposed</span>
          </span>
        );
      case 'both_accepted':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Logistics Booked</span>
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]">
            <Award className="h-3.5 w-3.5" />
            <span>Verified (Impact Issued)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
            {status}
          </span>
        );
    }
  };

  // Only allow delete on terminal/non-active statuses
  const isDeletable = (status: string) =>
    ['submitted', 'needs_followup', 'hazard_detected', 'low_confidence', 'no_match_found'].includes(status);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F6FE8]" />
      </div>
    );
  }

  const surplusMaterials = submissions.filter((sub) =>
    ['submitted', 'low_confidence', 'needs_followup', 'hazard_detected', 'no_match_found'].includes(sub.status)
  );

  const symbiosisDeals = submissions.filter((sub) =>
    ['match_proposed', 'proposal_drafted', 'both_accepted', 'verified'].includes(sub.status)
  );

  return (
    <>
      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          submission={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          deleting={deleting}
        />
      )}

      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="glass-card p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Marketplace Overview</h2>
            <p className="text-sm text-[#4B5563] max-w-xl">
              Track your surplus materials, review matches created by the Alchemist Agent, and view your sustainability impact certifications.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/submit"
              className="bg-[#0F6FE8] hover:bg-[#0A52B0] text-white px-5 h-11 inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Submit Surplus Material
            </Link>
            {/* Logout — visible on mobile only (sidebar handles desktop) */}
            <button
              onClick={logout}
              className="md:hidden h-11 px-4 inline-flex items-center justify-center rounded-xl text-sm font-semibold text-[#6B7280] hover:text-[#991B1B] hover:bg-[#FEF2F2] border border-[#E5E7EB] transition-all"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl">
            <span className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Active Proposed Matches</span>
            <span className="text-3xl font-extrabold text-[#111827] mt-2 block" style={{ fontFamily: 'var(--font-heading)' }}>{activeDealsCount}</span>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <span className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Verified Carbon Saved</span>
            <span className="text-3xl font-extrabold text-[#166534] mt-2 block" style={{ fontFamily: 'var(--font-heading)' }}>
              {co2Saved > 0 ? `${co2Saved.toLocaleString()} kg` : '0 kg'}
            </span>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <span className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider block">Total Disposal Savings</span>
            <span className="text-3xl font-extrabold text-[#0F6FE8] mt-2 block" style={{ fontFamily: 'var(--font-heading)' }}>
              {dollarsSaved > 0 ? `$${dollarsSaved.toLocaleString()}` : '$0'}
            </span>
          </div>
        </div>

        {/* Error View */}
        {error && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center space-x-3 text-[#991B1B]">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Delete error banner */}
        {deleteError && (
          <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center justify-between text-[#991B1B]">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{deleteError}</span>
            </div>
            <button onClick={() => setDeleteError(null)} className="text-[#991B1B]/60 hover:text-[#991B1B]">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Section 1: Surplus Materials */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <Recycle className="h-5 w-5 text-[#0F6FE8]" />
            Surplus Materials
          </h3>

          {surplusMaterials.length === 0 ? (
            <div className="glass-card border-dashed border-2 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <Recycle className="h-12 w-12 text-[#D1D5DB]" />
              <div className="space-y-1">
                <h4 className="font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>No pending materials</h4>
                <p className="text-sm text-[#6B7280] max-w-sm">
                  All submitted materials have been matched or you haven&apos;t submitted any material yet.
                </p>
              </div>

              <Link
                href="/dashboard/submit"
                className="bg-white hover:bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                Submit First Material
              </Link>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[#F3F4F6]">
              {surplusMaterials.map((sub) => (
                <div
                  key={sub.id}
                  className="p-6 hover:bg-[#F9FAFB] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#9CA3AF]">
                        Submitted {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                      {getStatusBadge(sub.status)}
                    </div>
                    <h4 className="font-semibold text-[#111827] text-sm line-clamp-1">
                      {sub.rawDescription}
                    </h4>
                    {sub.classification && (
                      <p className="text-xs text-[#6B7280]">
                        Classified as:{' '}
                        <span className="text-[#374151] font-medium">
                          {sub.classification.primaryCategory.replace('_', ' ')}
                        </span>{' '}
                        (Confidence: {(sub.classification.confidence * 100).toFixed(0)}%)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {sub.status === 'submitted' && (
                      <Link
                        href={`/dashboard/submit?id=${sub.id}`}
                        className="bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <span>Find Match</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                    {sub.status === 'needs_followup' && (
                      <Link
                        href={`/dashboard/submit?followup=${sub.id}`}
                        className="bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <span>Respond to Question</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                    {isDeletable(sub.status) && (
                      <button
                        onClick={() => setDeleteTarget(sub)}
                        className="p-2 text-[#9CA3AF] hover:text-[#DC2626] transition-colors border border-transparent hover:border-[#FECACA] hover:bg-[#FEF2F2] rounded-xl"
                        title="Delete submission"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Symbiosis Deals */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <TrendingUp className="h-5 w-5 text-[#166534]" />
            Symbiosis Deals
          </h3>

          {symbiosisDeals.length === 0 ? (
            <div className="glass-card border-dashed border-2 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <TrendingUp className="h-12 w-12 text-[#D1D5DB]" />
              <div className="space-y-1">
                <h4 className="font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>No active deals yet</h4>
                <p className="text-sm text-[#6B7280] max-w-sm">
                  Active matching deals, outreach proposals, and verified agreements will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[#F3F4F6]">
              {symbiosisDeals.map((sub) => (
                <div
                  key={sub.id}
                  className="p-6 hover:bg-[#F9FAFB] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#9CA3AF]">
                        Matched {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                      {getStatusBadge(sub.status)}
                    </div>
                    <h4 className="font-semibold text-[#111827] text-sm line-clamp-1">
                      {sub.rawDescription}
                    </h4>
                    {sub.match && (
                      <p className="text-xs text-[#6B7280]">
                        Match Confidence: <span className="text-[#166534] font-medium">{(sub.match.matchConfidence * 100).toFixed(0)}%</span> • Distance: <span className="text-[#374151] font-medium">{sub.match.distanceKm?.toFixed(1)} km</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {['match_proposed', 'proposal_drafted'].includes(sub.status) && (
                      <Link
                        href={`/dashboard/match/${sub.id}`}
                        className="bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <span>Review Proposal</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                    {(sub.status === 'both_accepted' || sub.status === 'verified') && (
                      <Link
                        href={`/dashboard/deal/${sub.match?.id || sub.id}`}
                        className="bg-white hover:bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-sm"
                      >
                        <span>Track Deal</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Received Proposals (target businesses only) */}
        {incomingMatches.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              <MessageSquare className="h-5 w-5 text-[#4338CA]" />
              Received Proposals
            </h3>
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[#F3F4F6]">
              {incomingMatches.map((m: any) => (
                <div
                  key={m.id}
                  className="p-6 hover:bg-[#F9FAFB] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#9CA3AF]">
                        Proposed {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                      {getStatusBadge(m.status)}
                    </div>
                    <h4 className="font-semibold text-[#111827] text-sm">
                      Incoming symbiosis match from a supplier
                    </h4>
                    <p className="text-xs text-[#6B7280]">
                      Match Confidence:{' '}
                      <span className="text-[#166534] font-medium">
                        {(m.matchConfidence * 100).toFixed(0)}%
                      </span>{' '}
                      • Distance:{' '}
                      <span className="text-[#374151] font-medium">
                        {m.distanceKm?.toFixed(1)} km
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {['match_proposed', 'proposal_drafted'].includes(m.status) && (
                      <Link
                        href={`/dashboard/match/${m.id}`}
                        className="bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <span>Review Proposal</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                    {(m.status === 'both_accepted' || m.status === 'verified') && (
                      <Link
                        href={`/dashboard/deal/${m.id}`}
                        className="bg-white hover:bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-sm"
                      >
                        <span>Track Deal</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
