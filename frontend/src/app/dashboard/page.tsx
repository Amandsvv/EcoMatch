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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="font-bold text-white text-base">Delete Submission?</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-400 leading-relaxed">
          This will permanently delete:{' '}
          <span className="text-slate-200 font-medium">
            &ldquo;{submission.rawDescription.slice(0, 80)}{submission.rawDescription.length > 80 ? '…' : ''}&rdquo;
          </span>
          . This action cannot be undone.
        </p>

        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 border border-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
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
  const { logout } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
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
        if (sub.status === 'verified') {
          try {
            const matchData = await api.getMatch(sub.id);
            if (matchData) {
              const cert = await api.getCertificate(matchData.id);
              if (cert) {
                co2 += cert.co2eAvoidedKg;
                dollars += cert.dollarsSaved;
              }
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
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/5 text-blue-400 border border-blue-500/10">
            <Clock className="h-3.5 w-3.5" />
            <span>Classifying</span>
          </span>
        );
      case 'needs_followup':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/5 text-amber-400 border border-amber-500/10">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Clarification Needed</span>
          </span>
        );
      case 'hazard_detected':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/5 text-red-400 border border-red-500/10">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Blocked (Hazardous)</span>
          </span>
        );
      case 'low_confidence':
      case 'no_match_found':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/5 text-slate-400 border border-slate-500/10">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>No Match Found</span>
          </span>
        );
      case 'match_proposed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/5 text-emerald-400 border border-emerald-500/10">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Match Proposed</span>
          </span>
        );
      case 'both_accepted':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/5 text-teal-400 border border-teal-500/10">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Logistics Booked</span>
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/5 text-indigo-400 border border-indigo-500/10">
            <Award className="h-3.5 w-3.5" />
            <span>Verified (Impact Issued)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/5 text-slate-400 border border-slate-500/10">
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
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

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
        <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Marketplace Overview</h2>
            <p className="text-sm text-slate-400 max-w-xl">
              Track your surplus materials, review matches created by the Alchemist Agent, and view your sustainability impact certifications.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 h-11 inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 border border-emerald-500/20"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Submit Surplus Material
            </Link>
            {/* Logout — visible on mobile only (sidebar handles desktop) */}
            <button
              onClick={logout}
              className="md:hidden h-11 px-4 inline-flex items-center justify-center rounded-xl text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/5 border border-slate-800 transition-all"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Active Proposed Matches</span>
            <span className="text-3xl font-extrabold text-white mt-2 block">{activeDealsCount}</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Verified Carbon Saved</span>
            <span className="text-3xl font-extrabold text-emerald-400 mt-2 block">
              {co2Saved > 0 ? `${co2Saved.toLocaleString()} kg` : '0 kg'}
            </span>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Disposal Savings</span>
            <span className="text-3xl font-extrabold text-teal-400 mt-2 block">
              {dollarsSaved > 0 ? `$${dollarsSaved.toLocaleString()}` : '$0'}
            </span>
          </div>
        </div>

        {/* Error View */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Delete error banner */}
        {deleteError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between text-red-400">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{deleteError}</span>
            </div>
            <button onClick={() => setDeleteError(null)} className="text-red-400/60 hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Submissions Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Material Submissions & Matches</h3>

          {submissions.length === 0 ? (
            <div className="bg-slate-900/20 border border-slate-900 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4">
              <Recycle className="h-12 w-12 text-slate-700" />
              <div className="space-y-1">
                <h4 className="font-bold text-white">No submissions or matches yet</h4>
                <p className="text-sm text-slate-500 max-w-sm">
                  Describe your material (brewery grains, cardboard, cooking oil) to find nearby symbiosis matches.
                </p>
              </div>

              <Link
                href="/dashboard/submit"
                className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Submit First Material
              </Link>
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden divide-y divide-slate-900">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-6 hover:bg-slate-900/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">
                        Submitted {new Date(sub.createdAt).toLocaleDateString()}
                      </span>
                      {getStatusBadge(sub.status)}
                    </div>
                    <h4 className="font-semibold text-white text-sm line-clamp-1">
                      {sub.rawDescription}
                    </h4>
                    {sub.classification && (
                      <p className="text-xs text-slate-400">
                        Classified as:{' '}
                        <span className="text-slate-300 font-medium">
                          {sub.classification.primaryCategory.replace('_', ' ')}
                        </span>{' '}
                        (Confidence: {(sub.classification.confidence * 100).toFixed(0)}%)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {sub.status === 'match_proposed' && (
                      <Link
                        href={`/dashboard/match/${sub.id}`}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <span>Review Proposed Match</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                    {(sub.status === 'both_accepted' || sub.status === 'verified') && (
                      <Link
                        href={`/dashboard/deal/${sub.id}`}
                        className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <span>Track Deal</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                    {sub.status === 'needs_followup' && (
                      <Link
                        href={`/dashboard/submit?followup=${sub.id}`}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <span>Respond to Question</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}

                    {/* Delete button — only for non-active statuses */}
                    {isDeletable(sub.status) && (
                      <button
                        onClick={() => setDeleteTarget(sub)}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 transition-all"
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
      </div>
    </>
  );
}
