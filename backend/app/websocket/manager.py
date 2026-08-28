"""
Simple in-memory WebSocket connection manager.

Tracks active connections keyed by user_id and by role, so both
targeted per-user alerts (customer) and role-wide broadcasts (admin)
are supported without page refresh.
"""
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.user_connections: Dict[str, List[WebSocket]] = {}
        self.role_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str, role: str) -> None:
        await websocket.accept()
        self.user_connections.setdefault(user_id, []).append(websocket)
        self.role_connections.setdefault(role, []).append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str, role: str) -> None:
        if user_id in self.user_connections and websocket in self.user_connections[user_id]:
            self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        if role in self.role_connections and websocket in self.role_connections[role]:
            self.role_connections[role].remove(websocket)
            if not self.role_connections[role]:
                del self.role_connections[role]

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        for ws in list(self.user_connections.get(user_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                pass

    async def send_to_role(self, role: str, payload: dict) -> None:
        for ws in list(self.role_connections.get(role, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                pass


ws_manager = ConnectionManager()
