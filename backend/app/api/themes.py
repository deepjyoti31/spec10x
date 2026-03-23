"""
Spec10x Backend - Themes API routes.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import Theme, ThemeStatus, User
from app.schemas import (
    BoardThemeCardResponse,
    ThemeDetailResponse,
    ThemeResponse,
    ThemeUpdate,
)
from app.services.signals import (
    _parse_theme_match_id,
    build_source_breakdown,
    build_theme_score_map,
    ensure_signal_consistency,
    get_workspace_signals,
    refresh_external_signal_theme_matches,
    serialize_feed_signal,
    serialize_impact_breakdown,
)

router = APIRouter(prefix="/api/themes", tags=["Themes"])

SOURCE_TYPE_ORDER = ("interview", "support", "survey", "analytics")


def _sort_themes(
    *,
    themes: list[Theme],
    sort: str,
    score_map: dict[uuid.UUID, object],
) -> list[Theme]:
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


def _get_theme_signals(
    *,
    theme: Theme,
    workspace_signals: list,
) -> list:
    return [
        signal
        for signal in workspace_signals
        if _parse_theme_match_id(signal.metadata_json) == theme.id
    ]


def _serialize_supporting_evidence(
    *,
    theme: Theme,
    theme_signals: list,
) -> list[dict]:
    theme_lookup = {theme.id: theme}
    grouped_signals: list[dict] = []
    for source_type in SOURCE_TYPE_ORDER:
        source_items = [
            serialize_feed_signal(
                signal,
                theme_lookup=theme_lookup,
            )
            for signal in sorted(
                theme_signals,
                key=lambda item: item.occurred_at,
                reverse=True,
            )
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
    return grouped_signals


@router.get("", response_model=list[ThemeResponse])
async def list_themes(
    sort: str = Query("urgency", pattern="^(urgency|frequency|sentiment|recency)$"),
    status_filter: str = Query("active", alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all themes for the current user."""
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

    return _sort_themes(
        themes=themes,
        sort=sort,
        score_map=score_map,
    )


@router.get("/board", response_model=list[BoardThemeCardResponse])
async def get_theme_board(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return ranked theme cards for the Sprint 6 priority board."""
    workspace = await ensure_signal_consistency(
        db,
        user_id=current_user.id,
    )
    result = await db.execute(
        select(Theme).where(
            Theme.user_id == current_user.id,
            Theme.status == ThemeStatus.active,
        )
    )
    themes = list(result.scalars().all())
    if not themes:
        return []

    workspace_signals = await get_workspace_signals(
        db,
        workspace_id=workspace.id,
    )
    score_map = build_theme_score_map(themes=themes, signals=workspace_signals)
    ordered_themes = _sort_themes(
        themes=themes,
        sort="urgency",
        score_map=score_map,
    )

    payload: list[dict] = []
    for theme in ordered_themes:
        theme_signals = _get_theme_signals(
            theme=theme,
            workspace_signals=workspace_signals,
        )
        theme_lookup = {theme.id: theme}
        evidence_preview = [
            serialize_feed_signal(signal, theme_lookup=theme_lookup)
            for signal in sorted(
                theme_signals,
                key=lambda item: item.occurred_at,
                reverse=True,
            )[:2]
        ]
        card_payload = BoardThemeCardResponse.model_validate(
            theme,
            from_attributes=True,
        ).model_dump()
        card_payload["impact_score"] = score_map[theme.id].total
        card_payload["impact_breakdown"] = serialize_impact_breakdown(score_map[theme.id])
        card_payload["source_breakdown"] = build_source_breakdown(theme_signals)
        card_payload["evidence_preview"] = evidence_preview
        payload.append(card_payload)

    return payload


@router.get("/{theme_id}", response_model=ThemeDetailResponse)
async def get_theme(
    theme_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get theme detail with source-aware evidence and score breakdown."""
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
    theme_signals = _get_theme_signals(
        theme=theme,
        workspace_signals=workspace_signals,
    )
    score_result = build_theme_score_map(
        themes=[theme],
        signals=workspace_signals,
    )[theme.id]

    payload = ThemeDetailResponse.model_validate(
        theme,
        from_attributes=True,
    ).model_dump()
    payload["impact_score"] = score_result.total
    payload["impact_breakdown"] = serialize_impact_breakdown(score_result)
    payload["source_breakdown"] = build_source_breakdown(theme_signals)
    payload["supporting_evidence"] = _serialize_supporting_evidence(
        theme=theme,
        theme_signals=theme_signals,
    )
    return payload


@router.patch("/{theme_id}", response_model=ThemeResponse)
async def update_theme(
    theme_id: uuid.UUID,
    update: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a theme or update its priority state."""
    stmt = (
        select(Theme)
        .where(
            Theme.id == theme_id,
            Theme.user_id == current_user.id,
        )
        .options(selectinload(Theme.insights))
    )
    result = await db.execute(stmt)
    theme = result.scalar_one_or_none()

    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    needs_match_refresh = False
    if update.name is not None:
        theme.name = update.name
        for insight in theme.insights:
            insight.theme_suggestion = update.name
        needs_match_refresh = True

    if update.priority_state is not None:
        theme.priority_state = update.priority_state

    await db.flush()
    if needs_match_refresh:
        await refresh_external_signal_theme_matches(
            db,
            user_id=current_user.id,
        )
    return theme
