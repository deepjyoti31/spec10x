"""
Integration Tests — Theme Trends API (v0.8, US-08-04-01)

Verifies that /api/themes/trends reuses the v0.52 trend windows and buckets
voice signals into rolling weekly counts, oldest first.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models import (
    FileType,
    Insight,
    InsightCategory,
    Interview,
    InterviewStatus,
    Theme,
    ThemeStatus,
)
from tests.conftest import AUTH_HEADER


async def _create_theme_with_dated_insights(
    db_session,
    test_user,
    name: str,
    *,
    insight_ages_days: list[int],
) -> Theme:
    theme = Theme(
        user_id=test_user.id,
        name=name,
        mention_count=len(insight_ages_days),
        sentiment_negative=1.0,
        status=ThemeStatus.active,
        is_new=False,
    )
    db_session.add(theme)
    await db_session.flush()

    interview = Interview(
        user_id=test_user.id,
        filename=f"{uuid.uuid4()}.txt",
        file_type=FileType.txt,
        file_size_bytes=10,
        storage_path=f"tests/{uuid.uuid4()}.txt",
        status=InterviewStatus.done,
        transcript="Some transcript text.",
    )
    db_session.add(interview)
    await db_session.flush()

    now = datetime.now(timezone.utc)
    for index, age_days in enumerate(insight_ages_days):
        db_session.add(
            Insight(
                user_id=test_user.id,
                interview_id=interview.id,
                theme_id=theme.id,
                category=InsightCategory.pain_point,
                title=f"{name} insight {index}",
                quote=f"Quote about {name.lower()} number {index}.",
                confidence=0.9,
                theme_suggestion=theme.name,
                sentiment="negative",
                created_at=now - timedelta(days=age_days),
            )
        )
    await db_session.flush()
    await db_session.commit()
    return theme


class TestThemeTrends:
    @pytest.mark.asyncio
    async def test_trends_shape_and_rising_direction(self, client, db_session, test_user):
        # 3 signals in the last 14 days, 1 in the previous 14-day window → rising
        theme = await _create_theme_with_dated_insights(
            db_session,
            test_user,
            "Trends Rising Theme",
            insight_ages_days=[2, 2, 2, 20],
        )

        response = await client.get("/api/themes/trends", headers=AUTH_HEADER)
        assert response.status_code == 200
        body = response.json()

        assert body["window_days"] == 14
        assert len(body["weeks"]) == 8
        assert body["has_data"] is True

        row = next(item for item in body["themes"] if item["id"] == str(theme.id))
        assert row["direction"] == "rising"
        assert row["recent_count"] == 3
        assert row["previous_count"] == 1
        assert len(row["weekly_counts"]) == 8
        assert sum(row["weekly_counts"]) == 4
        # Newest bucket (0-7 days ago) holds the three recent signals
        assert row["weekly_counts"][-1] == 3
        # The 20-day-old signal falls in the 14-21 day bucket
        assert row["weekly_counts"][5] == 1

    @pytest.mark.asyncio
    async def test_trends_declining_direction(self, client, db_session, test_user):
        theme = await _create_theme_with_dated_insights(
            db_session,
            test_user,
            "Trends Declining Theme",
            insight_ages_days=[16, 17, 18],
        )

        response = await client.get("/api/themes/trends", headers=AUTH_HEADER)
        assert response.status_code == 200
        row = next(
            item for item in response.json()["themes"] if item["id"] == str(theme.id)
        )
        assert row["direction"] == "declining"
        assert row["recent_count"] == 0
        assert row["previous_count"] == 3

    @pytest.mark.asyncio
    async def test_trends_sorted_by_impact_score(self, client, db_session, test_user):
        strong = await _create_theme_with_dated_insights(
            db_session,
            test_user,
            "Trends Strong Theme",
            insight_ages_days=[1, 1, 2, 2, 3],
        )
        weak = await _create_theme_with_dated_insights(
            db_session,
            test_user,
            "Trends Weak Theme",
            insight_ages_days=[80],
        )

        response = await client.get("/api/themes/trends", headers=AUTH_HEADER)
        assert response.status_code == 200
        themes = response.json()["themes"]
        positions = {row["id"]: index for index, row in enumerate(themes)}
        assert positions[str(strong.id)] < positions[str(weak.id)]
        scores = [row["impact_score"] for row in themes]
        assert scores == sorted(scores, reverse=True)
