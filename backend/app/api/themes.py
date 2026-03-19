"""
Spec10x Backend — Themes API Routes
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import User, Theme, ThemeStatus
from app.schemas import ThemeResponse, ThemeDetailResponse, ThemeUpdate
from app.services.signals import (
    build_source_breakdown,
    build_theme_score_map,
    ensure_signal_consistency,
    get_workspace_signals,
    serialize_feed_signal,
)
from app.services.signals import _parse_theme_match_id  # internal helper reused here
from app.services.signals import refresh_external_signal_theme_matches

router = APIRouter(prefix="/api/themes", tags=["Themes"])


@router.get("", response_model=list[ThemeResponse])
async def list_themes(
    sort: str = Query("urgency", pattern="^(urgency|frequency|sentiment|recency)$"),
    status_filter: str = Query("active", alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all themes for the current user, sorted by the specified order."""
    workspace = await ensure_signal_consistency(
        db,
        user_id=current_user.id,
    )

    stmt = select(Theme).where(Theme.user_id == current_user.id)
    if status_filter:
        stmt = stmt.where(Theme.status == status_filter)

    result = await db.execute(stmt)
    themes = list(result.scalars().all())
    if not themes:
        return []

    workspace_signals = await get_workspace_signals(
        db,
        workspace_id=workspace.id,
    )
    score_map = build_theme_score_map(themes=themes, signals=workspace_signals)

    for theme in themes:
        setattr(theme, "impact_score", score_map[theme.id].total)

    if sort == "urgency":
        themes.sort(
            key=lambda theme: (
                score_map[theme.id].total,
                theme.updated_at,
                theme.created_at,
            ),
            reverse=True,
        )
    elif sort == "frequency":
        themes.sort(
            key=lambda theme: (theme.mention_count, theme.updated_at, theme.created_at),
            reverse=True,
        )
    elif sort == "sentiment":
        themes.sort(
            key=lambda theme: (
                theme.sentiment_negative,
                theme.mention_count,
                theme.updated_at,
            ),
            reverse=True,
        )
    elif sort == "recency":
        themes.sort(
            key=lambda theme: (theme.updated_at, theme.created_at),
            reverse=True,
        )

    return themes


@router.get("/{theme_id}", response_model=ThemeDetailResponse)
async def get_theme(
    theme_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get theme detail with sub-themes and insights."""
    workspace = await ensure_signal_consistency(
        db,
        user_id=current_user.id,
    )
    stmt = (
        select(Theme)
        .where(
            Theme.id == theme_id,
            Theme.user_id == current_user.id,
        )
        .options(
            selectinload(Theme.sub_themes),
            selectinload(Theme.insights),
        )
    )
    result = await db.execute(stmt)
    theme = result.scalar_one_or_none()

    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    workspace_signals = await get_workspace_signals(
        db,
        workspace_id=workspace.id,
    )
    theme_lookup = {theme.id: theme}
    theme_signals = [
        signal
        for signal in workspace_signals
        if _parse_theme_match_id(signal.metadata_json) == theme.id
    ]

    grouped_signals: list[dict] = []
    for source_type in ("interview", "support", "survey", "analytics"):
        source_items = [
            serialize_feed_signal(
                signal,
                theme_lookup=theme_lookup,
            )
            for signal in theme_signals
            if signal.source_type.value == source_type
        ]
        if not source_items:
            continue
        grouped_signals.append(
            {
                "source_type": source_type,
                "label": source_type.title(),
                "count": len(source_items),
                "items": source_items,
            }
        )

    impact_score = build_theme_score_map(
        themes=[theme],
        signals=workspace_signals,
    )[theme.id].total

    payload = ThemeDetailResponse.model_validate(theme, from_attributes=True).model_dump()
    payload["impact_score"] = impact_score
    payload["source_breakdown"] = build_source_breakdown(theme_signals)
    payload["supporting_evidence"] = grouped_signals
    return payload


@router.patch("/{theme_id}", response_model=ThemeResponse)
async def update_theme(
    theme_id: uuid.UUID,
    update: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a theme."""
    stmt = select(Theme).where(
        Theme.id == theme_id,
        Theme.user_id == current_user.id,
    ).options(selectinload(Theme.insights))
    result = await db.execute(stmt)
    theme = result.scalar_one_or_none()

    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    if update.name is not None:
        theme.name = update.name
        for insight in theme.insights:
            insight.theme_suggestion = update.name

    await db.flush()
    await refresh_external_signal_theme_matches(
        db,
        user_id=current_user.id,
    )
    return theme
