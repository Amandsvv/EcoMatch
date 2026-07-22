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
  Recycle,
  Leaf,
} from 'lucide-react';

export default function ActiveDealTrackerPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingEvidence(true);
    setError(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await api.uploadPhoto(formData);
      setEvidenceUrl(response.url);
    } catch (err: any) {
      setError(err.message || 'File upload failed. Please try again.');
    } finally {
      setUploadingEvidence(false);
    }
  };

  useEffect(() => {
    fetchDealData();
  }, [submissionId]);

  const fetchDealData = async () => {
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

      setMatch(response.match);
      setDrafts(response.outreachDrafts || []);

      const matchId = response.match.id;

      try {
        const vers = await api.getVerificationRecords(matchId);
        setVerifications(vers || []);
      } catch {}

      try {
        const evs = await api.getDealEvents(matchId);
        setEvents(evs || []);
      } catch {}

      if (response.match.status === 'verified') {
        try {
          const cert = await api.getCertificate(matchId);
          setCertificate(cert);
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load deal tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!match?.id || !evidenceUrl) return;

    setActionLoading(true);
    setError(null);
    try {
      await api.submitEvidence(match.id, {
        evidenceType,
        evidenceUrl,
      });
      setEvidenceUrl('');
      await fetchDealData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit transfer evidence');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!match?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.issueCertificate(match.id);
      await fetchDealData();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger verification calculation');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader2 className="h-8 w-8 anim-spin text-[var(--eco-accent)]" />
        <span className="text-xs font-semibold text-[var(--eco-text-3)]">Loading deal workflow...</span>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center text-xs font-semibold text-[var(--eco-text-2)] hover:text-[var(--eco-text)] gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="p-4 rounded-lg bg-[var(--color-error-bg)] border border-[var(--color-error-border)] flex items-center gap-3 text-[var(--color-error)] text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error || 'Deal tracking record not found.'}</span>
        </div>
      </div>
    );
  }

  const myRecord = verifications.find((v: any) => v.businessId === user?.businessId);
  const otherRecord = verifications.find((v: any) => v.businessId !== user?.businessId);

  const getStepStatus = (stepIndex: number) => {
    const status = match.status;
    if (stepIndex === 1) return 'completed';
    if (stepIndex === 2) return status !== 'pending' ? 'completed' : 'current';
    if (stepIndex === 3) {
      if (status === 'verified') return 'completed';
      if (status === 'both_accepted') return 'current';
      return 'upcoming';
    }
    if (stepIndex === 4) return status === 'verified' ? 'completed' : 'upcoming';
    return 'upcoming';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center text-xs font-semibold text-[var(--eco-text-2)] hover:text-[var(--eco-text)] transition-colors gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Header Info Banner */}
      <div className="eco-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--eco-text-3)] font-semibold tracking-overline">
              Deal #{match.id.substring(0, 8)}
            </span>
            {match.status === 'verified' ? (
              <span className="badge-completion">Verified Complete</span>
            ) : (
              <span className="badge-success">Logistics Active</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-[var(--eco-text)] font-display">
            Industrial Symbiosis Transfer
          </h2>
          <p className="text-xs text-[var(--eco-text-2)]">
            Distance: {match.distanceKm.toFixed(1)} km • Match Confidence: {(match.matchConfidence * 100).toFixed(0)}%
          </p>
        </div>

        {certificate && (
          <div className="p-3 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success-border)] flex items-center gap-3 shrink-0">
            <Award className="h-8 w-8 text-[var(--color-success)]" />
            <div>
              <span className="text-[10px] text-[var(--eco-text-3)] font-semibold tracking-overline block">CO₂e Avoided</span>
              <span className="text-lg font-bold text-[var(--color-success)] font-display">{certificate.co2eAvoidedKg} kg</span>
            </div>
          </div>
        )}
      </div>

      {/* Workflow Timeline Card */}
      <div className="eco-card p-6 space-y-6">
        <h3 className="text-sm font-bold text-[var(--eco-text)] tracking-overline font-display border-b border-[var(--eco-border)] pb-3">
          Transfer Progress Timeline
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          {[
            { step: 1, title: 'AI Match', desc: 'Alchemist pairing' },
            { step: 2, title: 'Mutual Accept', desc: 'Terms confirmed' },
            { step: 3, title: 'Logistics / Proof', desc: 'Transfer evidence' },
            { step: 4, title: 'Verification', desc: 'Impact certificate' },
          ].map((st) => {
            const state = getStepStatus(st.step);
            return (
              <div
                key={st.step}
                className={`p-4 rounded-xl border transition-all ${
                  state === 'completed'
                    ? 'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success)]'
                    : state === 'current'
                    ? 'bg-[var(--color-info-bg)] border-[var(--color-info-border)] text-[var(--color-info)]'
                    : 'bg-[var(--eco-surface-2)] border-[var(--eco-border)] text-[var(--eco-text-3)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      state === 'completed'
                        ? 'bg-[var(--color-success)] text-white'
                        : state === 'current'
                        ? 'bg-[var(--color-info)] text-white'
                        : 'bg-[var(--eco-border)] text-[var(--eco-text-3)]'
                    }`}
                  >
                    {state === 'completed' ? <CheckCircle className="h-3.5 w-3.5" /> : st.step}
                  </div>
                  <span className="font-bold text-xs font-display text-[var(--eco-text)]">{st.title}</span>
                </div>
                <p className="text-[10px] text-[var(--eco-text-2)]">{st.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transfer Evidence & Verification Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Evidence Submission Card */}
        <div className="eco-card p-6 space-y-5">
          <h3 className="text-base font-bold text-[var(--eco-text)] font-display flex items-center gap-2 border-b border-[var(--eco-border)] pb-3">
            <UploadCloud className="h-4.5 w-4.5 text-[var(--eco-accent)]" />
            Transfer Verification Evidence
          </h3>

          {myRecord ? (
            myRecord.confirmed ? (
              <div className="p-4 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success-border)] flex items-start gap-3 text-xs text-[var(--color-success)]">
                <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block font-semibold text-sm">Your Transfer Evidence Verified!</strong>
                  <p className="text-[var(--eco-text-2)] leading-relaxed">
                    Evidence type: <span className="font-semibold text-[var(--eco-text)] capitalize">{myRecord.evidenceType?.replace('_', ' ')}</span>. Admin verification complete.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] flex items-start gap-3 text-xs text-[var(--color-warning-mid)]">
                  <Clock className="h-5 w-5 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <strong className="block font-semibold text-sm text-[var(--eco-text)]">Evidence Submitted — Awaiting Admin Approval</strong>
                    <p className="text-[var(--eco-text-2)] leading-relaxed">
                      Your transfer evidence photo ({myRecord.evidenceType}) has been submitted. It is currently in the Admin Verification Queue awaiting review.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-[var(--eco-surface-2)] border border-[var(--eco-border)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate max-w-[220px]">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--eco-accent)]" />
                    <span className="truncate text-[var(--eco-text-2)] font-mono text-[11px]">{myRecord.evidenceUrl}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceUrl(myRecord.evidenceUrl || '');
                      setEvidenceType(myRecord.evidenceType || 'receipt');
                    }}
                    className="text-xs font-semibold text-[var(--eco-accent)] hover:underline shrink-0"
                  >
                    Replace Image
                  </button>
                </div>
              </div>
            )
          ) : (
            <form onSubmit={handleSubmitEvidence} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold tracking-overline mb-1.5 text-[var(--eco-text-2)]">
                  Evidence Type
                </label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="eco-input"
                  disabled={actionLoading}
                >
                  <option value="receipt">Weight Bridge Receipt</option>
                  <option value="photo">Delivery Photo Proof</option>
                  <option value="bill_of_lading">Bill of Lading</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-overline mb-2 text-[var(--eco-text-2)]">
                  Upload Evidence Image
                </label>
                {evidenceUrl ? (
                  <div className="p-4 rounded-md flex items-center justify-between" style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)' }}>
                    <div className="flex items-center gap-3">
                      <img src={evidenceUrl} alt="Transfer Evidence Proof" className="h-12 w-12 rounded-md object-cover" style={{ border: '1px solid var(--eco-border)' }} />
                      <div>
                        <span className="text-xs font-bold block text-[var(--color-success)]">Evidence Uploaded Successfully</span>
                        <span className="text-[10px] block truncate max-w-[180px] text-[var(--eco-text-3)]">{evidenceUrl}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEvidenceUrl('')}
                      className="text-xs font-semibold text-[var(--color-error-mid)] hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-md p-6 text-center transition-all relative hover:bg-[var(--eco-surface)]" style={{ background: 'var(--eco-surface-2)', borderColor: 'var(--eco-border)' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEvidenceUpload}
                      disabled={uploadingEvidence || actionLoading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center justify-center gap-2">
                      {uploadingEvidence ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-[var(--eco-accent)]" />
                          <span className="text-xs font-semibold animate-pulse text-[var(--eco-text-2)]">Uploading Evidence Image...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-8 w-8 text-[var(--eco-text-3)]" />
                          <span className="text-xs font-semibold text-[var(--eco-text-2)]">Click or drag image here to upload</span>
                          <span className="text-[10px] text-[var(--eco-text-3)]">Supports PNG, JPG, GIF up to 10MB</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!evidenceUrl || actionLoading}
                className="eco-btn-primary w-full py-2.5 text-xs"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 anim-spin" /> : 'Submit Evidence Proof'}
              </button>
            </form>
          )}

          {/* Counterparty status badge */}
          <div className="p-3 rounded-lg bg-[var(--eco-surface-2)] border border-[var(--eco-border)] flex items-center justify-between text-xs">
            <span className="text-[var(--eco-text-2)] font-medium">Counterparty Verification Status:</span>
            {otherRecord?.confirmed ? (
              <span className="badge-success">Confirmed</span>
            ) : (
              <span className="badge-warning">Pending Proof</span>
            )}
          </div>
        </div>

        {/* Impact Certificate Panel */}
        <div className="eco-card p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[var(--eco-text)] font-display flex items-center gap-2 border-b border-[var(--eco-border)] pb-3">
              <Award className="h-4.5 w-4.5 text-[var(--color-success)]" />
              Verification Agent Impact Certificate
            </h3>

            {certificate ? (
              <div className="p-5 rounded-xl bg-white border border-[var(--eco-border)] space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--eco-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-[var(--color-success)]" />
                    <span className="font-bold text-xs tracking-tight font-display text-[var(--eco-text)]">OFFICIAL IMPACT CERTIFICATE</span>
                  </div>
                  <span className="badge-success">AUDITED</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-[var(--eco-text-3)] tracking-overline font-semibold block">CO₂e AVOIDED</span>
                    <span className="text-2xl font-black text-[var(--color-success)] font-display">{certificate.co2eAvoidedKg} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--eco-text-3)] tracking-overline font-semibold block">DISPOSAL SAVED</span>
                    <span className="text-2xl font-black text-[var(--eco-text)] font-display">${certificate.dollarsSaved}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--eco-border)] text-[10px] text-[var(--eco-text-3)] leading-relaxed">
                  Methodology: {certificate.methodologyReference || 'EPA WARM v15 Factor Calculation'}
                </div>

                <a
                  href={`/dashboard/certificate/${match.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="eco-btn-primary w-full py-3 text-xs text-center justify-center flex items-center gap-2 mt-3"
                >
                  <Award className="h-4.5 w-4.5" />
                  <span>View & Download Official PDF Certificate</span>
                </a>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-[var(--eco-surface-2)] text-center space-y-3">
                <ShieldCheck className="h-8 w-8 text-[var(--eco-text-3)] mx-auto" />
                <p className="text-xs text-[var(--eco-text-2)] leading-relaxed">
                  Both businesses must upload transfer evidence before the Verification Agent generates an audited CO₂ certification.
                </p>
              </div>
            )}
          </div>

          {!certificate && verifications.filter((v: any) => v.confirmed).length >= 2 && (
            <button
              onClick={handleIssueCertificate}
              disabled={actionLoading}
              className="eco-btn-primary w-full py-2.5 text-xs"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 anim-spin" /> : 'Calculate Impact Certificate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
