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
      await fetchMatchDetails(); // reload details to show accepted status
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
      await fetchMatchDetails(); // reload details to show rejected status
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
      await fetchMatchDetails(); // reload details to retrieve the drafted proposal and update the UI
    } catch (err: any) {
      setError(err.message || 'Failed to draft proposal message. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 text-red-400">
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
        className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Rationale Banner */}
      <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl backdrop-blur-sm space-y-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h3 className="font-bold text-white">Alchemist Agent Match Analysis</h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          {match.matchRationale}
        </p>
        <div className="flex items-center space-x-6 text-xs text-slate-400 border-t border-slate-900 pt-3">
          <span className="flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1 text-emerald-400" />
            Distance: {match.distanceKm.toFixed(1)} km
          </span>
          <span>Match Confidence: {(match.matchConfidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Main Draft Agreement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {!myDraft ? (
          <div className="md:col-span-3 bg-slate-900/40 border border-slate-900 p-12 rounded-2xl text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-amber-500/10 p-4 rounded-full border border-amber-500/20">
                <Info className="h-10 w-10 text-amber-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Proposal Message Not Yet Drafted</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Alchemist Agent has recommended this partner, but the tailored terms and outreach proposal message are not drafted yet.
              </p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleDraftMessage}
                disabled={submitting}
                className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
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
            <div className="md:col-span-2 bg-slate-900/40 border border-slate-900 p-8 rounded-2xl space-y-6">
              <h3 className="text-lg font-bold text-white border-b border-slate-900 pb-3">Proposed Agreement</h3>
              
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900/80 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed italic">
                "{myDraft.draftMessage}"
              </div>

              <div className="flex items-start space-x-3 bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 text-xs text-blue-400">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong>Grounded Privacy Protection:</strong>
                  <p className="leading-relaxed">
                    EcoMatch never reveals names, telephone numbers, or specific addresses between businesses. All transactions are securely routed through a dedicated hauler once confirmed.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side: Terms & Acceptance */}
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-900 pb-3">Proposed Terms</h3>

                {terms && (
                  <div className="space-y-4">
                    {(terms.price !== undefined || terms.pricePerUnit !== undefined || terms.price_per_unit !== undefined) && (
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">PROPOSED PRICE</span>
                        <span className="text-lg font-bold text-white mt-0.5 block flex items-center">
                          <DollarSign className="h-4.5 w-4.5 text-emerald-400 mr-0.5" />
                          {(terms.price === 0 || terms.pricePerUnit === 0 || terms.price_per_unit === 0) ? 'Free' : `$${terms.price ?? terms.pricePerUnit ?? terms.price_per_unit} / unit`}
                        </span>
                      </div>
                    )}
                    {terms.frequency && (
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">FREQUENCY</span>
                        <span className="text-sm text-slate-300 font-medium mt-0.5 block capitalize">{terms.frequency}</span>
                      </div>
                    )}
                    {(terms.volume || terms.volume_estimate) && (
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">ESTIMATED VOLUME</span>
                        <span className="text-sm text-slate-300 font-medium mt-0.5 block">{terms.volume ?? terms.volume_estimate}</span>
                      </div>
                    )}
                    {(terms.contractLength || terms.contractLengthMonths || terms.contract_length_months) && (
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">CONTRACT LENGTH</span>
                        <span className="text-sm text-slate-300 font-medium mt-0.5 block">
                          {terms.contractLength ?? terms.contractLengthMonths ?? terms.contract_length_months} {typeof (terms.contractLength ?? terms.contractLengthMonths ?? terms.contract_length_months) === 'number' ? 'months' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons based on status */}
              <div className="space-y-3 pt-6 border-t border-slate-900">
                {myDraft.status === 'pending' && match.status !== 'rejected' && (
                  <>
                    <button
                      onClick={handleAccept}
                      disabled={submitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Accept Terms'}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={submitting}
                      className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      Reject Proposal
                    </button>
                  </>
                )}

                {myDraft.status === 'accepted' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start space-x-3 text-emerald-400 text-xs">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <div className="space-y-0.5">
                        <strong>Proposal Accepted</strong>
                        <p className="text-slate-400 leading-relaxed mt-1">
                          You have accepted the terms. Waiting for the counterparty to accept. You will be notified when both agree.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {(myDraft.status === 'rejected' || match.status === 'rejected') && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start space-x-3 text-red-400 text-xs">
                    <XCircle className="h-5 w-5 shrink-0" />
                    <div className="space-y-0.5">
                      <strong>Match Cancelled</strong>
                      <p className="text-slate-400 leading-relaxed mt-1">
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
