"""
Integration Tests — Theme Merge (v0.54, US-054-02-04)

Verifies that merging a source theme into a target theme reassigns every
insight and sub-theme rather than dropping evidence, and that the source
theme is retired after the merge.
"""

from __future__ import annotations

import uuid

import pytest

from app.models import (
    FileType,
    Insight,
    InsightCategory,
    Interview,
    InterviewStatus,
    SubTheme,
    Theme,
    ThemeStatus,
)
from tests.conftest import AUTH_HEADER


async def _create_theme(db_session, test_user, name: str, mention_count: int = 1) -> Theme:
    theme = Theme(
        user_id=test_user.id,
        name=name,
        mention_count=mention_count,
        sentiment_positive=0.0,
        sentiment_neutral=0.0,
        sentiment_negative=1.0,
        status=ThemeStatus.active,
        is_new=False,
    )
    db_session.add(theme)
    await db_session.flush()
    return theme


async def _create_interview(db_session, test_user) -> Interview:
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
    return interview


async def _create_insight(db_session, test_user, interview: Interview, theme: Theme, title: str) -> Insight:
    insight = Insight(
        user_id=test_user.id,
        interview_id=interview.id,
        theme_id=theme.id,
        category=InsightCategory.pain_point,
        title=title,
        quote="A representative quote.",
        confidence=0.9,
        theme_suggestion=theme.name,
        sentiment="negative",
    )
    db_session.add(insight)
    await db_session.flush()
    return insight


class TestThemeMerge:
    @pytest.mark.asyncio
    async def test_merge_reassigns_insights_and_sub_themes(self, client, db_session, test_user):
        target = await _create_theme(db_session, test_user, "Slow onboarding", mention_count=2)
        source = await _create_theme(db_session, test_user, "Onboarding is slow", mention_count=3)

        interview = await _create_interview(db_session, test_user)
        target_insight = await _create_insight(db_session, test_user, interview, target, "Target insight")
        source_insight_a = await _create_insight(db_session, test_user, interview, source, "Source insight A")
        source_insight_b = await _create_insight(db_session, test_user, interview, source, "Source insight B")

        sub_theme = SubTheme(theme_id=source.id, name="Trial signup")
        db_session.add(sub_theme)
        await db_session.flush()
        await db_session.commit()

        response = await client.post(
            f"/api/themes/{target.id}/merge",
            headers=AUTH_HEADER,
            json={"source_theme_id": str(source.id)},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["merged_insight_count"] == 2
        assert body["merged_sub_theme_count"] == 1
        assert body["target_theme"]["id"] == str(target.id)
        assert body["target_theme"]["mention_count"] == 5

        # Source theme should no longer exist.
        get_source = await client.get(f"/api/themes/{source.id}", headers=AUTH_HEADER)
        assert get_source.status_code == 404

        # All insights (including the target's original one) now point at the target theme.
        get_target = await client.get(f"/api/themes/{target.id}", headers=AUTH_HEADER)
        assert get_target.status_code == 200
        target_detail = get_target.json()
        insight_ids = {insight["id"] for insight in target_detail["insights"]}
        assert insight_ids == {
            str(target_insight.id),
            str(source_insight_a.id),
            str(source_insight_b.id),
        }
        sub_theme_names = {sub["name"] for sub in target_detail["sub_themes"]}
        assert "Trial signup" in sub_theme_names

    @pytest.mark.asyncio
    async def test_merge_rejects_self_merge(self, client, db_session, test_user):
        theme = await _create_theme(db_session, test_user, "Self merge target")
        await db_session.commit()

        response = await client.post(
            f"/api/themes/{theme.id}/merge",
            headers=AUTH_HEADER,
            json={"source_theme_id": str(theme.id)},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_merge_404_when_source_missing(self, client, db_session, test_user):
        theme = await _create_theme(db_session, test_user, "Merge target only")
        await db_session.commit()

        response = await client.post(
            f"/api/themes/{theme.id}/merge",
            headers=AUTH_HEADER,
            json={"source_theme_id": str(uuid.uuid4())},
        )
        assert response.status_code == 404
