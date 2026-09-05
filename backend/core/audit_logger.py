import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List
from .models import AuditRecord

class AuditLedger:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AuditLedger, cls).__new__(cls)
            cls._instance.chain: List[AuditRecord] = []
            cls._instance.last_hash: str = "0" * 64
        return cls._instance

    def log_event(
        self,
        transaction_id: str,
        event_type: str,
        agent_id: str,
        details: Dict[str, Any],
        policy_checked: bool = True
    ) -> AuditRecord:
        record_id = f"aud_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        payload_to_hash = {
            "id": record_id,
            "timestamp": timestamp,
            "transaction_id": transaction_id,
            "event_type": event_type,
            "agent_id": agent_id,
            "details": details,
            "policy_checked": policy_checked,
            "prev_hash": self.last_hash
        }
        
        serialized = json.dumps(payload_to_hash, sort_keys=True)
        record_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        
        record = AuditRecord(
            id=record_id,
            timestamp=timestamp,
            transaction_id=transaction_id,
            event_type=event_type,
            agent_id=agent_id,
            details=details,
            policy_checked=policy_checked,
            prev_hash=self.last_hash,
            hash=record_hash
        )
        
        self.chain.append(record)
        self.last_hash = record_hash
        return record

    def verify_integrity(self) -> bool:
        prev = "0" * 64
        for record in self.chain:
            if record.prev_hash != prev:
                return False
            payload = {
                "id": record.id,
                "timestamp": record.timestamp,
                "transaction_id": record.transaction_id,
                "event_type": record.event_type,
                "agent_id": record.agent_id,
                "details": record.details,
                "policy_checked": record.policy_checked,
                "prev_hash": record.prev_hash
            }
            expected_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
            if record.hash != expected_hash:
                return False
            prev = record.hash
        return True

    def get_records_for_transaction(self, transaction_id: str) -> List[AuditRecord]:
        return [r for r in self.chain if r.transaction_id == transaction_id]

    def get_recent_records(self, limit: int = 50) -> List[AuditRecord]:
        return self.chain[-limit:][::-1]

    def reset(self):
        self.chain.clear()
        self.last_hash = "0" * 64

audit_ledger = AuditLedger()
