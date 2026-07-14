"""
Saved Views API — named, reusable filter sets on the unified feed.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import SavedView, User
from app.schemas import SavedViewCreate, SavedViewFilters, SavedViewResponse
from app.services.sources import get_or_create_default_workspace

router = APIRouter(prefix="/api/saved-views", tags=["Saved Views"])


def _serialize(saved_view: SavedView) -> SavedViewResponse:
    return SavedViewResponse(
        id=saved_view.id,
        name=saved_view.name,
        filters=SavedViewFilters(**(saved_view.filters_json or {})),
        created_at=saved_view.created_at,
    )


@router.get("", response_model=list[SavedViewResponse])
async def list_saved_views(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await get_or_create_default_workspace(db, current_user)
    stmt = (
        select(SavedView)
        .where(SavedView.workspace_id == workspace.id)
        .order_by(SavedView.created_at.desc())
    )
    result = await db.execute(stmt)
    return [_serialize(saved_view) for saved_view in result.scalars().all()]


@router.post("", response_model=SavedViewResponse, status_code=201)
async def create_saved_view(
    body: SavedViewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await get_or_create_default_workspace(db, current_user)

    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Saved view name cannot be empty")

    existing_stmt = select(SavedView).where(
        SavedView.workspace_id == workspace.id,
        SavedView.name == name,
    )
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail="A saved view with this name already exists")

    saved_view = SavedView(
        workspace_id=workspace.id,
        user_id=current_user.id,
        name=name,
        filters_json=body.filters.model_dump(mode="json", exclude_none=True),
    )
    db.add(saved_view)
    await db.flush()
    return _serialize(saved_view)


@router.delete("/{saved_view_id}", status_code=204)
async def delete_saved_view(
    saved_view_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await get_or_create_default_workspace(db, current_user)
    stmt = select(SavedView).where(
        SavedView.id == saved_view_id,
        SavedView.workspace_id == workspace.id,
    )
    result = await db.execute(stmt)
    saved_view = result.scalar_one_or_none()
    if saved_view is None:
        raise HTTPException(status_code=404, detail="Saved view not found")

    await db.delete(saved_view)
    await db.flush()
