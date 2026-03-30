"""
Home dashboard summary API.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Iterable

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import (
    Interview,
    InterviewStatus,
    Signal,
    SourceConnection,
    SyncRun,
    SyncRunStatus,
    Theme,
    ThemeStatus,
    User,
)
from app.schemas import HomeDashboardResponse
from app.services.signals import (
    _parse_theme_match_id,
    build_source_breakdown,
    build_theme_score_map,
    ensure_signal_consistency,
    get_workspace_signals,
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

SOURCE_TYPE_ORDER = ("interview", "support", "survey", "analytics")
SOURCE_TYPE_COUNT_LABELS = {
    "interview": ("interview", "interviews"),
    "support": ("ticket", "tickets"),
    "survey": ("survey response", "survey responses"),
    "analytics": ("analytics signal", "analytics signals"),
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.fromtimestamp(0, tz=timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _theme_signals(*, theme_id: uuid.UUID, signals: Iterable[Signal]) -> list[Signal]:
    return [
        signal
        for signal in signals
        if _parse_theme_match_id(signal.metadata_json) == theme_id
    ]


def _signals_in_window(
    signals: Iterable[Signal],
    *,
    window_start: datetime,
    window_end: datetime | None = None,
) -> list[Signal]:
    items: list[Signal] = []
    for signal in signals:
        occurred_at = _as_utc(signal.occurred_at)
        if occurred_at < window_start:
            continue
        if window_end is not None and occurred_at >= window_end:
            continue
        items.append(signal)
    return items


def _format_count_label(source_type: str, count: int) -> str:
    singular, plural = SOURCE_TYPE_COUNT_LABELS.get(source_type, ("signal", "signals"))
    noun = singular if count == 1 else plural
    return f"{count} {noun}"


def _source_summary_label(theme_signals: list[Signal]) -> str:
    breakdown = build_source_breakdown(theme_signals)
    if not breakdown:
        return "No sources"
    if len(breakdown) == 1:
        return breakdown[0]["label"]
    if len(breakdown) == 2:
        return f'{breakdown[0]["label"]} + {breakdown[1]["label"]}'
    return f"{len(breakdown)} sources"


def _priority_band(impact_score: float) -> str:
    if impact_score >= 75.0:
        return "high"
    if impact_score >= 65.0:
        return "med"
    return "low"


def _trend_for_counts(*, current_count: int, previous_count: int) -> str:
    if current_count > previous_count:
        return "up"
    if current_count < previous_count:
        return "down"
    return "flat"


def _velocity_delta(*, current_count: int, previous_count: int) -> int | None:
    if current_count + previous_count < 3 or previous_count == 0:
        return None
    return round(((current_count - previous_count) / previous_count) * 100)


def _sparkline_points(*, theme_id: uuid.UUID, signals: list[Signal], now: datetime) -> list[int]:
    start_date = (now - timedelta(days=6)).date()
    counts = [0] * 7
    for signal in signals:
        if _parse_theme_match_id(signal.metadata_json) != theme_id:
            continue
        day_index = (_as_utc(signal.occurred_at).date() - start_date).days
        if 0 <= day_index < 7:
            counts[day_index] += 1
    return counts


def _average_nonzero_scores(score_map: dict[uuid.UUID, object], theme_ids: Iterable[uuid.UUID]) -> float | None:
    values = [
        float(score_map[theme_id].total)
        for theme_id in theme_ids
        if float(score_map[theme_id].total) > 0
    ]
    if not values:
        return None
    return round(sum(values) / len(values), 1)


def _build_interview_activity(interview: Interview) -> dict:
    occurred_at = _as_utc(interview.updated_at or interview.created_at)
    if interview.status == InterviewStatus.done:
        title = f"{interview.filename} analyzed"
        subtitle = "Transcription"
        tone = "accent"
    elif interview.status == InterviewStatus.error:
        title = f"{interview.filename} failed processing"
        subtitle = "Interview Processing"
        tone = "warning"
    else:
        title = f"{interview.filename} uploaded"
        subtitle = "Interview Upload"
        tone = "success"
    return {
        "kind": "interview",
        "title": title,
        "subtitle": subtitle,
        "occurred_at": occurred_at,
        "href": "/interviews",
        "tone": tone,
    }


def _build_theme_activity(theme: Theme) -> dict:
    occurred_at = _as_utc(theme.last_new_activity or theme.created_at)
    return {
        "kind": "theme",
        "title": f"New theme: {theme.name}",
        "subtitle": "AI Insight Engine",
        "occurred_at": occurred_at,
        "href": "/insights",
        "tone": "accent",
    }


def _build_sync_activity(sync_run: SyncRun) -> dict:
    occurred_at = _as_utc(sync_run.finished_at or sync_run.started_at)
    display_name = sync_run.source_connection.data_source.display_name
    if sync_run.status == SyncRunStatus.failed:
        title = f"{display_name} sync failed"
        tone = "warning"
    else:
        title = f"{display_name} sync completed"
        tone = "success"
    return {
        "kind": "sync",
        "title": title,
        "subtitle": "Integration",
        "occurred_at": occurred_at,
        "href": "/integrations",
        "tone": tone,
    }


@router.get("/home", response_model=HomeDashboardResponse)
async def get_home_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await ensure_signal_consistency(db, user_id=current_user.id)
    now = _now_utc()
    current_window_start = now - timedelta(days=7)
    previous_window_start = now - timedelta(days=14)

    interviews_result = await db.execute(
        select(Interview)
        .where(Interview.user_id == current_user.id)
        .order_by(Interview.updated_at.desc(), Interview.created_at.desc())
    )
    interviews = list(interviews_result.scalars().all())

    themes_result = await db.execute(
        select(Theme)
        .where(
            Theme.user_id == current_user.id,
            Theme.status == ThemeStatus.active,
        )
        .order_by(Theme.created_at.desc())
    )
    active_themes = list(themes_result.scalars().all())

    workspace_signals = await get_workspace_signals(
        db,
        workspace_id=workspace.id,
    )
    score_map = build_theme_score_map(themes=active_themes, signals=workspace_signals)

    sync_runs_result = await db.execute(
        select(SyncRun)
        .join(SourceConnection, SyncRun.source_connection_id == SourceConnection.id)
        .where(SourceConnection.workspace_id == workspace.id)
        .options(
            selectinload(SyncRun.source_connection).selectinload(SourceConnection.data_source)
        )
        .order_by(SyncRun.finished_at.desc(), SyncRun.started_at.desc())
    )
    sync_runs = list(sync_runs_result.scalars().all())

    interviews_total = len(interviews)
    interviews_this_week = sum(
        1
        for interview in interviews
        if _as_utc(interview.created_at) >= current_window_start
    )
    new_themes_this_week = sum(
        1
        for theme in active_themes
        if theme.is_new and _as_utc(theme.last_new_activity or theme.created_at) >= current_window_start
    )
    signals_total = len(workspace_signals)
    active_source_type_count = len({signal.source_type for signal in workspace_signals})
    average_impact_score = (
        round(
            sum(float(score_map[theme.id].total) for theme in active_themes) / len(active_themes),
            1,
        )
        if active_themes
        else 0.0
    )

    current_window_signals = _signals_in_window(
        workspace_signals,
        window_start=current_window_start,
    )
    previous_window_signals = _signals_in_window(
        workspace_signals,
        window_start=previous_window_start,
        window_end=current_window_start,
    )
    average_impact_delta = None
    if len(current_window_signals) >= 3 and len(previous_window_signals) >= 3 and active_themes:
        current_score_map = build_theme_score_map(
            themes=active_themes,
            signals=current_window_signals,
        )
        previous_score_map = build_theme_score_map(
            themes=active_themes,
            signals=previous_window_signals,
        )
        theme_ids = [theme.id for theme in active_themes]
        current_average = _average_nonzero_scores(current_score_map, theme_ids)
        previous_average = _average_nonzero_scores(previous_score_map, theme_ids)
        if current_average is not None and previous_average is not None:
            average_impact_delta = round(current_average - previous_average, 1)

    active_priorities: list[dict] = []
    for theme in sorted(
        active_themes,
        key=lambda item: (
            float(score_map[item.id].total),
            _as_utc(item.updated_at),
            _as_utc(item.created_at),
        ),
        reverse=True,
    )[:5]:
        theme_signal_rows = _theme_signals(theme_id=theme.id, signals=workspace_signals)
        current_count = len(
            _signals_in_window(theme_signal_rows, window_start=current_window_start)
        )
        previous_count = len(
            _signals_in_window(
                theme_signal_rows,
                window_start=previous_window_start,
                window_end=current_window_start,
            )
        )
        breakdown = build_source_breakdown(theme_signal_rows)
        if breakdown:
            primary_source = max(
                breakdown,
                key=lambda item: (
                    item["count"],
                    -SOURCE_TYPE_ORDER.index(item["source_type"]),
                ),
            )
            primary_count_label = _format_count_label(
                primary_source["source_type"],
                primary_source["count"],
            )
        else:
            primary_count_label = "0 signals"
        impact_score = float(score_map[theme.id].total)
        active_priorities.append(
            {
                "id": theme.id,
                "name": theme.name,
                "impact_score": impact_score,
                "trend": _trend_for_counts(
                    current_count=current_count,
                    previous_count=previous_count,
                ),
                "primary_count_label": primary_count_label,
                "source_summary_label": _source_summary_label(theme_signal_rows),
                "priority_band": _priority_band(impact_score),
            }
        )

    recent_activity = [
        _build_interview_activity(interview)
        for interview in interviews[:6]
    ]
    recent_activity.extend(
        _build_theme_activity(theme)
        for theme in active_themes
        if theme.is_new
    )
    recent_activity.extend(
        _build_sync_activity(sync_run)
        for sync_run in sync_runs[:6]
    )
    recent_activity.sort(
        key=lambda item: _as_utc(item["occurred_at"]),
        reverse=True,
    )
    recent_activity = recent_activity[:6]

    emerging_trends: list[dict] = []
    for theme in active_themes:
        reference_time = _as_utc(theme.last_new_activity or theme.created_at)
        if not theme.is_new or reference_time < current_window_start:
            continue
        theme_signal_rows = _theme_signals(theme_id=theme.id, signals=workspace_signals)
        current_count = len(
            _signals_in_window(theme_signal_rows, window_start=current_window_start)
        )
        if current_count == 0:
            continue
        previous_count = len(
            _signals_in_window(
                theme_signal_rows,
                window_start=previous_window_start,
                window_end=current_window_start,
            )
        )
        emerging_trends.append(
            {
                "id": theme.id,
                "name": theme.name,
                "velocity_delta": _velocity_delta(
                    current_count=current_count,
                    previous_count=previous_count,
                ),
                "sparkline_points": _sparkline_points(
                    theme_id=theme.id,
                    signals=theme_signal_rows,
                    now=now,
                ),
                "href": "/insights",
                "_sort_key": (current_count, reference_time),
            }
        )

    emerging_trends.sort(
        key=lambda item: item["_sort_key"],
        reverse=True,
    )
    for item in emerging_trends:
        item.pop("_sort_key", None)
    emerging_trends = emerging_trends[:3]

    has_data = bool(interviews_total or signals_total or active_themes)
    return {
        "has_data": has_data,
        "stats": {
            "interviews_total": interviews_total,
            "interviews_this_week": interviews_this_week,
            "active_themes_total": len(active_themes),
            "new_themes_this_week": new_themes_this_week,
            "signals_total": signals_total,
            "active_source_type_count": active_source_type_count,
            "average_impact_score": average_impact_score,
            "average_impact_delta": average_impact_delta,
        },
        "active_priorities": active_priorities,
        "recent_activity": recent_activity,
        "emerging_trends": emerging_trends,
    }
