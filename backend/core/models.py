import os
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FailureCategory(str, Enum):
    TECH_OUTAGE = "TECH_OUTAGE"
    LIQUIDITY_CRUNCH = "LIQUIDITY_CRUNCH"
    MICRO_DISPUTE = "MICRO_DISPUTE"
    SUBSCRIPTION_CHURN = "SUBSCRIPTION_CHURN"
    AUTH_DROP = "AUTH_DROP"
    WILLFUL_CONTEST = "WILLFUL_CONTEST"


class Channel(str, Enum):
    VOICE = "VOICE"
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    SMS = "SMS"


class PTPStatus(str, Enum):
    PENDING = "PENDING"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    FULFILLED = "FULFILLED"
    BROKEN = "BROKEN"
    CANCELLED = "CANCELLED"


class PolicyConfig(BaseModel):
    max_discount_pct: float = Field(default=7.5, description="Max allowed settlement discount percentage")
    max_discount_flat_inr: float = Field(default=5000.0, description="Max flat discount amount in INR")
    max_split_installments: int = Field(default=3, description="Max installments allowed for restructuring")
    min_upfront_pct: float = Field(default=25.0, description="Minimum percentage required in immediate upfront tranche")
    max_grace_days: int = Field(default=14, description="Max grace days for Promise-to-Pay (PTP)")
    allow_ptp: bool = Field(default=True, description="Whether Promise-To-Pay tracking is enabled")
    enforce_trai_hours: bool = Field(default=True, description="Enforce TRAI 9 AM - 8 PM IST contact window")
    max_contact_velocity: int = Field(default=3, description="Maximum contact attempts within a 7-day period")
    cool_off_hours: int = Field(default=48, description="Cool off hours after customer rejection or dispute escalation")


class InstallmentItem(BaseModel):
    index: int
    amount: float
    due_date: str
    payment_link_id: Optional[str] = None
    payment_url: Optional[str] = None
    qr_code_url: Optional[str] = None
    status: str = "PENDING"  # PENDING, PAID, OVERDUE


class RestructurePlan(BaseModel):
    plan_id: str
    transaction_id: str
    original_amount: float
    discount_pct: float
    discount_amount: float
    settlement_amount: float
    num_installments: int
    installments: List[InstallmentItem]
    approved_by_policy: bool
    policy_validation_notes: List[str]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TransactionRecord(BaseModel):
    id: str
    invoice_id: str
    merchant_id: str = "rzp_merch_live_01"
    customer_name: str
    customer_phone: str
    customer_email: str
    original_amount: float
    currency: str = "INR"
    error_code: str
    error_description: str
    gateway_name: str = "HDFC_PG"
    attempts_made: int = 1
    last_attempt_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "FAILED"  # FAILED, RECOVERED, ESCALATED_TO_HUMAN, COOL_OFF, RESTRUCTURED
    recovered_amount: float = 0.0
    settlement_plan: Optional[RestructurePlan] = None
    failure_category: Optional[FailureCategory] = None


class RCADiagnosis(BaseModel):
    transaction_id: str
    failure_category: FailureCategory
    confidence: float
    root_cause_explanation: str
    recommended_channel: Channel
    recommended_action: str
    eligible_for_restructure: bool
    tags: List[str] = []


class PTPCommitment(BaseModel):
    ptp_id: str
    transaction_id: str
    customer_name: str
    customer_phone: str
    amount_promised: float
    promised_date: str
    channel: Channel
    status: PTPStatus = PTPStatus.PENDING
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class AuditRecord(BaseModel):
    id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    transaction_id: str
    event_type: str
    agent_id: str
    details: Dict[str, Any]
    policy_checked: bool = True
    prev_hash: str
    hash: str


class BatchItemResult(BaseModel):
    transaction: TransactionRecord
    rca: RCADiagnosis
    baseline_recovered: bool
    baseline_amount_recovered: float
    agentic_recovered: bool
    agentic_amount_recovered: float
    recovery_method: str
    restructure_plan: Optional[RestructurePlan] = None
    compliance_passed: bool
    audit_hash: str


class BatchBenchmarkSummary(BaseModel):
    total_cases: int
    total_gmv_at_risk: float
    baseline_recovered_amount: float
    baseline_recovery_rate_pct: float
    agentic_recovered_amount: float
    agentic_recovery_rate_pct: float
    net_alpha_inr: float
    roi_multiple: float
    compliance_breaches: int
    dispute_resolutions_count: int
    ptp_conversions_count: int
    avg_recovery_time_hours: float
    category_breakdown: Dict[str, Dict[str, Any]]
    items: List[BatchItemResult]
