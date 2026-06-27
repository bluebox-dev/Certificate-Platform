from fastapi import Request
from sqlalchemy.orm import Session
import models
import uuid

def log_action(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID = None,
    actor_id: uuid.UUID = None,
    request: Request = None,
    metadata: dict = None
):
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    log_entry = models.AuditLog(
        id=uuid.uuid4(),
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address,
        user_agent=user_agent,
        meta_data=metadata or {}
    )
    db.add(log_entry)
    db.commit()
