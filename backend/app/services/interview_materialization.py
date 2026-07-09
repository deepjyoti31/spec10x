"""
Interview materialization for connector-synced interview sources (v0.51).

Interview connectors (Fireflies first) do not write provider rows into
``signals`` directly. Each upstream meeting materializes into a native
``Interview`` that flows through the existing pipeline
(analysis → insights → themes → per-insight native signals), so synced
interviews behave exactly like uploaded ones — including Ask grounding
through ``transcript_chunks``.

Idempotency is enforced through ``source_items``:
- unchanged checksum → skipped
- changed checksum → the interview is reset and reprocessed
- interview deleted by the user → the source-item tombstone prevents
  the next sync from recreating it
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    FileType,
    Insight,
    Interview,
    InterviewStatus,
    Signal,
    Speaker,
    SourceConnection,
    SourceItem,
    TranscriptChunk,
    Workspace,
)
from app.services.sources import upsert_source_item

logger = logging.getLogger(__name__)

SOURCE_RECORD_TYPE = "meeting_transcript"


@dataclass(slots=True)
class MaterializedMeeting:
    """Provider-agnostic meeting payload ready to become an interview."""

    external_id: str
    title: str
    transcript_text: str
    occurred_at: datetime | None = None
    duration_seconds: int | None = None
    source_url: str | None = None
    participants: list[str] = field(default_factory=list)
    provider: str = "fireflies"


def meeting_checksum(meeting: MaterializedMeeting) -> str:
    payload = f"{meeting.title}\n{meeting.transcript_text}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


async def _enqueue_processing(interview_id: str) -> None:
    """Enqueue the standard interview processing job.

    Lazy import — ``app.api.interviews`` owns the shared arq pool, and this
    module is imported during connector auto-discovery, before the API
    modules finish loading.
    """
    from app.api.interviews import _get_arq_pool

    pool = await _get_arq_pool()
    await pool.enqueue_job(
        "process_interview_job",
        interview_id,
        _queue_name="spec10x:jobs",
    )


def _build_interview_metadata(meeting: MaterializedMeeting) -> dict:
    metadata = {
        "source_provider": meeting.provider,
        "external_id": meeting.external_id,
    }
    if meeting.occurred_at is not None:
        metadata["meeting_date"] = meeting.occurred_at.isoformat()
    if meeting.source_url:
        metadata["source_url"] = meeting.source_url
    if meeting.participants:
        metadata["participants"] = meeting.participants
    return metadata


async def _reset_interview_analysis(
    db: AsyncSession,
    interview: Interview,
) -> None:
    """Clear derived analysis so a changed transcript can reprocess cleanly."""
    # Lazy import: app.services.signals imports the connector package, which
    # imports this module during auto-discovery.
    from app.services.signals import cleanup_interview_native_signals

    await cleanup_interview_native_signals(db, interview_id=interview.id)
    await db.execute(
        delete(TranscriptChunk).where(TranscriptChunk.interview_id == interview.id)
    )
    await db.execute(delete(Insight).where(Insight.interview_id == interview.id))
    await db.execute(delete(Speaker).where(Speaker.interview_id == interview.id))


async def materialize_meeting(
    db: AsyncSession,
    *,
    connection: SourceConnection,
    owner_user_id: uuid.UUID,
    meeting: MaterializedMeeting,
) -> str:
    """Upsert one upstream meeting as a native interview.

    Returns one of ``"created"``, ``"updated"``, ``"unchanged"``.
    """
    checksum = meeting_checksum(meeting)

    existing_stmt = select(SourceItem).where(
        SourceItem.source_connection_id == connection.id,
        SourceItem.external_id == meeting.external_id,
    )
    existing_result = await db.execute(existing_stmt)
    existing_item = existing_result.scalar_one_or_none()

    if existing_item is not None:
        interview = (
            await db.get(Interview, existing_item.native_entity_id)
            if existing_item.native_entity_id
            else None
        )

        if interview is None:
            # The user deleted this synced interview — respect that and
            # keep the tombstone so the meeting is not recreated.
            existing_item.last_seen_at = datetime.now(timezone.utc)
            await db.flush()
            return "unchanged"

        if existing_item.checksum == checksum:
            await upsert_source_item(
                db,
                workspace_id=connection.workspace_id,
                source_connection_id=connection.id,
                external_id=meeting.external_id,
                source_record_type=SOURCE_RECORD_TYPE,
                external_updated_at=meeting.occurred_at,
                native_entity_type="interview",
                native_entity_id=interview.id,
                checksum=checksum,
            )
            return "unchanged"

        # Transcript changed upstream — reset analysis and reprocess.
        await _reset_interview_analysis(db, interview)
        interview.filename = meeting.title or interview.filename
        interview.transcript = meeting.transcript_text
        interview.file_size_bytes = len(meeting.transcript_text.encode("utf-8"))
        interview.file_hash = checksum
        interview.duration_seconds = meeting.duration_seconds
        interview.metadata_json = _build_interview_metadata(meeting)
        interview.status = InterviewStatus.queued
        interview.error_message = None
        await upsert_source_item(
            db,
            workspace_id=connection.workspace_id,
            source_connection_id=connection.id,
            external_id=meeting.external_id,
            source_record_type=SOURCE_RECORD_TYPE,
            external_updated_at=meeting.occurred_at,
            native_entity_type="interview",
            native_entity_id=interview.id,
            checksum=checksum,
        )
        await db.flush()
        await _enqueue_processing(str(interview.id))
        logger.info(
            "Materialized interview updated: provider=%s external_id=%s interview=%s",
            meeting.provider,
            meeting.external_id,
            interview.id,
        )
        return "updated"

    interview = Interview(
        user_id=owner_user_id,
        filename=meeting.title or f"{meeting.provider} meeting",
        file_type=FileType.txt,
        file_size_bytes=len(meeting.transcript_text.encode("utf-8")),
        storage_path="",
        transcript=meeting.transcript_text,
        duration_seconds=meeting.duration_seconds,
        file_hash=checksum,
        metadata_json=_build_interview_metadata(meeting),
        status=InterviewStatus.queued,
    )
    db.add(interview)
    await db.flush()

    await upsert_source_item(
        db,
        workspace_id=connection.workspace_id,
        source_connection_id=connection.id,
        external_id=meeting.external_id,
        source_record_type=SOURCE_RECORD_TYPE,
        external_updated_at=meeting.occurred_at,
        native_entity_type="interview",
        native_entity_id=interview.id,
        checksum=checksum,
    )
    await _enqueue_processing(str(interview.id))
    logger.info(
        "Materialized interview created: provider=%s external_id=%s interview=%s",
        meeting.provider,
        meeting.external_id,
        interview.id,
    )
    return "created"


async def materialize_meetings(
    db: AsyncSession,
    *,
    connection: SourceConnection,
    meetings: list[MaterializedMeeting],
) -> tuple[int, int, int]:
    """Materialize a batch of meetings. Returns (created, updated, unchanged)."""
    workspace = await db.get(Workspace, connection.workspace_id)
    if workspace is None:
        raise ValueError(f"Workspace {connection.workspace_id} not found")

    created = updated = unchanged = 0
    for meeting in meetings:
        if not meeting.transcript_text.strip():
            # Nothing to analyze — counted as seen by the caller, not stored.
            continue
        action = await materialize_meeting(
            db,
            connection=connection,
            owner_user_id=workspace.owner_user_id,
            meeting=meeting,
        )
        if action == "created":
            created += 1
        elif action == "updated":
            updated += 1
        else:
            unchanged += 1
    return created, updated, unchanged


async def delete_imported_connection_data(
    db: AsyncSession,
    *,
    connection: SourceConnection,
) -> tuple[int, int]:
    """Delete Spec10x's copies of everything imported through a connection.

    Removes materialized interviews (cascading their insights, chunks,
    speakers, and native signals), the connection's signals, and its
    source items. Upstream provider records are never touched.

    Returns (interviews_deleted, signals_deleted).
    """
    from app.services.signals import cleanup_interview_native_signals

    items_result = await db.execute(
        select(SourceItem).where(SourceItem.source_connection_id == connection.id)
    )
    source_items = list(items_result.scalars().all())

    interviews_deleted = 0
    for item in source_items:
        if item.native_entity_type != "interview" or item.native_entity_id is None:
            continue
        interview = await db.get(Interview, item.native_entity_id)
        if interview is None:
            continue
        await cleanup_interview_native_signals(
            db,
            interview_id=interview.id,
            workspace_id=connection.workspace_id,
        )
        await db.delete(interview)
        interviews_deleted += 1

    signals_result = await db.execute(
        delete(Signal)
        .where(Signal.source_connection_id == connection.id)
        .returning(Signal.id)
    )
    signals_deleted = len(signals_result.fetchall())

    await db.execute(
        delete(SourceItem).where(SourceItem.source_connection_id == connection.id)
    )
    await db.flush()

    logger.info(
        "Imported data deleted: connection=%s interviews=%d signals=%d",
        connection.id,
        interviews_deleted,
        signals_deleted,
    )
    return interviews_deleted, signals_deleted
