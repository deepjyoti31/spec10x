"""
Spec10x Backend — Cross-Interview Theme Synthesis

Groups insights into themes across all interviews for a user.
Uses fuzzy string matching to prevent duplicate themes.
"""

import logging
import re
import uuid
from datetime import datetime, timezone
from collections import defaultdict
from difflib import SequenceMatcher

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Insight, Theme, SubTheme, ThemeStatus,
)

logger = logging.getLogger(__name__)


# ─── Stop Words & Normalization ──────────────────────────

# Words to strip when comparing theme similarity
STOP_WORDS = frozenset({
    "the", "a", "an", "and", "or", "of", "in", "on", "for", "to", "with",
    "is", "are", "was", "were", "be", "been", "being",
    "it", "its", "this", "that", "these", "those",
    "has", "have", "had", "do", "does", "did",
    "about", "across", "around", "between", "through",
    # Generic words that add no theme-distinguishing value
    "analysis", "synthesis", "overview", "discussion", "summary",
    "feedback", "review", "insights", "general", "overall", "various",
    "customer", "user", "interview", "data", "information",
})

# Common suffix patterns to normalize (plural → singular, etc.)
SUFFIX_NORMALIZATIONS = [
    (r"ies$", "y"),      # categories → category
    (r"ves$", "f"),      # halves → half
    (r"ses$", "s"),      # analyses → analysis (rough)
    (r"s$", ""),          # features → feature
    (r"ing$", ""),        # onboarding → onboard (rough)
    (r"tion$", ""),       # communication → communica (rough)
    (r"ment$", ""),       # improvement → improve (rough)
]


async def synthesize_themes(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> int:
    """
    Cluster insights into themes across all interviews for a user.

    Algorithm:
        1. Acquire advisory lock to prevent concurrent synthesis
        2. Fetch all insights with theme_suggestion for this user
        3. Normalize and group by theme_suggestion
        4. Fuzzy-match groups to merge near-duplicates  
        5. Match groups against existing themes (fuzzy)
        6. Create/update Theme records
        7. Calculate sentiment aggregation
        8. Mark new themes

    Returns:
        Number of active themes
    """
    logger.info(f"Running theme synthesis for user {user_id}")

    # ── Concurrency safety: acquire advisory lock ──
    # Use user_id hash as lock key to prevent parallel synthesis for same user
    lock_key = hash(str(user_id)) % (2**31)  # PostgreSQL advisory lock needs int
    try:
        await db.execute(text(f"SELECT pg_advisory_xact_lock({lock_key})"))
        logger.trace(f"Acquired advisory lock {lock_key} for user {user_id}")
    except Exception as e:
        # Advisory locks may not be available in all environments (e.g., test DBs)
        logger.warning(f"Could not acquire advisory lock: {e}")

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

    logger.info(f"Found {len(insights)} insights to synthesize")
    logger.debug(f"Insights fetched: {[i.id for i in insights]}")

    # ── Step 1: Group insights by normalized theme suggestion ──
    raw_groups: dict[str, list[Insight]] = defaultdict(list)
    for insight in insights:
        if insight.theme_suggestion:
            key = _normalize_theme_name(insight.theme_suggestion)
            raw_groups[key].append(insight)
    
    logger.info(f"Grouped into {len(raw_groups)} raw theme suggestions")
    logger.debug(f"Raw groups: {[(k, [i.id for i in v]) for k, v in raw_groups.items()]}")

    # ── Step 2: Merge near-duplicate groups ──
    theme_groups = _merge_similar_groups(raw_groups)
    logger.info(f"Merged into {len(theme_groups)} unique themes")
    logger.debug(f"Merged groups: {[(k, [i.id for i in v]) for k, v in theme_groups.items()]}")

    # ── Step 3: Get existing themes for this user ──
    stmt = select(Theme).where(Theme.user_id == user_id)
    result = await db.execute(stmt)
    existing_themes_list = result.scalars().all()
    existing_themes: dict[str, Theme] = {
        _normalize_theme_name(t.name): t
        for t in existing_themes_list
    }

    themes_count = 0

    for theme_key, group_insights in theme_groups.items():
        # Use the most common theme suggestion as the display name
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

        # Find matching existing theme (exact or fuzzy)
        matched_key = _find_matching_theme(theme_key, existing_themes)

        if matched_key:
            # Update existing theme
            theme = existing_themes[matched_key]
            theme.mention_count = mention_count
            theme.sentiment_positive = round(positive, 2)
            theme.sentiment_negative = round(negative, 2)
            theme.sentiment_neutral = round(neutral, 2)
            theme.last_new_activity = datetime.now(timezone.utc)
            theme.status = ThemeStatus.active
            # Register this group under the matched key for insight linking
            existing_themes[theme_key] = theme
        else:
            # Create new theme (even with 1 source)
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

        # Link insights to this theme
        for ins in group_insights:
            ins.theme_id = existing_themes[theme_key].id

        themes_count += 1

    # Mark themes that have no insights anymore as "previous"
    active_theme_keys = set(theme_groups.keys())
    for theme_key, theme in existing_themes.items():
        if theme_key not in active_theme_keys:
            # Only mark as previous if it wasn't just matched by a different key
            if not any(
                _find_matching_theme(ak, {theme_key: theme})
                for ak in active_theme_keys
            ):
                theme.status = ThemeStatus.previous

    await db.flush()
    logger.info(f"Synthesis complete: {themes_count} active themes")
    return themes_count


# ─── Normalization & Matching ────────────────────────────

def _normalize_theme_name(name: str) -> str:
    """Normalize a theme name for grouping.
    
    Applies: lowercase, strip, replace separators, remove stop words.
    """
    name = name.lower().strip()
    # Replace common separators
    name = name.replace("_", " ").replace("-", " ")
    # Remove extra whitespace
    name = re.sub(r"\s+", " ", name).strip()
    # Remove stop words
    words = [w for w in name.split() if w not in STOP_WORDS]
    return " ".join(words) if words else name


def _normalize_for_comparison(name: str) -> str:
    """Deeper normalization for fuzzy comparison — strips suffixes too."""
    normalized = _normalize_theme_name(name)
    words = normalized.split()
    stemmed = []
    for word in words:
        for pattern, replacement in SUFFIX_NORMALIZATIONS:
            word = re.sub(pattern, replacement, word)
        if word:  # Don't add empty strings
            stemmed.append(word)
    return " ".join(stemmed)


def _similarity(a: str, b: str) -> float:
    """Calculate similarity between two normalized theme names."""
    if a == b:
        return 1.0
    
    # Try deep normalization
    a_deep = _normalize_for_comparison(a)
    b_deep = _normalize_for_comparison(b)
    if a_deep == b_deep:
        return 1.0
    
    # Check if one contains the other (substring match)
    if a_deep in b_deep or b_deep in a_deep:
        # Shorter name is contained in longer — high similarity
        shorter = min(len(a_deep), len(b_deep))
        longer = max(len(a_deep), len(b_deep))
        if shorter > 0 and shorter / longer > 0.5:
            return 0.9
    
    # SequenceMatcher for fuzzy matching
    return SequenceMatcher(None, a_deep, b_deep).ratio()


# Threshold for considering two theme names as the same
SIMILARITY_THRESHOLD = 0.80


def _merge_similar_groups(
    groups: dict[str, list],
) -> dict[str, list]:
    """Merge groups with similar theme names.
    
    Takes groups keyed by normalized theme name and merges any
    that are fuzzy-similar above the threshold.
    """
    keys = list(groups.keys())
    merged: dict[str, list] = {}
    used = set()

    for i, key_a in enumerate(keys):
        if key_a in used:
            continue
        
        # Start a new merged group
        merged_insights = list(groups[key_a])
        used.add(key_a)
        canonical_key = key_a
        
        # Look for similar groups to merge
        for j in range(i + 1, len(keys)):
            key_b = keys[j]
            if key_b in used:
                continue
            
            if _similarity(canonical_key, key_b) >= SIMILARITY_THRESHOLD:
                merged_insights.extend(groups[key_b])
                used.add(key_b)
                # Keep the shorter (more concise) key as canonical
                if len(key_b) < len(canonical_key):
                    canonical_key = key_b
        
        merged[canonical_key] = merged_insights

    return merged


def _find_matching_theme(
    group_key: str,
    existing_themes: dict[str, "Theme"],
) -> str | None:
    """Find an existing theme that matches a group key (exact or fuzzy).
    
    Returns the existing theme's key if found, None otherwise.
    """
    # Exact match first
    if group_key in existing_themes:
        return group_key
    
    # Fuzzy match
    best_match = None
    best_score = 0.0
    
    for existing_key in existing_themes:
        score = _similarity(group_key, existing_key)
        if score >= SIMILARITY_THRESHOLD and score > best_score:
            best_score = score
            best_match = existing_key
    
    return best_match


# ─── Description Generation ─────────────────────────────

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
