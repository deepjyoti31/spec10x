"""
Spec10x Backend — Export API Routes

Export insights and interview data as Markdown.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import User, Interview, Theme, Insight, ThemeStatus

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
