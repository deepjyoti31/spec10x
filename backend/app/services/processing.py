"""
Spec10x Backend — Processing Pipeline Orchestrator

Main pipeline: download file → extract text → analyze → embed → synthesize → done.
Runs as an arq background job.
"""

import logging
import tempfile
import os
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.core.storage import download_file
from app.core.pubsub import publish_status
from app.models import Interview, InterviewStatus

logger = logging.getLogger(__name__)
settings = get_settings()


async def process_interview(interview_id: str) -> dict:
    """
    Full processing pipeline for a single interview.

    Steps:
        1. Download file from storage
        2. Extract text (or mock-transcribe audio/video)
        3. Run AI analysis (extract insights)
        4. Generate embeddings and store chunks
        5. Run cross-interview synthesis (cluster themes)
        6. Mark as done

    Returns:
        dict with processing results summary
    """
    async with async_session_factory() as db:
        try:
            # Load interview
            stmt = select(Interview).where(
                Interview.id == uuid.UUID(interview_id)
            )
            result = await db.execute(stmt)
            interview = result.scalar_one_or_none()

            if not interview:
                logger.error(f"Interview {interview_id} not found")
                return {"error": "Interview not found"}

            user_id = str(interview.user_id)

            # ── Step 1: Download file ──
            await _update_status(
                db, interview, InterviewStatus.transcribing,
                user_id, "Downloading file..."
            )

            local_path = await _download_file(interview)

            # ── Step 2: Extract text ──
            await publish_status(
                user_id, interview_id, "transcribing",
                f"Extracting text from {interview.filename}..."
            )

            from app.services.extraction import extract_text
            transcript = extract_text(local_path, interview.file_type)

            interview.transcript = transcript
            await db.flush()

            # ── Step 3: AI Analysis ──
            await _update_status(
                db, interview, InterviewStatus.analyzing,
                user_id, "Analyzing content..."
            )

            from app.services.analysis import analyze_transcript
            analysis_result = analyze_transcript(
                transcript,
                use_mock=settings.use_mock_ai,
            )

            # Save insights and speakers to DB
            insights_count = await _save_analysis_results(
                db, interview, analysis_result
            )

            await publish_status(
                user_id, interview_id, "analyzing",
                f"Found {insights_count} insights",
                insights_count=insights_count,
            )

            # ── Step 4: Embed chunks ──
            from app.services.embeddings import chunk_and_embed
            chunks_count = await chunk_and_embed(
                db, interview, transcript,
                use_mock=settings.use_mock_ai,
            )

            # ── Step 5: Cross-interview synthesis ──
            from app.services.synthesis import synthesize_themes
            themes_count = await synthesize_themes(db, interview.user_id)

            # ── Step 6: Mark done ──
            await _update_status(
                db, interview, InterviewStatus.done,
                user_id,
                f"Complete: {insights_count} insights, {themes_count} themes",
                insights_count=insights_count,
            )

            await db.commit()

            # Clean up temp file
            _cleanup(local_path)

            return {
                "interview_id": interview_id,
                "insights": insights_count,
                "themes": themes_count,
                "chunks": chunks_count,
                "status": "done",
            }

        except Exception as e:
            logger.exception(f"Processing failed for interview {interview_id}")
            await db.rollback()

            # Try to mark as error
            try:
                async with async_session_factory() as err_db:
                    stmt = select(Interview).where(
                        Interview.id == uuid.UUID(interview_id)
                    )
                    result = await err_db.execute(stmt)
                    interview = result.scalar_one_or_none()
                    if interview:
                        interview.status = InterviewStatus.error
                        interview.error_message = str(e)[:2000]
                        await err_db.commit()

                        await publish_status(
                            str(interview.user_id), interview_id,
                            "error", f"Processing failed: {str(e)[:200]}"
                        )
            except Exception:
                logger.exception("Failed to update error status")

            return {"error": str(e)}


async def _download_file(interview: Interview) -> str:
    """Download file from storage to a temp directory."""
    suffix = f".{interview.file_type.value}"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.close()

    download_file(
        object_name=interview.storage_path,
        local_path=tmp.name,
    )
    logger.info(f"Downloaded {interview.filename} to {tmp.name}")
    return tmp.name


async def _update_status(
    db: AsyncSession,
    interview: Interview,
    status: InterviewStatus,
    user_id: str,
    message: str,
    insights_count: int = 0,
) -> None:
    """Update interview status in DB and publish to Redis."""
    interview.status = status
    await db.flush()
    await publish_status(
        user_id, str(interview.id), status.value, message,
        insights_count=insights_count,
    )


async def _save_analysis_results(
    db: AsyncSession,
    interview: Interview,
    analysis_result,
) -> int:
    """Save extracted insights and speakers to the database."""
    from app.models import Insight, Speaker, InsightCategory

    # Save speakers
    speaker_map = {}
    for speaker_data in analysis_result.speakers:
        speaker = Speaker(
            interview_id=interview.id,
            speaker_label=speaker_data.label,
            name=speaker_data.name,
            role=speaker_data.role,
            is_interviewer=speaker_data.is_interviewer,
            auto_detected=True,
        )
        db.add(speaker)
        await db.flush()
        speaker_map[speaker_data.label] = speaker.id

    # Save insights
    for insight_data in analysis_result.insights:
        # Map category string to enum
        try:
            category = InsightCategory(insight_data.category)
        except ValueError:
            category = InsightCategory.suggestion

        insight = Insight(
            user_id=interview.user_id,
            interview_id=interview.id,
            category=category,
            title=insight_data.title,
            quote=insight_data.quote,
            quote_start_index=insight_data.quote_start,
            quote_end_index=insight_data.quote_end,
            speaker_id=speaker_map.get(insight_data.speaker),
            confidence=insight_data.confidence,
            is_flagged=insight_data.confidence < 0.7,
            theme_suggestion=insight_data.theme_suggestion,
            sentiment=insight_data.sentiment,
        )
        db.add(insight)

    await db.flush()
    return len(analysis_result.insights)


def _cleanup(file_path: str) -> None:
    """Remove temporary file."""
    try:
        os.unlink(file_path)
    except OSError:
        pass
