import uuid
from typing import Dict, Any, Optional
from .models import RestructurePlan
from .audit_logger import audit_ledger

class RazorpayBridge:
    def __init__(self, key_id: str = "rzp_test_mX8yQ9w21K4L5P", key_secret: str = "mock_secret_key_rzp_2026"):
        self.key_id = key_id
        self.key_secret = key_secret
        self.created_links: Dict[str, Dict[str, Any]] = {}
        self.created_orders: Dict[str, Dict[str, Any]] = {}

    def create_order(self, amount: float, receipt: str, currency: str = "INR", notes: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        order_id = f"order_{uuid.uuid4().hex[:14]}"
        amount_paisa = int(amount * 100)
        order = {
            "id": order_id,
            "entity": "order",
            "amount": amount_paisa,
            "amount_paid": 0,
            "amount_due": amount_paisa,
            "currency": currency,
            "receipt": receipt,
            "status": "created",
            "notes": notes or {},
            "created_at": 1772064000
        }
        self.created_orders[order_id] = order
        return order

    def create_payment_link(
        self,
        amount: float,
        customer_name: str,
        customer_phone: str,
        customer_email: str,
        description: str,
        notes: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        plink_id = f"plink_{uuid.uuid4().hex[:14]}"
        amount_paisa = int(amount * 100)
        short_url = f"https://rzp.io/i/{plink_id[6:14]}"
        upi_intent = f"upi://pay?pa=razorpay.test@icici&pn=RazorpayTestMerchant&am={amount:.2f}&cu=INR&tn={plink_id}"

        payload = {
            "id": plink_id,
            "amount": amount_paisa,
            "currency": "INR",
            "description": description,
            "customer": {
                "name": customer_name,
                "contact": customer_phone,
                "email": customer_email
            },
            "short_url": short_url,
            "upi_intent_url": upi_intent,
            "qr_code_url": f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={upi_intent}",
            "status": "created",
            "notes": notes or {}
        }

        self.created_links[plink_id] = payload
        return payload

    def populate_restructure_links(
        self,
        plan: RestructurePlan,
        customer_name: str,
        customer_phone: str,
        customer_email: str
    ) -> RestructurePlan:
        for item in plan.installments:
            desc = f"RazorMediate Restructured Settlement Tranche {item.index}/{plan.num_installments} for Txn {plan.transaction_id}"
            link_data = self.create_payment_link(
                amount=item.amount,
                customer_name=customer_name,
                customer_phone=customer_phone,
                customer_email=customer_email,
                description=desc,
                notes={"plan_id": plan.plan_id, "tranche_index": str(item.index), "due_date": item.due_date}
            )
            item.payment_link_id = link_data["id"]
            item.payment_url = link_data["short_url"]
            item.qr_code_url = link_data["qr_code_url"]

        audit_ledger.log_event(
            transaction_id=plan.transaction_id,
            event_type="RAZORPAY_SPLIT_LINKS_PROVISIONED",
            agent_id="razorpay_bridge",
            details={
                "plan_id": plan.plan_id,
                "links_created": [item.payment_link_id for item in plan.installments]
            },
            policy_checked=True
        )
        return plan

    def simulate_payment_success(self, plink_id: str) -> Dict[str, Any]:
        if plink_id in self.created_links:
            self.created_links[plink_id]["status"] = "paid"
        return {
            "event": "payment_link.paid",
            "payload": {
                "payment_link": {
                    "entity": {
                        "id": plink_id,
                        "status": "paid"
                    }
                }
            }
        }

razorpay_bridge = RazorpayBridge()
