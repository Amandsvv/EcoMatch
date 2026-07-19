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
  Truck,
  Award,
  AlertTriangle
} from 'lucide-react';

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
      // Pre-fill fields to make it easy to refine
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
    if (!description || !cost || !frequency) {
      setError('Please fill in all required fields');
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

  const handleRefineDescription = (followupQuestion: string) => {
    // Keep the current description and prepare for answer
    setPipelineStatus('idle');
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {pipelineStatus === 'idle' && (
        <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
          
          <h2 className="text-xl font-bold text-white mb-2">Describe Your Surplus</h2>
          <p className="text-sm text-slate-400 mb-6">
            Input the details of your industrial waste or surplus. The Scout Agent will classify the chemical and physical composition to check for safety and compatibility.
          </p>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start space-x-3 text-red-400 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Material Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Example: 5 tons of organic spent brewer's grain and malt extract from brewing operations, free of chemical contaminants."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm placeholder-slate-600 transition-all outline-none resize-none"
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Disposal Cost per Ton / Unit ($)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="50"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-4 py-3 text-sm placeholder-slate-600 transition-all outline-none"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Frequency of Waste Output
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 text-sm transition-all outline-none text-slate-300"
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
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Upload Material Photo (Optional)
              </label>
              
              {photoRef ? (
                <div className="bg-slate-950 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={photoRef} alt="Surplus Upload" className="h-12 w-12 rounded-lg object-cover border border-slate-800" />
                    <div>
                      <span className="text-xs font-bold text-white block">Image Uploaded Successfully</span>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[200px]">{photoRef}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoRef('')}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 border-dashed rounded-xl p-6 text-center hover:border-emerald-500/50 transition-all relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer animate-pulse"
                    disabled={uploadingPhoto || loading}
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                        <span className="text-xs font-semibold text-slate-400 animate-pulse">Uploading to Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-8 w-8 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-400">Click or drag photo here to upload</span>
                        <span className="text-[10px] text-slate-600">Supports PNG, JPG, GIF up to 10MB</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>


            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
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

      {/* Pipeline Loader View */}
      {pipelineStatus === 'classifying' && (
        <div className="bg-slate-900/40 border border-slate-900 p-12 rounded-3xl backdrop-blur-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
              <Recycle className="h-16 w-16 text-emerald-400 animate-spin relative z-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Analyzing Material Composition</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              The Scout Agent is classifying your material, assessing safety checks, and estimating composition...
            </p>
          </div>
        </div>
      )}

      {pipelineStatus === 'matching' && (
        <div className="bg-slate-900/40 border border-slate-900 p-12 rounded-3xl backdrop-blur-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
              <Sparkles className="h-16 w-16 text-emerald-400 animate-spin relative z-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Searching for Symbiosis Match</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              The Alchemist Agent is searching the database for compatible reuse businesses, verifying chemical constraints, and ranking candidates...
            </p>
          </div>
        </div>
      )}

      {pipelineStatus === 'drafting' && (
        <div className="bg-slate-900/40 border border-slate-900 p-12 rounded-3xl backdrop-blur-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
              <MessageSquare className="h-16 w-16 text-emerald-400 animate-bounce relative z-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Drafting Proposal Agreement</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              The Negotiator Agent is calculating mutually beneficial pricing, contract lengths, and drafting the agreement messages...
            </p>
          </div>
        </div>
      )}

      {/* Scout Result Stage */}
      {pipelineStatus === 'scout_done' && result && (
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Scout Analysis Result
                </h3>
                <p className="text-xs text-slate-400 font-medium">Material classification and safety assessment complete</p>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                Passes Safety Check
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Primary Category</span>
                <span className="text-sm font-semibold text-white mt-1 block capitalize">
                  {result.classification.primaryCategory.replace('_', ' ')}
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subtype / Material</span>
                <span className="text-sm font-semibold text-white mt-1 block capitalize">
                  {result.classification.subtype || 'N/A'}
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 md:col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estimated Composition</span>
                <div className="mt-2 text-xs text-slate-300 space-y-1">
                  {result.classification.estimatedComposition ? (
                    Object.entries(
                      typeof result.classification.estimatedComposition === 'string'
                        ? JSON.parse(result.classification.estimatedComposition)
                        : result.classification.estimatedComposition
                    ).map(([key, val]: any) => (
                      <div key={key} className="flex justify-between border-b border-slate-900 pb-1 last:border-0 last:pb-0">
                        <span className="text-slate-500 capitalize">{key.replace('_', ' ')}</span>
                        <span className="font-semibold text-slate-300">{val}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500">No composition details estimated</span>
                  )}
                </div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 md:col-span-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Analysis Confidence</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all" 
                      style={{ width: `${result.classification.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {(result.classification.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleFindMatch}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group font-bold"
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
          <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Scout Assessment Complete</span>
                <span className="text-[10px] text-slate-400">
                  {result.classification.primaryCategory.replace('_', ' ')} • {result.classification.subtype}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">{(result.classification.confidence * 100).toFixed(0)}% Conf.</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  Alchemist Match Found
                </h3>
                <p className="text-xs text-slate-400 font-medium">Optimal compatible business pairing nearby</p>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                {(result.match.matchConfidence * 100).toFixed(0)}% Match
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Partner Type</span>
                  <span className="text-sm font-semibold text-white mt-1 block capitalize">
                    {result.match.targetBusinessId ? 'Compatible Local Operation' : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Proximity Distance</span>
                  <span className="text-sm font-semibold text-white mt-1 block flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    {result.match.distanceKm.toFixed(1)} km away
                  </span>
                </div>
                {result.match.estimatedSourceSavings && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 md:col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estimated Economic Savings</span>
                    <span className="text-lg font-bold text-emerald-400 mt-1 block flex items-center gap-0.5">
                      <DollarSign className="h-5 w-5" />
                      {result.match.estimatedSourceSavings.toLocaleString()} / year saved
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Match Rationale</span>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  "{result.match.matchRationale}"
                </p>
              </div>

              <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/10 text-[10px] text-amber-400/80 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>Contact details (phone, email, address) are completely hidden for privacy until both sides accept the terms.</span>
              </div>
            </div>

            <button
              onClick={handleDraftMessage}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group font-bold"
            >
              <MessageSquare className="h-4 w-4" />
              Draft Proposal Agreement (Negotiator Agent)
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Complete Result Views (Negotiator Complete, Hazards, Followup, No Match) */}
      {pipelineStatus === 'complete' && result && (
        <div className="space-y-6">
          {/* 1. Proposal Drafted Success View */}
          {result.status === 'proposal_drafted' && (
            <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20">
                  <CheckCircle className="h-12 w-12 text-emerald-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Proposal Agreement Ready!</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Negotiator Agent drafted a friendly proposal including surplus details. The agreement has been sent to the partner's dashboard.
                </p>
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 text-left space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Deal Status</span>
                  <span className="text-sm font-semibold text-emerald-400 mt-1 block flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="h-4 w-4" />
                    Awaiting Business Acceptance
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Privacy Lock</span>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Contact details will be shared automatically once both parties click "Accept".
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push(`/dashboard/match/${result.submissionId}`)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center group font-bold"
              >
                Review Proposal Terms & Accept
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* 2. Needs Follow-up Clarification */}
          {result.status === 'needs_followup' && (
            <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-900 pb-4">
                <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                  <AlertCircle className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">AI Clarification Requested</h3>
                  <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wide">
                    Scout Confidence: {(result.classification.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-sm text-slate-300 italic">
                "{result.classification.followupQuestion}"
              </div>

              <p className="text-xs text-slate-500">
                To process your submission accurately, please refine your description above to answer this question.
              </p>

              <button
                onClick={() => handleRefineDescription(result.classification.followupQuestion)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center"
              >
                Refine Description
              </button>
            </div>
          )}

          {/* 3. Hazard Detected Block */}
          {result.status === 'hazard_detected' && (
            <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20">
                  <ShieldAlert className="h-12 w-12 text-red-400" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Material Submission Rejected</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  The Scout Agent flagged this material description as hazardous, regulated, or not within our approved non-hazardous scope.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-left text-xs text-red-400">
                <strong>Deterministic Hazard Block:</strong> Materials classified outside the six permitted categories or containing chemical/toxic markers are immediately blocked from matching to guarantee safety.
              </div>

              <button
                onClick={() => { setPipelineStatus('idle'); setResult(null); }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl py-3 text-sm font-semibold transition-colors"
              >
                Submit a Different Material
              </button>
            </div>
          )}

          {/* 4. No Candidate Match Found */}
          {result.status === 'no_match_found' && (
            <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-slate-800 p-4 rounded-full border border-slate-700">
                  <Search className="h-12 w-12 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">No Nearby Candidates</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Your material was classified as <strong className="text-slate-300">{result.classification.primaryCategory.replace('_', ' ')}</strong>, but the Alchemist Agent could not discover compatible reuse businesses within a 15km radius.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-left text-xs text-slate-500 leading-relaxed">
                We have saved your submission. Once a compatible consumer business registers in your area, our engine will automatically evaluate the match.
              </div>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
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
