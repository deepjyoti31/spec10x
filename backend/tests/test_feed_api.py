"""
Integration tests for Sprint 4/5 feed, theme evidence, and impact score APIs.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.connectors.base import NormalizedSignal
from app.models import (
    FileType,
    Insight,
    InsightCategory,
    Interview,
    InterviewStatus,
    Speaker,
    Theme,
    ThemePriorityState,
    ThemeStatus,
)
from app.services.signals import sync_interview_signals_for_interview, upsert_external_signals
from app.services.sources import (
    create_source_connection,
    get_or_create_default_workspace,
    seed_default_data_sources,
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


async def _create_interview_signal(
    db_session,
    test_user,
    theme: Theme,
    *,
    title: str,
    quote: str,
    created_at: datetime,
    sentiment: str = "negative",
) -> None:
    interview = Interview(
        user_id=test_user.id,
        filename=f"{title.replace(' ', '_')}.txt",
        file_type=FileType.txt,
        file_size_bytes=len(quote),
        storage_path=f"tests/{uuid.uuid4()}.txt",
        status=InterviewStatus.done,
        transcript=quote,
    )
    db_session.add(interview)
    await db_session.flush()

    speaker = Speaker(
        interview_id=interview.id,
        speaker_label="Speaker 1",
        name="Customer",
        auto_detected=True,
    )
    db_session.add(speaker)
    await db_session.flush()

    insight = Insight(
        user_id=test_user.id,
        interview_id=interview.id,
        theme_id=theme.id,
        category=(
            InsightCategory.pain_point
            if sentiment == "negative"
            else InsightCategory.positive
            if sentiment == "positive"
            else InsightCategory.suggestion
        ),
        title=title,
        quote=quote,
        speaker_id=speaker.id,
        confidence=0.95,
        theme_suggestion=theme.name,
        sentiment=sentiment,
        created_at=created_at,
    )
    db_session.add(insight)
    await db_session.flush()
    await sync_interview_signals_for_interview(db_session, interview_id=interview.id)


async def _create_external_signal(
    db_session,
    test_user,
    *,
    provider: str,
    title: str,
    content_text: str,
    occurred_at: datetime,
    sentiment: str | None,
    source_url: str | None,
    metadata_json: dict | None = None,
) -> None:
    workspace = await get_or_create_default_workspace(db_session, test_user)
    await seed_default_data_sources(db_session)
    from app.models import DataSource, SourceType

    data_source = (
        await db_session.execute(
            select(DataSource).where(
                DataSource.provider == provider,
                DataSource.source_type == (
                    SourceType.support if provider == "zendesk" else SourceType.survey
                ),
            )
        )
    ).scalar_one()

    connection = await create_source_connection(
        db_session,
        workspace=workspace,
        created_by_user=test_user,
        data_source=data_source,
        secret_ref=None,
        config_json={"test_connection": True},
    )
    await upsert_external_signals(
        db_session,
        connection=connection,
        data_source=data_source,
        signals=[
            NormalizedSignal(
                external_id=str(uuid.uuid4()),
                source_record_type="ticket" if provider == "zendesk" else "survey_response",
                signal_kind="ticket" if provider == "zendesk" else "survey_response",
                occurred_at=occurred_at,
                title=title,
                content_text=content_text,
                sentiment=sentiment,
                source_url=source_url,
                metadata_json=metadata_json,
            )
        ],
    )


class TestFeedApi:
    @pytest.mark.asyncio
    async def test_lists_mixed_source_rows_in_desc_order_and_filters(
        self,
        client,
        db_session,
        test_user,
    ):
        base_time = datetime.now(timezone.utc)
        theme_name = f"Onboarding {uuid.uuid4().hex[:8]}"
        theme = await _create_theme(
            db_session,
            test_user,
            theme_name,
        )
        await _create_interview_signal(
            db_session,
            test_user,
            theme,
            title="Feed Native Signal",
            quote=f"Native pain point about {theme_name}",
            created_at=base_time - timedelta(days=3),
        )
        await _create_external_signal(
            db_session,
            test_user,
            provider="zendesk",
            title="Feed Zendesk Signal",
            content_text=f"{theme_name} setup takes too long",
            occurred_at=base_time - timedelta(days=2),
            sentiment="negative",
            source_url="https://acme.zendesk.com/agent/tickets/123",
            metadata_json={"tags": [theme_name]},
        )
        await _create_external_signal(
            db_session,
            test_user,
            provider="csv_import",
            title="Feed Survey Signal",
            content_text=f"Survey response about {theme_name} friction",
            occurred_at=base_time - timedelta(days=1),
            sentiment="negative",
            source_url=None,
            metadata_json={
                "question": f"How was {theme_name}?",
                "tags": [theme_name, "setup"],
            },
        )
        await db_session.commit()

        response = await client.get("/api/feed", headers=AUTH_HEADER)
        assert response.status_code == 200
        rows = response.json()
        titles = [row["title"] for row in rows]
        assert titles.index("Feed Survey Signal") < titles.index("Feed Zendesk Signal")
        assert titles.index("Feed Zendesk Signal") < titles.index("Feed Native Signal")

        support_response = await client.get(
            "/api/feed?source=support&sentiment=negative",
            headers=AUTH_HEADER,
        )
        assert support_response.status_code == 200
        support_rows = support_response.json()
        assert len(support_rows) >= 1
        assert all(row["source_type"] == "support" for row in support_rows)
        assert any(row["title"] == "Feed Zendesk Signal" for row in support_rows)

        date_from = (base_time - timedelta(days=1)).date().isoformat()
        date_to = base_time.date().isoformat()
        recent_response = await client.get(
            f"/api/feed?date_from={date_from}&date_to={date_to}",
            headers=AUTH_HEADER,
        )
        assert recent_response.status_code == 200
        recent_titles = {row["title"] for row in recent_response.json()}
        assert "Feed Survey Signal" in recent_titles
        assert "Feed Native Signal" not in recent_titles

    @pytest.mark.asyncio
    async def test_theme_detail_includes_source_breakdown_and_linkbacks(
        self,
        client,
        db_session,
        test_user,
    ):
        theme_name = f"Onboarding {uuid.uuid4().hex[:8]}"
        theme = await _create_theme(
            db_session,
            test_user,
            theme_name,
        )
        base_time = datetime.now(timezone.utc)
        await _create_interview_signal(
            db_session,
            test_user,
            theme,
            title="Detail Native Signal",
            quote=f"Interview quote about {theme_name}",
            created_at=base_time - timedelta(days=4),
        )
        await _create_external_signal(
            db_session,
            test_user,
            provider="zendesk",
            title="Detail Support Signal",
            content_text=f"Zendesk ticket about {theme_name}",
            occurred_at=base_time - timedelta(days=2),
            sentiment="negative",
            source_url="https://acme.zendesk.com/agent/tickets/456",
            metadata_json={"tags": [theme_name]},
        )
        await _create_external_signal(
            db_session,
            test_user,
            provider="csv_import",
            title="Detail Survey Signal",
            content_text=f"Survey response about {theme_name}",
            occurred_at=base_time - timedelta(days=1),
            sentiment="negative",
            source_url=None,
            metadata_json={"question": f"Rate {theme_name}", "tags": [theme_name]},
        )
        await db_session.commit()

        response = await client.get(f"/api/themes/{theme.id}", headers=AUTH_HEADER)
        assert response.status_code == 200
        payload = response.json()
        breakdown = {row["source_type"]: row["count"] for row in payload["source_breakdown"]}
        assert breakdown["interview"] >= 1
        assert breakdown["support"] >= 1
        assert breakdown["survey"] >= 1
        assert payload["impact_breakdown"]["total"] == payload["impact_score"]
        assert payload["impact_breakdown"]["frequency"] >= 0
        assert payload["impact_breakdown"]["source_diversity"] > 0

        groups = {group["source_type"]: group for group in payload["supporting_evidence"]}
        interview_item = groups["interview"]["items"][0]
        support_item = groups["support"]["items"][0]
        survey_item = groups["survey"]["items"][0]

        assert interview_item["link"]["href"].startswith("/interview/")
        assert support_item["link"]["href"].startswith("https://acme.zendesk.com/")
        assert survey_item["link"]["href"].startswith("/feed?signal=")


class TestImpactScoreApi:
    @pytest.mark.asyncio
    async def test_sort_urgency_uses_impact_score_v1(
        self,
        client,
        db_session,
        test_user,
    ):
        high_theme_name = f"Onboarding {uuid.uuid4().hex[:8]}"
        low_theme_name = f"Billing {uuid.uuid4().hex[:8]}"
        high_theme = await _create_theme(
            db_session,
            test_user,
            high_theme_name,
            mention_count=2,
        )
        low_theme = await _create_theme(
            db_session,
            test_user,
            low_theme_name,
            mention_count=7,
        )

        now = datetime.now(timezone.utc)
        await _create_interview_signal(
            db_session,
            test_user,
            high_theme,
            title="High Impact Interview",
            quote=f"Recent painful issue in {high_theme_name}",
            created_at=now - timedelta(days=1),
        )
        await _create_external_signal(
            db_session,
            test_user,
            provider="zendesk",
            title="High Impact Support",
            content_text=f"{high_theme_name} failed for multiple customers",
            occurred_at=now - timedelta(days=1),
            sentiment="negative",
            source_url="https://acme.zendesk.com/agent/tickets/777",
            metadata_json={"tags": [high_theme_name]},
        )

        for idx in range(7):
            await _create_interview_signal(
                db_session,
                test_user,
                low_theme,
                title=f"Low Impact Interview {idx}",
                quote=f"Older neutral evidence about {low_theme_name}",
                created_at=now - timedelta(days=120 + idx),
                sentiment="neutral",
            )

        await db_session.commit()

        response = await client.get("/api/themes?sort=urgency", headers=AUTH_HEADER)
        assert response.status_code == 200
        rows = response.json()
        names = [row["name"] for row in rows]

        assert names.index(high_theme.name) < names.index(low_theme.name)

        high_row = next(row for row in rows if row["name"] == high_theme.name)
        low_row = next(row for row in rows if row["name"] == low_theme.name)
        assert high_row["impact_score"] == 63.0
        assert low_row["impact_score"] == 36.0

    @pytest.mark.asyncio
    async def test_priority_board_returns_ranked_cards_and_preview(
        self,
        client,
        db_session,
        test_user,
    ):
        pinned_theme = await _create_theme(
            db_session,
            test_user,
            f"Pinned {uuid.uuid4().hex[:8]}",
            mention_count=3,
        )
        ranked_theme = await _create_theme(
            db_session,
            test_user,
            f"Ranked {uuid.uuid4().hex[:8]}",
            mention_count=2,
        )
        monitored_theme = await _create_theme(
            db_session,
            test_user,
            f"Monitoring {uuid.uuid4().hex[:8]}",
            mention_count=1,
        )
        pinned_theme.priority_state = ThemePriorityState.pinned
        monitored_theme.priority_state = ThemePriorityState.monitoring

        now = datetime.now(timezone.utc)
        await _create_interview_signal(
            db_session,
            test_user,
            pinned_theme,
            title="Pinned Interview",
            quote=f"Evidence for {pinned_theme.name}",
            created_at=now - timedelta(days=1),
        )
        await _create_external_signal(
            db_session,
            test_user,
            provider="zendesk",
            title="Pinned Ticket",
            content_text=f"Support evidence for {pinned_theme.name}",
            occurred_at=now - timedelta(hours=12),
            sentiment="negative",
            source_url="https://acme.zendesk.com/agent/tickets/800",
            metadata_json={"tags": [pinned_theme.name]},
        )
        await _create_interview_signal(
            db_session,
            test_user,
            ranked_theme,
            title="Ranked Interview",
            quote=f"Evidence for {ranked_theme.name}",
            created_at=now - timedelta(days=2),
        )
        await _create_interview_signal(
            db_session,
            test_user,
            monitored_theme,
            title="Monitoring Interview",
            quote=f"Evidence for {monitored_theme.name}",
            created_at=now - timedelta(days=4),
            sentiment="neutral",
        )
        await db_session.commit()

        response = await client.get("/api/themes/board", headers=AUTH_HEADER)
        assert response.status_code == 200
        rows = response.json()
        assert len(rows) >= 3

        pinned_row = next(row for row in rows if row["id"] == str(pinned_theme.id))
        ranked_row = next(row for row in rows if row["id"] == str(ranked_theme.id))
        monitored_row = next(row for row in rows if row["id"] == str(monitored_theme.id))

        assert pinned_row["priority_state"] == "pinned"
        assert monitored_row["priority_state"] == "monitoring"
        assert ranked_row["priority_state"] == "default"
        assert pinned_row["impact_breakdown"]["total"] == pinned_row["impact_score"]
        assert len(pinned_row["evidence_preview"]) == 2
        assert any(item["source_type"] == "support" for item in pinned_row["evidence_preview"])

    @pytest.mark.asyncio
    async def test_patch_theme_updates_priority_state_without_rename(
        self,
        client,
        db_session,
        test_user,
    ):
        theme = await _create_theme(
            db_session,
            test_user,
            f"Priority {uuid.uuid4().hex[:8]}",
        )
        await db_session.commit()

        response = await client.patch(
            f"/api/themes/{theme.id}",
            json={"priority_state": "monitoring"},
            headers=AUTH_HEADER,
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["name"] == theme.name
        assert payload["priority_state"] == "monitoring"
