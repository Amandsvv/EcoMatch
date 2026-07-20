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
  MessageSquare 
} from 'lucide-react';

export default function MatchReview({ params }: { params: Promise<{ id: string }> }) {
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

      // Determine my role in this match
      let role: 'source' | 'target' | null = null;
      if (matchRecord.sourceBusinessId === user?.businessId) {
        role = 'source';
      } else if (matchRecord.targetBusinessId === user?.businessId) {
        role = 'target';
      }
      setMyRole(role);

      // Find my draft
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
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F6FE8]" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center text-sm text-[#4B5563] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-center space-x-3 text-[#991B1B]">
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
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center text-sm text-[#4B5563] hover:text-[#111827] transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Rationale Banner */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-[#0F6FE8]" />
          <h3 className="font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Alchemist Agent Match Analysis</h3>
        </div>
        <p className="text-sm text-[#374151] leading-relaxed">
          {match.matchRationale}
        </p>
        <div className="flex items-center space-x-6 text-xs text-[#6B7280] border-t border-[#E5E7EB] pt-3">
          <span className="flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1 text-[#0F6FE8]" />
            Distance: {match.distanceKm.toFixed(1)} km
          </span>
          <span>Match Confidence: {(match.matchConfidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Main Draft Agreement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {!myDraft ? (
          <div className="glass-card p-12 rounded-2xl text-center space-y-6 md:col-span-3">
            <div className="flex justify-center">
              <div className="bg-[#FFFBEB] p-4 rounded-full border border-[#FDE68A]">
                <Info className="h-10 w-10 text-[#D97706]" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Proposal Message Not Yet Drafted</h3>
              <p className="text-sm text-[#4B5563] max-w-md mx-auto">
                Alchemist Agent has recommended this partner, but the tailored terms and outreach proposal message are not drafted yet.
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleDraftMessage}
                disabled={submitting}
                className="w-full max-w-sm bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
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
            <div className="glass-card p-8 rounded-2xl space-y-6 md:col-span-2">
              <h3 className="text-lg font-bold text-[#111827] border-b border-[#E5E7EB] pb-3" style={{ fontFamily: 'var(--font-heading)' }}>Proposed Agreement</h3>
              
              <div className="bg-[#F9FAFB] p-6 rounded-xl border border-[#E5E7EB] text-sm text-[#374151] whitespace-pre-wrap leading-relaxed italic">
                &ldquo;{myDraft.draftMessage}&rdquo;
              </div>

              <div className="flex items-start space-x-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 text-xs text-[#1D4ED8]">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>Grounded Privacy Protection:</strong>
                  <p className="leading-relaxed text-[#374151]">
                    EcoMatch never reveals names, telephone numbers, or specific addresses between businesses. All transactions are securely routed through a dedicated hauler once confirmed.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side: Terms & Acceptance */}
            <div className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-3" style={{ fontFamily: 'var(--font-heading)' }}>Proposed Terms</h3>

                {terms && (
                  <div className="space-y-4">
                    {(terms.price !== undefined || terms.pricePerUnit !== undefined || terms.price_per_unit !== undefined) && (
                      <div>
                        <span className="text-[10px] text-[#6B7280] font-semibold block uppercase">PROPOSED PRICE</span>
                        <span className="text-lg font-bold text-[#111827] mt-0.5 block flex items-center">
                          <DollarSign className="h-4.5 w-4.5 text-[#0F6FE8] mr-0.5" />
                          {(terms.price === 0 || terms.pricePerUnit === 0 || terms.price_per_unit === 0) ? 'Free' : `$${terms.price ?? terms.pricePerUnit ?? terms.price_per_unit} / unit`}
                        </span>
                      </div>
                    )}
                    {terms.frequency && (
                      <div>
                        <span className="text-[10px] text-[#6B7280] font-semibold block uppercase">FREQUENCY</span>
                        <span className="text-sm text-[#374151] font-medium mt-0.5 block capitalize">{terms.frequency}</span>
                      </div>
                    )}
                    {(terms.volume || terms.volume_estimate) && (
                      <div>
                        <span className="text-[10px] text-[#6B7280] font-semibold block uppercase">ESTIMATED VOLUME</span>
                        <span className="text-sm text-[#374151] font-medium mt-0.5 block">{terms.volume ?? terms.volume_estimate}</span>
                      </div>
                    )}
                    {(terms.contractLength || terms.contractLengthMonths || terms.contract_length_months) && (
                      <div>
                        <span className="text-[10px] text-[#6B7280] font-semibold block uppercase">CONTRACT LENGTH</span>
                        <span className="text-sm text-[#374151] font-medium mt-0.5 block">
                          {terms.contractLength ?? terms.contractLengthMonths ?? terms.contract_length_months} {typeof (terms.contractLength ?? terms.contractLengthMonths ?? terms.contract_length_months) === 'number' ? 'months' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons based on status */}
              <div className="space-y-3 pt-6 border-t border-[#E5E7EB]">
                {myDraft.status === 'pending' && match.status !== 'rejected' && (
                  <>
                    <button
                      onClick={handleAccept}
                      disabled={submitting}
                      className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Accept Terms'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={submitting}
                      className="w-full bg-white hover:bg-[#FEF2F2] border border-[#E5E7EB] hover:border-[#FECACA] text-[#6B7280] hover:text-[#991B1B] rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      Reject Proposal
                    </button>
                  </>
                )}

                {myDraft.status === 'accepted' && (
                  <div className="space-y-4">
                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 flex items-start space-x-3 text-[#166534] text-xs">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <div className="space-y-0.5">
                        <strong>Proposal Accepted</strong>
                        <p className="text-[#4B5563] leading-relaxed mt-1">
                          You have accepted the terms. Waiting for the counterparty to accept. You will be notified when both agree.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(myDraft.status === 'rejected' || match.status === 'rejected') && (
                  <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-start space-x-3 text-[#991B1B] text-xs">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <div className="space-y-0.5">
                      <strong>Match Cancelled</strong>
                      <p className="text-[#4B5563] leading-relaxed mt-1">
                        This match proposal was rejected by one of the businesses. Our system is searching for alternative candidates.
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
