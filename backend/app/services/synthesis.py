"""
Spec10x Backend — Cross-Interview Theme Synthesis

Groups insights into themes across all interviews for a user.
Mock mode uses normalized string matching; real mode uses embedding similarity.
"""

import logging
import uuid
from datetime import datetime, timezone
from collections import defaultdict

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Insight, Theme, SubTheme, ThemeStatus,
)

logger = logging.getLogger(__name__)


async def synthesize_themes(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    """
    Cluster insights into themes across all interviews for a user.

    Algorithm (mock mode — string matching):
        1. Fetch all insights with theme_suggestion for this user
        2. Normalize and group by theme_suggestion
        3. For groups with 2+ sources: create/update Theme
        4. Calculate sentiment aggregation
        5. Mark new themes

    Returns:
        Number of active themes
    """
    logger.info(f"Running theme synthesis for user {user_id}")

    # Fetch all non-dismissed insights with theme suggestions
    stmt = (
        select(Insight)
        .where(
            Insight.user_id == user_id,
            Insight.is_dismissed == False,  # noqa: E712
            Insight.theme_suggestion.isnot(None),
        )
    )
    result = await db.execute(stmt)
    insights = result.scalars().all()

    if not insights:
        logger.info("No insights found — nothing to synthesize")
        return 0

    # Group insights by normalized theme suggestion
    theme_groups: dict[str, list[Insight]] = defaultdict(list)
    for insight in insights:
        if insight.theme_suggestion:
            key = _normalize_theme_name(insight.theme_suggestion)
            theme_groups[key].append(insight)

    # Get existing themes for this user
    stmt = select(Theme).where(Theme.user_id == user_id)
    result = await db.execute(stmt)
    existing_themes = {
        _normalize_theme_name(t.name): t
        for t in result.scalars().all()
    }

    themes_count = 0

    for theme_key, group_insights in theme_groups.items():
        # Use the most common theme suggestion as the name
        name_counts: dict[str, int] = defaultdict(int)
        for ins in group_insights:
            name_counts[ins.theme_suggestion] += 1
        best_name = max(name_counts, key=name_counts.get)

        # Count unique interviews (sources)
        unique_interviews = set(ins.interview_id for ins in group_insights)
        mention_count = len(group_insights)

        # Calculate sentiment
        sentiments = [ins.sentiment for ins in group_insights if ins.sentiment]
        positive = sum(1 for s in sentiments if s == "positive") / max(len(sentiments), 1)
        negative = sum(1 for s in sentiments if s == "negative") / max(len(sentiments), 1)
        neutral = 1.0 - positive - negative

        if theme_key in existing_themes:
            # Update existing theme
            theme = existing_themes[theme_key]
            theme.mention_count = mention_count
            theme.sentiment_positive = round(positive, 2)
            theme.sentiment_negative = round(negative, 2)
            theme.sentiment_neutral = round(neutral, 2)
            theme.last_new_activity = datetime.now(timezone.utc)
            # Only mark as active if it has 2+ sources
            if len(unique_interviews) >= 2:
                theme.status = ThemeStatus.active
        else:
            # Create new theme (only if 2+ unique sources)
            if len(unique_interviews) >= 2:
                theme = Theme(
                    user_id=user_id,
                    name=best_name,
                    description=_generate_theme_description(group_insights),
                    mention_count=mention_count,
                    sentiment_positive=round(positive, 2),
                    sentiment_negative=round(negative, 2),
                    sentiment_neutral=round(neutral, 2),
                    is_new=True,
                    last_new_activity=datetime.now(timezone.utc),
                    status=ThemeStatus.active,
                )
                db.add(theme)
                await db.flush()
                existing_themes[theme_key] = theme
            else:
                # Signal (1 source) — leave insights unlinked to a theme
                continue

        # Link insights to this theme
        for ins in group_insights:
            ins.theme_id = existing_themes[theme_key].id

        themes_count += 1

    # Mark themes that have no insights anymore as "previous"
    for theme_key, theme in existing_themes.items():
        if theme_key not in theme_groups:
            theme.status = ThemeStatus.previous

    await db.flush()
    logger.info(f"Synthesis complete: {themes_count} active themes")
    return themes_count


def _normalize_theme_name(name: str) -> str:
    """Normalize a theme name for grouping."""
    return name.lower().strip().replace("_", " ").replace("-", " ")


def _generate_theme_description(insights: list) -> str:
    """Generate a short description for a theme based on its insights."""
    categories = defaultdict(int)
    for ins in insights:
        categories[ins.category.value if hasattr(ins.category, 'value') else ins.category] += 1

    parts = []
    if categories.get("pain_point"):
        parts.append(f"{categories['pain_point']} pain points")
    if categories.get("feature_request"):
        parts.append(f"{categories['feature_request']} feature requests")
    if categories.get("positive"):
        parts.append(f"{categories['positive']} positive mentions")
    if categories.get("suggestion"):
        parts.append(f"{categories['suggestion']} suggestions")

    unique_interviews = set(ins.interview_id for ins in insights)
    return (
        f"Theme with {len(insights)} mentions across "
        f"{len(unique_interviews)} interviews: {', '.join(parts)}."
    )
