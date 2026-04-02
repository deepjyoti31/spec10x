"""
Spec10x Backend — Export API Routes

Export insights, interview data, and feed signals as Markdown.
"""

from typing import Any
import uuid
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import User, Interview, Theme, Insight, ThemeStatus, SourceType
from app.services.signals import ensure_signal_consistency, get_workspace_signals, serialize_feed_signal

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.get("/insights", response_class=PlainTextResponse)
async def export_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Export all themes and insights as Markdown.
    """
    # Fetch themes with insights
    stmt = (
        select(Theme)
        .where(
            Theme.user_id == current_user.id,
            Theme.status == ThemeStatus.active,
        )
        .options(selectinload(Theme.insights))
        .order_by(Theme.mention_count.desc())
    )
    result = await db.execute(stmt)
    themes = result.scalars().all()

    # Fetch unthemed insights
    stmt = (
        select(Insight)
        .where(
            Insight.user_id == current_user.id,
            Insight.theme_id.is_(None),
            Insight.is_dismissed == False,  # noqa: E712
        )
    )
    result = await db.execute(stmt)
    unthemed = result.scalars().all()

    # Build markdown
    lines = [
        f"# Spec10x — Interview Insights Export",
        f"",
        f"*Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*",
        f"*User: {current_user.email}*",
        f"",
        f"---",
        f"",
    ]

    if themes:
        lines.append(f"## Themes ({len(themes)} active)")
        lines.append("")

        for theme in themes:
            # Theme header
            sentiment_bar = _sentiment_bar(
                theme.sentiment_positive,
                theme.sentiment_neutral,
                theme.sentiment_negative,
            )
            lines.append(f"### {theme.name}")
            lines.append(f"")
            if theme.description:
                lines.append(f"{theme.description}")
                lines.append(f"")
            lines.append(f"- **Mentions:** {theme.mention_count}")
            lines.append(f"- **Sentiment:** {sentiment_bar}")
            lines.append(f"")

            # Insights for this theme
            if theme.insights:
                for insight in theme.insights:
                    if insight.is_dismissed:
                        continue
                    category_icon = _category_icon(insight.category.value)
                    lines.append(f"- {category_icon} **{insight.title}**")
                    lines.append(f"  > \"{insight.quote}\"")
                    lines.append(f"")

            lines.append("---")
            lines.append("")

    if unthemed:
        lines.append(f"## Uncategorized Insights ({len(unthemed)})")
        lines.append("")
        for insight in unthemed:
            category_icon = _category_icon(insight.category.value)
            lines.append(f"- {category_icon} **{insight.title}**")
            lines.append(f"  > \"{insight.quote}\"")
            lines.append(f"")

    if not themes and not unthemed:
        lines.append("*No insights found. Upload some interviews to get started.*")

    return "\n".join(lines)


@router.get("/interview/{interview_id}", response_class=PlainTextResponse)
async def export_interview(
    interview_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export a single interview's transcript and insights as Markdown."""
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

    lines = [
        f"# {interview.filename}",
        f"",
        f"*Uploaded: {interview.created_at.strftime('%Y-%m-%d %H:%M UTC')}*",
        f"*Status: {interview.status.value}*",
        f"",
    ]

    if interview.speakers:
        lines.append("## Speakers")
        lines.append("")
        for speaker in interview.speakers:
            role_str = f" ({speaker.role})" if speaker.role else ""
            label = speaker.name or speaker.speaker_label
            interviewer = " 🎙️" if speaker.is_interviewer else ""
            lines.append(f"- **{label}**{role_str}{interviewer}")
        lines.append("")

    if interview.transcript:
        lines.append("## Transcript")
        lines.append("")
        lines.append(interview.transcript)
        lines.append("")

    if interview.insights:
        lines.append("## Extracted Insights")
        lines.append("")
        for insight in interview.insights:
            if insight.is_dismissed:
                continue
            icon = _category_icon(insight.category.value)
            lines.append(f"### {icon} {insight.title}")
            lines.append(f"")
            lines.append(f"> \"{insight.quote}\"")
            lines.append(f"")
            lines.append(f"- **Category:** {insight.category.value.replace('_', ' ').title()}")
            lines.append(f"- **Confidence:** {insight.confidence:.0%}")
            if insight.sentiment:
                lines.append(f"- **Sentiment:** {insight.sentiment}")
            lines.append(f"")

    return "\n".join(lines)


@router.get("/feed", response_class=PlainTextResponse)
async def export_feed(
    source: SourceType | None = Query(None),
    sentiment: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export the current filtered feed as Markdown."""
    workspace = await ensure_signal_consistency(db, user_id=current_user.id)

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

    serialized_signals = [
        serialize_feed_signal(
            signal,
            theme_lookup=theme_lookup,
            include_full_content=True,
        )
        for signal in signals
    ]

    lines = [
        "# Spec10x - Feed Export",
        "",
        f"*Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*",
        f"*User: {current_user.email}*",
        f"*Filters: {_format_feed_filters(source, sentiment, date_from, date_to)}*",
        "",
        "---",
        "",
    ]

    if not serialized_signals:
        lines.append("*No feed signals matched the current filters.*")
        return "\n".join(lines)

    lines.append(f"## Signals ({len(serialized_signals)})")
    lines.append("")

    for index, signal in enumerate(serialized_signals, start=1):
        title = signal.get("title") or signal.get("signal_kind_label") or "Untitled signal"
        occurred_at = signal.get("occurred_at")

        lines.append(f"### {index}. {title}")
        lines.append("")
        lines.append(f"- **ID:** {signal['id']}")
        lines.append(f"- **Source:** {signal['source_label']}")
        lines.append(f"- **Provider:** {signal['provider_label']}")
        lines.append(f"- **Signal Type:** {signal['signal_kind_label']}")
        if occurred_at:
            lines.append(f"- **Occurred:** {_format_export_datetime(occurred_at)}")
        if signal.get("sentiment"):
            lines.append(f"- **Sentiment:** {signal['sentiment']}")
        if signal.get("author_or_speaker"):
            lines.append(f"- **Author/Speaker:** {signal['author_or_speaker']}")
        theme_chip = signal.get("theme_chip") or {}
        if isinstance(theme_chip, dict) and theme_chip.get("name"):
            lines.append(f"- **Theme:** {theme_chip['name']}")
        link = signal.get("link") or {}
        if isinstance(link, dict) and link.get("href"):
            lines.append(f"- **Link:** {link['href']}")
        lines.append("")

        content_text = signal.get("content_text") or signal.get("excerpt")
        if isinstance(content_text, str) and content_text.strip():
            lines.append(content_text.strip())
            lines.append("")

        metadata_lines = _format_feed_metadata(signal.get("metadata_json"))
        if metadata_lines:
            lines.append("#### Metadata")
            lines.append("")
            lines.extend(metadata_lines)
            lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def _category_icon(category: str) -> str:
    return {
        "pain_point": "🔴",
        "feature_request": "🔵",
        "positive": "🟢",
        "suggestion": "🟡",
    }.get(category, "📝")


def _sentiment_bar(positive: float, neutral: float, negative: float) -> str:
    pos_pct = int(positive * 100)
    neg_pct = int(negative * 100)
    neu_pct = 100 - pos_pct - neg_pct
    return f"🟢 {pos_pct}% / ⚪ {neu_pct}% / 🔴 {neg_pct}%"

def _format_feed_filters(
    source: SourceType | None,
    sentiment: str | None,
    date_from: date | None,
    date_to: date | None,
) -> str:
    filters: list[str] = []

    if source is not None:
        filters.append(f"Source: {source.value.replace('_', ' ').title()}")
    if sentiment:
        filters.append(f"Sentiment: {sentiment.title()}")
    if date_from is not None:
        filters.append(f"Date from: {date_from.isoformat()}")
    if date_to is not None:
        filters.append(f"Date to: {date_to.isoformat()}")

    return " | ".join(filters) if filters else "All signals"


def _format_export_datetime(value: Any) -> str:
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M UTC")

    return str(value)


def _format_feed_metadata(metadata_json: Any) -> list[str]:
    if not isinstance(metadata_json, dict):
        return []

    lines: list[str] = []
    skip_keys = {"theme_match", "interview_id"}

    for key, value in metadata_json.items():
        if key in skip_keys or value in (None, "", [], {}):
            continue

        label = key.replace("_", " ").title()
        if key == "tags" and isinstance(value, list):
            tags = [str(item).strip() for item in value if str(item).strip()]
            if tags:
                lines.append(f"- **{label}:** {', '.join(tags)}")
            continue

        if isinstance(value, dict):
            continue

        if isinstance(value, bool):
            lines.append(f"- **{label}:** {'Yes' if value else 'No'}")
            continue

        if isinstance(value, (int, float)):
            lines.append(f"- **{label}:** {value}")
            continue

        if isinstance(value, str) and value.strip():
            lines.append(f"- **{label}:** {value.strip()}")

    return lines
