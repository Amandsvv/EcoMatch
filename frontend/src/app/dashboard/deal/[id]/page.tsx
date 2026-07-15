'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  Award, 
  ShieldCheck, 
  Truck, 
  FileText, 
  UploadCloud, 
  DollarSign, 
  Loader2, 
  AlertTriangle,
  Recycle
} from 'lucide-react';

export default function DealTracker({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const submissionId = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [match, setMatch] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [certificate, setCertificate] = useState<any>(null);

  const [evidenceType, setEvidenceType] = useState('receipt');
  
  useEffect(() => {
    fetchDealData();
  }, [submissionId]);

  const fetchDealData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getMatchBySubmission(submissionId);
      const matchRecord = response.match;
      setMatch(matchRecord);
      setDrafts(response.outreachDrafts || []);
      setEvents(response.dealEvents || []);

      // Fetch verifications
      const verRecord = await api.getVerificationRecords(matchRecord.id);
      setVerifications(verRecord || []);

      // Fetch certificate if verified
      if (matchRecord.status === 'verified') {
        try {
          const cert = await api.getCertificate(matchRecord.id);
          setCertificate(cert);
        } catch {
          // No certificate issued yet or fetch failed
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load deal tracker data');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) return;
    setError(null);
    setActionLoading(true);
    try {
      // 1. Submit evidence type
      await api.submitEvidence(match.id, { evidenceType });
      // 2. Confirm evidence for this business
      await api.confirmVerification(match.id, { businessId: user?.businessId || '' });
      
      // Reload deal details
      await fetchDealData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!match) return;
    setError(null);
    setActionLoading(true);
    try {
      await api.issueCertificate(match.id);
      await fetchDealData();
    } catch (err: any) {
      setError(err.message || 'Failed to issue impact certificate');
    } finally {
      setActionLoading(false);
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
          <span>{error || 'Deal details could not be retrieved.'}</span>
        </div>
      </div>
    );
  }

  // Determine current user's verification record
  const myVerification = verifications.find(v => v.businessId === user?.businessId);
  const partnerVerification = verifications.find(v => v.businessId !== user?.businessId);

  // Status mapping
  const timelineSteps = [
    { label: 'Match Proposed', completed: true, icon: ShieldCheck },
    { label: 'Accepted by Both', completed: match.status !== 'proposed' && match.status !== 'rejected', icon: CheckCircle },
    { label: 'Logistics Arranged', completed: ['logistics_scheduled', 'completed', 'verified'].includes(match.status), icon: Truck },
    { label: 'Evidence Verified', completed: verifications.length === 2 && verifications.every(v => v.confirmed), icon: FileText },
    { label: 'Certificate Issued', completed: match.status === 'verified', icon: Award },
  ];

  const bothVerificationsConfirmed = verifications.length === 2 && verifications.every(v => v.confirmed);

  return (
    <div className="space-y-8 max-w-4xl">
      <button
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Timeline Tracker */}
      <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-3xl backdrop-blur-sm">
        <h3 className="text-base font-bold text-white mb-6">Symbiosis Pipeline Tracker</h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute left-4 right-4 top-5 h-[1px] bg-slate-800 z-0"></div>

          {timelineSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex items-center md:flex-col md:text-center space-x-4 md:space-x-0 md:space-y-3 z-10">
                <div className={`p-2.5 rounded-full border ${
                  step.completed 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-slate-950 border-slate-900 text-slate-600'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className={`text-xs font-bold block ${step.completed ? 'text-white' : 'text-slate-500'}`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-600 block mt-0.5">
                    {step.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid split: Verification Form & Certificate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Verification Records */}
        <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-white border-b border-slate-900 pb-3">Delivery Verification</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-900/80">
              <div>
                <span className="text-xs font-bold text-white block">Your Verification Status</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Upload receipt or photo to verify delivery</span>
              </div>
              <div>
                {myVerification?.confirmed ? (
                  <span className="bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 text-xs px-2.5 py-1 rounded-full font-bold">Confirmed</span>
                ) : (
                  <span className="bg-amber-500/5 text-amber-400 border border-amber-500/10 text-xs px-2.5 py-1 rounded-full font-bold">Pending</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-900/80">
              <div>
                <span className="text-xs font-bold text-white block">Symbiosis Partner Verification</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Partner business verification status</span>
              </div>
              <div>
                {partnerVerification?.confirmed ? (
                  <span className="bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 text-xs px-2.5 py-1 rounded-full font-bold">Confirmed</span>
                ) : (
                  <span className="bg-amber-500/5 text-amber-400 border border-amber-500/10 text-xs px-2.5 py-1 rounded-full font-bold">Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Form to submit verification if not yet confirmed */}
          {!myVerification?.confirmed && (
            <form onSubmit={handleUploadEvidence} className="bg-slate-950 p-6 rounded-2xl border border-slate-900 space-y-4 pt-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Submit Delivery Evidence</span>
              
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-2">EVIDENCE TYPE</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`border rounded-xl p-3 flex items-center justify-center cursor-pointer transition-all ${
                    evidenceType === 'receipt' 
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400' 
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}>
                    <input 
                      type="radio" 
                      name="evidence" 
                      value="receipt" 
                      checked={evidenceType === 'receipt'}
                      onChange={() => setEvidenceType('receipt')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold">Hauler Receipt</span>
                  </label>

                  <label className={`border rounded-xl p-3 flex items-center justify-center cursor-pointer transition-all ${
                    evidenceType === 'photo' 
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400' 
                      : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}>
                    <input 
                      type="radio" 
                      name="evidence" 
                      value="photo" 
                      checked={evidenceType === 'photo'}
                      onChange={() => setEvidenceType('photo')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold">Photo of Delivery</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Upload & Confirm Verification
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Certificate Section */}
        <div className="flex flex-col justify-between">
          {match.status === 'verified' && certificate ? (
            /* Visual Certificate Card */
            <div className="bg-emerald-950/20 border-2 border-emerald-500/30 p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[400px] shadow-xl shadow-emerald-500/5">
              {/* Background watermark */}
              <Recycle className="absolute -right-16 -bottom-16 h-64 w-64 text-emerald-500/5 pointer-events-none" />

              <div className="space-y-6">
                <div className="flex items-center space-x-2 border-b border-emerald-500/20 pb-4">
                  <Award className="h-8 w-8 text-emerald-400" />
                  <div>
                    <h3 className="font-extrabold text-white text-lg tracking-tight uppercase">Certificate of Impact</h3>
                    <span className="text-[10px] text-emerald-400 font-bold tracking-wider">ECOMATCH INDUSTRIAL SYMBIOSIS</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">VERIFIED REDUCTION</span>
                    <span className="text-4xl font-extrabold text-white mt-1 block">
                      {certificate.co2eAvoidedKg.toLocaleString()} kg
                    </span>
                    <span className="text-xs text-emerald-400 font-semibold mt-0.5 block">CO2 Equivalent Avoided</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">VERIFIED SAVINGS</span>
                    <span className="text-2xl font-extrabold text-white mt-1 block flex items-center">
                      <DollarSign className="h-6 w-6 text-emerald-400 mr-0.5" />
                      {certificate.dollarsSaved.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">Avoided Waste Disposal Cost</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-emerald-500/20 z-10">
                <span className="text-[9px] text-slate-500 block uppercase">METHODOLOGY REFERENCE</span>
                <p className="text-[10px] text-slate-400 font-mono leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                  {certificate.methodologyReference}
                </p>
              </div>
            </div>
          ) : (
            /* Action call to issue certificate if verifications complete */
            <div className="bg-slate-900/40 border border-slate-900 p-8 rounded-2xl text-center flex flex-col justify-center items-center space-y-6 h-full">
              <Award className="h-16 w-16 text-slate-700" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Impact Certificate</h3>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                  Once both verification records are confirmed by generators and consumers, the carbon/financial saving certificate will unlock.
                </p>
              </div>

              {bothVerificationsConfirmed && (
                <button
                  onClick={handleIssueCertificate}
                  disabled={actionLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Issue Carbon Certificate'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
