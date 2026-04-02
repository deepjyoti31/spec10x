"""
Interview library query and serialization helpers.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Insight, Interview, InterviewStatus, User
from app.services.billing_limits import get_plan_limits
from app.services.signals import NATIVE_PROVIDER, PROVIDER_LABELS


DISPLAY_PROCESSING = "processing"
DISPLAY_DONE = "done"
DISPLAY_ERROR = "error"
DISPLAY_LOW_INSIGHT = "low_insight"


@dataclass(slots=True)
class InterviewLibraryRow:
    interview: Interview
    display_status: str
    participant_summary: str | None
    source_provider: str
    source_label: str
    insights_count: int
    themes_count: int
    theme_chips: list[dict[str, str]]
    search_text: str


def _display_status(interview: Interview, insights_count: int) -> str:
    if interview.status == InterviewStatus.error:
        return DISPLAY_ERROR
    if interview.status in {
        InterviewStatus.queued,
        InterviewStatus.transcribing,
        InterviewStatus.analyzing,
    }:
        return DISPLAY_PROCESSING
    if interview.status == InterviewStatus.done and insights_count == 0:
        return DISPLAY_LOW_INSIGHT
    return DISPLAY_DONE


def _participant_summary(interview: Interview) -> str | None:
    preferred_labels: list[str] = []
    fallback_labels: list[str] = []

    for speaker in interview.speakers:
        label = (speaker.name or speaker.speaker_label or "").strip()
        if not label:
            continue
        if speaker.is_interviewer:
            fallback_labels.append(label)
        else:
            preferred_labels.append(label)

    candidates = preferred_labels or fallback_labels
    unique_labels: list[str] = []
    seen: set[str] = set()
    for label in candidates:
        normalized = label.lower()
        if normalized in seen:
            continue
        seen.add(normalized)
        unique_labels.append(label)

    if not unique_labels:
        return None
    if len(unique_labels) == 1:
        return unique_labels[0]
    if len(unique_labels) == 2:
        return ", ".join(unique_labels)
    return f"{unique_labels[0]}, {unique_labels[1]} +{len(unique_labels) - 2} more"


def _source_provider(interview: Interview) -> str:
    metadata = interview.metadata_json or {}
    value = metadata.get("source_provider")
    return str(value) if value else NATIVE_PROVIDER


def _source_label(interview: Interview, provider: str) -> str:
    metadata = interview.metadata_json or {}
    value = metadata.get("source_label")
    if value:
        return str(value)
    return PROVIDER_LABELS.get(provider, provider.replace("_", " ").title())


def _theme_data(interview: Interview) -> tuple[int, list[dict[str, str]]]:
    theme_names: dict[str, str] = {}

    for insight in interview.insights:
        if insight.is_dismissed or insight.theme_id is None or insight.theme is None:
            continue
        theme_id = str(insight.theme.id)
        if theme_id not in theme_names:
            theme_names[theme_id] = insight.theme.name

    sorted_theme_items = sorted(
        theme_names.items(),
        key=lambda item: item[1].lower(),
    )
    return len(sorted_theme_items), [
        {"id": theme_id, "name": theme_name}
        for theme_id, theme_name in sorted_theme_items
    ]


def _build_search_text(interview: Interview, participant_summary: str | None) -> str:
    parts = [interview.filename]
    if participant_summary:
        parts.append(participant_summary)
    for speaker in interview.speakers:
        if speaker.name:
            parts.append(speaker.name)
        if speaker.speaker_label:
            parts.append(speaker.speaker_label)
    for insight in interview.insights:
        if insight.is_dismissed:
            continue
        parts.append(insight.title)
        parts.append(insight.quote)
    return " ".join(part.lower() for part in parts if part)


def _serialize_row(row: InterviewLibraryRow) -> dict:
    interview = row.interview
    return {
        "id": interview.id,
        "filename": interview.filename,
        "file_type": interview.file_type,
        "created_at": interview.created_at,
        "updated_at": interview.updated_at,
        "duration_seconds": interview.duration_seconds,
        "file_size_bytes": interview.file_size_bytes,
        "raw_status": interview.status,
        "display_status": row.display_status,
        "error_message": interview.error_message,
        "participant_summary": row.participant_summary,
        "source_provider": row.source_provider,
        "source_label": row.source_label,
        "insights_count": row.insights_count,
        "themes_count": row.themes_count,
        "theme_chips": row.theme_chips,
    }


def _sort_rows(rows: list[InterviewLibraryRow], sort: str) -> list[InterviewLibraryRow]:
    if sort == "oldest":
        return sorted(
            rows,
            key=lambda row: (
                row.interview.created_at,
                row.interview.updated_at,
            ),
        )
    if sort == "name":
        return sorted(
            rows,
            key=lambda row: (
                row.interview.filename.lower(),
                row.interview.created_at,
            ),
        )
    if sort == "insights":
        return sorted(
            rows,
            key=lambda row: (
                row.insights_count,
                row.interview.updated_at,
                row.interview.created_at,
            ),
            reverse=True,
        )
    if sort == "themes":
        return sorted(
            rows,
            key=lambda row: (
                row.themes_count,
                row.insights_count,
                row.interview.updated_at,
                row.interview.created_at,
            ),
            reverse=True,
        )
    return sorted(
        rows,
        key=lambda row: (
            row.interview.updated_at,
            row.interview.created_at,
        ),
        reverse=True,
    )


async def build_interview_library(
    db: AsyncSession,
    *,
    user: User,
    q: str | None = None,
    sort: str = "recent",
    status_filter: str | None = None,
    source_filter: str | None = None,
) -> dict:
    result = await db.execute(
        select(Interview)
        .where(Interview.user_id == user.id)
        .options(
            selectinload(Interview.speakers),
            selectinload(Interview.insights).selectinload(Insight.theme),
        )
    )
    interviews = list(result.scalars().all())

    all_rows: list[InterviewLibraryRow] = []
    for interview in interviews:
        active_insights = [
            insight for insight in interview.insights
            if not insight.is_dismissed
        ]
        insights_count = len(active_insights)
        themes_count, theme_chips = _theme_data(interview)
        participant_summary = _participant_summary(interview)
        source_provider = _source_provider(interview)
        source_label = _source_label(interview, source_provider)
        all_rows.append(
            InterviewLibraryRow(
                interview=interview,
                display_status=_display_status(interview, insights_count),
                participant_summary=participant_summary,
                source_provider=source_provider,
                source_label=source_label,
                insights_count=insights_count,
                themes_count=themes_count,
                theme_chips=theme_chips,
                search_text=_build_search_text(interview, participant_summary),
            )
        )

    filtered_rows = all_rows
    if q:
        query = q.strip().lower()
        if query:
            filtered_rows = [
                row for row in filtered_rows
                if query in row.search_text
            ]

    if status_filter:
        filtered_rows = [
            row for row in filtered_rows
            if row.display_status == status_filter
        ]

    if source_filter:
        filtered_rows = [
            row for row in filtered_rows
            if row.source_provider == source_filter
        ]

    sorted_rows = _sort_rows(filtered_rows, sort)

    source_counts = Counter(row.source_provider for row in all_rows)
    available_sources = [
        {
            "provider": provider,
            "label": PROVIDER_LABELS.get(provider, provider.replace("_", " ").title()),
            "count": count,
        }
        for provider, count in sorted(
            source_counts.items(),
            key=lambda item: (item[0] != NATIVE_PROVIDER, item[0]),
        )
    ]

    limits = get_plan_limits(user.plan)
    storage_bytes_used = sum(interview.file_size_bytes for interview in interviews)

    return {
        "summary": {
            "total_count": len(all_rows),
            "filtered_count": len(sorted_rows),
            "storage_bytes_used": storage_bytes_used,
            "storage_bytes_limit": limits["storage_bytes"],
            "plan": user.plan,
            "has_data": bool(all_rows),
            "available_sources": available_sources,
        },
        "items": [_serialize_row(row) for row in sorted_rows],
    }
