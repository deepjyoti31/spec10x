"""
Collections API — user-created groupings of interviews.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_scoped_user
from app.core.database import get_db
from app.models import Collection, CollectionInterview, Interview, User
from app.schemas import (
    CollectionCreate,
    CollectionDetailResponse,
    CollectionInterviewsRequest,
    CollectionResponse,
    CollectionUpdate,
    InterviewResponse,
)

router = APIRouter(prefix="/api/collections", tags=["Collections"])


async def _get_owned_collection(
    db: AsyncSession,
    *,
    collection_id: uuid.UUID,
    user_id: uuid.UUID,
    with_interviews: bool = False,
) -> Collection:
    stmt = select(Collection).where(
        Collection.id == collection_id,
        Collection.user_id == user_id,
    )
    if with_interviews:
        stmt = stmt.options(
            selectinload(Collection.interview_links).selectinload(CollectionInterview.interview)
        )
    result = await db.execute(stmt)
    collection = result.scalar_one_or_none()
    if collection is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


def _serialize_summary(collection: Collection, interview_count: int) -> CollectionResponse:
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        description=collection.description,
        interview_count=interview_count,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.get("", response_model=list[CollectionResponse])
async def list_collections(
    current_user: User = Depends(get_scoped_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .options(selectinload(Collection.interview_links))
        .order_by(Collection.created_at.desc())
    )
    result = await db.execute(stmt)
    collections = result.scalars().all()
    return [
        _serialize_summary(collection, len(collection.interview_links))
        for collection in collections
    ]


@router.post("", response_model=CollectionResponse, status_code=201)
async def create_collection(
    body: CollectionCreate,
    current_user: User = Depends(get_scoped_user),
    db: AsyncSession = Depends(get_db),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Collection name cannot be empty")

    collection = Collection(
        user_id=current_user.id,
        name=name,
        description=body.description,
    )
    db.add(collection)
    await db.flush()
    return _serialize_summary(collection, 0)


@router.get("/{collection_id}", response_model=CollectionDetailResponse)
async def get_collection(
    collection_id: uuid.UUID,
    current_user: User = Depends(get_scoped_user),
    db: AsyncSession = Depends(get_db),
):
    collection = await _get_owned_collection(
        db, collection_id=collection_id, user_id=current_user.id, with_interviews=True
    )
    interviews = [
        InterviewResponse.model_validate(link.interview, from_attributes=True)
        for link in sorted(collection.interview_links, key=lambda link: link.added_at, reverse=True)
    ]
    return CollectionDetailResponse(
        **_serialize_summary(collection, len(interviews)).model_dump(),
        interviews=interviews,
    )


@router.patch("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: uuid.UUID,
    body: CollectionUpdate,
    current_user: User = Depends(get_scoped_user),
    db: AsyncSession = Depends(get_db),
):
    collection = await _get_owned_collection(
        db, collection_id=collection_id, user_id=current_user.id, with_interviews=True
    )
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Collection name cannot be empty")
        collection.name = name
    if body.description is not None:
        collection.description = body.description

    await db.flush()
    await db.refresh(collection, attribute_names=["name", "description", "updated_at"])
    return _serialize_summary(collection, len(collection.interview_links))


@router.delete("/{collection_id}", status_code=204)
async def delete_collection(
    collection_id: uuid.UUID,
    current_user: User = Depends(get_scoped_user),
    db: AsyncSession = Depends(get_db),
):
    collection = await _get_owned_collection(
        db, collection_id=collection_id, user_id=current_user.id
    )
    await db.delete(collection)
    await db.flush()


@router.post("/{collection_id}/interviews", response_model=CollectionDetailResponse)
async def add_collection_interviews(
    collection_id: uuid.UUID,
    body: CollectionInterviewsRequest,
    current_user: User = Depends(get_scoped_user),
    db: AsyncSession = Depends(get_db),
):
    collection = await _get_owned_collection(
        db, collection_id=collection_id, user_id=current_user.id, with_interviews=True
    )

    interviews_stmt = select(Interview).where(
        Interview.id.in_(body.interview_ids),
        Interview.user_id == current_user.id,
    )
    interviews_result = await db.execute(interviews_stmt)
    owned_interviews = {interview.id: interview for interview in interviews_result.scalars().all()}

    existing_ids = {link.interview_id for link in collection.interview_links}
    for interview_id in body.interview_ids:
        if interview_id not in owned_interviews or interview_id in existing_ids:
            continue
        db.add(CollectionInterview(collection_id=collection.id, interview_id=interview_id))
        existing_ids.add(interview_id)

    await db.flush()
    await db.refresh(collection, attribute_names=["interview_links"])
    return await get_collection(collection_id, current_user, db)


@router.delete("/{collection_id}/interviews/{interview_id}", status_code=204)
async def remove_collection_interview(
    collection_id: uuid.UUID,
    interview_id: uuid.UUID,
    current_user: User = Depends(get_scoped_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_collection(db, collection_id=collection_id, user_id=current_user.id)
    stmt = select(CollectionInterview).where(
        CollectionInterview.collection_id == collection_id,
        CollectionInterview.interview_id == interview_id,
    )
    result = await db.execute(stmt)
    link = result.scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=404, detail="Interview is not in this collection")

    await db.delete(link)
    await db.flush()
