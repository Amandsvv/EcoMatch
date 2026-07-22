'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Recycle,
  TrendingUp,
  PlusCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Award,
  ChevronRight,
  Trash2,
  Loader2,
  MessageSquare,
  X,
} from 'lucide-react';

interface Submission {
  id: string;
  rawDescription: string;
  disposalCostPerUnit: number;
  disposalFrequency: string;
  status: string;
  createdAt: string;
  classification?: any;
  match?: any;
}

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="eco-card w-full max-w-md p-6 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 text-[var(--color-error-mid)]">
            <div className="p-2.5 rounded-full bg-[var(--color-error-bg)] border border-[var(--color-error-border)]">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--eco-text)] font-display">
                Delete Submission?
              </h3>
              <p className="text-xs text-[var(--eco-text-3)]">This action cannot be undone.</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-[var(--eco-text-3)] hover:text-[var(--eco-text)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--eco-text-2)] bg-[var(--eco-surface-2)] p-3 rounded-md line-clamp-2 italic">
          &ldquo;{submission.rawDescription}&rdquo;
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-xs font-semibold text-[var(--eco-text-2)] hover:bg-[var(--eco-surface-2)] rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="eco-btn-primary py-2 px-4 text-xs bg-[var(--color-error-mid)] hover:bg-red-700"
          >
            {deleting ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 anim-spin" /> Deleting...
              </span>
            ) : (
              'Confirm Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const { user } = useAuth();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [incomingMatches, setIncomingMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Live Stats from user data
  const [activeDealsCount, setActiveDealsCount] = useState(0);
  const [co2Saved, setCo2Saved] = useState(0);
  const [dollarsSaved, setDollarsSaved] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const subsData = await api.getSubmissions();
      const validSubmissions = subsData || [];
      setSubmissions(validSubmissions);

      const activeCount = validSubmissions.filter((s: any) =>
        ['match_proposed', 'proposal_drafted', 'both_accepted', 'verified'].includes(s.status)
      ).length;
      setActiveDealsCount(activeCount);

      const verifiedCount = validSubmissions.filter((s: any) => s.status === 'verified').length;
      setCo2Saved(verifiedCount * 1250);
      setDollarsSaved(verifiedCount * 850);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSubmission(deleteTarget.id);
      setSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setError('Failed to delete submission');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="badge-info">
            <Clock className="h-3 w-3" />
            <span>Classifying</span>
          </span>
        );
      case 'needs_followup':
        return (
          <span className="badge-warning">
            <AlertTriangle className="h-3 w-3" />
            <span>Clarification Needed</span>
          </span>
        );
      case 'hazard_detected':
        return (
          <span className="badge-error">
            <ShieldAlert className="h-3 w-3" />
            <span>Blocked (Hazardous)</span>
          </span>
        );
      case 'low_confidence':
      case 'no_match_found':
        return (
          <span className="badge-muted">
            <AlertTriangle className="h-3 w-3" />
            <span>No Match Found</span>
          </span>
        );
      case 'match_proposed':
        return (
          <span className="badge-success">
            <TrendingUp className="h-3 w-3" />
            <span>Match Proposed</span>
          </span>
        );
      case 'both_accepted':
        return (
          <span className="badge-success">
            <CheckCircle className="h-3 w-3" />
            <span>Logistics Booked</span>
          </span>
        );
      case 'verified':
        return (
          <span className="badge-completion">
            <Award className="h-3 w-3" />
            <span>Verified (Impact Issued)</span>
          </span>
        );
      default:
        return <span className="badge-muted">{status}</span>;
    }
  };

  const isDeletable = (status: string) =>
    ['submitted', 'needs_followup', 'hazard_detected', 'low_confidence', 'no_match_found'].includes(status);

  const surplusMaterials = submissions.filter((sub) =>
    ['submitted', 'low_confidence', 'needs_followup', 'hazard_detected', 'no_match_found'].includes(sub.status)
  );

  const symbiosisDeals = submissions.filter((sub) =>
    ['match_proposed', 'proposal_drafted', 'both_accepted', 'verified'].includes(sub.status)
  );

  return (
    <>
      {deleteTarget && (
        <DeleteConfirmModal
          submission={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="eco-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-medium text-[#0A0F0D] font-display">
              Marketplace Overview
            </h1>
            <p className="text-xs sm:text-sm text-[var(--eco-text-2)] max-w-xl leading-relaxed">
              Track your surplus materials, review matches created by the Alchemist Agent, and view your sustainability impact certifications.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/dashboard/submit" className="eco-btn-primary py-2.5 px-5 text-sm">
              <PlusCircle className="h-4.5 w-4.5" />
              Submit Surplus
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="stat-card green">
            <span className="text-[10px] text-[var(--eco-text-3)] font-semibold tracking-overline block">
              Active Proposed Matches
            </span>
            <span className="stat-number text-[var(--eco-text)]">{activeDealsCount}</span>
          </div>

          <div className="stat-card blue">
            <span className="text-[10px] text-[var(--eco-text-3)] font-semibold tracking-overline block">
              Verified Carbon Saved
            </span>
            <span className="stat-number text-[var(--color-success)]">
              {co2Saved > 0 ? `${co2Saved.toLocaleString()} kg` : '0 kg'}
            </span>
          </div>

          <div className="stat-card amber">
            <span className="text-[10px] text-[var(--eco-text-3)] font-semibold tracking-overline block">
              Total Disposal Savings
            </span>
            <span className="stat-number text-[var(--eco-accent)]">
              {dollarsSaved > 0 ? `$${dollarsSaved.toLocaleString()}` : '$0'}
            </span>
          </div>
        </div>

        {/* Section 1: Surplus Materials */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--eco-text)] font-display flex items-center gap-2">
              <Recycle className="h-5 w-5 text-[var(--eco-accent)]" />
              Surplus Materials
            </h3>
            <span className="text-xs text-[var(--eco-text-3)] font-semibold">
              {surplusMaterials.length} Listed
            </span>
          </div>

          {surplusMaterials.length === 0 ? (
            <div className="eco-card border-dashed p-10 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--eco-surface-2)] flex items-center justify-center text-[var(--eco-text-3)]">
                <Recycle className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="font-bold text-sm text-[var(--eco-text)] font-display">No pending materials</h4>
                <p className="text-xs text-[var(--eco-text-3)]">
                  All submitted materials have been matched or you haven&apos;t submitted any material yet.
                </p>
              </div>
              <Link href="/dashboard/submit" className="eco-btn-outline text-xs py-2 px-4 mt-2">
                Submit First Material
              </Link>
            </div>
          ) : (
            <div className="eco-card overflow-hidden divide-y divide-[var(--eco-border)]">
              {surplusMaterials.map((sub) => (
                <div
                  key={sub.id}
                  className="p-5 hover:bg-[var(--eco-surface-2)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--eco-text-3)] font-medium">
                        Submitted {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                      {getStatusBadge(sub.status)}
                    </div>
                    <h4 className="font-semibold text-sm text-[var(--eco-text)] line-clamp-1">
                      {sub.rawDescription}
                    </h4>
                    {sub.classification && (
                      <p className="text-xs text-[var(--eco-text-2)]">
                        Classified as:{' '}
                        <span className="font-semibold text-[var(--eco-text)] capitalize">
                          {sub.classification.primaryCategory.replace('_', ' ')}
                        </span>{' '}
                        (Confidence: {(sub.classification.confidence * 100).toFixed(0)}%)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sub.status === 'submitted' && (
                      <Link
                        href={`/dashboard/submit?id=${sub.id}`}
                        className="eco-btn-primary text-xs py-1.5 px-3"
                      >
                        <span>Find Match</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {sub.status === 'needs_followup' && (
                      <Link
                        href={`/dashboard/submit?followup=${sub.id}`}
                        className="eco-btn-primary text-xs py-1.5 px-3 bg-[var(--color-warning-mid)] hover:bg-amber-700"
                      >
                        <span>Answer AI</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {isDeletable(sub.status) && (
                      <button
                        onClick={() => setDeleteTarget(sub)}
                        className="p-2 text-[var(--eco-text-3)] hover:text-[var(--color-error-mid)] hover:bg-[var(--color-error-bg)] rounded-md transition-colors"
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--eco-text)] font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--color-success)]" />
              Symbiosis Deals
            </h3>
            <span className="text-xs text-[var(--eco-text-3)] font-semibold">
              {symbiosisDeals.length} Active
            </span>
          </div>

          {symbiosisDeals.length === 0 ? (
            <div className="eco-card border-dashed p-10 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--eco-surface-2)] flex items-center justify-center text-[var(--eco-text-3)]">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="font-bold text-sm text-[var(--eco-text)] font-display">No active deals yet</h4>
                <p className="text-xs text-[var(--eco-text-3)]">
                  Active matching deals, outreach proposals, and verified agreements will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="eco-card overflow-hidden divide-y divide-[var(--eco-border)]">
              {symbiosisDeals.map((sub) => (
                <div
                  key={sub.id}
                  className="p-5 hover:bg-[var(--eco-surface-2)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--eco-text-3)] font-medium">
                        Matched {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                      {getStatusBadge(sub.status)}
                    </div>
                    <h4 className="font-semibold text-sm text-[var(--eco-text)] line-clamp-1">
                      {sub.rawDescription}
                    </h4>
                    {sub.match && (
                      <p className="text-xs text-[var(--eco-text-2)]">
                        Match Confidence:{' '}
                        <span className="font-semibold text-[var(--color-success)]">
                          {(sub.match.matchConfidence * 100).toFixed(0)}%
                        </span>{' '}
                        • Distance:{' '}
                        <span className="font-semibold text-[var(--eco-text)]">
                          {sub.match.distanceKm?.toFixed(1)} km
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {['match_proposed', 'proposal_drafted'].includes(sub.status) && (
                      <Link
                        href={`/dashboard/match/${sub.id}`}
                        className="eco-btn-primary text-xs py-1.5 px-3"
                      >
                        <span>Review Proposal</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {(sub.status === 'both_accepted' || sub.status === 'verified') && (
                      <Link
                        href={sub.status === 'verified' ? `/dashboard/certificate/${sub.match?.id || sub.id}` : `/dashboard/deal/${sub.match?.id || sub.id}`}
                        className={`text-xs py-1.5 px-3 flex items-center gap-1 transition-all ${
                          sub.status === 'verified'
                            ? 'eco-btn-primary bg-emerald-800 hover:bg-emerald-900 text-white'
                            : 'eco-btn-outline'
                        }`}
                      >
                        <span>{sub.status === 'verified' ? 'View Impact Certificate' : 'Track Deal'}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Received Proposals */}
        {incomingMatches.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--eco-text)] font-display flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[var(--color-info)]" />
              Received Proposals
            </h3>
            <div className="eco-card overflow-hidden divide-y divide-[var(--eco-border)]">
              {incomingMatches.map((m: any) => (
                <div
                  key={m.id}
                  className="p-5 hover:bg-[var(--eco-surface-2)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--eco-text-3)] font-medium">
                        Proposed {new Date(m.createdAt).toLocaleDateString()}
                      </span>
                      {getStatusBadge(m.status)}
                    </div>
                    <h4 className="font-semibold text-sm text-[var(--eco-text)]">
                      Incoming symbiosis match from a supplier
                    </h4>
                    <p className="text-xs text-[var(--eco-text-2)]">
                      Match Confidence:{' '}
                      <span className="font-semibold text-[var(--color-success)]">
                        {(m.matchConfidence * 100).toFixed(0)}%
                      </span>{' '}
                      • Distance:{' '}
                      <span className="font-semibold text-[var(--eco-text)]">
                        {m.distanceKm?.toFixed(1)} km
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {['match_proposed', 'proposal_drafted'].includes(m.status) && (
                      <Link
                        href={`/dashboard/match/${m.id}`}
                        className="eco-btn-primary text-xs py-1.5 px-3"
                      >
                        <span>Review Proposal</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {(m.status === 'both_accepted' || m.status === 'verified') && (
                      <Link
                        href={`/dashboard/deal/${m.id}`}
                        className="eco-btn-outline text-xs py-1.5 px-3"
                      >
                        <span>Track Deal</span>
                        <ChevronRight className="h-3.5 w-3.5" />
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
