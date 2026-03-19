"""
Unified feed API for mixed-source evidence.
"""

from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import Signal, Theme, User, SourceType, SignalStatus
from app.schemas import FeedSignalDetailResponse, FeedSignalResponse
from app.services.signals import (
    ensure_signal_consistency,
    get_workspace_signals,
    serialize_feed_signal,
)

router = APIRouter(prefix="/api/feed", tags=["Feed"])


@router.get("", response_model=list[FeedSignalResponse])
async def list_feed(
    source: SourceType | None = Query(None),
    sentiment: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await ensure_signal_consistency(
        db,
        user_id=current_user.id,
    )
    themes_result = await db.execute(select(Theme).where(Theme.user_id == current_user.id))
    theme_lookup = {theme.id: theme for theme in themes_result.scalars().all()}

    signals = await get_workspace_signals(
        db,
        workspace_id=workspace.id,
        source_filter=source,
        sentiment=sentiment,
        date_from=date_from,
        date_to=date_to,
    )
    return [
        serialize_feed_signal(signal, theme_lookup=theme_lookup)
        for signal in signals
    ]


@router.get("/{signal_id}", response_model=FeedSignalDetailResponse)
async def get_feed_signal(
    signal_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await ensure_signal_consistency(
        db,
        user_id=current_user.id,
    )
    stmt = select(Signal).where(
        Signal.id == signal_id,
        Signal.workspace_id == workspace.id,
        Signal.status == SignalStatus.active,
    )
    result = await db.execute(stmt)
    signal = result.scalar_one_or_none()
    if signal is None:
        raise HTTPException(status_code=404, detail="Feed signal not found")

    themes_result = await db.execute(select(Theme).where(Theme.user_id == current_user.id))
    theme_lookup = {theme.id: theme for theme in themes_result.scalars().all()}
    return serialize_feed_signal(
        signal,
        theme_lookup=theme_lookup,
        include_full_content=True,
    )
