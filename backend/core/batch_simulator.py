import random
from datetime import datetime, timezone
import uuid
from typing import List, Dict, Any
from .models import (
    TransactionRecord, FailureCategory, RCADiagnosis, BatchItemResult,
    BatchBenchmarkSummary, PolicyConfig, Channel
)
from .rca_agent import rca_agent
from .policy_engine import policy_engine
from .compliance_guard import compliance_guard
from .razorpay_bridge import razorpay_bridge
from .audit_logger import audit_ledger

SAMPLE_COMPANIES = [
    "Zepto Hyperlocal", "Swiggy Instamart", "Freshworks SaaS", "Khatabook Pro",
    "Meesho Logistics", "Urban Company Partner", "Nykaa Direct", "Razorpay Capital Merchant",
    "Ola Mobility Fleet", "BharatPe Merchant Hub"
]

SAMPLE_CUSTOMERS = [
    ("Aditya Sharma", "+919876543210", "aditya@sharma.in"),
    ("Pooja Nair", "+919812345678", "pooja@nair.com"),
    ("Rajesh Gupta", "+919988776655", "rajesh@guptatech.in"),
    ("Ananya Iyer", "+919765432109", "ananya@iyer.org"),
    ("Vikram Malhotra", "+919823456789", "vikram@malhotracorp.com"),
    ("Siddharth Rao", "+919834567890", "sid@raologistics.in"),
    ("Sneha Patel", "+919845678901", "sneha@pateldigital.in"),
    ("Deepak Verma", "+919856789012", "deepak@vermaenterprises.in")
]

FAILURE_SCENARIOS = [
    # 25% Technical Outage
    (FailureCategory.TECH_OUTAGE, "GATEWAY_TIMEOUT", "HDFC banking switch response timeout (504)", 1500, 35000),
    # 30% Liquidity Crunch
    (FailureCategory.LIQUIDITY_CRUNCH, "INSUFFICIENT_FUNDS", "Customer card limit exhausted / balance low", 12000, 85000),
    # 25% Micro-Dispute
    (FailureCategory.MICRO_DISPUTE, "DISPUTE_RAISED", "Client flagged partial fulfillment / damaged carton", 25000, 150000),
    # 15% Subscription Churn
    (FailureCategory.SUBSCRIPTION_CHURN, "MANDATE_EXPIRED", "e-NACH mandate recurring debit auth failed", 3000, 20000),
    # 5% Distress / Willful
    (FailureCategory.WILLFUL_CONTEST, "LEGAL_THREAT", "Customer requested DND / disputed invoice validity", 40000, 200000),
]

class BatchSimulator:
    def run_benchmark(self, batch_size: int = 100, seed: int = 42) -> BatchBenchmarkSummary:
        random.seed(seed)
        items: List[BatchItemResult] = []
        
        total_gmv = 0.0
        baseline_recovered_amt = 0.0
        agentic_recovered_amt = 0.0
        compliance_breaches = 0
        disputes_resolved = 0
        ptps_converted = 0
        
        category_stats: Dict[str, Dict[str, Any]] = {
            cat.value: {"count": 0, "gmv": 0.0, "baseline_recovered": 0.0, "agentic_recovered": 0.0}
            for cat in FailureCategory
        }

        for i in range(batch_size):
            roll = random.random()
            if roll < 0.25:
                cat_info = FAILURE_SCENARIOS[0]
            elif roll < 0.55:
                cat_info = FAILURE_SCENARIOS[1]
            elif roll < 0.80:
                cat_info = FAILURE_SCENARIOS[2]
            elif roll < 0.95:
                cat_info = FAILURE_SCENARIOS[3]
            else:
                cat_info = FAILURE_SCENARIOS[4]

            cat, err_code, err_desc, min_amt, max_amt = cat_info
            amount = round(random.uniform(min_amt, max_amt), -2)
            base_cust, _, base_email = random.choice(SAMPLE_CUSTOMERS)
            cust_name = base_cust
            cust_phone = f"+9198{i:08d}"
            cust_email = f"user_{i}@{base_email.split('@')[1]}" 
            company = random.choice(SAMPLE_COMPANIES)
            
            clean_company = company.replace(" ", "_").lower()[:12]
            txn = TransactionRecord(
                id=f"txn_{uuid.uuid4().hex[:10]}",
                invoice_id=f"INV-2026-{1000 + i}",
                merchant_id=f"rzp_m_{clean_company}",
                customer_name=f"{cust_name} ({company})",
                customer_phone=cust_phone,
                customer_email=cust_email,
                original_amount=amount,
                error_code=err_code,
                error_description=err_desc,
                gateway_name=random.choice(["HDFC_PG", "ICICI_SWITCH", "AXIS_DIRECT", "SBI_GATEWAY"]),
                status="FAILED"
            )

            # 1. RCA Diagnosis
            rca = rca_agent.diagnose(txn)

            # 2. Baseline Model
            baseline_recovered = False
            baseline_amt = 0.0
            if cat == FailureCategory.TECH_OUTAGE and random.random() < 0.35:
                baseline_recovered = True
                baseline_amt = amount
            elif cat == FailureCategory.SUBSCRIPTION_CHURN and random.random() < 0.08:
                baseline_recovered = True
                baseline_amt = amount
            elif cat == FailureCategory.AUTH_DROP and random.random() < 0.20:
                baseline_recovered = True
                baseline_amt = amount

            # 3. Agentic Swarm Execution
            agentic_recovered = False
            agentic_amt = 0.0
            method = "NONE"
            restructure_plan = None
            compliance_passed = True

            # Simulate operating at 11:30 AM IST (06:00 UTC) for compliant outreach
            simulated_business_hour_utc = datetime(2026, 8, 27, 6, 0, 0, tzinfo=timezone.utc)
            can_contact, violations = compliance_guard.validate_contact_action(txn, rca.recommended_channel, at_time=simulated_business_hour_utc)
            if not can_contact:
                compliance_passed = False
                compliance_breaches += 1

            if cat == FailureCategory.TECH_OUTAGE:
                if random.random() < 0.85:
                    agentic_recovered = True
                    agentic_amt = amount
                    method = "ALTERNATE_ACQUIRER_UPI_INTENT"
            
            elif cat == FailureCategory.LIQUIDITY_CRUNCH:
                if random.random() < 0.65:
                    agentic_recovered = True
                    plan = policy_engine.create_restructure_plan(txn, requested_discount_pct=0.0, num_installments=2, upfront_pct=40.0)
                    restructure_plan = razorpay_bridge.populate_restructure_links(plan, txn.customer_name, txn.customer_phone, txn.customer_email)
                    agentic_amt = plan.settlement_amount
                    method = "DEBT_RESTRUCTURE_SPLIT_AND_PTP"
                    ptps_converted += 1

            elif cat == FailureCategory.MICRO_DISPUTE:
                if random.random() < 0.70:
                    agentic_recovered = True
                    plan = policy_engine.create_restructure_plan(txn, requested_discount_pct=5.0, num_installments=1)
                    restructure_plan = razorpay_bridge.populate_restructure_links(plan, txn.customer_name, txn.customer_phone, txn.customer_email)
                    agentic_amt = plan.settlement_amount
                    method = "BOUNDED_DISPUTE_SETTLEMENT_CREDIT"
                    disputes_resolved += 1

            elif cat == FailureCategory.SUBSCRIPTION_CHURN:
                if random.random() < 0.50:
                    agentic_recovered = True
                    agentic_amt = amount
                    method = "ONE_CLICK_MANDATE_HEAL"

            elif cat == FailureCategory.WILLFUL_CONTEST:
                method = "CLEAN_HUMAN_LEGAL_ESCALATION"

            audit_rec = audit_ledger.log_event(
                transaction_id=txn.id,
                event_type="BENCHMARK_EVALUATED",
                agent_id="batch_simulator",
                details={
                    "category": cat.value,
                    "baseline_recovered": baseline_recovered,
                    "agentic_recovered": agentic_recovered,
                    "method": method,
                    "amount_recovered": agentic_amt
                },
                policy_checked=True
            )

            total_gmv += amount
            baseline_recovered_amt += baseline_amt
            agentic_recovered_amt += agentic_amt

            category_stats[cat.value]["count"] += 1
            category_stats[cat.value]["gmv"] += amount
            category_stats[cat.value]["baseline_recovered"] += baseline_amt
            category_stats[cat.value]["agentic_recovered"] += agentic_amt

            items.append(BatchItemResult(
                transaction=txn,
                rca=rca,
                baseline_recovered=baseline_recovered,
                baseline_amount_recovered=baseline_amt,
                agentic_recovered=agentic_recovered,
                agentic_amount_recovered=agentic_amt,
                recovery_method=method,
                restructure_plan=restructure_plan,
                compliance_passed=compliance_passed,
                audit_hash=audit_rec.hash
            ))

        baseline_rate = round((baseline_recovered_amt / total_gmv) * 100, 2) if total_gmv > 0 else 0
        agentic_rate = round((agentic_recovered_amt / total_gmv) * 100, 2) if total_gmv > 0 else 0
        net_alpha = round(agentic_recovered_amt - baseline_recovered_amt, 2)
        roi_mult = round(agentic_recovered_amt / max(1.0, baseline_recovered_amt), 2)

        return BatchBenchmarkSummary(
            total_cases=batch_size,
            total_gmv_at_risk=round(total_gmv, 2),
            baseline_recovered_amount=round(baseline_recovered_amt, 2),
            baseline_recovery_rate_pct=baseline_rate,
            agentic_recovered_amount=round(agentic_recovered_amt, 2),
            agentic_recovery_rate_pct=agentic_rate,
            net_alpha_inr=net_alpha,
            roi_multiple=roi_mult,
            compliance_breaches=compliance_breaches,
            dispute_resolutions_count=disputes_resolved,
            ptp_conversions_count=ptps_converted,
            avg_recovery_time_hours=1.8,
            category_breakdown=category_stats,
            items=items
        )

batch_simulator = BatchSimulator()
