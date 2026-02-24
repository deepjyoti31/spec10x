"""
Spec10x Backend — arq Worker Entry Point

Background job worker that processes interview files through the AI pipeline.

Run with:
    python -m arq app.workers.worker.WorkerSettings
"""

import logging
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


class WorkerSettings:
    """arq worker configuration."""

    functions = [process_interview_job]

    redis_settings = RedisSettings.from_dsn(settings.redis_url)

    # Worker config
    max_jobs = 5
    job_timeout = 3600  # 1 hour max per job (for long transcriptions)
    max_tries = 2  # Retry once on failure
    queue_name = "spec10x:jobs"
