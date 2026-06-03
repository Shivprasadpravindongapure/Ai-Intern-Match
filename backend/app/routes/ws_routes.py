"""
ws_routes.py — WebSocket & Notifications Endpoints for SkillProof AI

Provides:
  - WebSocket /ws/{user_id} — real-time push notifications per user
  - GET  /api/notifications — list user's notifications
  - POST /api/notifications/{id}/read — mark one as read
  - POST /api/notifications/read-all — mark all as read
  - DELETE /api/notifications/{id} — delete one
  - GET  /api/notifications/unread-count — badge count
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.utils.jwt_handler import get_current_user
from app.utils.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket & Notifications"])


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket /ws/{user_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: str = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    WebSocket endpoint for real-time notifications.

    Authentication: JWT token passed as ?token=<jwt> query parameter.
    Sends push notifications for:
      - Job matches found
      - AI analysis complete
      - Application status updates
      - Profile refresh complete
    """
    # Validate JWT token
    if not token:
        await websocket.close(code=4001)
        return

    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        token_user_id = int(payload.get("sub") or 0)
    except (JWTError, ValueError):
        await websocket.close(code=4001)
        return

    # Ensure the token belongs to the requested user_id
    if token_user_id != user_id:
        await websocket.close(code=4003)
        return

    # Validate user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=4004)
        return

    # Connect
    await manager.connect(websocket, user_id)
    logger.info("WS authenticated: user_id=%d (%s)", user_id, user.email)

    # Send connected event + unread count
    unread_count = db.query(Notification).filter(
        Notification.user_id == user_id, Notification.is_read == False
    ).count()
    await websocket.send_json({
        "type": "connected",
        "message": f"Real-time connected. Welcome back, {user.full_name.split()[0]}!",
        "unread_count": unread_count,
        "timestamp": datetime.utcnow().isoformat(),
    })

    try:
        while True:
            # Keep the connection alive — handle ping/pong
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info("WS disconnected: user_id=%d", user_id)
    except Exception as exc:
        logger.error("WS error for user_id=%d: %s", user_id, exc)
        manager.disconnect(websocket, user_id)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/notifications
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/notifications", tags=["Notifications"])
def get_notifications(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return the latest notifications for the authenticated user."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "notifications": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "is_read": n.is_read,
                "meta": n.meta,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/notifications/unread-count
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/notifications/unread-count", tags=["Notifications"])
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return the count of unread notifications."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return {"count": count}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/notifications/{id}/read
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/notifications/{notif_id}/read", tags=["Notifications"])
def mark_notification_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Mark a specific notification as read."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notif_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read."}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/notifications/read-all
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/notifications/read-all", tags=["Notifications"])
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Mark all notifications as read for the current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/notifications/{id}
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/api/notifications/{notif_id}", tags=["Notifications"])
def delete_notification(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete a specific notification."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notif_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted."}
