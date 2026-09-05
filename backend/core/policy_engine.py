import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Tuple
from .models import TransactionRecord, PolicyConfig, RestructurePlan, InstallmentItem
from .audit_logger import audit_ledger

class RestructurePolicyEngine:
    def __init__(self, policy: PolicyConfig = PolicyConfig()):
        self.policy = policy

    def update_policy(self, new_policy: PolicyConfig):
        self.policy = new_policy

    def create_restructure_plan(
        self,
        txn: TransactionRecord,
        requested_discount_pct: float = 0.0,
        num_installments: int = 2,
        upfront_pct: float = 40.0
    ) -> RestructurePlan:
        plan_id = f"rst_{uuid.uuid4().hex[:10]}"
        notes = []

        # 1. Clamp discount percentage
        actual_discount_pct = min(max(0.0, requested_discount_pct), self.policy.max_discount_pct)
        if requested_discount_pct > self.policy.max_discount_pct:
            notes.append(f"Requested discount ({requested_discount_pct}%) clamped to merchant cap ({self.policy.max_discount_pct}%)")
        
        # 2. Clamp discount amount by flat cap
        raw_discount_amt = txn.original_amount * (actual_discount_pct / 100.0)
        discount_amount = min(raw_discount_amt, self.policy.max_discount_flat_inr)
        if raw_discount_amt > self.policy.max_discount_flat_inr:
            notes.append(f"Discount amount capped at max flat limit of INR {self.policy.max_discount_flat_inr}")

        settlement_amount = round(txn.original_amount - discount_amount, 2)

        # 3. Clamp installments
        actual_splits = min(max(1, num_installments), self.policy.max_split_installments)
        if num_installments > self.policy.max_split_installments:
            notes.append(f"Split count ({num_installments}) clamped to merchant maximum ({self.policy.max_split_installments})")

        # 4. Enforce minimum upfront percentage
        actual_upfront_pct = max(upfront_pct, self.policy.min_upfront_pct)
        if upfront_pct < self.policy.min_upfront_pct:
            notes.append(f"Upfront payment adjusted to minimum threshold of {self.policy.min_upfront_pct}%")

        # 5. Build installment schedule
        installments: List[InstallmentItem] = []
        now = datetime.now(timezone.utc)

        if actual_splits == 1:
            installments.append(InstallmentItem(
                index=1,
                amount=settlement_amount,
                due_date=now.strftime("%Y-%m-%d"),
                status="PENDING"
            ))
        else:
            upfront_amount = round(settlement_amount * (actual_upfront_pct / 100.0), 2)
            remaining_amount = round(settlement_amount - upfront_amount, 2)
            remaining_splits = actual_splits - 1
            split_amount = round(remaining_amount / remaining_splits, 2)

            # Tranche 1: Immediate Upfront
            installments.append(InstallmentItem(
                index=1,
                amount=upfront_amount,
                due_date=now.strftime("%Y-%m-%d"),
                status="PENDING"
            ))

            # Subsequent tranches (e.g. T+7 days, T+14 days)
            accumulated = upfront_amount
            for i in range(1, actual_splits):
                due = now + timedelta(days=i * 7)
                current_tranche_amt = split_amount if i < actual_splits - 1 else round(settlement_amount - accumulated, 2)
                accumulated += current_tranche_amt
                installments.append(InstallmentItem(
                    index=i + 1,
                    amount=current_tranche_amt,
                    due_date=due.strftime("%Y-%m-%d"),
                    status="PENDING"
                ))

        plan = RestructurePlan(
            plan_id=plan_id,
            transaction_id=txn.id,
            original_amount=txn.original_amount,
            discount_pct=round(actual_discount_pct, 2),
            discount_amount=round(discount_amount, 2),
            settlement_amount=settlement_amount,
            num_installments=actual_splits,
            installments=installments,
            approved_by_policy=True,
            policy_validation_notes=notes
        )

        audit_ledger.log_event(
            transaction_id=txn.id,
            event_type="RESTRUCTURE_PLAN_GENERATED",
            agent_id="policy_engine",
            details={
                "plan_id": plan_id,
                "original_amount": txn.original_amount,
                "discount_pct": plan.discount_pct,
                "settlement_amount": plan.settlement_amount,
                "splits": plan.num_installments,
                "notes": notes
            },
            policy_checked=True
        )

        return plan

policy_engine = RestructurePolicyEngine()
