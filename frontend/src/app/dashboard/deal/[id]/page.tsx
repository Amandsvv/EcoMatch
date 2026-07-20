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
      await api.submitEvidence(match.id, { evidenceType, evidenceUrl });
      await api.confirmVerification(match.id);
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
    { label: 'Logistics Arranged', completed: ['both_accepted', 'logistics_scheduled', 'completed', 'verified'].includes(match.status), icon: Truck },
    { label: 'Evidence Verified', completed: verifications.length === 2 && verifications.every(v => v.confirmed), icon: FileText },
    { label: 'Certificate Issued', completed: match.status === 'verified', icon: Award },
  ];

  const bothVerificationsConfirmed = verifications.length === 2 && verifications.every(v => v.confirmed);

  return (
    <div className="space-y-8 max-w-4xl">
      <button
        onClick={() => router.push('/dashboard')}
        className="inline-flex items-center text-sm text-[#4B5563] hover:text-[#111827] transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Timeline Tracker */}
      <div className="bg-white border border-[#E5E7EB] p-8 rounded-2xl shadow-sm">
        <h3 className="text-base font-bold text-[#111827] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Symbiosis Pipeline Tracker</h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute left-4 right-4 top-5 h-[1px] bg-[#E5E7EB] z-0"></div>

          {timelineSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex items-center md:flex-col md:text-center space-x-4 md:space-x-0 md:space-y-3 z-10">
                <div className={`p-2.5 rounded-full border ${step.completed
                    ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                    : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#9CA3AF]'
                  }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className={`text-xs font-bold block ${step.completed ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] block mt-0.5">
                    {step.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hauler Info Section */}
      {match.status !== 'proposed' && match.status !== 'rejected' && (
        <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 text-[#166534]">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#111827] text-sm">Assigned Logistics Partner</h4>
              <p className="text-xs text-[#4B5563] mt-1">
                A hauler has been automatically dispatched to coordinate this transfer.
              </p>
            </div>
          </div>
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 flex flex-col justify-center sm:min-w-[280px]">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E5E7EB]">
              <span className="text-[#6B7280] font-semibold">HAULER COMPANY</span>
              <span className="text-[#111827] font-bold">EcoMatch Logistics</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[#6B7280] font-semibold">CONTACT NUMBER</span>
              <span className="text-[#0F6FE8] font-bold font-mono">+1-555-LOG-PICK</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Verification Form & Certificate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Left Side: Verification Records */}
        <div className="glass-card p-8 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-[#111827] border-b border-[#E5E7EB] pb-3" style={{ fontFamily: 'var(--font-heading)' }}>Delivery Verification</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
              <div>
                <span className="text-xs font-bold text-[#111827] block">Your Verification Status</span>
                <span className="text-[10px] text-[#6B7280] block mt-0.5">Upload receipt or photo to verify delivery</span>
              </div>
              <div>
                {myVerification?.confirmed ? (
                  <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-xs px-2.5 py-1 rounded-full font-bold">Confirmed</span>
                ) : (
                  <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-xs px-2.5 py-1 rounded-full font-bold">Pending</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
              <div>
                <span className="text-xs font-bold text-[#111827] block">Symbiosis Partner Verification</span>
                <span className="text-[10px] text-[#6B7280] block mt-0.5">Partner business verification status</span>
              </div>
              <div>
                {partnerVerification?.confirmed ? (
                  <span className="bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-xs px-2.5 py-1 rounded-full font-bold">Confirmed</span>
                ) : (
                  <span className="bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-xs px-2.5 py-1 rounded-full font-bold">Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Form to submit verification if not yet confirmed */}
          {!myVerification?.confirmed && (
            <form onSubmit={handleUploadEvidence} className="bg-[#F9FAFB] p-6 rounded-xl border border-[#E5E7EB] space-y-4">
              <span className="text-xs font-bold text-[#374151] uppercase tracking-wider block">Submit Delivery Evidence</span>

              <div>
                <label className="block text-[10px] text-[#6B7280] font-semibold mb-2 uppercase">EVIDENCE TYPE</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`border rounded-xl p-3 flex items-center justify-center cursor-pointer transition-all ${evidenceType === 'receipt'
                      ? 'border-[#0F6FE8] bg-[#EFF6FF] text-[#1D4ED8]'
                      : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F3F4F6]'
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

                  <label className={`border rounded-xl p-3 flex items-center justify-center cursor-pointer transition-all ${evidenceType === 'photo'
                      ? 'border-[#0F6FE8] bg-[#EFF6FF] text-[#1D4ED8]'
                      : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-[#F3F4F6]'
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

              <div>
                <label className="block text-[10px] text-[#6B7280] font-semibold mb-2 uppercase">UPLOAD EVIDENCE DOCUMENT / PHOTO</label>
                {evidenceUrl ? (
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={evidenceUrl} alt="Evidence Upload" className="h-10 w-10 rounded-lg object-cover border border-[#E5E7EB]" />
                      <div>
                        <span className="text-xs font-bold text-[#166534] block">Document Uploaded</span>
                        <span className="text-[10px] text-[#6B7280] block truncate max-w-[180px]">{evidenceUrl}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEvidenceUrl('')}
                      className="text-xs text-[#DC2626] hover:text-[#B91C1C] font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-[#E5E7EB] border-dashed rounded-xl p-5 text-center hover:border-[#0F6FE8] hover:bg-[#EFF6FF] transition-all relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEvidenceUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploadingEvidence || actionLoading}
                    />
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      {uploadingEvidence ? (
                        <>
                          <Loader2 className="h-6 w-6 animate-spin text-[#0F6FE8]" />
                          <span className="text-[10px] font-semibold text-[#4B5563]">Uploading to Cloudinary...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-6 w-6 text-[#9CA3AF]" />
                          <span className="text-xs text-[#4B5563]">Click to select receipt or photo file</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 flex items-start space-x-2 text-[#991B1B] text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading || uploadingEvidence || !evidenceUrl}
                className="w-full bg-[#0F6FE8] hover:bg-[#0A52B0] text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center justify-center disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Confirm Verification
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
            <div className="bg-[#F0FDF4] border-2 border-[#166534]/20 p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[400px] shadow-md">
              {/* Background watermark */}
              <Recycle className="absolute -right-16 -bottom-16 h-64 w-64 text-[#166534]/5 pointer-events-none" />

              <div className="space-y-6">
                <div className="flex items-center space-x-2 border-b border-[#BBF7D0] pb-4">
                  <Award className="h-8 w-8 text-[#166534]" />
                  <div>
                    <h3 className="font-extrabold text-[#166534] text-lg tracking-tight uppercase" style={{ fontFamily: 'var(--font-heading)' }}>Certificate of Impact</h3>
                    <span className="text-[10px] text-[#16A34A] font-bold tracking-wider">ECOMATCH INDUSTRIAL SYMBIOSIS</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">VERIFIED REDUCTION</span>
                    <span className="text-4xl font-extrabold text-[#166534] mt-1 block" style={{ fontFamily: 'var(--font-heading)' }}>
                      {certificate.co2eAvoidedKg.toLocaleString()} kg
                    </span>
                    <span className="text-xs text-[#16A34A] font-semibold mt-0.5 block">CO2 Equivalent Avoided</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">VERIFIED SAVINGS</span>
                    <span className="text-2xl font-extrabold text-[#111827] mt-1 block flex items-center" style={{ fontFamily: 'var(--font-heading)' }}>
                      <DollarSign className="h-6 w-6 text-[#166534] mr-0.5" />
                      {certificate.dollarsSaved.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#6B7280] block mt-0.5">Avoided Waste Disposal Cost</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-[#BBF7D0] z-10">
                <span className="text-[9px] text-[#6B7280] block uppercase">METHODOLOGY REFERENCE</span>
                <p className="text-[10px] text-[#4B5563] font-mono leading-relaxed bg-white p-2.5 rounded-lg border border-[#E5E7EB]">
                  {certificate.methodologyReference}
                </p>
                <button
                  onClick={() => window.open(`/dashboard/certificate/${match.id}`, '_blank')}
                  className="w-full mt-4 bg-[#166534] hover:bg-[#14532D] text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-sm flex items-center justify-center border border-[#166534]/20"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download PDF Certificate
                </button>
              </div>
            </div>
          ) : (
            /* Action call to issue certificate if verifications complete */
            <div className="glass-card p-8 rounded-2xl text-center flex flex-col justify-center items-center space-y-6 h-full">
              <Award className="h-16 w-16 text-[#D1D5DB]" />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Impact Certificate</h3>
                <p className="text-sm text-[#4B5563] max-w-xs mx-auto">
                  Once both verification records are confirmed by generators and consumers, the carbon/financial saving certificate will unlock.
                </p>
              </div>

              {bothVerificationsConfirmed && (
                <button
                  onClick={handleIssueCertificate}
                  disabled={actionLoading}
                  className="w-full bg-[#166534] hover:bg-[#14532D] text-white rounded-xl py-3 text-sm font-semibold transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Issue Carbon Certificate'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deal Activity Log Section */}
      <div className="glass-card p-8 rounded-2xl space-y-6">
        <h3 className="text-base font-bold text-[#111827]" style={{ fontFamily: 'var(--font-heading)' }}>Deal Activity Log</h3>
        {events.length === 0 ? (
          <p className="text-xs text-[#9CA3AF]">No activity events recorded yet.</p>
        ) : (
          <div className="relative pl-6 border-l border-[#E5E7EB] space-y-6 ml-2">
            {events.map((event) => (
              <div key={event.id} className="relative">
                {/* Timeline Node Dot */}
                <div className="absolute -left-[32px] top-1 w-3 h-3 rounded-full bg-white border-2 border-[#0F6FE8] shadow-sm"></div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                      {event.eventType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] font-mono">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#4B5563] leading-relaxed">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
