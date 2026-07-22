'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Info,
  MapPin,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

export default function MatchProposalReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const submissionId = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [match, setMatch] = useState<any>(null);
  const [myDraft, setMyDraft] = useState<any>(null);
  const [myRole, setMyRole] = useState<'source' | 'target' | null>(null);

  useEffect(() => {
    fetchMatchDetails();
  }, [submissionId]);

  const fetchMatchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      try {
        response = await api.getMatch(submissionId);
      } catch (err: any) {
        if (err.status === 404) {
          response = await api.getMatchBySubmission(submissionId);
        } else {
          throw err;
        }
      }

      const matchRecord = response.match;
      setMatch(matchRecord);

      let role: 'source' | 'target' | null = null;
      if (matchRecord.sourceBusinessId === user?.businessId) {
        role = 'source';
      } else if (matchRecord.targetBusinessId === user?.businessId) {
        role = 'target';
      }
      setMyRole(role);

      if (role) {
        const draft = response.outreachDrafts.find((d: any) => d.recipientRole === role);
        setMyDraft(draft);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load proposed match details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!myDraft) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.acceptMatch(myDraft.id);
      await fetchMatchDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to accept proposal');
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!myDraft) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.rejectMatch(myDraft.id);
      await fetchMatchDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to reject proposal');
      setSubmitting(false);
    }
  };

  const handleDraftMessage = async () => {
    if (!match?.id) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.draftMessage(match.id);
      await fetchMatchDetails();
    } catch (err: any) {
      setError(err.message || 'Failed to draft proposal message. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader2 className="h-8 w-8 anim-spin text-[var(--eco-accent)]" />
        <span className="text-xs font-semibold text-[var(--eco-text-3)]">Analyzing match...</span>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center text-xs font-semibold text-[var(--eco-text-2)] hover:text-[var(--eco-text)] transition-colors gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="p-4 rounded-lg bg-[var(--color-error-bg)] border border-[var(--color-error-border)] flex items-center gap-3 text-[var(--color-error)] text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error || 'Match details could not be retrieved.'}</span>
        </div>
      </div>
    );
  }

  const terms = myDraft
    ? (typeof myDraft.proposedTerms === 'string'
      ? JSON.parse(myDraft.proposedTerms)
      : myDraft.proposedTerms)
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center text-xs font-semibold text-[var(--eco-text-2)] hover:text-[var(--eco-text)] transition-colors gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Rationale Banner */}
      <div className="eco-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[var(--eco-accent)]" />
            <h3 className="font-bold text-base text-[var(--eco-text)] font-display">
              Alchemist Agent Match Analysis
            </h3>
          </div>
          <span className="badge-success">
            {(match.matchConfidence * 100).toFixed(0)}% Match
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[var(--eco-text-2)] leading-relaxed italic bg-[var(--eco-surface-2)] p-4 rounded-md">
          &ldquo;{match.matchRationale}&rdquo;
        </p>
        <div className="flex items-center gap-6 text-xs text-[var(--eco-text-3)] pt-1">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-[var(--eco-accent)]" />
            Distance: {match.distanceKm.toFixed(1)} km
          </span>
        </div>
      </div>

      {/* Main Draft Agreement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {!myDraft ? (
          <div className="eco-card p-10 text-center space-y-5 md:col-span-3">
            <div className="w-12 h-12 rounded-full bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] flex items-center justify-center text-[var(--color-warning-mid)] mx-auto">
              <Info className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--eco-text)] font-display">
                Proposal Message Not Yet Drafted
              </h3>
              <p className="text-xs text-[var(--eco-text-2)] max-w-md mx-auto">
                Alchemist Agent has recommended this partner, but the tailored terms and outreach proposal message are not drafted yet.
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleDraftMessage}
                disabled={submitting}
                className="eco-btn-primary py-3 px-6 text-xs"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 anim-spin" /> Drafting...
                  </span>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Draft Proposal Message
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Left Side: Draft Message */}
            <div className="eco-card p-6 space-y-5 md:col-span-2">
              <h3 className="text-base font-bold text-[var(--eco-text)] font-display border-b border-[var(--eco-border)] pb-3">
                Proposed Agreement
              </h3>

              <div className="p-5 rounded-lg bg-[var(--eco-surface-2)] border border-[var(--eco-border)] text-xs sm:text-sm text-[var(--eco-text-2)] whitespace-pre-wrap leading-relaxed">
                &ldquo;{myDraft.draftMessage}&rdquo;
              </div>

              <div className="p-4 rounded-lg bg-[var(--color-info-bg)] border border-[var(--color-info-border)] flex items-start gap-3 text-xs text-[var(--color-info)]">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="block text-[var(--eco-text)] font-semibold">Grounded Privacy Protection</strong>
                  <p className="text-[var(--eco-text-2)] leading-relaxed">
                    EcoMatch never reveals names, telephone numbers, or specific addresses between businesses upfront.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side: Terms & Acceptance */}
            <div className="eco-card p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <h3 className="text-xs font-bold tracking-overline text-[var(--eco-text-3)] border-b border-[var(--eco-border)] pb-2 font-display">
                  Proposed Terms
                </h3>

                {terms && (
                  <div className="space-y-4 text-xs">
                    {(terms.price !== undefined || terms.pricePerUnit !== undefined || terms.price_per_unit !== undefined) && (
                      <div>
                        <span className="text-[10px] text-[var(--eco-text-3)] font-semibold tracking-overline block">
                          PROPOSED PRICE
                        </span>
                        <span className="text-base font-bold text-[var(--eco-text)] mt-0.5 flex items-center">
                          {(terms.price === 0 || terms.pricePerUnit === 0 || terms.price_per_unit === 0)
                            ? 'Free'
                            : `$${terms.price ?? terms.pricePerUnit ?? terms.price_per_unit} / unit`}
                        </span>
                      </div>
                    )}
                    {terms.frequency && (
                      <div>
                        <span className="text-[10px] text-[var(--eco-text-3)] font-semibold tracking-overline block">
                          FREQUENCY
                        </span>
                        <span className="font-semibold text-[var(--eco-text)] capitalize mt-0.5 block">
                          {terms.frequency}
                        </span>
                      </div>
                    )}
                    {(terms.volume || terms.volume_estimate) && (
                      <div>
                        <span className="text-[10px] text-[var(--eco-text-3)] font-semibold tracking-overline block">
                          ESTIMATED VOLUME
                        </span>
                        <span className="font-semibold text-[var(--eco-text)] mt-0.5 block">
                          {terms.volume ?? terms.volume_estimate}
                        </span>
                      </div>
                    )}
                    {(terms.contractLength || terms.contractLengthMonths || terms.contract_length_months) && (
                      <div>
                        <span className="text-[10px] text-[var(--eco-text-3)] font-semibold tracking-overline block">
                          CONTRACT LENGTH
                        </span>
                        <span className="font-semibold text-[var(--eco-text)] mt-0.5 block">
                          {terms.contractLength ?? terms.contractLengthMonths ?? terms.contract_length_months}{' '}
                          {typeof (terms.contractLength ?? terms.contractLengthMonths ?? terms.contract_length_months) === 'number' ? 'months' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-4 border-t border-[var(--eco-border)]">
                {myDraft.status === 'pending' && match.status !== 'rejected' && (
                  <>
                    <button
                      onClick={handleAccept}
                      disabled={submitting}
                      className="eco-btn-primary w-full py-2.5 text-xs"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 anim-spin" /> : 'Accept Terms'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={submitting}
                      className="eco-btn-outline w-full py-2.5 text-xs text-[var(--color-error-mid)] border-[var(--color-error-border)] hover:bg-[var(--color-error-bg)]"
                    >
                      Reject Proposal
                    </button>
                  </>
                )}

                {myDraft.status === 'accepted' && (
                  <div className="p-3 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success-border)] flex items-start gap-2 text-xs text-[var(--color-success)]">
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Proposal Accepted</strong>
                      <p className="text-[var(--eco-text-2)] mt-0.5">
                        Waiting for counterparty acceptance.
                      </p>
                    </div>
                  </div>
                )}

                {(myDraft.status === 'rejected' || match.status === 'rejected') && (
                  <div className="p-3 rounded-lg bg-[var(--color-error-bg)] border border-[var(--color-error-border)] flex items-start gap-2 text-xs text-[var(--color-error)]">
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>Match Cancelled</strong>
                      <p className="text-[var(--eco-text-2)] mt-0.5">
                        Rejected by one of the parties.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
