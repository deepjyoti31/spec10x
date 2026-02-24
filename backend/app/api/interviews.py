"""
Spec10x Backend — Interviews API Routes
"""

import uuid
import hashlib
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from arq import create_pool
from arq.connections import RedisSettings

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.storage import generate_upload_url
from app.models import User, Interview, FileType, InterviewStatus
from app.schemas import (
    UploadUrlRequest,
    UploadUrlResponse,
    InterviewCreate,
    InterviewResponse,
    InterviewDetailResponse,
)

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])

settings = get_settings()

# Lazy arq pool
_arq_pool = None


async def _get_arq_pool():
    """Get or create the arq Redis pool for enqueuing jobs."""
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(
            RedisSettings.from_dsn(settings.redis_url),
        )
    return _arq_pool


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
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A file with this content has already been uploaded",
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
    sort: str = Query("recent", regex="^(recent|name|sentiment)$"),
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
    stmt = select(Interview).where(
        Interview.id == interview_id,
        Interview.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    interview = result.scalar_one_or_none()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    await db.delete(interview)

    # TODO: Delete file from storage
    # TODO: Recalculate themes after deletion


@router.post("/{interview_id}/reanalyze", response_model=InterviewResponse)
async def reanalyze_interview(
    interview_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-run AI analysis on an existing interview."""
    stmt = select(Interview).where(
        Interview.id == interview_id,
        Interview.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    interview = result.scalar_one_or_none()

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.status not in (InterviewStatus.done, InterviewStatus.error):
        raise HTTPException(
            status_code=400,
            detail="Interview is still processing",
        )

    # Reset status and re-enqueue
    interview.status = InterviewStatus.queued
    interview.error_message = None
    await db.flush()

    pool = await _get_arq_pool()
    await pool.enqueue_job(
        "process_interview_job",
        str(interview.id),
        _queue_name="spec10x:jobs",
    )

    return interview



