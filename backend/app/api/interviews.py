"""
Spec10x Backend — Interviews API Routes
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from arq import create_pool
from arq.connections import RedisSettings

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.storage import generate_upload_url
from app.models import (
    User,
    Interview,
    FileType,
    InterviewStatus,
    Speaker,
    Insight,
    TranscriptChunk,
)
from app.schemas import (
    UploadUrlRequest,
    UploadUrlResponse,
    InterviewCreate,
    InterviewResponse,
    InterviewDetailResponse,
    InterviewLibraryResponse,
    InterviewBulkRequest,
    InterviewBulkResultResponse,
    SpeakerUpdate,
    SpeakerResponse,
)
from app.services.interview_library import build_interview_library
from app.services.signals import (
    cleanup_interview_native_signals,
    refresh_external_signal_theme_matches,
)
from app.services.synthesis import synthesize_themes

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])

settings = get_settings()

# Lazy arq pool
_arq_pool = None


async def _get_arq_pool():
    """Get or create the arq Redis pool for enqueuing jobs."""
    global _arq_pool
    if _arq_pool is not None:
        # Check if the pool's connection is still usable (event loop may have changed in tests)
        try:
            import asyncio
            asyncio.get_running_loop()
        except RuntimeError:
            _arq_pool = None
    if _arq_pool is None:
        _arq_pool = await create_pool(
            RedisSettings.from_dsn(settings.redis_url),
        )
    return _arq_pool


async def _load_owned_interview(
    db: AsyncSession,
    *,
    interview_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Interview | None:
    result = await db.execute(
        select(Interview).where(
            Interview.id == interview_id,
            Interview.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def _refresh_after_interview_mutation(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> None:
    await synthesize_themes(db, user_id)
    await refresh_external_signal_theme_matches(
        db,
        user_id=user_id,
    )


async def _finalize_interview_deletion(
    db: AsyncSession,
    *,
    interview: Interview,
) -> None:
    await cleanup_interview_native_signals(
        db,
        interview_id=interview.id,
    )
    await db.delete(interview)
    await db.flush()


async def _prepare_interview_reanalysis(
    db: AsyncSession,
    *,
    interview: Interview,
) -> None:
    if interview.status not in (InterviewStatus.done, InterviewStatus.error):
        raise HTTPException(
            status_code=400,
            detail="Interview is still processing",
        )

    await cleanup_interview_native_signals(
        db,
        interview_id=interview.id,
    )
    await db.execute(
        delete(TranscriptChunk).where(TranscriptChunk.interview_id == interview.id)
    )
    await db.execute(
        delete(Insight).where(Insight.interview_id == interview.id)
    )
    await db.execute(
        delete(Speaker).where(Speaker.interview_id == interview.id)
    )

    interview.status = InterviewStatus.queued
    interview.transcript = None
    interview.error_message = None
    await db.flush()


@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    request: UploadUrlRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Get a pre-signed URL for direct file upload from the browser.
    Frontend uploads directly to MinIO/GCS — avoids backend bottleneck.
    """
    # Generate a unique storage path: user_id/uuid/filename
    file_id = str(uuid.uuid4())
    storage_path = f"{current_user.id}/{file_id}/{request.filename}"

    upload_url = generate_upload_url(
        object_name=storage_path,
        content_type=request.content_type,
    )

    return UploadUrlResponse(
        upload_url=upload_url,
        storage_path=storage_path,
    )


@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview(
    request: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Register an uploaded file and enqueue it for processing.
    Called after the frontend has uploaded the file to storage via signed URL.
    """
    # Check for duplicate file hash
    if request.file_hash:
        stmt = select(Interview).where(
            Interview.user_id == current_user.id,
            Interview.file_hash == request.file_hash,
        )
        existing = await db.execute(stmt)
        existing_interview = existing.scalar_one_or_none()
        if existing_interview:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This file has already been uploaded as '{existing_interview.filename}'",
            )

    interview = Interview(
        user_id=current_user.id,
        filename=request.filename,
        file_type=request.file_type,
        file_size_bytes=request.file_size_bytes,
        storage_path=request.storage_path,
        file_hash=request.file_hash,
        status=InterviewStatus.queued,
    )
    db.add(interview)
    await db.flush()

    # Enqueue processing job
    pool = await _get_arq_pool()
    await pool.enqueue_job(
        "process_interview_job",
        str(interview.id),
        _queue_name="spec10x:jobs",
    )

    return interview


@router.get("", response_model=list[InterviewResponse])
async def list_interviews(
    sort: str = Query("recent", pattern="^(recent|name|sentiment)$"),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all interviews for the current user."""
    stmt = select(Interview).where(Interview.user_id == current_user.id)

    if status_filter:
        stmt = stmt.where(Interview.status == status_filter)

    if sort == "recent":
        stmt = stmt.order_by(Interview.created_at.desc())
    elif sort == "name":
        stmt = stmt.order_by(Interview.filename.asc())

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/library", response_model=InterviewLibraryResponse)
async def get_interview_library(
    q: Optional[str] = Query(None),
    sort: str = Query("recent", pattern="^(recent|oldest|name|insights|themes)$"),
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        pattern="^(done|processing|error|low_insight)$",
    ),
    source: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await build_interview_library(
        db,
        user=current_user,
        q=q,
        sort=sort,
        status_filter=status_filter,
        source_filter=source,
    )


@router.post("/bulk-reanalyze", response_model=InterviewBulkResultResponse)
async def bulk_reanalyze_interviews(
    request: InterviewBulkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    succeeded_ids: list[uuid.UUID] = []
    failures: list[dict[str, object]] = []

    if not request.interview_ids:
        return {
            "requested_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "succeeded_ids": [],
            "failures": [],
        }

    for interview_id in request.interview_ids:
        interview = await _load_owned_interview(
            db,
            interview_id=interview_id,
            user_id=current_user.id,
        )
        if interview is None:
            failures.append(
                {"interview_id": interview_id, "error": "Interview not found"}
            )
            continue

        try:
            await _prepare_interview_reanalysis(db, interview=interview)
            succeeded_ids.append(interview.id)
        except HTTPException as exc:
            failures.append(
                {"interview_id": interview_id, "error": str(exc.detail)}
            )

    if succeeded_ids:
        await _refresh_after_interview_mutation(db, user_id=current_user.id)
        pool = await _get_arq_pool()
        for interview_id in succeeded_ids:
            await pool.enqueue_job(
                "process_interview_job",
                str(interview_id),
                _queue_name="spec10x:jobs",
            )

    return {
        "requested_count": len(request.interview_ids),
        "success_count": len(succeeded_ids),
        "failed_count": len(failures),
        "succeeded_ids": succeeded_ids,
        "failures": failures,
    }


@router.post("/bulk-delete", response_model=InterviewBulkResultResponse)
async def bulk_delete_interviews(
    request: InterviewBulkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    succeeded_ids: list[uuid.UUID] = []
    failures: list[dict[str, object]] = []

    if not request.interview_ids:
        return {
            "requested_count": 0,
            "success_count": 0,
            "failed_count": 0,
            "succeeded_ids": [],
            "failures": [],
        }

    for interview_id in request.interview_ids:
        interview = await _load_owned_interview(
            db,
            interview_id=interview_id,
            user_id=current_user.id,
        )
        if interview is None:
            failures.append(
                {"interview_id": interview_id, "error": "Interview not found"}
            )
            continue

        await _finalize_interview_deletion(db, interview=interview)
        succeeded_ids.append(interview_id)

    if succeeded_ids:
        await _refresh_after_interview_mutation(db, user_id=current_user.id)

    return {
        "requested_count": len(request.interview_ids),
        "success_count": len(succeeded_ids),
        "failed_count": len(failures),
        "succeeded_ids": succeeded_ids,
        "failures": failures,
    }


@router.get("/{interview_id}", response_model=InterviewDetailResponse)
async def get_interview(
    interview_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get interview detail with transcript and insights."""
    stmt = (
        select(Interview)
        .where(
            Interview.id == interview_id,
            Interview.user_id == current_user.id,
        )
        .options(
            selectinload(Interview.speakers),
            selectinload(Interview.insights),
        )
    )
    result = await db.execute(stmt)
    interview = result.scalar_one_or_none()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    return interview


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interview(
    interview_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an interview and cascade-delete its insights and chunks."""
    interview = await _load_owned_interview(
        db,
        interview_id=interview_id,
        user_id=current_user.id,
    )

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    await _finalize_interview_deletion(db, interview=interview)
    await _refresh_after_interview_mutation(db, user_id=current_user.id)

    # TODO: Delete file from storage
    await db.flush()


@router.post("/{interview_id}/reanalyze", response_model=InterviewResponse)
async def reanalyze_interview(
    interview_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-run AI analysis on an existing interview."""
    interview = await _load_owned_interview(
        db,
        interview_id=interview_id,
        user_id=current_user.id,
    )

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    await _prepare_interview_reanalysis(db, interview=interview)
    await _refresh_after_interview_mutation(db, user_id=current_user.id)
    await db.refresh(interview)

    pool = await _get_arq_pool()
    await pool.enqueue_job(
        "process_interview_job",
        str(interview.id),
        _queue_name="spec10x:jobs",
    )

    return interview


@router.put("/{interview_id}/speakers/{speaker_id}", response_model=SpeakerResponse)
async def update_speaker(
    interview_id: uuid.UUID,
    speaker_id: uuid.UUID,
    speaker_update: SpeakerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update speaker metadata."""
    # Verify interview belongs to user
    stmt = select(Interview).where(
        Interview.id == interview_id,
        Interview.user_id == current_user.id
    )
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Interview not found")
        
    stmt = select(Speaker).where(
        Speaker.id == speaker_id,
        Speaker.interview_id == interview_id
    )
    result = await db.execute(stmt)
    speaker = result.scalar_one_or_none()
    
    if not speaker:
        raise HTTPException(status_code=404, detail="Speaker not found")
        
    if speaker_update.name is not None:
        speaker.name = speaker_update.name
    if speaker_update.role is not None:
        speaker.role = speaker_update.role
    if speaker_update.company is not None:
        speaker.company = speaker_update.company
        
    await db.commit()
    await db.refresh(speaker)
    return speaker

