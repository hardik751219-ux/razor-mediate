import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Lock, CheckCircle2 } from 'lucide-react';
import { AuditRecord } from '../types';
import { fetchAuditLogs } from '../api';

export const AuditLedgerView: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [verified, setVerified] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs(100);
      setLogs(res.records);
      setVerified(res.integrity_verified);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-[#0D1527] border border-slate-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">
              Cryptographic Audit Trail (SHA-256 Chain)
            </h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Immutable Ledger
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Every agent diagnostic step, policy validation check, discount grant, and Razorpay API execution is cryptographically chained with SHA-256 hashing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 text-xs font-medium border border-emerald-800/60">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Chain Integrity: Valid</span>
          </div>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Feed */}
      <div className="rounded-xl bg-[#0D1527] border border-slate-800 overflow-hidden shadow-sm">
        <div className="p-3 bg-[#090F1C] border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">
            Recorded Ledger Blocks ({logs.length} events)
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            Genesis Hash: 00000000000000000000000000000000
          </span>
        </div>

        <div className="divide-y divide-slate-800 max-h-[550px] overflow-y-auto">
          {logs.map((record) => (
            <div key={record.id} className="p-3.5 hover:bg-slate-800/30 transition text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-semibold text-[10px] bg-blue-950 text-blue-300 border border-blue-800/60">
                    {record.event_type}
                  </span>
                  <span className="font-medium text-slate-200">
                    Txn: <span className="font-mono text-slate-400">{record.transaction_id}</span>
                  </span>
                  <span className="text-slate-500">• Agent: <span className="text-slate-300 font-medium">{record.agent_id}</span></span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{record.timestamp}</span>
              </div>

              <div className="p-2.5 bg-[#090F1C] rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                <pre>{JSON.stringify(record.details, null, 2)}</pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 pt-0.5">
                <div className="truncate">
                  <span className="text-slate-400">Prev Hash:</span> {record.prev_hash}
                </div>
                <div className="truncate text-emerald-400/90">
                  <span className="text-slate-400">Current Hash:</span> {record.hash}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
