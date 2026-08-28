"""
WebSocket endpoint for real-time dual alerts (/ws/alerts).

Client connects with a JWT as a query param: /ws/alerts?token=<jwt>
Server validates the token, registers the socket under the user's id
and role, and pushes notification/fraud events as they happen
(see app/services/notification_service.py).
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.database import SessionLocal
from app.models.models import User
from app.services.security import decode_token
from app.websocket.manager import ws_manager

router = APIRouter()


@router.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
    except Exception:
        await websocket.close(code=4401)
        return

    user_id = payload.get("sub")
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
    finally:
        db.close()

    if not user:
        await websocket.close(code=4401)
        return

    role = user.role.value
    await ws_manager.connect(websocket, user.id, role)
    try:
        while True:
            # Keep the connection alive; client may send pings.
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user.id, role)
