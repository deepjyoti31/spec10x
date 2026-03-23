"""
Signal services for Sprint 4/5 multi-source evidence.

This module owns:
- native interview signal materialization
- deterministic theme matching for external signals
- feed serialization
- impact score calculation
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.connectors.base import NormalizedSignal
from app.models import (
    DataSource,
    Insight,
    InsightCategory,
    Interview,
    Signal,
    SignalKind,
    SignalStatus,
    SourceConnection,
    SourceType,
    Theme,
    ThemeStatus,
    User,
    Workspace,
)
from app.services.sources import get_or_create_default_workspace, upsert_source_item
from app.services.synthesis import _normalize_theme_name, _similarity


NATIVE_PROVIDER = "native_upload"
THEME_MATCH_THRESHOLD = 0.82

IMPACT_FREQUENCY_WEIGHT = 40.0
IMPACT_NEGATIVE_WEIGHT = 25.0
IMPACT_RECENCY_WEIGHT = 20.0
IMPACT_SOURCE_DIVERSITY_WEIGHT = 15.0

SOURCE_TYPE_LABELS = {
    SourceType.interview: "Interview",
    SourceType.support: "Support",
    SourceType.survey: "Survey",
    SourceType.analytics: "Analytics",
}

PROVIDER_LABELS = {
    NATIVE_PROVIDER: "Interview Upload",
    "zendesk": "Zendesk",
    "csv_import": "Survey CSV Import",
}

SIGNAL_KIND_LABELS = {
    SignalKind.insight: "Insight",
    SignalKind.ticket: "Ticket",
    SignalKind.survey_response: "Survey Response",
    SignalKind.metric_window: "Metric Window",
}

INTERVIEW_SENTIMENT_BY_CATEGORY = {
    InsightCategory.pain_point: "negative",
    InsightCategory.feature_request: "neutral",
    InsightCategory.positive: "positive",
    InsightCategory.suggestion: "neutral",
}


@dataclass(slots=True)
class ThemeMatchResult:
    theme_id: uuid.UUID | None
    strategy: str | None
    score: float | None


@dataclass(slots=True)
class ImpactScoreResult:
    total: float
    frequency: float
    negative: float
    recency: float
    source_diversity: float


async def _get_default_workspace_for_user_id(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> Workspace:
    user = await db.get(User, user_id)
    if user is None:
        raise ValueError(f"User {user_id} not found")
    return await get_or_create_default_workspace(db, user)


async def _get_workspace_owner_user_id(
    db: AsyncSession,
    workspace_id: uuid.UUID,
) -> uuid.UUID:
    workspace = await db.get(Workspace, workspace_id)
    if workspace is None:
        raise ValueError(f"Workspace {workspace_id} not found")
    return workspace.owner_user_id


def _parse_theme_match_id(metadata_json: dict[str, Any] | None) -> uuid.UUID | None:
    if not metadata_json:
        return None
    theme_match = metadata_json.get("theme_match")
    if not isinstance(theme_match, dict):
        return None
    theme_id = theme_match.get("theme_id")
    if not theme_id:
        return None
    try:
        return uuid.UUID(str(theme_id))
    except (TypeError, ValueError):
        return None


def _merge_theme_match_metadata(
    metadata_json: dict[str, Any] | None,
    match: ThemeMatchResult,
) -> dict[str, Any] | None:
    metadata = dict(metadata_json or {})
    if match.theme_id is None:
        metadata.pop("theme_match", None)
    else:
        metadata["theme_match"] = {
            "theme_id": str(match.theme_id),
            "strategy": match.strategy,
            "score": round(float(match.score or 0.0), 3),
        }
    return metadata or None


def _derive_interview_signal_sentiment(insight: Insight) -> str | None:
    if insight.sentiment:
        return insight.sentiment
    return INTERVIEW_SENTIMENT_BY_CATEGORY.get(insight.category)


def _signal_kind_from_string(signal_kind: str) -> SignalKind:
    try:
        return SignalKind(signal_kind)
    except ValueError:
        return SignalKind.ticket


def _parse_occurred_at(value: datetime | str | None) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _normalized_signal_candidates(signal: Signal | NormalizedSignal) -> list[str]:
    metadata = signal.metadata_json or {}
    candidates = [
        getattr(signal, "title", None),
        getattr(signal, "content_text", None),
        metadata.get("question") if isinstance(metadata, dict) else None,
    ]
    tags = metadata.get("tags") if isinstance(metadata, dict) else None
    if isinstance(tags, list):
        candidates.extend(str(tag) for tag in tags if tag)

    normalized: list[str] = []
    for candidate in candidates:
        if not candidate:
            continue
        normalized_value = _normalize_theme_name(str(candidate))
        if normalized_value:
            normalized.append(normalized_value)
    return normalized


def match_signal_to_themes(
    signal: Signal | NormalizedSignal,
    themes: list[Theme],
) -> ThemeMatchResult:
    if not themes:
        return ThemeMatchResult(None, None, None)

    candidates = _normalized_signal_candidates(signal)
    if not candidates:
        return ThemeMatchResult(None, None, None)

    best_theme: Theme | None = None
    best_score = 0.0
    best_theme_name = ""

    for theme in sorted(themes, key=lambda item: (-item.mention_count, item.name.lower())):
        theme_name = _normalize_theme_name(theme.name)
        if not theme_name:
            continue

        theme_best_score = 0.0
        for candidate in candidates:
            if not candidate:
                continue
            if theme_name in candidate:
                theme_best_score = 1.0
                break
            theme_best_score = max(theme_best_score, _similarity(theme_name, candidate))

        if theme_best_score > best_score:
            best_theme = theme
            best_score = theme_best_score
            best_theme_name = theme_name
            continue

        if (
            theme_best_score == best_score
            and theme_best_score >= THEME_MATCH_THRESHOLD
            and (
                len(theme_name) > len(best_theme_name)
                or (
                    len(theme_name) == len(best_theme_name)
                    and best_theme is not None
                    and (
                        theme.mention_count > best_theme.mention_count
                        or (
                            theme.mention_count == best_theme.mention_count
                            and theme.name.lower() < best_theme.name.lower()
                        )
                    )
                )
            )
        ):
            best_theme = theme
            best_theme_name = theme_name

    if best_theme is None or best_score < THEME_MATCH_THRESHOLD:
        return ThemeMatchResult(None, None, None)

    return ThemeMatchResult(
        theme_id=best_theme.id,
        strategy="deterministic_v1",
        score=best_score,
    )


async def upsert_external_signals(
    db: AsyncSession,
    *,
    connection: SourceConnection,
    data_source: DataSource,
    signals: list[NormalizedSignal],
) -> tuple[int, int, int]:
    owner_user_id = await _get_workspace_owner_user_id(db, connection.workspace_id)
    themes_result = await db.execute(
        select(Theme).where(
            Theme.user_id == owner_user_id,
            Theme.status == ThemeStatus.active,
        )
    )
    active_themes = list(themes_result.scalars().all())

    created = 0
    updated = 0
    unchanged = 0

    for normalized in signals:
        source_item, _, source_item_unchanged = await upsert_source_item(
            db,
            workspace_id=connection.workspace_id,
            source_connection_id=connection.id,
            external_id=normalized.external_id,
            source_record_type=normalized.source_record_type,
            external_updated_at=_parse_occurred_at(normalized.occurred_at),
            checksum=normalized.checksum,
        )

        signal_stmt = select(Signal).where(Signal.source_item_id == source_item.id)
        signal_result = await db.execute(signal_stmt)
        signal_row = signal_result.scalar_one_or_none()

        theme_match = match_signal_to_themes(normalized, active_themes)
        metadata_json = _merge_theme_match_metadata(normalized.metadata_json, theme_match)

        if signal_row is None:
            created += 1
            signal_row = Signal(
                workspace_id=connection.workspace_id,
                source_connection_id=connection.id,
                source_item_id=source_item.id,
                source_type=data_source.source_type,
                provider=data_source.provider,
                signal_kind=_signal_kind_from_string(normalized.signal_kind),
                occurred_at=_parse_occurred_at(normalized.occurred_at),
                title=normalized.title,
                content_text=normalized.content_text or "",
                author_or_speaker=normalized.author_or_speaker,
                sentiment=normalized.sentiment,
                source_url=normalized.source_url,
                metadata_json=metadata_json,
                status=SignalStatus.active,
            )
            db.add(signal_row)
        else:
            signal_is_unchanged = (
                source_item_unchanged
                and signal_row.source_connection_id == connection.id
                and signal_row.source_item_id == source_item.id
                and signal_row.source_type == data_source.source_type
                and signal_row.provider == data_source.provider
                and signal_row.signal_kind == _signal_kind_from_string(normalized.signal_kind)
                and signal_row.occurred_at == _parse_occurred_at(normalized.occurred_at)
                and signal_row.title == normalized.title
                and signal_row.content_text == (normalized.content_text or "")
                and signal_row.author_or_speaker == normalized.author_or_speaker
                and signal_row.sentiment == normalized.sentiment
                and signal_row.source_url == normalized.source_url
                and signal_row.metadata_json == metadata_json
                and signal_row.status == SignalStatus.active
            )
            if signal_is_unchanged:
                unchanged += 1
                continue

            updated += 1
            signal_row.source_connection_id = connection.id
            signal_row.source_item_id = source_item.id
            signal_row.source_type = data_source.source_type
            signal_row.provider = data_source.provider
            signal_row.signal_kind = _signal_kind_from_string(normalized.signal_kind)
            signal_row.occurred_at = _parse_occurred_at(normalized.occurred_at)
            signal_row.title = normalized.title
            signal_row.content_text = normalized.content_text or ""
            signal_row.author_or_speaker = normalized.author_or_speaker
            signal_row.sentiment = normalized.sentiment
            signal_row.source_url = normalized.source_url
            signal_row.metadata_json = metadata_json
            signal_row.status = SignalStatus.active

    await db.flush()
    return created, updated, unchanged


async def refresh_external_signal_theme_matches(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> int:
    workspace = await _get_default_workspace_for_user_id(db, user_id)
    themes_result = await db.execute(
        select(Theme).where(
            Theme.user_id == user_id,
            Theme.status == ThemeStatus.active,
        )
    )
    active_themes = list(themes_result.scalars().all())

    signals_result = await db.execute(
        select(Signal).where(
            Signal.workspace_id == workspace.id,
            Signal.status == SignalStatus.active,
            Signal.provider != NATIVE_PROVIDER,
        )
    )
    signals = list(signals_result.scalars().all())

    changed = 0
    for signal in signals:
        before_theme_id = _parse_theme_match_id(signal.metadata_json)
        match = match_signal_to_themes(signal, active_themes)
        signal.metadata_json = _merge_theme_match_metadata(signal.metadata_json, match)
        after_theme_id = _parse_theme_match_id(signal.metadata_json)
        if before_theme_id != after_theme_id:
            changed += 1

    await db.flush()
    return changed


async def sync_interview_signals_for_interview(
    db: AsyncSession,
    *,
    interview_id: uuid.UUID,
) -> int:
    stmt = (
        select(Interview)
        .where(Interview.id == interview_id)
        .options(
            selectinload(Interview.insights),
            selectinload(Interview.speakers),
        )
    )
    result = await db.execute(stmt)
    interview = result.scalar_one_or_none()
    if interview is None:
        return 0

    workspace = await _get_default_workspace_for_user_id(db, interview.user_id)
    speakers_by_id = {speaker.id: speaker for speaker in interview.speakers}
    insights_by_id = {insight.id: insight for insight in interview.insights}
    active_insights = {
        insight.id: insight
        for insight in interview.insights
        if not insight.is_dismissed
    }

    existing_signals: dict[uuid.UUID, Signal] = {}
    if insights_by_id:
        existing_result = await db.execute(
            select(Signal).where(
                Signal.workspace_id == workspace.id,
                Signal.provider == NATIVE_PROVIDER,
                Signal.source_type == SourceType.interview,
                Signal.native_entity_type == "insight",
                Signal.native_entity_id.in_(tuple(insights_by_id.keys())),
            )
        )
        existing_signals = {
            signal.native_entity_id: signal
            for signal in existing_result.scalars().all()
            if signal.native_entity_id is not None
        }

    for insight_id, insight in active_insights.items():
        speaker = speakers_by_id.get(insight.speaker_id)
        theme_match = ThemeMatchResult(
            theme_id=insight.theme_id,
            strategy="native" if insight.theme_id else None,
            score=1.0 if insight.theme_id else None,
        )
        metadata_json = _merge_theme_match_metadata(
            {
                "interview_id": str(interview.id),
                "filename": interview.filename,
                "category": insight.category.value,
                "theme_suggestion": insight.theme_suggestion,
                "speaker_label": speaker.speaker_label if speaker else None,
                "speaker_name": speaker.name if speaker else None,
            },
            theme_match,
        )
        metadata_json = {
            key: value
            for key, value in (metadata_json or {}).items()
            if value is not None
        } or None

        signal_row = existing_signals.get(insight_id)
        if signal_row is None:
            signal_row = Signal(
                workspace_id=workspace.id,
                source_type=SourceType.interview,
                provider=NATIVE_PROVIDER,
                signal_kind=SignalKind.insight,
                occurred_at=insight.created_at,
                title=insight.title,
                content_text=insight.quote,
                author_or_speaker=speaker.name if speaker and speaker.name else (
                    speaker.speaker_label if speaker else None
                ),
                sentiment=_derive_interview_signal_sentiment(insight),
                metadata_json=metadata_json,
                native_entity_type="insight",
                native_entity_id=insight.id,
                status=SignalStatus.active,
            )
            db.add(signal_row)
        else:
            signal_row.occurred_at = insight.created_at
            signal_row.title = insight.title
            signal_row.content_text = insight.quote
            signal_row.author_or_speaker = speaker.name if speaker and speaker.name else (
                speaker.speaker_label if speaker else None
            )
            signal_row.sentiment = _derive_interview_signal_sentiment(insight)
            signal_row.metadata_json = metadata_json
            signal_row.status = SignalStatus.active

    stale_ids = [insight_id for insight_id in insights_by_id if insight_id not in active_insights]
    if stale_ids:
        await db.execute(
            delete(Signal).where(
                Signal.workspace_id == workspace.id,
                Signal.provider == NATIVE_PROVIDER,
                Signal.native_entity_type == "insight",
                Signal.native_entity_id.in_(tuple(stale_ids)),
            )
        )

    await db.flush()
    return len(active_insights)


async def ensure_native_interview_signals(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> None:
    workspace = await _get_default_workspace_for_user_id(db, user_id)

    insights_result = await db.execute(
        select(Insight.id, Insight.interview_id)
        .where(
            Insight.user_id == user_id,
            Insight.is_dismissed.is_(False),
        )
    )
    insight_rows = insights_result.all()
    active_insight_ids = {row.id for row in insight_rows}
    interview_ids = sorted({row.interview_id for row in insight_rows})

    native_result = await db.execute(
        select(Signal.native_entity_id).where(
            Signal.workspace_id == workspace.id,
            Signal.provider == NATIVE_PROVIDER,
            Signal.source_type == SourceType.interview,
            Signal.native_entity_type == "insight",
        )
    )
    existing_native_ids = {
        row[0]
        for row in native_result.all()
        if row[0] is not None
    }

    if existing_native_ids - active_insight_ids:
        await db.execute(
            delete(Signal).where(
                Signal.workspace_id == workspace.id,
                Signal.provider == NATIVE_PROVIDER,
                Signal.source_type == SourceType.interview,
                Signal.native_entity_type == "insight",
                Signal.native_entity_id.in_(tuple(existing_native_ids - active_insight_ids)),
            )
        )

    missing_insight_ids = active_insight_ids - existing_native_ids
    if not missing_insight_ids and not (existing_native_ids - active_insight_ids):
        return

    for interview_id in interview_ids:
        await sync_interview_signals_for_interview(db, interview_id=interview_id)


async def ensure_signal_consistency(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> Workspace:
    workspace = await _get_default_workspace_for_user_id(db, user_id)
    await ensure_native_interview_signals(db, user_id=user_id)
    await refresh_external_signal_theme_matches(db, user_id=user_id)
    return workspace


async def cleanup_interview_native_signals(
    db: AsyncSession,
    *,
    interview_id: uuid.UUID,
    workspace_id: uuid.UUID | None = None,
) -> None:
    insights_result = await db.execute(
        select(Insight.id, Insight.user_id).where(Insight.interview_id == interview_id)
    )
    insight_rows = insights_result.all()
    insight_ids = [row.id for row in insight_rows]
    if not insight_ids:
        return

    resolved_workspace_id = workspace_id
    if resolved_workspace_id is None:
        resolved_workspace_id = await _get_default_workspace_for_user_id(
            db,
            insight_rows[0].user_id,
        )
        resolved_workspace_id = resolved_workspace_id.id

    await db.execute(
        delete(Signal).where(
            Signal.workspace_id == resolved_workspace_id,
            Signal.provider == NATIVE_PROVIDER,
            Signal.source_type == SourceType.interview,
            Signal.native_entity_type == "insight",
            Signal.native_entity_id.in_(tuple(insight_ids)),
        )
    )
    await db.flush()


def _source_type_count_key(signal: Signal) -> SourceType:
    return signal.source_type


def _signal_recency_points(newest_occurred_at: datetime | None) -> float:
    if newest_occurred_at is None:
        return 0.0

    now = datetime.now(timezone.utc)
    if newest_occurred_at.tzinfo is None:
        newest_occurred_at = newest_occurred_at.replace(tzinfo=timezone.utc)
    days_old = (now - newest_occurred_at).days
    if days_old <= 7:
        return 20.0
    if days_old <= 30:
        return 14.0
    if days_old <= 90:
        return 8.0
    return 3.0


def calculate_impact_score(
    *,
    theme_id: uuid.UUID,
    signals: list[Signal],
) -> ImpactScoreResult:
    themed_signals = [
        signal
        for signal in signals
        if _parse_theme_match_id(signal.metadata_json) == theme_id
    ]
    if not themed_signals:
        return ImpactScoreResult(0.0, 0.0, 0.0, 0.0, 0.0)

    themed_count = len(themed_signals)
    frequency_score = min(themed_count, 10) / 10 * IMPACT_FREQUENCY_WEIGHT

    negative_count = sum(1 for signal in themed_signals if signal.sentiment == "negative")
    negative_ratio = negative_count / themed_count if themed_count else 0.0
    negative_score = negative_ratio * IMPACT_NEGATIVE_WEIGHT

    newest_occurred_at = max(signal.occurred_at for signal in themed_signals)
    recency_score = _signal_recency_points(newest_occurred_at)

    distinct_source_types = len({signal.source_type for signal in themed_signals})
    source_diversity_score = distinct_source_types / 3 * IMPACT_SOURCE_DIVERSITY_WEIGHT

    total = round(
        frequency_score + negative_score + recency_score + source_diversity_score,
        1,
    )

    return ImpactScoreResult(
        total=total,
        frequency=round(frequency_score, 1),
        negative=round(negative_score, 1),
        recency=round(recency_score, 1),
        source_diversity=round(source_diversity_score, 1),
    )


def build_theme_score_map(
    *,
    themes: list[Theme],
    signals: list[Signal],
) -> dict[uuid.UUID, ImpactScoreResult]:
    return {
        theme.id: calculate_impact_score(theme_id=theme.id, signals=signals)
        for theme in themes
    }


def serialize_impact_breakdown(result: ImpactScoreResult) -> dict[str, float]:
    return {
        "total": result.total,
        "frequency": result.frequency,
        "negative": result.negative,
        "recency": result.recency,
        "source_diversity": result.source_diversity,
    }


def _build_signal_theme_chip(
    signal: Signal,
    theme_lookup: dict[uuid.UUID, Theme],
) -> dict[str, str] | None:
    theme_id = _parse_theme_match_id(signal.metadata_json)
    if theme_id is None:
        return None
    theme = theme_lookup.get(theme_id)
    if theme is None:
        return None
    return {"id": str(theme.id), "name": theme.name}


def build_signal_link(signal: Signal) -> dict[str, str] | None:
    metadata = signal.metadata_json or {}
    if signal.source_type == SourceType.interview:
        interview_id = metadata.get("interview_id")
        if interview_id:
            return {
                "kind": "internal",
                "href": f"/interview/{interview_id}",
                "label": "View interview",
            }
        return None

    if signal.source_type == SourceType.support and signal.source_url:
        return {
            "kind": "external",
            "href": signal.source_url,
            "label": "Open in Zendesk",
        }

    if signal.source_type == SourceType.survey:
        return {
            "kind": "internal",
            "href": f"/feed?signal={signal.id}",
            "label": "View imported CSV evidence",
        }

    return None


def serialize_feed_signal(
    signal: Signal,
    *,
    theme_lookup: dict[uuid.UUID, Theme],
    include_full_content: bool = False,
) -> dict[str, Any]:
    content_text = signal.content_text or ""
    excerpt = content_text if len(content_text) <= 180 else f"{content_text[:177]}..."
    metadata = dict(signal.metadata_json or {})

    return {
        "id": str(signal.id),
        "source_type": signal.source_type.value,
        "source_label": SOURCE_TYPE_LABELS.get(signal.source_type, signal.source_type.value.title()),
        "provider": signal.provider,
        "provider_label": PROVIDER_LABELS.get(signal.provider, signal.provider.replace("_", " ").title()),
        "signal_kind": signal.signal_kind.value,
        "signal_kind_label": SIGNAL_KIND_LABELS.get(signal.signal_kind, signal.signal_kind.value.replace("_", " ").title()),
        "occurred_at": signal.occurred_at,
        "title": signal.title,
        "excerpt": excerpt,
        "content_text": content_text if include_full_content else None,
        "author_or_speaker": signal.author_or_speaker,
        "sentiment": signal.sentiment,
        "theme_chip": _build_signal_theme_chip(signal, theme_lookup),
        "link": build_signal_link(signal),
        "metadata_json": metadata,
    }


def build_source_breakdown(signals: list[Signal]) -> list[dict[str, Any]]:
    counts: dict[SourceType, int] = {}
    for signal in signals:
        counts[signal.source_type] = counts.get(signal.source_type, 0) + 1

    ordered_types = [SourceType.interview, SourceType.support, SourceType.survey, SourceType.analytics]
    return [
        {
            "source_type": source_type.value,
            "label": SOURCE_TYPE_LABELS[source_type],
            "count": counts.get(source_type, 0),
        }
        for source_type in ordered_types
        if counts.get(source_type, 0) > 0
    ]


async def get_workspace_signals(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    source_filter: SourceType | None = None,
    sentiment: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[Signal]:
    stmt = select(Signal).where(
        Signal.workspace_id == workspace_id,
        Signal.status == SignalStatus.active,
    )
    if source_filter is not None:
        stmt = stmt.where(Signal.source_type == source_filter)
    if sentiment:
        stmt = stmt.where(Signal.sentiment == sentiment)
    if date_from is not None:
        stmt = stmt.where(
            Signal.occurred_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        )
    if date_to is not None:
        stmt = stmt.where(
            Signal.occurred_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc)
        )

    stmt = stmt.order_by(Signal.occurred_at.desc(), Signal.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
