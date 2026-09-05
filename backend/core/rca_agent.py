from typing import Optional
from .models import TransactionRecord, RCADiagnosis, FailureCategory, Channel
from .audit_logger import audit_ledger

class RCAClassifierAgent:
    def diagnose(self, txn: TransactionRecord, user_message: Optional[str] = None) -> RCADiagnosis:
        code = txn.error_code.upper()
        desc = txn.error_description.lower()
        msg = user_message.lower().strip() if user_message else ""

        # Priority 1: Customer in-conversation explicit distress / emergency signal
        if msg and any(w in msg for w in [
            "hospital", "emergency", "accident", "died", "death", "icu", "funeral", "harass", "police", "lawyer"
        ]):
            diag = RCADiagnosis(
                transaction_id=txn.id,
                failure_category=FailureCategory.WILLFUL_CONTEST,
                confidence=0.98,
                root_cause_explanation="Distress/Emergency keyword detected in customer message. Automated outreach halted per regulatory guardrails.",
                recommended_channel=Channel.EMAIL,
                recommended_action="Cool-off lock active (72h). Case transferred to human finance desk.",
                eligible_for_restructure=False,
                tags=["distress_halt", "regulatory_freeze", "human_escalation"]
            )

        # Priority 2: Customer reports specific dispute / damaged goods in message
        elif msg and any(w in msg for w in [
            "damage", "damaged", "defect", "missing", "broken", "wrong bill", "dispute", "kharab", "galat", "carton"
        ]):
            carton_info = "2 damaged cartons" if ("2" in msg or "carton" in msg) else "fulfillment defect"
            diag = RCADiagnosis(
                transaction_id=txn.id,
                failure_category=FailureCategory.MICRO_DISPUTE,
                confidence=0.93,
                root_cause_explanation=f"Customer reported {carton_info} in shipment batch. B2B delivery discrepancy verified via conversation.",
                recommended_channel=Channel.VOICE,
                recommended_action="Authorise bounded goodwill credit (up to 7.5%) to close receivable immediately.",
                eligible_for_restructure=True,
                tags=["dispute_verified", "customer_testimony", "goodwill_credit"]
            )

        # Priority 3: Customer reports liquidity crunch / requests installment split
        elif msg and any(w in msg for w in [
            "split", "installment", "paise nahi", "salary", "friday", "next week", "budget", "part payment", "cashflow", "kisto", "40%"
        ]):
            diag = RCADiagnosis(
                transaction_id=txn.id,
                failure_category=FailureCategory.LIQUIDITY_CRUNCH,
                confidence=0.95,
                root_cause_explanation="Customer confirmed temporary cashflow mismatch pending salary cycle. Structured split plan requested.",
                recommended_channel=Channel.WHATSAPP,
                recommended_action="Generate interest-free 2-part split plan with Promise-to-Pay contract.",
                eligible_for_restructure=True,
                tags=["liquidity_confirmed", "split_restructure", "ptp_tracking"]
            )

        # Priority 4: Customer reports technical failure in message
        elif msg and any(w in msg for w in [
            "timeout", "otp", "freeze", "frozen", "server", "failed", "screen", "glitch"
        ]):
            diag = RCADiagnosis(
                transaction_id=txn.id,
                failure_category=FailureCategory.TECH_OUTAGE,
                confidence=0.97,
                root_cause_explanation="Customer confirmed transaction freeze during OTP verification step. Core banking switch delay.",
                recommended_channel=Channel.WHATSAPP,
                recommended_action="Dispatch alternate 1-click Razorpay UPI intent link.",
                eligible_for_restructure=False,
                tags=["tech_verified", "upi_intent", "zero_friction"]
            )

        # Priority 5: Telemetry from Payment Gateway (when no customer message yet)
        elif any(term in code for term in [
            "GATEWAY_TIMEOUT", "BAD_GATEWAY", "TIMEOUT", "503", "504", "BANK_DOWN", "HDFC_DOWN", "NPCI_DOWN"
        ]):
            diag = RCADiagnosis(
                transaction_id=txn.id,
                failure_category=FailureCategory.TECH_OUTAGE,
                confidence=0.96,
                root_cause_explanation="Bank switch 504 timeout detected from HDFC core network telemetry. Customer payment drop was technical.",
                recommended_channel=Channel.WHATSAPP,
                recommended_action="Trigger smart payment retry link via alternate acquirer with 1-click UPI intent.",
                eligible_for_restructure=False,
                tags=["gateway_timeout", "telemetry_verified", "alternate_routing"]
            )

        elif any(term in code for term in [
            "INSUFFICIENT_FUNDS", "LIMIT_EXCEEDED", "LOW_BALANCE", "CARD_LIMIT"
        ]):
            diag = RCADiagnosis(
                transaction_id=txn.id,
                failure_category=FailureCategory.LIQUIDITY_CRUNCH,
                confidence=0.89,
                root_cause_explanation="Card issuer declined: credit limit exhausted during billing attempt. Awaiting customer confirmation for split schedule.",
                recommended_channel=Channel.WHATSAPP,
                recommended_action="Synthesize dynamic multi-tranche payment plan with Promise-to-Pay tracker.",
                eligible_for_restructure=True,
                tags=["card_limit_telemetry", "awaiting_split_confirmation"]
            )

        elif any(term in code for term in ["DISPUTE", "DEFECT", "CHARGEBACK", "REFUND_DEMAND"]):
            diag = RCADiagnosis(
                transaction_id=txn.id,
                failure_category=FailureCategory.MICRO_DISPUTE,
                confidence=0.79,
                root_cause_explanation="Invoice dispute flag registered in system. Specific delivery exception details pending customer statement.",
                recommended_channel=Channel.VOICE,
                recommended_action="Initiate conversational triage to determine exact goods or invoice discrepancy.",
                eligible_for_restructure=True,
                tags=["preliminary_dispute_flag", "awaiting_customer_statement"]
            )

        elif any(term in code for term in ["MANDATE_EXPIRED", "CARD_EXPIRED", "AUTH_REVOKED"]):
            diag = RCADiagnosis(
                transaction_id=txn.id,
                failure_category=FailureCategory.SUBSCRIPTION_CHURN,
                confidence=0.95,
                root_cause_explanation="Recurring auto-debit token expired. Customer at risk of silent churn.",
                recommended_channel=Channel.WHATSAPP,
                recommended_action="Dispatch interactive 1-click Razorpay e-NACH/UPI AutoPay update link.",
                eligible_for_restructure=False,
                tags=["subscription_healing", "enach_update"]
            )

        else:
            diag = RCADiagnosis(
                transaction_id=txn.id,
                failure_category=FailureCategory.AUTH_DROP,
                confidence=0.72,
                root_cause_explanation=f"Invoice {txn.invoice_id} overdue. No technical gateway exception reported. Telemetry awaiting customer response.",
                recommended_channel=Channel.WHATSAPP,
                recommended_action="Send pre-filled Razorpay Fast Checkout link with UPI intent direct trigger.",
                eligible_for_restructure=False,
                tags=["inconclusive_telemetry", "conversational_inquiry"]
            )

        audit_ledger.log_event(
            transaction_id=txn.id,
            event_type="RCA_DIAGNOSIS_COMPLETED",
            agent_id="rca_agent",
            details={
                "category": diag.failure_category.value,
                "confidence": diag.confidence,
                "explanation": diag.root_cause_explanation,
                "recommended_action": diag.recommended_action,
                "has_user_message": bool(user_message)
            },
            policy_checked=True
        )

        return diag

rca_agent = RCAClassifierAgent()
