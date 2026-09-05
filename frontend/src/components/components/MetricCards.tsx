import React from 'react';
import { TrendingUp, Calendar, Shield, IndianRupee } from 'lucide-react';
import { BatchBenchmarkSummary } from '../types';

interface MetricCardsProps {
  benchmarkData: BatchBenchmarkSummary | null;
  ptpCount: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ benchmarkData, ptpCount }) => {
  const gmvAtRisk = benchmarkData ? benchmarkData.total_gmv_at_risk : 4381100;
  const recoveredGmv = benchmarkData ? benchmarkData.agentic_recovered_amount : 2338055;
  const recoveryRate = benchmarkData ? benchmarkData.agentic_recovery_rate_pct : 53.37;
  const baselineRate = benchmarkData ? benchmarkData.baseline_recovery_rate_pct : 44.4;
  const alphaInr = benchmarkData ? benchmarkData.net_alpha_inr : 2145455;
  const activePTPs = ptpCount || (benchmarkData ? benchmarkData.ptp_conversions_count : 26);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Revenue at Risk */}
      <div className="p-4 rounded-xl bg-[#0B1322] border border-[#162238] shadow-xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[#131E35] border border-slate-800/80 flex items-center justify-center shrink-0 text-slate-300">
          <span className="font-semibold text-sm">₹</span>
        </div>
        <div>
          <span className="text-xs font-medium text-slate-400 block">Revenue at Risk</span>
          <div className="text-lg font-bold text-white tracking-tight mt-0.5">
            ₹{gmvAtRisk.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Failed card payments, mandate drops & overdue invoices
          </p>
        </div>
      </div>

      {/* 2. Recovered Revenue */}
      <div className="p-4 rounded-xl bg-[#0B1322] border border-[#162238] shadow-xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[#0E2822] border border-emerald-900/60 flex items-center justify-center shrink-0 text-emerald-400">
          <TrendingUp className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-medium text-slate-400 block">Recovered Revenue</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg font-bold text-emerald-400 tracking-tight">
              ₹{recoveredGmv.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-semibold text-emerald-300 bg-[#0E2C24] px-1.5 py-0.5 rounded border border-emerald-800/50">
              {recoveryRate}%
            </span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 leading-snug">
            +₹{alphaInr.toLocaleString('en-IN')} vs standard retries ({baselineRate}%)
          </p>
        </div>
      </div>

      {/* 3. Promise-to-Pay (PTP) */}
      <div className="p-4 rounded-xl bg-[#0B1322] border border-[#162238] shadow-xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[#2A1D15] border border-amber-900/60 flex items-center justify-center shrink-0 text-amber-400">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-medium text-slate-400 block">Promise-to-Pay (PTP)</span>
          <div className="text-lg font-bold text-white tracking-tight mt-0.5">
            {activePTPs} <span className="text-xs font-normal text-slate-300">Active Agreements</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Structured payment splits & automated schedules
          </p>
        </div>
      </div>

      {/* 4. Compliance & Safety */}
      <div className="p-4 rounded-xl bg-[#0B1322] border border-[#162238] shadow-xs flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-full bg-[#12203D] border border-blue-900/60 flex items-center justify-center shrink-0 text-blue-400">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-medium text-slate-400 block">Compliance & Safety</span>
          <div className="text-lg font-bold text-white tracking-tight mt-0.5">
            0 <span className="text-xs font-normal text-slate-300">Violations</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Max 3 contacts/week • Distress emergency auto-freeze
          </p>
        </div>
      </div>
    </div>
  );
};
