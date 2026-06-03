"""
websocket_manager.py — WebSocket Connection Manager for SkillProof AI

Manages active WebSocket connections per user. Enables real-time
push notifications for job matches, AI completions, and app updates.
"""

import json
import logging
from typing import Dict, List

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages multiple WebSocket connections per user.

    Supports:
        - Multiple simultaneous sessions per user (multi-tab)
        - Per-user targeted messages
        - Global broadcast
    """

    def __init__(self):
        # user_id → list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        """Accept a new WebSocket connection and register it."""
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info("WS connected: user_id=%d (total sessions: %d)", user_id, len(self.active_connections[user_id]))

    def disconnect(self, websocket: WebSocket, user_id: int) -> None:
        """Remove a closed WebSocket connection."""
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
            except ValueError:
                pass
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info("WS disconnected: user_id=%d", user_id)

    async def send_to_user(self, user_id: int, data: dict) -> None:
        """Send a JSON message to all active sessions of a user."""
        if user_id not in self.active_connections:
            return
        dead = []
        for ws in self.active_connections[user_id]:
            try:
                await ws.send_text(json.dumps(data))
            except Exception as exc:
                logger.warning("WS send failed for user %d: %s", user_id, exc)
                dead.append(ws)
        # Clean up dead connections
        for ws in dead:
            try:
                self.active_connections[user_id].remove(ws)
            except ValueError:
                pass

    async def broadcast(self, data: dict) -> None:
        """Send a JSON message to every connected user."""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, data)

    def is_connected(self, user_id: int) -> bool:
        """Check if a user has at least one active WebSocket connection."""
        return user_id in self.active_connections and bool(self.active_connections[user_id])

    def active_user_count(self) -> int:
        """Return the number of users with active connections."""
        return len(self.active_connections)


# Global singleton instance used across all routes
manager = ConnectionManager()
