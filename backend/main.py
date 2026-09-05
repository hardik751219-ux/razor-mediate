import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.models import (
    TransactionRecord, PolicyConfig, RCADiagnosis, RestructurePlan,
    PTPCommitment, BatchBenchmarkSummary, AuditRecord, Channel
)
from core.rca_agent import rca_agent
from core.policy_engine import policy_engine
from core.compliance_guard import compliance_guard
from core.razorpay_bridge import razorpay_bridge
from core.mediation_agent import mediation_agent
from core.batch_simulator import batch_simulator
from core.audit_logger import audit_ledger

app = FastAPI(
    title="RazorMediate API",
    description="Autonomous Financial Mediation & Revenue Recovery Swarm for Razorpay Merchants",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for demo
ptp_store: List[PTPCommitment] = []
active_transactions: Dict[str, TransactionRecord] = {}

class ChatRequest(BaseModel):
    transaction_id: str
    customer_name: str
    customer_phone: str
    customer_email: str
    original_amount: float
    invoice_id: str
    error_code: str
    error_description: str
    user_message: str
    channel: str = "WHATSAPP"
    conversation_history: Optional[List[Dict[str, str]]] = None

class RestructureRequest(BaseModel):
    transaction_id: str
    original_amount: float
    requested_discount_pct: float = 5.0
    num_installments: int = 2
    upfront_pct: float = 40.0
    customer_name: str = "Demo Merchant"
    customer_phone: str = "+919876543210"
    customer_email: str = "merchant@demo.in"

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "RazorMediate Swarm", "integrity": audit_ledger.verify_integrity()}

@app.get("/api/config", response_model=PolicyConfig)
def get_policy_config():
    return policy_engine.policy

@app.post("/api/config", response_model=PolicyConfig)
def update_policy_config(new_config: PolicyConfig):
    policy_engine.update_policy(new_config)
    compliance_guard.policy = new_config
    return policy_engine.policy

@app.post("/api/triage", response_model=RCADiagnosis)
def triage_transaction(txn: TransactionRecord, user_message: Optional[str] = None):
    active_transactions[txn.id] = txn
    return rca_agent.diagnose(txn, user_message=user_message)

@app.post("/api/restructure", response_model=RestructurePlan)
def restructure_payment(req: RestructureRequest):
    txn = active_transactions.get(req.transaction_id)
    if not txn:
        txn = TransactionRecord(
            id=req.transaction_id,
            invoice_id=f"INV-{req.transaction_id}",
            customer_name=req.customer_name,
            customer_phone=req.customer_phone,
            customer_email=req.customer_email,
            original_amount=req.original_amount,
            error_code="INSUFFICIENT_FUNDS",
            error_description="Card balance limit reached",
            status="FAILED"
        )
    plan = policy_engine.create_restructure_plan(
        txn=txn,
        requested_discount_pct=req.requested_discount_pct,
        num_installments=req.num_installments,
        upfront_pct=req.upfront_pct
    )
    plan = razorpay_bridge.populate_restructure_links(plan, req.customer_name, req.customer_phone, req.customer_email)
    return plan

@app.post("/api/chat")
def handle_chat_message(req: ChatRequest):
    txn = TransactionRecord(
        id=req.transaction_id,
        invoice_id=req.invoice_id,
        customer_name=req.customer_name,
        customer_phone=req.customer_phone,
        customer_email=req.customer_email,
        original_amount=req.original_amount,
        error_code=req.error_code,
        error_description=req.error_description,
        status="FAILED"
    )
    active_transactions[txn.id] = txn
    ch = Channel.VOICE if req.channel.upper() == "VOICE" else Channel.WHATSAPP
    result = mediation_agent.process_message(txn, req.user_message, ch, req.conversation_history)
    if result.get("ptp"):
        ptp_obj = PTPCommitment(**result["ptp"])
        ptp_store.append(ptp_obj)
    return result

@app.post("/api/simulate-batch", response_model=BatchBenchmarkSummary)
def run_batch_benchmark(batch_size: int = 100):
    return batch_simulator.run_benchmark(batch_size=batch_size)

@app.get("/api/audit-logs")
def get_audit_logs(limit: int = 100):
    is_valid = audit_ledger.verify_integrity()
    records = audit_ledger.get_recent_records(limit=limit)
    return {
        "integrity_verified": is_valid,
        "total_records": len(audit_ledger.chain),
        "records": records
    }

@app.get("/api/ptp/list", response_model=List[PTPCommitment])
def list_ptps():
    return ptp_store

@app.post("/api/razorpay/webhook")
def handle_razorpay_webhook(payload: Dict[str, Any]):
    event = payload.get("event", "unknown")
    audit_ledger.log_event(
        transaction_id=payload.get("payload", {}).get("payment", {}).get("entity", {}).get("order_id", "webhook_event"),
        event_type=f"RAZORPAY_WEBHOOK_{event.upper()}",
        agent_id="webhook_listener",
        details=payload,
        policy_checked=True
    )
    return {"status": "received", "event": event}
