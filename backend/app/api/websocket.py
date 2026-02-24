"""
Spec10x Backend — WebSocket for Real-Time Processing Updates

Clients connect via WS /ws/processing to receive live status
updates as interviews are processed by background workers.
"""

import logging
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.auth import verify_firebase_token
from app.core.pubsub import subscribe_user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/processing")
async def processing_updates(
    websocket: WebSocket,
    token: str = Query(default=""),
):
    """
    WebSocket endpoint for real-time interview processing updates.

    Connect with: ws://localhost:8000/ws/processing?token=<firebase_token>

    Sends JSON messages:
    {
        "interview_id": "...",
        "status": "analyzing",
        "message": "Extracting themes...",
        "insights_count": 3
    }
    """
    # Authenticate
    claims = verify_firebase_token(token)
    if claims is None:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = claims.get("uid", "")

    await websocket.accept()
    logger.info(f"WebSocket connected for user {user_id}")

    try:
        async for status_msg in subscribe_user(user_id):
            await websocket.send_json(status_msg)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.exception(f"WebSocket error for user {user_id}: {e}")
        try:
            await websocket.close(code=1011, reason="Internal error")
        except Exception:
            pass
