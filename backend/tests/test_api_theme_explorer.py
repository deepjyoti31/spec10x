"""
Integration tests for the Insights theme explorer endpoint.
"""

from __future__ import annotations

import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.connectors.base import NormalizedSignal
from app.core.auth import get_current_user
from app.main import app
from app.models import (
    DataSource,
    FileType,
    Insight,
    InsightCategory,
    Interview,
    InterviewStatus,
    SourceType,
    Speaker,
    Theme,
    ThemeStatus,
    User,
)
from app.services.signals import sync_interview_signals_for_interview, upsert_external_signals
from app.services.sources import (
    create_source_connection,
    get_or_create_default_workspace,
    seed_default_data_sources,
)
from tests.conftest import AUTH_HEADER


@contextmanager
def _auth_as(user: User):
    original_override = app.dependency_overrides.get(get_current_user)

    async def _override_user():
        return user

    app.dependency_overrides[get_current_user] = _override_user
    try:
        yield
    finally:
        if original_override is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = original_override


async def _create_user(db_session, *, name: str = "Explorer User") -> User:
    unique = uuid.uuid4().hex[:10]
    user = User(
        firebase_uid=f"explorer-{unique}",
        email=f"explorer-{unique}@spec10x.local",
        name=name,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_theme(
    db_session,
    user: User,
    *,
    name: str,
    status: ThemeStatus = ThemeStatus.active,
    mention_count: int = 1,
    is_new: bool = False,
    sentiment_positive: float = 0.0,
    sentiment_neutral: float = 0.0,
    sentiment_negative: float = 1.0,
    created_at: datetime | None = None,
) -> Theme:
    theme = Theme(
        user_id=user.id,
        name=name,
        mention_count=mention_count,
        sentiment_positive=sentiment_positive,
        sentiment_neutral=sentiment_neutral,
        sentiment_negative=sentiment_negative,
        status=status,
        is_new=is_new,
        created_at=created_at,
        updated_at=created_at,
        last_new_activity=created_at if is_new else None,
    )
    db_session.add(theme)
    await db_session.flush()
    return theme


async def _create_interview_signal(
    db_session,
    user: User,
    theme: Theme,
    *,
    title: str,
    quote: str,
    created_at: datetime,
    sentiment: str = "negative",
    speaker_name: str = "Customer",
) -> None:
    interview = Interview(
        user_id=user.id,
        filename=f"{title.replace(' ', '_')}.txt",
        file_type=FileType.txt,
        file_size_bytes=len(quote),
        storage_path=f"tests/{uuid.uuid4()}.txt",
        status=InterviewStatus.done,
        transcript=quote,
        created_at=created_at,
        updated_at=created_at,
    )
    db_session.add(interview)
    await db_session.flush()

    speaker = Speaker(
        interview_id=interview.id,
        speaker_label="Speaker 1",
        name=speaker_name,
        auto_detected=True,
    )
    db_session.add(speaker)
    await db_session.flush()

    insight = Insight(
        user_id=user.id,
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
        updated_at=created_at,
    )
    db_session.add(insight)
    await db_session.flush()
    await sync_interview_signals_for_interview(db_session, interview_id=interview.id)


async def _create_external_signal(
    db_session,
    user: User,
    *,
    provider: str,
    title: str,
    content_text: str,
    occurred_at: datetime,
    sentiment: str | None,
    author_or_speaker: str | None = None,
    metadata_json: dict | None = None,
) -> None:
    workspace = await get_or_create_default_workspace(db_session, user)
    await seed_default_data_sources(db_session)

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
        created_by_user=user,
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
                author_or_speaker=author_or_speaker,
                sentiment=sentiment,
                source_url=None,
                metadata_json=metadata_json,
            )
        ],
    )


async def _seed_explorer_workspace(db_session, user: User) -> dict[str, object]:
    now = datetime.now(timezone.utc)
    alpha = await _create_theme(
        db_session,
        user,
        name=f"Onboarding {uuid.uuid4().hex[:6]}",
        mention_count=8,
        is_new=True,
        created_at=now - timedelta(hours=6),
        sentiment_positive=0.1,
        sentiment_neutral=0.2,
        sentiment_negative=0.7,
    )
    beta = await _create_theme(
        db_session,
        user,
        name=f"Delight {uuid.uuid4().hex[:6]}",
        mention_count=4,
        created_at=now - timedelta(days=3),
        sentiment_positive=0.8,
        sentiment_neutral=0.1,
        sentiment_negative=0.1,
    )
    gamma = await _create_theme(
        db_session,
        user,
        name=f"Legacy {uuid.uuid4().hex[:6]}",
        status=ThemeStatus.previous,
        mention_count=2,
        created_at=now - timedelta(days=10),
        sentiment_positive=0.2,
        sentiment_neutral=0.7,
        sentiment_negative=0.1,
    )

    await _create_interview_signal(
        db_session,
        user,
        alpha,
        title="Wizard confusion",
        quote="The setup wizard is too technical for new users.",
        created_at=now - timedelta(hours=20),
        sentiment="negative",
        speaker_name="Jordan",
    )
    await _create_external_signal(
        db_session,
        user,
        provider="zendesk",
        title="Enterprise onboarding ticket",
        content_text=f"{alpha.name} keeps blocking enterprise trial setup.",
        occurred_at=now - timedelta(hours=3),
        sentiment="negative",
        author_or_speaker="Support Ops",
        metadata_json={"tags": [alpha.name]},
    )
    await _create_interview_signal(
        db_session,
        user,
        beta,
        title="Delight quote",
        quote="The new dashboard finally makes the reporting flow feel obvious.",
        created_at=now - timedelta(days=4),
        sentiment="positive",
        speaker_name="Alicia",
    )
    await _create_interview_signal(
        db_session,
        user,
        gamma,
        title="Legacy concern",
        quote="The old export flow still breaks when the report has too many charts.",
        created_at=now - timedelta(days=8),
        sentiment="neutral",
        speaker_name="Morgan",
    )
    await db_session.commit()

    return {
        "now": now,
        "alpha": alpha,
        "beta": beta,
        "gamma": gamma,
    }


class TestThemeExplorerApi:
    @pytest.mark.asyncio
    async def test_no_data_workspace_returns_no_data_state(self, client, db_session):
        user = await _create_user(db_session, name="Empty Explorer User")

        with _auth_as(user):
            response = await client.get("/api/themes/explorer", headers=AUTH_HEADER)

        assert response.status_code == 200
        payload = response.json()
        assert payload["summary"] == {
            "interviews_count": 0,
            "signals_count": 0,
            "active_themes_count": 0,
        }
        assert payload["default_selected_theme_id"] is None
        assert payload["active_themes"] == []
        assert payload["previous_themes"] == []
        assert payload["empty_reason"] == "no_data"

    @pytest.mark.asyncio
    async def test_explorer_groups_active_previous_and_card_preview_data(
        self,
        client,
        db_session,
    ):
        user = await _create_user(db_session, name="Explorer Data User")
        seeded = await _seed_explorer_workspace(db_session, user)
        alpha = seeded["alpha"]
        gamma = seeded["gamma"]

        with _auth_as(user):
            response = await client.get("/api/themes/explorer?sort=urgency", headers=AUTH_HEADER)

        assert response.status_code == 200
        payload = response.json()
        assert payload["summary"] == {
            "interviews_count": 3,
            "signals_count": 4,
            "active_themes_count": 2,
        }
        assert payload["default_selected_theme_id"] == str(alpha.id)
        assert [theme["name"] for theme in payload["active_themes"]] == [
            alpha.name,
            seeded["beta"].name,
        ]
        assert [theme["name"] for theme in payload["previous_themes"]] == [gamma.name]

        alpha_card = payload["active_themes"][0]
        assert alpha_card["impact_score"] > payload["active_themes"][1]["impact_score"]
        assert alpha_card["source_chips"] == [
            {"source_type": "interview", "label": "Interview", "count": 1},
            {"source_type": "support", "label": "Support", "count": 1},
        ]
        assert len(alpha_card["quote_previews"]) == 2
        assert alpha_card["quote_previews"][0]["source_label"] == "Support"
        assert "enterprise trial setup" in alpha_card["quote_previews"][0]["excerpt"]
        assert alpha_card["quote_previews"][1]["author_or_speaker"] == "Jordan"
        assert payload["empty_reason"] is None

    @pytest.mark.asyncio
    async def test_explorer_filters_by_source_sentiment_date_and_no_matches(
        self,
        client,
        db_session,
    ):
        user = await _create_user(db_session, name="Explorer Filter User")
        seeded = await _seed_explorer_workspace(db_session, user)
        now = seeded["now"]
        alpha = seeded["alpha"]
        beta = seeded["beta"]

        with _auth_as(user):
            support_response = await client.get(
                "/api/themes/explorer?source=support",
                headers=AUTH_HEADER,
            )
            positive_response = await client.get(
                "/api/themes/explorer?sentiment=positive",
                headers=AUTH_HEADER,
            )
            recent_response = await client.get(
                f"/api/themes/explorer?date_from={(now - timedelta(days=1)).date().isoformat()}&date_to={now.date().isoformat()}",
                headers=AUTH_HEADER,
            )
            no_match_response = await client.get(
                "/api/themes/explorer?source=survey",
                headers=AUTH_HEADER,
            )

        assert support_response.status_code == 200
        support_payload = support_response.json()
        assert [theme["name"] for theme in support_payload["active_themes"]] == [alpha.name]
        assert support_payload["previous_themes"] == []
        assert support_payload["summary"]["signals_count"] == 1

        assert positive_response.status_code == 200
        positive_payload = positive_response.json()
        assert [theme["name"] for theme in positive_payload["active_themes"]] == [beta.name]
        assert positive_payload["previous_themes"] == []

        assert recent_response.status_code == 200
        recent_payload = recent_response.json()
        assert [theme["name"] for theme in recent_payload["active_themes"]] == [alpha.name]
        assert recent_payload["previous_themes"] == []

        assert no_match_response.status_code == 200
        no_match_payload = no_match_response.json()
        assert no_match_payload["active_themes"] == []
        assert no_match_payload["previous_themes"] == []
        assert no_match_payload["default_selected_theme_id"] is None
        assert no_match_payload["empty_reason"] == "no_matches"

    @pytest.mark.asyncio
    async def test_default_selected_theme_id_preserves_requested_theme_then_falls_back(
        self,
        client,
        db_session,
    ):
        user = await _create_user(db_session, name="Explorer Selection User")
        seeded = await _seed_explorer_workspace(db_session, user)
        alpha = seeded["alpha"]
        gamma = seeded["gamma"]

        with _auth_as(user):
            keep_selection_response = await client.get(
                f"/api/themes/explorer?selected_theme_id={gamma.id}",
                headers=AUTH_HEADER,
            )
            fallback_response = await client.get(
                f"/api/themes/explorer?source=support&selected_theme_id={gamma.id}",
                headers=AUTH_HEADER,
            )

        assert keep_selection_response.status_code == 200
        assert keep_selection_response.json()["default_selected_theme_id"] == str(gamma.id)

        assert fallback_response.status_code == 200
        assert fallback_response.json()["default_selected_theme_id"] == str(alpha.id)
