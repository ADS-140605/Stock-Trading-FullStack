import asyncio
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # List of all active websocket connections
        self.active_connections: List[WebSocket] = []
        # Mapping for personal messages if needed
        self.user_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        if username not in self.user_connections:
            self.user_connections[username] = []
        self.user_connections[username].append(websocket)

    def disconnect(self, websocket: WebSocket, username: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if username in self.user_connections:
            if websocket in self.user_connections[username]:
                self.user_connections[username].remove(websocket)
            if not self.user_connections[username]:
                del self.user_connections[username]

    async def broadcast(self, message: dict):
        # Create a copy of the list to iterate over safely
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                pass

    async def send_personal_message(self, message: dict, username: str):
        if username in self.user_connections:
            for connection in list(self.user_connections[username]):
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()
