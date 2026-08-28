"""
Creates in-app notifications and pushes them over the live WebSocket channel.
"""
from sqlalchemy.orm import Session

from app.models.models import Notification, User, UserRole
from app.websocket.manager import ws_manager


async def notify_user(db: Session, user_id: str, notif_type: str, title: str,
                       message: str, metadata: dict | None = None, broadcast: bool = True) -> Notification:
    notif = Notification(
        user_id=user_id,
        type=notif_type,
        title=title,
        message=message,
        metadata_json=metadata or {},
    )
    db.add(notif)
    db.flush()

    if broadcast:
        await ws_manager.send_to_user(user_id, {
            "event": "notification",
            "notification": {
                "id": notif.id,
                "type": notif.type.value if hasattr(notif.type, "value") else notif.type,
                "title": notif.title,
                "message": notif.message,
                "created_at": notif.created_at.isoformat() if notif.created_at else None,
            },
        })
    return notif


async def notify_role(db: Session, role: str, notif_type: str, title: str,
                       message: str, metadata: dict | None = None) -> None:
    """Persist and broadcast a role-wide notification (bank/fraud desk)."""
    role_value = UserRole(role) if role in UserRole.__members__ else role
    users = db.query(User).filter(User.role == role_value, User.is_active == True).all()  # noqa: E712
    for user in users:
        db.add(Notification(user_id=user.id, type=notif_type, title=title,
                             message=message, metadata_json=metadata or {}))
    await ws_manager.send_to_role(role, {
        "event": "notification",
        "notification": {
            "type": notif_type,
            "title": title,
            "message": message,
            "metadata": metadata or {},
        },
    })
