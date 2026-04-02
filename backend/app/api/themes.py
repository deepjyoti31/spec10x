"""
Spec10x Backend - Themes API routes.
"""

from collections import defaultdict
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import Interview, Signal, SourceType, Theme, ThemeStatus, User
from app.schemas import (
    BoardThemeCardResponse,
    ThemeExplorerCardResponse,
    ThemeDetailResponse,
    ThemeExplorerFiltersResponse,
    ThemeExplorerQuotePreviewResponse,
    ThemeExplorerResponse,
    ThemeExplorerSentimentResponse,
    ThemeExplorerSourceChipResponse,
    ThemeExplorerSummaryResponse,
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

SOURCE_TYPE_ENUM_ORDER = (
    SourceType.interview,
    SourceType.support,
    SourceType.survey,
    SourceType.analytics,
)
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


def _filter_explorer_signals(
    *,
    workspace_signals: list[Signal],
    selected_sources: set[SourceType],
    date_from: date | None,
    date_to: date | None,
) -> list[Signal]:
    filtered_signals: list[Signal] = []
    for signal in workspace_signals:
        if selected_sources and signal.source_type not in selected_sources:
            continue
        signal_date = signal.occurred_at.date()
        if date_from is not None and signal_date < date_from:
            continue
        if date_to is not None and signal_date > date_to:
            continue
        filtered_signals.append(signal)
    return filtered_signals


def _build_theme_signal_map(
    *,
    themes: list[Theme],
    signals: list[Signal],
) -> dict[uuid.UUID, list[Signal]]:
    theme_ids = {theme.id for theme in themes}
    theme_signals: dict[uuid.UUID, list[Signal]] = defaultdict(list)
    for signal in signals:
        theme_id = _parse_theme_match_id(signal.metadata_json)
        if theme_id is None or theme_id not in theme_ids:
            continue
        theme_signals[theme_id].append(signal)
    return theme_signals


def _get_dominant_sentiment(theme: Theme) -> str:
    sentiment_pairs = (
        ("negative", theme.sentiment_negative),
        ("neutral", theme.sentiment_neutral),
        ("positive", theme.sentiment_positive),
    )
    return max(sentiment_pairs, key=lambda item: item[1])[0]


def _theme_matches_explorer_filters(
    *,
    theme: Theme,
    theme_signals: list[Signal],
    sentiment_filter: str | None,
    has_signal_filters: bool,
) -> bool:
    if sentiment_filter and _get_dominant_sentiment(theme) != sentiment_filter:
        return False
    if has_signal_filters and not theme_signals:
        return False
    return True


def _serialize_quote_previews(
    *,
    theme_signals: list[Signal],
) -> list[ThemeExplorerQuotePreviewResponse]:
    previews: list[ThemeExplorerQuotePreviewResponse] = []
    for signal in sorted(
        theme_signals,
        key=lambda item: (item.occurred_at, item.created_at),
        reverse=True,
    )[:2]:
        serialized_signal = serialize_feed_signal(signal, theme_lookup={})
        previews.append(
            ThemeExplorerQuotePreviewResponse(
                id=serialized_signal["id"],
                excerpt=serialized_signal["excerpt"],
                author_or_speaker=serialized_signal["author_or_speaker"],
                source_label=serialized_signal["source_label"],
                occurred_at=serialized_signal["occurred_at"],
            )
        )
    return previews


def _serialize_theme_explorer_card(
    *,
    theme: Theme,
    theme_signals: list[Signal],
    score: float,
) -> ThemeExplorerCardResponse:
    return ThemeExplorerCardResponse(
        id=theme.id,
        name=theme.name,
        is_new=theme.is_new,
        impact_score=score,
        mention_count=len(theme_signals) if theme_signals else theme.mention_count,
        sentiment=ThemeExplorerSentimentResponse(
            positive=theme.sentiment_positive,
            neutral=theme.sentiment_neutral,
            negative=theme.sentiment_negative,
        ),
        source_chips=[
            ThemeExplorerSourceChipResponse(**source_chip)
            for source_chip in build_source_breakdown(theme_signals)
        ],
        quote_previews=_serialize_quote_previews(theme_signals=theme_signals),
    )


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
        card_payload = ThemeResponse.model_validate(
            theme,
            from_attributes=True,
        ).model_dump()
        card_payload["impact_score"] = score_map[theme.id].total
        card_payload["impact_breakdown"] = serialize_impact_breakdown(score_map[theme.id])
        card_payload["source_breakdown"] = build_source_breakdown(theme_signals)
        card_payload["evidence_preview"] = evidence_preview
        payload.append(card_payload)

    return payload


@router.get("/explorer", response_model=ThemeExplorerResponse)
async def get_theme_explorer(
    sort: str = Query("urgency", pattern="^(urgency|frequency|sentiment|recency)$"),
    source: list[SourceType] = Query(default=[]),
    sentiment: str | None = Query(default=None, pattern="^(negative|positive|neutral)$"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    selected_theme_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a filter-aware theme explorer payload for the redesigned Insights page."""
    workspace = await ensure_signal_consistency(
        db,
        user_id=current_user.id,
    )

    themes_result = await db.execute(select(Theme).where(Theme.user_id == current_user.id))
    all_themes = list(themes_result.scalars().all())

    interviews_result = await db.execute(
        select(Interview).where(Interview.user_id == current_user.id)
    )
    interviews = list(interviews_result.scalars().all())

    workspace_signals = await get_workspace_signals(
        db,
        workspace_id=workspace.id,
    )
    available_source_types = [
        source_type.value
        for source_type in SOURCE_TYPE_ENUM_ORDER
        if any(signal.source_type == source_type for signal in workspace_signals)
    ]

    selected_sources = set(source)
    filtered_signals = _filter_explorer_signals(
        workspace_signals=workspace_signals,
        selected_sources=selected_sources,
        date_from=date_from,
        date_to=date_to,
    )
    theme_signal_map = _build_theme_signal_map(
        themes=all_themes,
        signals=filtered_signals,
    )
    score_map = build_theme_score_map(
        themes=all_themes,
        signals=filtered_signals,
    )
    has_signal_filters = bool(selected_sources or date_from is not None or date_to is not None)

    active_themes = _sort_themes(
        themes=[
            theme
            for theme in all_themes
            if theme.status == ThemeStatus.active
            and _theme_matches_explorer_filters(
                theme=theme,
                theme_signals=theme_signal_map.get(theme.id, []),
                sentiment_filter=sentiment,
                has_signal_filters=has_signal_filters,
            )
        ],
        sort=sort,
        score_map=score_map,
    )
    previous_themes = _sort_themes(
        themes=[
            theme
            for theme in all_themes
            if theme.status == ThemeStatus.previous
            and _theme_matches_explorer_filters(
                theme=theme,
                theme_signals=theme_signal_map.get(theme.id, []),
                sentiment_filter=sentiment,
                has_signal_filters=has_signal_filters,
            )
        ],
        sort=sort,
        score_map=score_map,
    )

    serialized_active_themes = [
        _serialize_theme_explorer_card(
            theme=theme,
            theme_signals=theme_signal_map.get(theme.id, []),
            score=score_map[theme.id].total,
        )
        for theme in active_themes
    ]
    serialized_previous_themes = [
        _serialize_theme_explorer_card(
            theme=theme,
            theme_signals=theme_signal_map.get(theme.id, []),
            score=score_map[theme.id].total,
        )
        for theme in previous_themes
    ]

    default_theme_id = None
    available_theme_ids = {theme.id for theme in [*active_themes, *previous_themes]}
    if selected_theme_id and selected_theme_id in available_theme_ids:
        default_theme_id = selected_theme_id
    elif active_themes:
        default_theme_id = active_themes[0].id
    elif previous_themes:
        default_theme_id = previous_themes[0].id

    visible_theme_ids = {theme.id for theme in [*active_themes, *previous_themes]}
    visible_signals = [
        signal
        for signal in filtered_signals
        if _parse_theme_match_id(signal.metadata_json) in visible_theme_ids
    ]
    interview_ids = {
        str((signal.metadata_json or {}).get("interview_id"))
        for signal in visible_signals
        if (signal.metadata_json or {}).get("interview_id")
    }

    has_any_data = bool(all_themes or workspace_signals or interviews)
    empty_reason = None
    if not has_any_data:
        empty_reason = "no_data"
    elif not serialized_active_themes and not serialized_previous_themes:
        empty_reason = "no_matches"

    return ThemeExplorerResponse(
        summary=ThemeExplorerSummaryResponse(
            interviews_count=len(interview_ids),
            signals_count=len(visible_signals),
            active_themes_count=len(serialized_active_themes),
        ),
        filters=ThemeExplorerFiltersResponse(
            sort=sort,
            sources=[item.value for item in source],
            sentiment=sentiment,
            date_from=date_from,
            date_to=date_to,
            selected_theme_id=selected_theme_id,
            available_source_types=available_source_types,
        ),
        default_selected_theme_id=default_theme_id,
        active_themes=serialized_active_themes,
        previous_themes=serialized_previous_themes,
        empty_reason=empty_reason,
    )


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
