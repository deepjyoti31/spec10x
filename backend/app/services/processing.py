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
from app.core.database import get_session_factory
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
        2. Extract text (or fail on audio/video if Vertex AI deferred)
        3. Run AI analysis (extract insights)
        4. Generate embeddings and store chunks
        5. Run cross-interview synthesis (cluster themes)
        6. Mark as done

    Returns:
        dict with processing results summary
    """
    async with get_session_factory()() as db:
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
            logger.info(f"Step 1: Downloading file for interview {interview_id}")
            await _update_status(
                db, interview, InterviewStatus.transcribing,
                user_id, "Downloading file..."
            )

            local_path = await _download_file(interview)
            logger.info(f"✅ Downloaded to {local_path}")

            # ── Step 2: Extract text ──
            logger.info(f"Step 2: Extracting text for interview {interview_id}")
            await publish_status(
                user_id, interview_id, "transcribing",
                f"Extracting text from {interview.filename}..."
            )
            logger.info(f"📡 Published status: transcribing for interview {interview_id}")
            logger.debug(f"Calling text extraction service for {interview.file_type} file.")

            from app.services.extraction import extract_text
            transcript = extract_text(local_path, interview.file_type)
            logger.info(f"✅ Extracted {len(transcript)} characters")
            logger.debug(f"Transcript extracted, length: {len(transcript)}")

            interview.transcript = transcript
            await db.flush()
            logger.debug("Transcript saved to interview object and flushed to DB.")

            # ── Step 3: AI Analysis ──
            logger.info(f"Step 3: AI Analysis for interview {interview_id}")
            await _update_status(
                db, interview, InterviewStatus.analyzing,
                user_id, "Analyzing content..."
            )
            logger.info(f"📡 Published status: {InterviewStatus.analyzing.value} for interview {interview_id}")
            logger.debug(f"Fetching existing themes for user {user_id} to guide analysis.")

            # Fetch existing theme names so the LLM can reuse them
            from app.models import Theme
            stmt_themes = select(Theme.name).where(
                Theme.user_id == interview.user_id,
            )
            theme_result = await db.execute(stmt_themes)
            existing_theme_names = [row[0] for row in theme_result.all()]

            from app.services.analysis import analyze_transcript
            analysis_result = analyze_transcript(
                transcript,
                existing_themes=existing_theme_names if existing_theme_names else None,
            )
            logger.info(f"✅ AI Analysis complete: {len(analysis_result.insights)} insights found")

            # Save insights and speakers to DB
            insights_count = await _save_analysis_results(
                db, interview, analysis_result
            )

            await publish_status(
                user_id, interview_id, "analyzing",
                f"Found {insights_count} insights",
            )

            # ── Step 4: Embed chunks ──
            logger.info(f"Step 4: Embedding chunks for interview {interview_id}")
            from app.services.embeddings import chunk_transcript, _real_embeddings
            from app.models import TranscriptChunk
            # Split into chunks
            logger.info(f"Chunking transcript for interview {interview.id} ({len(transcript)} chars)")
            chunks = chunk_transcript(transcript)

            if not chunks:
                logger.warning(f"No chunks generated for interview {interview.id}")
                chunks_count = 0
            else:
                # Generate embeddings
                logger.info(f"Generating embeddings for {len(chunks)} chunks...")
                embeddings = _real_embeddings(chunks)

                # Store chunks in DB
                logger.info(f"Storing chunks in database for interview {interview.id}")
                for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
                    chunk = TranscriptChunk(
                        interview_id=interview.id,
                        chunk_index=i,
                        content=chunk_text,
                        embedding=embedding,
                    )
                    db.add(chunk)

                await db.flush()
                logger.info(f"✅ Stored {len(chunks)} chunks for interview {interview.id}")
                chunks_count = len(chunks)

            # ── Step 5: Cross-interview synthesis ──
            logger.info(f"Step 5: Synthesizing themes for user {user_id}")
            from app.services.synthesis import synthesize_themes
            themes_count = await synthesize_themes(db, interview.user_id)
            logger.info(f"✅ Synthesis complete: {themes_count} themes")

            # ── Step 6: Mark done ──
            logger.info(f"Step 6: Finalizing interview {interview_id}")
            await _update_status(
                db, interview, InterviewStatus.done,
                user_id,
                f"Complete: {insights_count} insights, {themes_count} themes",
            )

            from app.models import Notification
            success_notification = Notification(
                user_id=interview.user_id,
                title="Interview Processed",
                message=f"Successfully processed {interview.filename}. Found {insights_count} insights and {themes_count} themes."
            )
            db.add(success_notification)

            await db.commit()

            # Clean up temp file
            _cleanup(local_path)

            logger.info(f"🚀 Processing pipeline FINISHED for interview {interview_id}")

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
                async with get_session_factory()() as err_db:
                    stmt = select(Interview).where(
                        Interview.id == uuid.UUID(interview_id)
                    )
                    result = await err_db.execute(stmt)
                    interview = result.scalar_one_or_none()
                    if interview:
                        interview.status = InterviewStatus.error
                        interview.error_message = str(e)[:2000]

                        from app.models import Notification
                        error_notification = Notification(
                            user_id=interview.user_id,
                            title="Processing Failed",
                            message=f"Failed to process {interview.filename}: {str(e)[:200]}"
                        )
                        err_db.add(error_notification)

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
) -> None:
    """Update interview status in DB and publish to Redis."""
    interview.status = status
    await db.flush()
    await publish_status(
        user_id, str(interview.id), status.value, message,
    )


async def _save_analysis_results(
    db: AsyncSession,
    interview: Interview,
    analysis_result,
) -> int:
    """Save extracted insights and speakers to the database."""
    from app.models import Insight, Speaker, InsightCategory
    from app.services.synthesis import _normalize_theme_name

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
