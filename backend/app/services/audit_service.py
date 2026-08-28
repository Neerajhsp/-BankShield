"""
Audit logging helper — every sensitive action writes an AuditLog row.
"""
from sqlalchemy.orm import Session

from app.models.models import AuditLog


def log_action(db: Session, user_id: str | None, action: str, entity: str,
                entity_id: str | None = None, metadata: dict | None = None) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        metadata_json=metadata or {},
    )
    db.add(entry)
    db.flush()
    return entry
