"""
Spec10x Backend — WebSocket for Real-Time Processing Updates

Clients connect via WS /ws/processing to receive live status
updates as interviews are processed by background workers.
"""

import logging
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select

from app.core.auth import verify_firebase_token
from app.core.database import get_session_factory
from app.core.pubsub import subscribe_user
from app.models import User, Interview, InterviewStatus
import asyncio

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
        "message": "Extracting themes..."
    }
    """
    await websocket.accept()
    
    # Authenticate
    claims = verify_firebase_token(token)
    if claims is None:
        logger.warning(f"WebSocket: Auth failed for token starting with {token[:10]}...")
        await websocket.close(code=4001, reason="Invalid token")
        return

    firebase_uid = claims.get("uid", "")
    
    # Look up the database user to get the DB UUID — the worker publishes
    # status updates keyed by the DB user UUID, not the Firebase UID.
    try:
        async with get_session_factory()() as db:
            stmt = select(User).where(User.firebase_uid == firebase_uid)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()

        if user is None:
            logger.warning(f"WebSocket: No DB user found for Firebase UID {firebase_uid}")
            await websocket.close(code=4001, reason="User not found")
            return

        user_id = str(user.id)
    except Exception as e:
        logger.error(f"WebSocket: Failed to look up user: {e}")
        await websocket.close(code=1011, reason="Internal error")
        return

    logger.info(f"WebSocket connected for user {user_id} (firebase: {firebase_uid})")
    
    # 1. Send initial state of all currently processing or recently updated interviews
    try:
        async with get_session_factory()() as db:
            stmt = (
                select(Interview)
                .where(Interview.user_id == user.id)
                .order_by(Interview.updated_at.desc())
                .limit(20)
            )
            result = await db.execute(stmt)
            interviews = result.scalars().all()
            
            for interview in interviews:
                await websocket.send_json({
                    "interview_id": str(interview.id),
                    "status": interview.status.value,
                    "message": f"Status: {interview.status.value}"
                })
            logger.info(f"WebSocket: Sent initial state for {len(interviews)} interviews to user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket: Failed to send initial state: {e}")

    # 2. Start keep-alive ping task
    async def keep_alive():
        try:
            while True:
                await asyncio.sleep(30)
                await websocket.send_json({"type": "ping"})
        except Exception:
            pass

    ping_task = asyncio.create_task(keep_alive())

    try:
        # 3. Stream live updates
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
    finally:
        ping_task.cancel()
