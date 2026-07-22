'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Leaf,
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

function SubmitSurplusContent() {
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

  const inputCls = "w-full border rounded-md px-4 py-3 text-sm outline-none transition-all resize-none";
  const inputStyle: React.CSSProperties = { background: 'var(--eco-surface)', borderColor: 'var(--eco-border)', color: 'var(--eco-text)' };
  const labelCls = "block tracking-overline text-[10px] font-semibold mb-2";

  return (
    <div className="max-w-2xl mx-auto">
      {pipelineStatus === 'idle' && (
        <div className="eco-card p-8">
          <h2 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--eco-text)' }}>Describe Your Surplus</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--eco-text-2)' }}>
            Input the details of your industrial waste or surplus. The Scout Agent will classify the chemical and physical composition to check for safety and compatibility.
          </p>

          {error && (
            <div className="mb-6 rounded-lg p-4 flex items-start gap-3 text-sm badge-error">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={labelCls} style={{ color: 'var(--eco-text-2)' }}>Material Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Example: 5 tons of organic spent brewer's grain and malt extract from brewing operations, free of chemical contaminants."
                className={inputCls}
                style={inputStyle}
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelCls} style={{ color: 'var(--eco-text-2)' }}>Disposal Cost per Ton / Unit ($)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10" style={{ color: 'var(--eco-text-3)' }}>
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="50"
                    className="w-full border rounded-md pl-10 pr-4 py-3 text-sm outline-none transition-all"
                    style={inputStyle}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelCls} style={{ color: 'var(--eco-text-2)' }}>Frequency of Waste Output</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
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
                <label className={labelCls} style={{ color: 'var(--eco-text-2)' }}>Upload Material Photo (Optional)</label>

              {photoRef ? (
                <div className="p-4 rounded-md flex items-center justify-between" style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
                  <div className="flex items-center gap-3">
                    <img src={photoRef} alt="Surplus Upload" className="h-12 w-12 rounded-md object-cover" style={{ border: '1px solid var(--eco-border)' }} />
                    <div>
                      <span className="text-xs font-bold block" style={{ color: 'var(--color-success)' }}>Image Uploaded Successfully</span>
                      <span className="text-[10px] block truncate max-w-[200px]" style={{ color: 'var(--eco-text-3)' }}>{photoRef}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoRef('')}
                    className="text-xs font-semibold"
                    style={{ color: 'var(--color-error-mid)' }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="border border-dashed rounded-md p-6 text-center transition-all relative" style={{ background: 'var(--eco-surface-2)', borderColor: 'var(--eco-border)' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingPhoto || loading}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--eco-primary)' }} />
                        <span className="text-xs font-semibold animate-pulse" style={{ color: 'var(--eco-text-2)' }}>Uploading to Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-8 w-8" style={{ color: 'var(--eco-text-3)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--eco-text-2)' }}>Click or drag photo here to upload</span>
                        <span className="text-[10px]" style={{ color: 'var(--eco-text-3)' }}>Supports PNG, JPG, GIF up to 10MB</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="eco-btn-primary w-full py-3.5 text-sm"
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
        <div className="eco-card p-12 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: 'var(--eco-surface-2)' }} />
              <Leaf className="h-16 w-16 animate-spin relative z-10" style={{ color: 'var(--eco-primary)' }} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-xl font-bold" style={{ color: 'var(--eco-text)' }}>Analyzing Material Composition</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--eco-text-2)' }}>
              The Scout Agent is classifying your material, assessing safety checks, and estimating composition...
            </p>
          </div>
        </div>
      )}

      {/* Pipeline Loader — Matching */}
      {pipelineStatus === 'matching' && (
        <div className="eco-card p-12 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: 'var(--eco-surface-2)' }} />
              <Sparkles className="h-16 w-16 animate-spin relative z-10" style={{ color: 'var(--eco-primary)' }} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-xl font-bold" style={{ color: 'var(--eco-text)' }}>Searching for Symbiosis Match</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--eco-text-2)' }}>
              The Alchemist Agent is searching the database for compatible reuse businesses, verifying chemical constraints, and ranking candidates...
            </p>
          </div>
        </div>
      )}

      {/* Pipeline Loader — Drafting */}
      {pipelineStatus === 'drafting' && (
        <div className="eco-card p-12 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: 'var(--eco-surface-2)' }} />
              <MessageSquare className="h-16 w-16 animate-bounce relative z-10" style={{ color: 'var(--eco-primary)' }} />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-xl font-bold" style={{ color: 'var(--eco-text)' }}>Drafting Proposal Agreement</h3>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--eco-text-2)' }}>
              The Negotiator Agent is calculating mutually beneficial pricing, contract lengths, and drafting the agreement messages...
            </p>
          </div>
        </div>
      )}

      {/* Scout Result Stage */}
      {pipelineStatus === 'scout_done' && result && (
        <div className="space-y-6">
          <div className="eco-card p-8 space-y-6">
            <div className="flex justify-between items-center pb-4" style={{ borderBottom: '1px solid var(--eco-border)' }}>
              <div>
                <h3 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: 'var(--eco-text)' }}>
                  <ShieldCheck className="h-5 w-5" style={{ color: 'var(--color-success)' }} />
                  Scout Analysis Result
                </h3>
                <p className="text-xs font-medium" style={{ color: 'var(--eco-text-3)' }}>Material classification and safety assessment complete</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold badge-success">
                Passes Safety Check
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)' }}>
                <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Primary Category</span>
                <span className="text-sm font-semibold mt-1 block capitalize" style={{ color: 'var(--eco-text)' }}>
                  {result.classification.primaryCategory.replace('_', ' ')}
                </span>
              </div>
              <div className="p-4 rounded-md" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)' }}>
                <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Subtype / Material</span>
                <span className="text-sm font-semibold mt-1 block capitalize" style={{ color: 'var(--eco-text)' }}>
                  {result.classification.subtype || 'N/A'}
                </span>
              </div>
              <div className="p-4 rounded-md md:col-span-2" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)' }}>
                <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Estimated Composition</span>
                <div className="mt-2 text-xs space-y-1" style={{ color: 'var(--eco-text-2)' }}>
                  {result.classification.estimatedComposition ? (
                    Object.entries(
                      typeof result.classification.estimatedComposition === 'string'
                        ? JSON.parse(result.classification.estimatedComposition)
                        : result.classification.estimatedComposition
                    ).map(([key, val]: any) => (
                      <div key={key} className="flex justify-between pb-1 last:pb-0" style={{ borderBottom: '1px solid var(--eco-border)' }}>
                        <span className="capitalize" style={{ color: 'var(--eco-text-3)' }}>{key.replace('_', ' ')}</span>
                        <span className="font-semibold" style={{ color: 'var(--eco-text-2)' }}>{val}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'var(--eco-text-3)' }}>No composition details estimated</span>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-md md:col-span-2" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)' }}>
                <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Analysis Confidence</span>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--eco-border)' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${(result.classification?.confidence || 0.9) * 100}%`, background: '#1B4332' }}
                    />
                  </div>
                  <span className="text-xs font-extrabold shrink-0" style={{ color: '#1B4332' }}>
                    {((result.classification?.confidence || 0.9) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleFindMatch}
              className="eco-btn-primary w-full py-3.5 text-sm gap-2"
            >
              <Search className="h-4 w-4" />
              Find Symbiosis Match (Alchemist Agent)
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Alchemist Result Stage */}
      {pipelineStatus === 'alchemist_done' && result && (
        <div className="space-y-6">
          {/* Scout result summary (minimized) */}
          <div className="p-4 rounded-md flex items-center justify-between" style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" style={{ color: 'var(--color-success)' }} />
              <div>
                <span className="text-xs font-semibold block" style={{ color: 'var(--color-success)' }}>Scout Assessment Complete</span>
                <span className="text-[10px]" style={{ color: 'var(--eco-text-2)' }}>
                  {result.classification.primaryCategory.replace('_', ' ')} • {result.classification.subtype}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold" style={{ color: 'var(--color-success)' }}>{(result.classification.confidence * 100).toFixed(0)}% Conf.</span>
          </div>

          <div className="eco-card p-8 space-y-6">
            <div className="flex justify-between items-center pb-4" style={{ borderBottom: '1px solid var(--eco-border)' }}>
              <div>
                <h3 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: 'var(--eco-text)' }}>
                  <Sparkles className="h-5 w-5" style={{ color: 'var(--eco-primary)' }} />
                  Alchemist Match Found
                </h3>
                <p className="text-xs font-medium" style={{ color: 'var(--eco-text-3)' }}>Optimal compatible business pairing nearby</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold badge-success">
                {(result.match.matchConfidence * 100).toFixed(0)}% Match
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-md" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)' }}>
                  <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Target Partner Type</span>
                  <span className="text-sm font-semibold mt-1 block capitalize" style={{ color: 'var(--eco-text)' }}>
                    {result.match.targetBusinessId ? 'Compatible Local Operation' : 'N/A'}
                  </span>
                </div>
                <div className="p-4 rounded-md" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)' }}>
                  <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Proximity Distance</span>
                  <span className="text-sm font-semibold mt-1 flex items-center gap-1" style={{ color: 'var(--eco-text)' }}>
                    <MapPin className="h-4 w-4" style={{ color: 'var(--eco-primary)' }} />
                    {result.match.distanceKm.toFixed(1)} km away
                  </span>
                </div>
                {result.match.estimatedSourceSavings && (
                  <div className="p-4 rounded-md md:col-span-2" style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
                    <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Estimated Economic Savings</span>
                    <span className="text-lg font-bold mt-1 flex items-center gap-0.5" style={{ color: 'var(--color-success)' }}>
                      <DollarSign className="h-5 w-5" />
                      {result.match.estimatedSourceSavings.toLocaleString()} / year saved
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5 rounded-md space-y-2" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)' }}>
                <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Match Rationale</span>
                <p className="text-xs leading-relaxed italic" style={{ color: 'var(--eco-text-2)' }}>
                  &ldquo;{result.match.matchRationale}&rdquo;
                </p>
              </div>

              <div className="p-3 rounded-md text-[10px] flex items-start gap-2" style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--color-warning)' }}>
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Contact details (phone, email, address) are completely hidden for privacy until both sides accept the terms.</span>
              </div>
            </div>

            <button
              onClick={handleDraftMessage}
              className="eco-btn-primary w-full py-3.5 text-sm gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Draft Proposal Agreement (Negotiator Agent)
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Complete Result Views */}
      {pipelineStatus === 'complete' && result && (
        <div className="space-y-6">
          {/* 1. Proposal Drafted Success View */}
          {result.status === 'proposal_drafted' && (
            <div className="eco-card p-8 space-y-6 text-center">
              <div className="flex justify-center">
                <div className="p-4 rounded-full" style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
                  <CheckCircle className="h-12 w-12" style={{ color: 'var(--color-success)' }} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold" style={{ color: 'var(--eco-text)' }}>Proposal Agreement Ready!</h3>
                <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--eco-text-2)' }}>
                  Negotiator Agent drafted a friendly proposal including surplus details. The agreement has been sent to the partner&apos;s dashboard.
                </p>
              </div>

              <div className="p-6 rounded-md text-left space-y-4" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)' }}>
                <div>
                  <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Deal Status</span>
                  <span className="text-sm font-semibold mt-1 flex items-center gap-1.5" style={{ color: 'var(--color-success)' }}>
                    <ShieldCheck className="h-4 w-4" />
                    Awaiting Business Acceptance
                  </span>
                </div>
                <div>
                  <span className="tracking-overline text-[10px] font-bold block" style={{ color: 'var(--eco-text-3)' }}>Privacy Lock</span>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--eco-text-2)' }}>
                    Contact details will be shared automatically once both parties click &ldquo;Accept&rdquo;.
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push(`/dashboard/match/${result.submissionId}`)}
                className="eco-btn-primary w-full py-3.5 text-sm"
              >
                Review Proposal Terms &amp; Accept
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          )}

          {/* 2. Needs Follow-up Clarification */}
          {result.status === 'needs_followup' && (
            <div className="eco-card p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--eco-border)' }}>
                <div className="p-2 rounded-md" style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)' }}>
                  <AlertCircle className="h-6 w-6" style={{ color: 'var(--color-warning-mid)' }} />
                </div>
                <div>
                  <h3 className="font-display font-bold" style={{ color: 'var(--eco-text)' }}>AI Clarification Requested</h3>
                  <span className="tracking-overline text-[10px] font-bold" style={{ color: 'var(--color-warning)' }}>
                    Scout Confidence: {(result.classification.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-md text-sm italic" style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', color: 'var(--eco-text-2)' }}>
                &ldquo;{result.classification.followupQuestion}&rdquo;
              </div>

              <p className="text-xs" style={{ color: 'var(--eco-text-3)' }}>
                To process your submission accurately, please refine your description above to answer this question.
              </p>

              <button
                onClick={() => handleRefineDescription(result.classification.followupQuestion)}
                className="w-full rounded-md py-3 text-sm font-semibold border transition-all"
                style={{ background: 'var(--eco-surface)', borderColor: 'var(--eco-border)', color: 'var(--eco-text-2)' }}
              >
                Refine Description
              </button>
            </div>
          )}

          {/* 3. Hazard Detected Block */}
          {result.status === 'hazard_detected' && (
            <div className="eco-card p-8 space-y-6 text-center">
              <div className="flex justify-center">
                <div className="p-4 rounded-full" style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)' }}>
                  <ShieldAlert className="h-12 w-12" style={{ color: 'var(--color-error-mid)' }} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold" style={{ color: 'var(--eco-text)' }}>Material Submission Rejected</h3>
                <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--eco-text-2)' }}>
                  The Scout Agent flagged this material description as hazardous, regulated, or not within our approved non-hazardous scope.
                </p>
              </div>

              <div className="p-4 rounded-md text-left text-xs" style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', color: 'var(--color-error)' }}>
                <strong>Deterministic Hazard Block:</strong> Materials classified outside the six permitted categories or containing chemical/toxic markers are immediately blocked from matching to guarantee safety.
              </div>

              <button
                onClick={() => { setPipelineStatus('idle'); setResult(null); }}
                className="w-full rounded-md py-3 text-sm font-semibold border transition-all"
                style={{ background: 'var(--eco-surface)', borderColor: 'var(--eco-border)', color: 'var(--eco-text-2)' }}
              >
                Submit a Different Material
              </button>
            </div>
          )}

          {/* 4. No Candidate Match Found */}
          {result.status === 'no_match_found' && (
            <div className="eco-card p-8 space-y-6 text-center">
              <div className="flex justify-center">
                <div className="p-4 rounded-full" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)' }}>
                  <Search className="h-12 w-12" style={{ color: 'var(--eco-text-3)' }} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold" style={{ color: 'var(--eco-text)' }}>No Nearby Candidates</h3>
                <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--eco-text-2)' }}>
                  Your material was classified as <strong style={{ color: 'var(--eco-text)' }}>{result.classification.primaryCategory.replace('_', ' ')}</strong>, but the Alchemist Agent could not discover compatible reuse businesses within a 15km radius.
                </p>
              </div>

              <div className="p-4 rounded-md text-left text-xs leading-relaxed" style={{ background: 'var(--eco-surface-2)', border: '1px solid var(--eco-border)', color: 'var(--eco-text-2)' }}>
                We have saved your submission. Once a compatible consumer business registers in your area, our engine will automatically evaluate the match.
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="eco-btn-primary w-full py-3 text-sm"
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

export default function SubmitSurplusMaterialPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader2 className="h-8 w-8 anim-spin text-[var(--eco-accent)]" />
        <span className="text-xs font-semibold text-[var(--eco-text-3)]">Loading form...</span>
      </div>
    }>
      <SubmitSurplusContent />
    </Suspense>
  );
}

