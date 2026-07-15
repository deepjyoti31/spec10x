"""
Spec10x Backend — arq Worker Entry Point

Background job worker that processes interview files through the AI pipeline.

Run with:
    python -m arq app.workers.worker.WorkerSettings
"""

import logging
from arq import cron
from arq.connections import RedisSettings
from app.core.config import get_settings

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


async def process_interview_job(ctx: dict, interview_id: str) -> dict:
    """
    arq job function — processes a single interview through the full pipeline.
    Delegates to the processing service.
    """
    from app.services.processing import process_interview

    logger.info(f"🔄 Starting processing job for interview {interview_id}")
    result = await process_interview(interview_id)
    logger.info(f"✅ Processing complete for interview {interview_id}: {result}")
    return result


async def scheduled_connector_sync(ctx: dict) -> dict:
    """Hourly cron — run an incremental sync for every connected
    API-token source (Fireflies, Zendesk). Keeps synced libraries
    current without user action (US-051-03-01).
    """
    from sqlalchemy import func, select
    from sqlalchemy.orm import selectinload

    from app.core.database import get_session_factory
    from app.models import (
        ConnectionMethod,
        SourceConnection,
        SourceConnectionStatus,
    )
    from app.services.sync_orchestrator import run_incremental_sync

    synced = 0
    failed = 0
    async with get_session_factory()() as db:
        stmt = (
            select(SourceConnection)
            .where(SourceConnection.status.in_([
                SourceConnectionStatus.connected,
                SourceConnectionStatus.error,
            ]))
            .options(selectinload(SourceConnection.data_source))
        )
        result = await db.execute(stmt)
        connections = [
            conn
            for conn in result.scalars().all()
            if conn.data_source.connection_method == ConnectionMethod.api_token
        ]

        # Count suspended connections for logging
        suspended_stmt = (
            select(func.count())
            .select_from(SourceConnection)
            .where(SourceConnection.status == SourceConnectionStatus.error_suspended)
        )
        suspended_result = await db.execute(suspended_stmt)
        suspended_count = suspended_result.scalar() or 0

        logger.info(
            f"Scheduled sync: {len(connections)} eligible API-token sources, "
            f"{suspended_count} suspended (skipped)"
        )
        for connection in connections:
            try:
                sync_run = await run_incremental_sync(
                    db,
                    connection=connection,
                    data_source=connection.data_source,
                )
                await db.commit()
                if sync_run.status.value == "succeeded":
                    synced += 1
                else:
                    failed += 1
            except Exception:
                failed += 1
                await db.rollback()
                logger.exception(
                    f"Scheduled sync failed for connection {connection.id}"
                )

    logger.info(
        f"Scheduled sync complete: {synced} succeeded, {failed} failed, "
        f"{suspended_count} suspended"
    )
    return {"synced": synced, "failed": failed, "suspended": suspended_count}


async def scheduled_outcome_notifications(ctx: dict) -> dict:
    """Daily cron — notify spec owners the first time a shipped spec's
    outcome readout leaves `too_early` (v1.1 auto-close loop, D-11-05).
    Idempotent via the `outcome_notified_at` stamp."""
    from app.core.database import get_session_factory
    from app.services.outcomes import generate_outcome_notifications

    async with get_session_factory()() as db:
        created = await generate_outcome_notifications(db)
        await db.commit()
    return {"notifications_created": created}


class WorkerSettings:
    """arq worker configuration."""

    functions = [process_interview_job]

    cron_jobs = [
        # Hourly incremental sync for connected API-token sources
        cron(scheduled_connector_sync, minute=15, timeout=1800),
        # Daily post-ship outcome notifications (v1.1 full-loop close)
        cron(scheduled_outcome_notifications, hour=6, minute=30, timeout=600),
    ]

    redis_settings = RedisSettings.from_dsn(settings.redis_url)

    # Worker config
    max_jobs = 5
    job_timeout = 3600  # 1 hour max per job (for long transcriptions)
    max_tries = 2  # Retry once on failure
    queue_name = "spec10x:jobs"
