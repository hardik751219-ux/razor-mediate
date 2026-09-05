import { PolicyConfig, RestructurePlan, RCADiagnosis, BatchBenchmarkSummary, AuditRecord, PTPCommitment } from './types';

const API_BASE = 'http://localhost:8000';

export async function fetchPolicyConfig(): Promise<PolicyConfig> {
  const res = await fetch(`${API_BASE}/api/config`);
  return res.json();
}

export async function updatePolicyConfig(config: PolicyConfig): Promise<PolicyConfig> {
  const res = await fetch(`${API_BASE}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function sendChatMessage(payload: {
  transaction_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  original_amount: number;
  invoice_id: string;
  error_code: string;
  error_description: string;
  user_message: string;
  channel: string;
  conversation_history?: Array<{ role: string; content: string }>;
}) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function runBatchBenchmark(batchSize: number = 100): Promise<BatchBenchmarkSummary> {
  const res = await fetch(`${API_BASE}/api/simulate-batch?batch_size=${batchSize}`, {
    method: 'POST',
  });
  return res.json();
}

export async function fetchAuditLogs(limit: number = 50): Promise<{ integrity_verified: boolean; total_records: number; records: AuditRecord[] }> {
  const res = await fetch(`${API_BASE}/api/audit-logs?limit=${limit}`);
  return res.json();
}

export async function fetchPTPs(): Promise<PTPCommitment[]> {
  const res = await fetch(`${API_BASE}/api/ptp/list`);
  return res.json();
}

export async function triageTransaction(payload: {
  id: string;
  invoice_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  original_amount: number;
  error_code: string;
  error_description: string;
}): Promise<RCADiagnosis> {
  const res = await fetch(`${API_BASE}/api/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant_id: 'rzp_merch_live_01',
      currency: 'INR',
      gateway_name: 'HDFC_PG',
      attempts_made: 1,
      status: 'FAILED',
      recovered_amount: 0.0,
      ...payload
    }),
  });
  return res.json();
}
