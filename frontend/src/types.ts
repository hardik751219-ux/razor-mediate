export interface PolicyConfig {
  max_discount_pct: number;
  max_discount_flat_inr: number;
  max_split_installments: number;
  min_upfront_pct: number;
  max_grace_days: number;
  allow_ptp: boolean;
  enforce_trai_hours: boolean;
  max_contact_velocity: number;
  cool_off_hours: number;
}

export interface InstallmentItem {
  index: number;
  amount: number;
  due_date: string;
  payment_link_id?: string;
  payment_url?: string;
  qr_code_url?: string;
  status: string;
}

export interface RestructurePlan {
  plan_id: string;
  transaction_id: string;
  original_amount: number;
  discount_pct: number;
  discount_amount: number;
  settlement_amount: number;
  num_installments: number;
  installments: InstallmentItem[];
  approved_by_policy: boolean;
  policy_validation_notes: string[];
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  invoice_id: string;
  merchant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  original_amount: number;
  currency: string;
  error_code: string;
  error_description: string;
  gateway_name: string;
  attempts_made: number;
  status: string;
  recovered_amount: number;
  settlement_plan?: RestructurePlan;
}

export interface RCADiagnosis {
  transaction_id: string;
  failure_category: string;
  confidence: number;
  root_cause_explanation: string;
  recommended_channel: string;
  recommended_action: string;
  eligible_for_restructure: boolean;
  tags: string[];
}

export interface PTPCommitment {
  ptp_id: string;
  transaction_id: string;
  customer_name: string;
  customer_phone: string;
  amount_promised: number;
  promised_date: string;
  channel: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface BatchItemResult {
  transaction: TransactionRecord;
  rca: RCADiagnosis;
  baseline_recovered: boolean;
  baseline_amount_recovered: number;
  agentic_recovered: boolean;
  agentic_amount_recovered: number;
  recovery_method: string;
  restructure_plan?: RestructurePlan;
  compliance_passed: boolean;
  audit_hash: string;
}

export interface BatchBenchmarkSummary {
  total_cases: number;
  total_gmv_at_risk: number;
  baseline_recovered_amount: number;
  baseline_recovery_rate_pct: number;
  agentic_recovered_amount: number;
  agentic_recovery_rate_pct: number;
  net_alpha_inr: number;
  roi_multiple: number;
  compliance_breaches: number;
  dispute_resolutions_count: number;
  ptp_conversions_count: number;
  avg_recovery_time_hours: number;
  category_breakdown: Record<string, { count: number; gmv: number; baseline_recovered: number; agentic_recovered: number }>;
  items: BatchItemResult[];
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  transaction_id: string;
  event_type: string;
  agent_id: string;
  details: Record<string, any>;
  policy_checked: boolean;
  prev_hash: string;
  hash: string;
}
