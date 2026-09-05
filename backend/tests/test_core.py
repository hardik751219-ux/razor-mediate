import pytest
from core.models import TransactionRecord, PolicyConfig, FailureCategory, Channel
from core.rca_agent import rca_agent
from core.policy_engine import policy_engine
from core.compliance_guard import compliance_guard
from core.audit_logger import audit_ledger
from core.batch_simulator import batch_simulator

def test_rca_gateway_timeout():
    txn = TransactionRecord(
        id="txn_test_01",
        invoice_id="INV-999",
        customer_name="Test Merchant",
        customer_phone="+919876543210",
        customer_email="test@razorpay.com",
        original_amount=15000.0,
        error_code="GATEWAY_TIMEOUT",
        error_description="HDFC 504 Gateway Timeout"
    )
    diag = rca_agent.diagnose(txn)
    assert diag.failure_category == FailureCategory.TECH_OUTAGE
    assert diag.confidence >= 0.90

def test_policy_bounds_enforcement():
    txn = TransactionRecord(
        id="txn_test_02",
        invoice_id="INV-998",
        customer_name="Test Merchant",
        customer_phone="+919876543210",
        customer_email="test@razorpay.com",
        original_amount=50000.0,
        error_code="INSUFFICIENT_FUNDS",
        error_description="Customer requested 20% discount and 10 splits"
    )
    # Request 20% discount and 10 splits (configured max is 7.5% and 3 splits)
    plan = policy_engine.create_restructure_plan(txn, requested_discount_pct=20.0, num_installments=10)
    assert plan.discount_pct <= policy_engine.policy.max_discount_pct
    assert plan.discount_amount <= policy_engine.policy.max_discount_flat_inr
    assert plan.num_installments <= policy_engine.policy.max_split_installments

def test_compliance_distress_detection():
    is_distress, reason = compliance_guard.detect_distress_or_optout("I am in the hospital for emergency, please do not call")
    assert is_distress is True
    assert "hospital" in reason.lower()

def test_audit_ledger_integrity():
    audit_ledger.reset()
    audit_ledger.log_event("txn_1", "INIT", "agent_1", {"msg": "hello"})
    audit_ledger.log_event("txn_1", "UPDATE", "agent_2", {"msg": "approved"})
    assert audit_ledger.verify_integrity() is True

def test_batch_simulator_run():
    summary = batch_simulator.run_benchmark(batch_size=20, seed=123)
    assert summary.total_cases == 20
    assert summary.agentic_recovered_amount > summary.baseline_recovered_amount
    assert summary.compliance_breaches == 0
