'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Recycle, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Camera, 
  CheckCircle, 
  ShieldAlert, 
  Search, 
  DollarSign,
  Sparkles,
  MapPin,
  ShieldCheck,
  MessageSquare,
  Award,
  AlertTriangle
} from 'lucide-react';

import { SubmitSurplusSchema } from '@/lib/validation';

export default function SubmitSurplus() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const followupId = searchParams.get('followup');
  const existingId = searchParams.get('id');

  // Form fields
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('50');
  const [frequency, setFrequency] = useState('monthly');
  const [photoRef, setPhotoRef] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await api.uploadPhoto(formData);
      setPhotoRef(response.url);
    } catch (err: any) {
      setError(err.message || 'Photo upload failed. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pipeline response states
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'classifying' | 'scout_done' | 'matching' | 'alchemist_done' | 'drafting' | 'complete'>('idle');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (followupId) {
      loadFollowupData(followupId);
    } else if (existingId) {
      loadExistingSubmission(existingId);
    }
  }, [followupId, existingId]);

  const loadFollowupData = async (id: string) => {
    try {
      const data = await api.getSubmission(id);
      setDescription(data.rawDescription + ' - ');
      setCost(String(data.disposalCostPerUnit));
      setFrequency(data.disposalFrequency);
    } catch (err: any) {
      setError('Failed to load previous submission details');
    }
  };

  const loadExistingSubmission = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSubmission(id);
      setResult(data);
      if (['hazard_detected', 'needs_followup', 'low_confidence'].includes(data.status)) {
        setPipelineStatus('complete');
      } else if (data.status === 'submitted') {
        setPipelineStatus('scout_done');
      } else if (data.status === 'match_proposed') {
        const matchData = await api.getMatchBySubmission(id);
        setResult({
          submissionId: data.id,
          classification: data.classification,
          match: matchData.match,
          status: 'match_proposed'
        });
        setPipelineStatus('alchemist_done');
      } else if (data.status === 'proposal_drafted') {
        const matchData = await api.getMatchBySubmission(id);
        setResult({
          submissionId: data.id,
          classification: data.classification,
          match: matchData.match,
          drafts: matchData.outreachDrafts,
          status: 'proposal_drafted'
        });
        setPipelineStatus('complete');
      }
    } catch (err: any) {
      setError('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = SubmitSurplusSchema.safeParse({
      description,
      cost,
      frequency,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please fill in all required fields correctly');
      return;
    }

    setError(null);
    setLoading(true);
    setPipelineStatus('classifying');

    try {
      const photos = photoRef ? [photoRef] : [];
      const response = await api.createSubmission({
        businessId: user?.businessId,
        rawDescription: description,
        photoRefs: photos,
        disposalCostPerUnit: parseFloat(cost),
        disposalFrequency: frequency,
      });

      setResult(response);
      if (['hazard_detected', 'needs_followup', 'low_confidence'].includes(response.status)) {
        setPipelineStatus('complete');
      } else {
        setPipelineStatus('scout_done');
      }
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check inputs.');
      setPipelineStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleFindMatch = async () => {
    if (!result?.submissionId) return;
    setError(null);
    setLoading(true);
    setPipelineStatus('matching');
    try {
      const response = await api.findMatch(result.submissionId);
      if (response.status === 'no_match_found') {
        setResult((prev: any) => ({ ...prev, status: 'no_match_found' }));
        setPipelineStatus('complete');
      } else {
        setResult((prev: any) => ({ 
          ...prev, 
          status: 'match_proposed', 
          match: response.match 
        }));
        setPipelineStatus('alchemist_done');
      }
    } catch (err: any) {
      setError(err.message || 'Matching failed. Please try again.');
      setPipelineStatus('scout_done');
    } finally {
      setLoading(false);
    }
  };

  const handleDraftMessage = async () => {
    if (!result?.match?.id) return;
    setError(null);
    setLoading(true);
    setPipelineStatus('drafting');
    try {
      const response = await api.draftMessage(result.match.id);
      setResult((prev: any) => ({
        ...prev,
        status: 'proposal_drafted',
        drafts: response.outreachDrafts
      }));
      setPipelineStatus('complete');
    } catch (err: any) {
      setError(err.message || 'Drafting message failed. Please try again.');
      setPipelineStatus('alchemist_done');
    } finally {
      setLoading(false);
    }
  };

  const handleRefineDescription = (_followupQuestion: string) => {
    setPipelineStatus('idle');
    setResult(null);
  };

  const inputCls = "w-full bg-white border border-[#D1D5DB] focus:border-[#0F6FE8] rounded-xl px-4 py-3 text-sm text-[#111827] placeholder-[#9CA3AF] transition-all outline-none";
  const labelCls = "block text-xs font-semibold text-[#374151] uppercase tracking-wider mb-2";

  return (
    <div className="max-w-2xl mx-auto">
      {pipelineStatus === 'idle' && (
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-xl font-bold text-[#111827] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Describe Your Surplus</h2>
          <p className="text-sm text-[#4B5563] mb-6">
            Input the details of your industrial waste or surplus. The Scout Agent will classify the chemical and physical composition to check for safety and compatibility.
          </p>

          {error && (
            <div className="mb-6 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-start space-x-3 text-[#991B1B] text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={labelCls}>Material Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Example: 5 tons of organic spent brewer's grain and malt extract from brewing operations, free of chemical contaminants."
                className={`${inputCls} resize-none`}
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Disposal Cost per Ton / Unit ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="50"
                    className={`${inputCls} pl-9`}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Frequency of Waste Output</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className={`${inputCls} text-[#111827]`}
                  disabled={loading}
                >
                  <option value="once">One-time Surplus</option>
                  <option value="daily">Daily Output</option>
                  <option value="weekly">Weekly Output</option>
                  <option value="monthly">Monthly Output</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>Upload Material Photo (Optional)</label>
              
              {photoRef ? (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={photoRef} alt="Surplus Upload" className="h-12 w-12 rounded-lg object-cover border border-[#E5E7EB]" />
                    <div>
                      <span className="text-xs font-bold text-[#166534] block">Image Uploaded Successfully</span>
                      <span className="text-[10px] text-[#6B7280] block truncate max-w-[200px]">{photoRef}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoRef('')}
                    className="text-xs text-[#DC2626] hover:text-[#B91C1C] font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] border-dashed rounded-xl p-6 text-center hover:border-[#0F6FE8] hover:bg-[#EFF6FF] transition-all relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingPhoto || loading}
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-[#0F6FE8]" />
                        <span className="text-xs font-semibold text-[#4B5563] animate-pulse">Uploading to Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-8 w-8 text-[#9CA3AF]" />
                        <span className="text-xs font-semibold text-[#4B5563]">Click or drag photo here to upload</span>
                        <span className="text-[10px] text-[#9CA3AF]">Supports PNG, JPG, GIF up to 10MB</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Running AI Pipeline...
                </span>
              ) : (
                <>
                  Submit to Scout Agent
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Pipeline Loader — Classifying */}
      {pipelineStatus === 'classifying' && (
        <div className="glass-card p-12 rounded-2xl text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#EFF6FF] rounded-full blur-xl animate-pulse"></div>
              <Recycle className="h-16 w-16 text-[#0F6FE8] animate-spin relative z-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Analyzing Material Composition</h3>
            <p className="text-sm text-[#4B5563] max-w-sm mx-auto">
              The Scout Agent is classifying your material, assessing safety checks, and estimating composition...
            </p>
          </div>
        </div>
      )}

      {/* Pipeline Loader — Matching */}
      {pipelineStatus === 'matching' && (
        <div className="glass-card p-12 rounded-2xl text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#F0FDF4] rounded-full blur-xl animate-pulse"></div>
              <Sparkles className="h-16 w-16 text-[#166534] animate-spin relative z-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Searching for Symbiosis Match</h3>
            <p className="text-sm text-[#4B5563] max-w-sm mx-auto">
              The Alchemist Agent is searching the database for compatible reuse businesses, verifying chemical constraints, and ranking candidates...
            </p>
          </div>
        </div>
      )}

      {/* Pipeline Loader — Drafting */}
      {pipelineStatus === 'drafting' && (
        <div className="glass-card p-12 rounded-2xl text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#EEF2FF] rounded-full blur-xl animate-pulse"></div>
              <MessageSquare className="h-16 w-16 text-[#4338CA] animate-bounce relative z-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Drafting Proposal Agreement</h3>
            <p className="text-sm text-[#4B5563] max-w-sm mx-auto">
              The Negotiator Agent is calculating mutually beneficial pricing, contract lengths, and drafting the agreement messages...
            </p>
          </div>
        </div>
      )}

      {/* Scout Result Stage */}
      {pipelineStatus === 'scout_done' && result && (
        <div className="space-y-6">
          <div className="glass-card p-8 rounded-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  <ShieldCheck className="h-5 w-5 text-[#166534]" />
                  Scout Analysis Result
                </h3>
                <p className="text-xs text-[#6B7280] font-medium">Material classification and safety assessment complete</p>
              </div>
              <span className="bg-[#F0FDF4] text-[#166534] text-xs px-2.5 py-1 rounded-full border border-[#BBF7D0] font-semibold">
                Passes Safety Check
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Primary Category</span>
                <span className="text-sm font-semibold text-[#111827] mt-1 block capitalize">
                  {result.classification.primaryCategory.replace('_', ' ')}
                </span>
              </div>
              <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Subtype / Material</span>
                <span className="text-sm font-semibold text-[#111827] mt-1 block capitalize">
                  {result.classification.subtype || 'N/A'}
                </span>
              </div>
              <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] md:col-span-2">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Estimated Composition</span>
                <div className="mt-2 text-xs text-[#374151] space-y-1">
                  {result.classification.estimatedComposition ? (
                    Object.entries(
                      typeof result.classification.estimatedComposition === 'string'
                        ? JSON.parse(result.classification.estimatedComposition)
                        : result.classification.estimatedComposition
                    ).map(([key, val]: any) => (
                      <div key={key} className="flex justify-between border-b border-[#E5E7EB] pb-1 last:border-0 last:pb-0">
                        <span className="text-[#6B7280] capitalize">{key.replace('_', ' ')}</span>
                        <span className="font-semibold text-[#374151]">{val}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[#9CA3AF]">No composition details estimated</span>
                  )}
                </div>
              </div>
              <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] md:col-span-2">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Analysis Confidence</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#0F6FE8] h-full rounded-full transition-all" 
                      style={{ width: `${result.classification.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#0F6FE8]">
                    {(result.classification.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleFindMatch}
              className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group"
            >
              <Search className="h-4 w-4" />
              Find Symbiosis Match (Alchemist Agent)
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Alchemist Result Stage */}
      {pipelineStatus === 'alchemist_done' && result && (
        <div className="space-y-6">
          {/* Scout result summary (minimized) */}
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#166534]" />
              <div>
                <span className="text-xs font-semibold text-[#166534] block">Scout Assessment Complete</span>
                <span className="text-[10px] text-[#4B5563]">
                  {result.classification.primaryCategory.replace('_', ' ')} • {result.classification.subtype}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#166534]">{(result.classification.confidence * 100).toFixed(0)}% Conf.</span>
          </div>

          <div className="glass-card p-8 rounded-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  <Sparkles className="h-5 w-5 text-[#0F6FE8]" />
                  Alchemist Match Found
                </h3>
                <p className="text-xs text-[#6B7280] font-medium">Optimal compatible business pairing nearby</p>
              </div>
              <span className="bg-[#F0FDF4] text-[#166534] text-xs px-2.5 py-1 rounded-full border border-[#BBF7D0] font-semibold">
                {(result.match.matchConfidence * 100).toFixed(0)}% Match
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Target Partner Type</span>
                  <span className="text-sm font-semibold text-[#111827] mt-1 block capitalize">
                    {result.match.targetBusinessId ? 'Compatible Local Operation' : 'N/A'}
                  </span>
                </div>
                <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Proximity Distance</span>
                  <span className="text-sm font-semibold text-[#111827] mt-1 block flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-[#0F6FE8]" />
                    {result.match.distanceKm.toFixed(1)} km away
                  </span>
                </div>
                {result.match.estimatedSourceSavings && (
                  <div className="bg-[#F0FDF4] p-4 rounded-xl border border-[#BBF7D0] md:col-span-2">
                    <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Estimated Economic Savings</span>
                    <span className="text-lg font-bold text-[#166534] mt-1 block flex items-center gap-0.5">
                      <DollarSign className="h-5 w-5" />
                      {result.match.estimatedSourceSavings.toLocaleString()} / year saved
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-[#F9FAFB] p-5 rounded-xl border border-[#E5E7EB] space-y-2">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Match Rationale</span>
                <p className="text-xs text-[#4B5563] leading-relaxed italic">
                  &ldquo;{result.match.matchRationale}&rdquo;
                </p>
              </div>

              <div className="bg-[#FFFBEB] p-3 rounded-lg border border-[#FDE68A] text-[10px] text-[#92400E] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Contact details (phone, email, address) are completely hidden for privacy until both sides accept the terms.</span>
              </div>
            </div>

            <button
              onClick={handleDraftMessage}
              className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group"
            >
              <MessageSquare className="h-4 w-4" />
              Draft Proposal Agreement (Negotiator Agent)
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Complete Result Views */}
      {pipelineStatus === 'complete' && result && (
        <div className="space-y-6">
          {/* 1. Proposal Drafted Success View */}
          {result.status === 'proposal_drafted' && (
            <div className="glass-card p-8 rounded-2xl space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-[#F0FDF4] p-4 rounded-full border border-[#BBF7D0]">
                  <CheckCircle className="h-12 w-12 text-[#166534]" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Proposal Agreement Ready!</h3>
                <p className="text-sm text-[#4B5563] max-w-sm mx-auto">
                  Negotiator Agent drafted a friendly proposal including surplus details. The agreement has been sent to the partner&apos;s dashboard.
                </p>
              </div>

              <div className="bg-[#F9FAFB] p-6 rounded-xl border border-[#E5E7EB] text-left space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Deal Status</span>
                  <span className="text-sm font-semibold text-[#166534] mt-1 block flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    Awaiting Business Acceptance
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Privacy Lock</span>
                  <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                    Contact details will be shared automatically once both parties click &ldquo;Accept&rdquo;.
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push(`/dashboard/match/${result.submissionId}`)}
                className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center group"
              >
                Review Proposal Terms &amp; Accept
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* 2. Needs Follow-up Clarification */}
          {result.status === 'needs_followup' && (
            <div className="glass-card p-8 rounded-2xl space-y-6">
              <div className="flex items-center space-x-3 border-b border-[#E5E7EB] pb-4">
                <div className="bg-[#FFFBEB] p-2 rounded-xl border border-[#FDE68A]">
                  <AlertCircle className="h-6 w-6 text-[#D97706]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>AI Clarification Requested</h3>
                  <span className="text-[10px] font-bold text-[#92400E] uppercase tracking-wide">
                    Scout Confidence: {(result.classification.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="bg-[#FFFBEB] p-4 rounded-xl border border-[#FDE68A] text-sm text-[#374151] italic">
                &ldquo;{result.classification.followupQuestion}&rdquo;
              </div>

              <p className="text-xs text-[#6B7280]">
                To process your submission accurately, please refine your description above to answer this question.
              </p>

              <button
                onClick={() => handleRefineDescription(result.classification.followupQuestion)}
                className="w-full bg-white hover:bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] rounded-xl py-3 text-sm font-semibold transition-all shadow-sm flex items-center justify-center"
              >
                Refine Description
              </button>
            </div>
          )}

          {/* 3. Hazard Detected Block */}
          {result.status === 'hazard_detected' && (
            <div className="glass-card p-8 rounded-2xl space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-[#FEF2F2] p-4 rounded-full border border-[#FECACA]">
                  <ShieldAlert className="h-12 w-12 text-[#DC2626]" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Material Submission Rejected</h3>
                <p className="text-sm text-[#4B5563] max-w-sm mx-auto">
                  The Scout Agent flagged this material description as hazardous, regulated, or not within our approved non-hazardous scope.
                </p>
              </div>

              <div className="bg-[#FEF2F2] p-4 rounded-xl border border-[#FECACA] text-left text-xs text-[#991B1B]">
                <strong>Deterministic Hazard Block:</strong> Materials classified outside the six permitted categories or containing chemical/toxic markers are immediately blocked from matching to guarantee safety.
              </div>

              <button
                onClick={() => { setPipelineStatus('idle'); setResult(null); }}
                className="w-full bg-white hover:bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] rounded-xl py-3 text-sm font-semibold transition-colors shadow-sm"
              >
                Submit a Different Material
              </button>
            </div>
          )}

          {/* 4. No Candidate Match Found */}
          {result.status === 'no_match_found' && (
            <div className="glass-card p-8 rounded-2xl space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-[#F3F4F6] p-4 rounded-full border border-[#E5E7EB]">
                  <Search className="h-12 w-12 text-[#9CA3AF]" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>No Nearby Candidates</h3>
                <p className="text-sm text-[#4B5563] max-w-sm mx-auto">
                  Your material was classified as <strong className="text-[#374151]">{result.classification.primaryCategory.replace('_', ' ')}</strong>, but the Alchemist Agent could not discover compatible reuse businesses within a 15km radius.
                </p>
              </div>

              <div className="bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] text-left text-xs text-[#6B7280] leading-relaxed">
                We have saved your submission. Once a compatible consumer business registers in your area, our engine will automatically evaluate the match.
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
