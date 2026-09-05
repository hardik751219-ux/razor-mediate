import re
from datetime import datetime, timezone, timedelta
from typing import Tuple, List, Dict, Optional
from .models import TransactionRecord, PolicyConfig, Channel
from .audit_logger import audit_ledger

DISTRESS_PATTERNS = [
    r"\bhospital\b", r"\bmedical emergency\b", r"\bicuda\b", r"\baccident\b",
    r"\bpolice\b", r"\blegal notice\b", r"\bcourt\b", r"\bsue\b", r"\blawyer\b",
    r"\bharassment\b", r"\bharrass\b", r"\bstop calling\b", r"\bdon't call\b",
    r"\bdo not call\b", r"\bdnd\b", r"\bfraud company\b", r"\bcheater\b"
]

class ComplianceGuard:
    def __init__(self, policy: PolicyConfig = PolicyConfig()):
        self.policy = policy
        self.customer_history: Dict[str, List[datetime]] = {}
        self.cool_off_list: Dict[str, datetime] = {}

    def is_within_trai_window(self, dt: Optional[datetime] = None) -> Tuple[bool, str]:
        if not self.policy.enforce_trai_hours:
            return True, "TRAI window check bypassed by config"
        
        now_utc = dt or datetime.now(timezone.utc)
        ist_offset = timedelta(hours=5, minutes=30)
        ist_now = now_utc + ist_offset
        hour = ist_now.hour
        
        if 9 <= hour < 20:
            return True, f"Current IST time ({ist_now.strftime('%H:%M')}) is within TRAI window (09:00 - 20:00)"
        return False, f"Current IST time ({ist_now.strftime('%H:%M')}) is outside TRAI permissible window (09:00 - 20:00)"

    def check_velocity_and_cooldown(self, customer_phone: str, at_time: Optional[datetime] = None) -> Tuple[bool, str]:
        now = at_time or datetime.now(timezone.utc)
        if customer_phone in self.cool_off_list:
            cool_off_expiry = self.cool_off_list[customer_phone]
            if now < cool_off_expiry:
                remaining_hours = (cool_off_expiry - now).total_seconds() / 3600
                return False, f"Customer is in mandatory cooling-off period ({remaining_hours:.1f}h remaining)"
            else:
                del self.cool_off_list[customer_phone]

        history = self.customer_history.get(customer_phone, [])
        seven_days_ago = now - timedelta(days=7)
        recent_contacts = [t for t in history if t > seven_days_ago]
        self.customer_history[customer_phone] = recent_contacts

        if len(recent_contacts) >= self.policy.max_contact_velocity:
            return False, f"Max contact velocity exceeded ({len(recent_contacts)}/{self.policy.max_contact_velocity} attempts in 7 days)"

        return True, f"Velocity check passed ({len(recent_contacts)}/{self.policy.max_contact_velocity} attempts)"

    def detect_distress_or_optout(self, text: str) -> Tuple[bool, Optional[str]]:
        lower = text.lower()
        for pat in DISTRESS_PATTERNS:
            if re.search(pat, lower):
                return True, f'Triggered safety rule: match for pattern "{pat}"'
        return False, None

    def record_attempt(self, customer_phone: str, at_time: Optional[datetime] = None):
        now = at_time or datetime.now(timezone.utc)
        if customer_phone not in self.customer_history:
            self.customer_history[customer_phone] = []
        self.customer_history[customer_phone].append(now)

    def trigger_cool_off(self, customer_phone: str, hours: Optional[int] = None, at_time: Optional[datetime] = None):
        h = hours or self.policy.cool_off_hours
        now = at_time or datetime.now(timezone.utc)
        expiry = now + timedelta(hours=h)
        self.cool_off_list[customer_phone] = expiry

    def validate_contact_action(
        self,
        txn: TransactionRecord,
        channel: Channel,
        at_time: Optional[datetime] = None
    ) -> Tuple[bool, List[str]]:
        violations = []
        if channel in [Channel.VOICE, Channel.WHATSAPP, Channel.SMS]:
            ok, reason = self.is_within_trai_window(at_time)
            if not ok:
                violations.append(reason)

        ok, reason = self.check_velocity_and_cooldown(txn.customer_phone, at_time)
        if not ok:
            violations.append(reason)

        is_allowed = len(violations) == 0
        audit_ledger.log_event(
            transaction_id=txn.id,
            event_type="COMPLIANCE_CHECK",
            agent_id="compliance_guard",
            details={
                "channel": channel.value,
                "is_allowed": is_allowed,
                "violations": violations
            },
            policy_checked=True
        )
        return is_allowed, violations

compliance_guard = ComplianceGuard()
