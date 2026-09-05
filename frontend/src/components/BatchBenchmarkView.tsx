import React, { useState } from 'react';
import { Play, Download, CheckCircle2, XCircle, ArrowUpRight, Filter, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { BatchBenchmarkSummary } from '../types';
import { runBatchBenchmark } from '../api';

interface BatchBenchmarkViewProps {
  benchmarkData: BatchBenchmarkSummary | null;
  onBenchmarkRun: (data: BatchBenchmarkSummary) => void;
}

export const BatchBenchmarkView: React.FC<BatchBenchmarkViewProps> = ({
  benchmarkData,
  onBenchmarkRun
}) => {
  const [running, setRunning] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  const handleRunSimulation = async () => {
    setRunning(true);
    try {
      const data = await runBatchBenchmark(100);
      onBenchmarkRun(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const handleExportCSV = () => {
    if (!benchmarkData) return;
    const headers = ['Transaction ID', 'Customer', 'Original Amount', 'Category', 'Baseline Recovered', 'Agentic Recovered', 'Recovery Method', 'SHA-256 Audit Hash'];
    const rows = benchmarkData.items.map((it) => [
      it.transaction.id,
      `"${it.transaction.customer_name}"`,
      it.transaction.original_amount,
      it.rca.failure_category,
      it.baseline_recovered ? 'YES' : 'NO',
      it.agentic_recovered ? 'YES' : 'NO',
      `"${it.recovery_method}"`,
      it.audit_hash
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'RazorMediate_Batch_Benchmark_Audit_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = benchmarkData
    ? benchmarkData.items.filter((item) => {
        if (selectedFilter === 'ALL') return true;
        return item.rca.failure_category === selectedFilter;
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Top Banner with Run Button */}
      <div className="p-4 rounded-xl bg-[#0D1527] border border-slate-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">
              100-Transaction Monte Carlo Benchmark Runner
            </h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/50">
              Track 03 Hard Criterion
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Simulates a held-out batch of 100 Indian fintech failure cases across Technical Outages, Liquidity crunches, B2B Disputes, and Mandates, measuring exact INR recovered with zero compliance violations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {benchmarkData && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export Audit CSV
            </button>
          )}
          <button
            onClick={handleRunSimulation}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            {running ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating 100 Transactions...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Run 100-Batch Benchmark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparative Performance Box */}
      {benchmarkData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Baseline Card */}
          <div className="p-4 rounded-xl bg-[#0D1527] border border-slate-800">
            <span className="text-xs font-medium text-slate-400 block mb-1">
              Baseline (Standard Retries)
            </span>
            <div className="text-xl font-bold text-slate-300">
              ₹{benchmarkData.baseline_recovered_amount.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Recovery Rate: <span className="font-semibold text-white">{benchmarkData.baseline_recovery_rate_pct}%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Only catches transient technical 5xx drops. 0% dispute or liquidity recovery.
            </p>
          </div>

          {/* Agentic Swarm Card */}
          <div className="p-4 rounded-xl bg-[#0D1527] border border-emerald-800/60">
            <span className="text-xs font-medium text-emerald-400 block mb-1">
              RazorMediate AI Recovery
            </span>
            <div className="text-xl font-bold text-emerald-400">
              ₹{benchmarkData.agentic_recovered_amount.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-emerald-300 mt-1">
              Recovery Rate: <span className="font-bold text-emerald-400">{benchmarkData.agentic_recovery_rate_pct}%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Autonomous conversational mediation + bounded splits + instant 1-click UPI links.
            </p>
          </div>

          {/* Net Alpha */}
          <div className="p-4 rounded-xl bg-[#0D1527] border border-slate-800">
            <span className="text-xs font-medium text-blue-400 block mb-1">
              Net Alpha & Lift
            </span>
            <div className="text-xl font-bold text-white flex items-center gap-1">
              +₹{benchmarkData.net_alpha_inr.toLocaleString('en-IN')}
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xs text-slate-300 mt-1">
              Lift Multiple: <span className="font-semibold text-white">{benchmarkData.roi_multiple}x Recovery Lift</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Compliance Violations: <span className="font-semibold text-purple-400">0 (100% Gated)</span>
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs & Data Table */}
      {benchmarkData && (
        <div className="rounded-xl bg-[#0D1527] border border-slate-800 overflow-hidden shadow-sm">
          <div className="p-3 bg-[#090F1C] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">Filter:</span>
              <div className="flex flex-wrap gap-1">
                {['ALL', 'TECH_OUTAGE', 'LIQUIDITY_CRUNCH', 'MICRO_DISPUTE', 'SUBSCRIPTION_CHURN', 'WILLFUL_CONTEST'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedFilter(cat)}
                    className={`text-[11px] px-2.5 py-0.5 rounded font-medium transition ${
                      selectedFilter === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-[11px] text-slate-400">
              Showing <span className="text-white font-semibold">{filteredItems.length}</span> of {benchmarkData.total_cases} records
            </span>
          </div>

          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#090F1C] text-slate-400 sticky top-0 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Transaction ID</th>
                  <th className="px-3.5 py-2.5">Customer</th>
                  <th className="px-3.5 py-2.5">Amount</th>
                  <th className="px-3.5 py-2.5">RCA Category</th>
                  <th className="px-3.5 py-2.5">Baseline</th>
                  <th className="px-3.5 py-2.5">RazorMediate</th>
                  <th className="px-3.5 py-2.5">Recovery Method</th>
                  <th className="px-3.5 py-2.5 font-mono">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredItems.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="px-3.5 py-2.5 font-mono text-slate-300">
                      {item.transaction.id}
                    </td>
                    <td className="px-3.5 py-2.5 text-white font-medium">
                      {item.transaction.customer_name}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-200">
                      ₹{item.transaction.original_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-blue-300 border border-slate-700">
                        {item.rca.failure_category}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      {item.baseline_recovered ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ₹{item.baseline_amount_recovered.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-500">Unrecovered</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {item.agentic_recovered ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ₹{item.agentic_amount_recovered.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Escalated</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400 text-[11px]">
                      {item.recovery_method}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[10px] text-slate-500">
                      {item.audit_hash.substring(0, 14)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
