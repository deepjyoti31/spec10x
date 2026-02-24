"""
Spec10x Backend — Redis Pub/Sub for Real-Time Processing Updates

Workers publish status updates → WebSocket handler subscribes and broadcasts to clients.
"""

import json
import logging
from typing import AsyncGenerator

import redis.asyncio as aioredis

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Lazy-init Redis connection pool
_redis_pool: aioredis.Redis | None = None


def _get_redis() -> aioredis.Redis:
    """Get or create a Redis connection for pub/sub."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
        )
    return _redis_pool


def _channel_name(user_id: str) -> str:
    return f"spec10x:processing:{user_id}"


async def publish_status(
    user_id: str,
    interview_id: str,
    status: str,
    message: str,
    insights_count: int = 0,
    extra: dict | None = None,
) -> None:
    """Publish a processing status update for a user's interview."""
    r = _get_redis()
    payload = {
        "interview_id": str(interview_id),
        "status": status,
        "message": message,
        "insights_count": insights_count,
    }
    if extra:
        payload.update(extra)
    await r.publish(_channel_name(str(user_id)), json.dumps(payload))
    logger.debug(f"Published status: {status} for interview {interview_id}")


async def subscribe_user(user_id: str) -> AsyncGenerator[dict, None]:
    """
    Async generator that yields processing status messages for a user.
    Used by WebSocket handler.
    """
    r = _get_redis()
    pubsub = r.pubsub()
    channel = _channel_name(str(user_id))
    await pubsub.subscribe(channel)
    logger.info(f"Subscribed to {channel}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    yield data
                except json.JSONDecodeError:
                    continue
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()
