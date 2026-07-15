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
  DollarSign
} from 'lucide-react';

export default function SubmitSurplus() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const followupId = searchParams.get('followup');

  // Form fields
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('50');
  const [frequency, setFrequency] = useState('monthly');
  const [photoRef, setPhotoRef] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pipeline response states
  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'classifying' | 'matching' | 'complete'>('idle');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (followupId) {
      loadFollowupData(followupId);
    }
  }, [followupId]);

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
      setPipelineStatus('complete');
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check inputs.');
      setPipelineStatus('idle');
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
                Photo Reference URL (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600">
                  <Camera className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={photoRef}
                  onChange={(e) => setPhotoRef(e.target.value)}
                  placeholder="https://example.com/waste_image.jpg"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-9 pr-4 py-3 text-sm placeholder-slate-600 transition-all outline-none"
                  disabled={loading}
                />
              </div>
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
              The Scout Agent is classifying your material, assessing safety checks, and scanning for local recycling candidates...
            </p>
          </div>
        </div>
      )}

      {/* Result Display Views */}
      {pipelineStatus === 'complete' && result && (
        <div className="space-y-6">
          {/* 1. Success Match Proposed */}
          {result.status === 'match_proposed' && (
            <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm space-y-6 text-center">
              <div className="flex justify-center">
                <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20">
                  <CheckCircle className="h-12 w-12 text-emerald-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Symbiosis Match Found!</h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Alchemist Agent matched your material with a nearby buyer. A draft agreement has been generated.
                </p>
              </div>

              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 text-left space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CLASSIFIED CATEGORY</span>
                  <span className="text-sm font-semibold text-white mt-1 block">
                    {result.classification.primaryCategory.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">MATCH CONFIDENCE</span>
                  <span className="text-sm font-semibold text-emerald-400 mt-1 block">
                    {(result.match.matchConfidence * 100).toFixed(0)}% (Verified Grounded)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">COMPATIBILITY RATIONALE</span>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {result.match.matchRationale}
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push(`/dashboard/match/${result.submissionId}`)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center group"
              >
                Review Proposal Terms
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
