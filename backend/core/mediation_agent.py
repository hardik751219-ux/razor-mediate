import uuid
from typing import Dict, Any, List, Optional
from .models import TransactionRecord, RCADiagnosis, Channel, RestructurePlan, PTPCommitment, PTPStatus
from .policy_engine import policy_engine
from .compliance_guard import compliance_guard
from .razorpay_bridge import razorpay_bridge
from .audit_logger import audit_ledger
from .rca_agent import rca_agent

class MediationAgent:
    def process_message(
        self,
        txn: TransactionRecord,
        user_message: str,
        channel: Channel = Channel.WHATSAPP,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        history = conversation_history or []
        user_lower = user_message.lower().strip()

        # Run RCA on every message so confidence is always fresh and real
        rca = rca_agent.diagnose(txn, user_message=user_message)
        rca_payload = {
            "failure_category": rca.failure_category.value,
            "confidence": rca.confidence,
            "confidence_pct": round(rca.confidence * 100, 1),
            "root_cause_explanation": rca.root_cause_explanation,
            "recommended_action": rca.recommended_action,
            "tags": rca.tags,
        }

        # 1. Safety & Distress check
        is_distress, reason = compliance_guard.detect_distress_or_optout(user_message)
        if is_distress:
            compliance_guard.trigger_cool_off(txn.customer_phone, hours=72)
            audit_ledger.log_event(
                transaction_id=txn.id,
                event_type="DISTRESS_ESCALATION",
                agent_id="mediation_agent",
                details={"reason": reason, "customer_input": user_message},
                policy_checked=True
            )
            return {
                "agent_response": "I sincerely apologize for troubling you during this time. I have placed an immediate freeze on all follow-ups regarding this invoice and transferred your file to our senior care desk. Wishing you safety and recovery.",
                "action_taken": "COOL_OFF_TRIGGERED",
                "status": "ESCALATED_TO_HUMAN",
                "restructure_plan": None,
                "ptp": None,
                "escalated": True,
                "rca": rca_payload
            }

        # 2. Case A: Micro-Dispute (Damage / Defect / SLA Breach)
        if any(w in user_lower for w in ["damage", "damaged", "defect", "missing", "8 out of 10", "wrong bill", "dispute", "kharab", "galat"]):
            plan = policy_engine.create_restructure_plan(txn, requested_discount_pct=5.0, num_installments=1)
            plan = razorpay_bridge.populate_restructure_links(plan, txn.customer_name, txn.customer_phone, txn.customer_email)
            
            response = (
                f"Namaste {txn.customer_name} ji. We truly apologize for the discrepancy with your order. "
                f"To resolve this immediately without delaying your workflow, our policy allows an instant goodwill settlement credit of "
                f"₹{plan.discount_amount:,.0f} ({plan.discount_pct}%). You can settle the adjusted balance of ₹{plan.settlement_amount:,.0f} directly here: "
                f"{plan.installments[0].payment_url}"
            )
            return {
                "agent_response": response,
                "action_taken": "DISPUTE_CREDIT_OFFERED",
                "status": "RESTRUCTURED",
                "restructure_plan": plan.model_dump(),
                "ptp": None,
                "escalated": False,
                "rca": rca_payload
            }

        # 3. Case B: Liquidity Crunch / Installment / Split Request / Delay Request
        elif any(w in user_lower for w in ["split", "installment", "paise nahi hai", "salary", "friday", "next week", "budget", "part payment", "cashflow", "kisto"]):
            plan = policy_engine.create_restructure_plan(txn, requested_discount_pct=0.0, num_installments=2, upfront_pct=40.0)
            plan = razorpay_bridge.populate_restructure_links(plan, txn.customer_name, txn.customer_phone, txn.customer_email)
            
            upfront_link = plan.installments[0].payment_url
            response = (
                f"We completely understand your cashflow situation, {txn.customer_name}. "
                f"We have activated an interest-free 2-part split plan for you: Pay ₹{plan.installments[0].amount:,.0f} upfront today to keep your account in good standing, "
                f"and the remaining ₹{plan.installments[1].amount:,.0f} in 7 days ({plan.installments[1].due_date}). "
                f"Here is your instant link for Part 1: {upfront_link}"
            )
            
            ptp = PTPCommitment(
                ptp_id=f"ptp_{uuid.uuid4().hex[:10]}",
                transaction_id=txn.id,
                customer_name=txn.customer_name,
                customer_phone=txn.customer_phone,
                amount_promised=plan.settlement_amount,
                promised_date=plan.installments[1].due_date,
                channel=channel,
                status=PTPStatus.PENDING,
                notes="Agreed to 2-part split plan via AI mediation"
            )
            return {
                "agent_response": response,
                "action_taken": "SPLIT_PLAN_GENERATED",
                "status": "RESTRUCTURED",
                "restructure_plan": plan.model_dump(),
                "ptp": ptp.model_dump(),
                "escalated": False,
                "rca": rca_payload
            }

        # 4. Case C: Technical Problem (Bank timeout, OTP failed)
        elif any(w in user_lower for w in ["bank timeout", "otp", "technical error", "failed", "server down", "server issue", "degraded"]):
            plan = policy_engine.create_restructure_plan(txn, requested_discount_pct=0.0, num_installments=1)
            plan = razorpay_bridge.populate_restructure_links(plan, txn.customer_name, txn.customer_phone, txn.customer_email)
            
            response = (
                f"We noticed your bank switch experienced a transient timeout during OTP verification. "
                f"We have routed an alternate 1-click Razorpay UPI intent link directly to your device: {plan.installments[0].payment_url} "
                f"(Zero OTP required for UPI apps)."
            )
            return {
                "agent_response": response,
                "action_taken": "FAST_UPI_LINK_DISPATCHED",
                "status": "RECOVERED",
                "restructure_plan": plan.model_dump(),
                "ptp": None,
                "escalated": False,
                "rca": rca_payload
            }

        # Default General Response
        else:
            plan = policy_engine.create_restructure_plan(txn, requested_discount_pct=0.0, num_installments=1)
            plan = razorpay_bridge.populate_restructure_links(plan, txn.customer_name, txn.customer_phone, txn.customer_email)
            response = (
                f"Hello {txn.customer_name}, this is your automated billing assistant for invoice {txn.invoice_id} of ₹{txn.original_amount:,.0f}. "
                f"How can we assist you today? You may request a 2-part split plan, report an invoice dispute, or pay instantly with 1-click UPI: {plan.installments[0].payment_url}"
            )
            return {
                "agent_response": response,
                "action_taken": "GREETING_AND_OPTIONS_PRESENTED",
                "status": "FAILED",
                "restructure_plan": plan.model_dump(),
                "ptp": None,
                "escalated": False,
                "rca": rca_payload
            }

mediation_agent = MediationAgent()
