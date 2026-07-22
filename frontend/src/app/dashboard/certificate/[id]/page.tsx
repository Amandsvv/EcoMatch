'use client';

import React, { useEffect, useState, use } from 'react';
import { api } from '@/lib/api';
import { Loader2, Award, Recycle, DollarSign } from 'lucide-react';

export default function ImpactCertificatePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const matchId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    certificate: any;
    match: any;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const matchData = await api.getMatch(matchId);
        const certData = await api.getCertificate(matchId);
        setData({
          certificate: certData,
          match: matchData.match,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load certificate');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#F9FAFB] text-[#111827] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#0F6FE8]" />
        <p className="text-sm font-semibold tracking-wide text-[#6B7280]">Loading Certificate Details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-[#F9FAFB] p-6 text-center space-y-4">
        <p className="text-[#991B1B] font-bold">Error loading certificate</p>
        <p className="text-[#4B5563] text-xs max-w-md">{error || 'Certificate could not be loaded.'}</p>
      </div>
    );
  }

  const { certificate, match } = data;

  return (
    <div className="min-h-screen bg-white text-slate-950 p-4 md:p-8 flex flex-col justify-center items-center print:p-0 print:m-0">
      {/* Top Action Controls (Hidden in Print) */}
      <div className="w-full max-w-4xl mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          ← Back to Dashboard
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 text-xs font-bold rounded-md bg-emerald-800 hover:bg-emerald-900 text-white transition-colors flex items-center gap-2 shadow-sm"
        >
          <Award className="h-4 w-4" />
          <span>Download / Print PDF Certificate</span>
        </button>
      </div>

      <div className="border-8 border-emerald-800 p-6 md:p-8 w-full max-w-4xl relative overflow-hidden bg-slate-50 shadow-2xl rounded-2xl flex flex-col justify-between min-h-[580px] print:shadow-none print:border-4 print:bg-white print:rounded-none print:w-full print:max-w-none print:m-0 print:p-6">
        {/* Decorative corner borders */}
        <div className="absolute top-4 left-4 right-4 bottom-4 border-2 border-emerald-800/10 pointer-events-none"></div>

        {/* Watermark symbol */}
        <Recycle className="absolute -right-20 -bottom-20 h-96 w-96 text-emerald-800/[0.03] pointer-events-none print:text-emerald-800/[0.02]" />

        <div className="space-y-8 relative z-10 text-center w-full">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="bg-emerald-100 p-4 rounded-full text-emerald-800 print:bg-emerald-50">
              <Award className="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-black text-emerald-900 tracking-tight uppercase print:text-emerald-950">
              Certificate of Sustainability Impact
            </h1>
            <p className="text-xs font-bold tracking-widest text-emerald-700 uppercase">
              EcoMatch Industrial Symbiosis Program
            </p>
          </div>

          <div className="w-24 h-1 bg-emerald-800 mx-auto rounded-full"></div>

          <div className="space-y-4 max-w-2xl mx-auto">
            <p className="text-sm text-slate-500 font-medium italic">
              This certificate verifies the successful diversion and reuse of surplus resources:
            </p>
            
            <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-sm space-y-3 print:border-slate-200 print:shadow-none">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Resource Generator</span>
                  <span className="text-sm font-extrabold text-slate-800">{match.sourceBusinessName || 'Source Business'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Resource Consumer</span>
                  <span className="text-sm font-extrabold text-slate-800">{match.targetBusinessName || 'Target Business'}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-2">
              By redirecting non-hazardous surplus material from conventional disposal routes to direct agricultural/manufacturing reuse, the participating enterprises have collectively achieved the following environmental and financial milestones:
            </p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-8 max-w-xl mx-auto pt-4">
            <div className="bg-emerald-50 border border-emerald-100/50 p-6 rounded-2xl text-center print:bg-emerald-50/50 print:border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-extrabold tracking-wider block uppercase">CARBON EMISSIONS AVOIDED</span>
              <span className="text-4xl font-black text-emerald-900 mt-2 block">
                {certificate.co2eAvoidedKg.toLocaleString()} kg
              </span>
              <span className="text-[10px] text-emerald-600 font-bold mt-1 block">CO₂ Equivalent (CO₂e)</span>
            </div>

            <div className="bg-slate-100/50 border border-slate-200/50 p-6 rounded-2xl text-center print:bg-slate-50 print:border-slate-300">
              <span className="text-[10px] text-slate-500 font-extrabold tracking-wider block uppercase">FINANCIAL SAVINGS REALIZED</span>
              <span className="text-4xl font-black text-slate-800 mt-2 block flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-emerald-800 mr-0.5" />
                {certificate.dollarsSaved.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-bold mt-1 block">Avoided Disposal Expenditure</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-8 mt-12 flex flex-col md:flex-row justify-between items-center text-left gap-6 relative z-10 print:mt-8">
          <div className="space-y-2 max-w-md w-full">
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Methodology & Audit Registry</span>
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed bg-white border border-slate-200 p-2.5 rounded-lg print:bg-slate-50">
              {certificate.methodologyReference}
            </p>
          </div>

          <div className="text-center md:text-right space-y-1">
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider font-mono">CERTIFICATE AUTHENTICATION CODE</span>
            <span className="text-[10px] text-slate-600 font-mono tracking-wide bg-slate-100 px-3 py-1 rounded-md print:bg-slate-50">
              {certificate.id}
            </span>
            <span className="text-[9px] text-slate-400 block mt-1">
              Issued: {new Date(certificate.issuedAt || Date.now()).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
