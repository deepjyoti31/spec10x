"""
Integration tests for the home dashboard summary endpoint.
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
    FileType,
    Insight,
    InsightCategory,
    Interview,
    InterviewStatus,
    SourceConnectionStatus,
    SyncRun,
    SyncRunStatus,
    SyncRunType,
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


async def _create_user(db_session, *, name: str = "Dashboard User") -> User:
    unique = uuid.uuid4().hex[:10]
    user = User(
        firebase_uid=f"dashboard-{unique}",
        email=f"dashboard-{unique}@spec10x.local",
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
    mention_count: int = 1,
    is_new: bool = False,
    created_at: datetime | None = None,
) -> Theme:
    theme = Theme(
        user_id=user.id,
        name=name,
        mention_count=mention_count,
        sentiment_positive=0.0,
        sentiment_neutral=0.0,
        sentiment_negative=1.0,
        status=ThemeStatus.active,
        is_new=is_new,
        created_at=created_at,
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
) -> Interview:
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
        confidence=0.95,
        theme_suggestion=theme.name,
        sentiment=sentiment,
        created_at=created_at,
        updated_at=created_at,
    )
    db_session.add(insight)
    await db_session.flush()
    await sync_interview_signals_for_interview(db_session, interview_id=interview.id)
    return interview


async def _create_interview_event(
    db_session,
    user: User,
    *,
    filename: str,
    status: InterviewStatus,
    updated_at: datetime,
) -> Interview:
    interview = Interview(
        user_id=user.id,
        filename=filename,
        file_type=FileType.txt,
        file_size_bytes=128,
        storage_path=f"tests/{uuid.uuid4()}.txt",
        status=status,
        created_at=updated_at,
        updated_at=updated_at,
    )
    db_session.add(interview)
    await db_session.flush()
    return interview


async def _create_external_signal(
    db_session,
    user: User,
    *,
    provider: str,
    title: str,
    content_text: str,
    occurred_at: datetime,
    sentiment: str | None,
    metadata_json: dict | None = None,
) -> None:
    workspace = await get_or_create_default_workspace(db_session, user)
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
        created_by_user=user,
        data_source=data_source,
        secret_ref=None,
        config_json={"test_connection": True},
    )
    connection.status = SourceConnectionStatus.connected
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
                source_url=None,
                metadata_json=metadata_json,
            )
        ],
    )


async def _create_sync_run(
    db_session,
    user: User,
    *,
    provider: str = "zendesk",
    finished_at: datetime,
    status: SyncRunStatus = SyncRunStatus.succeeded,
) -> SyncRun:
    workspace = await get_or_create_default_workspace(db_session, user)
    await seed_default_data_sources(db_session)
    from app.models import DataSource, SourceType

    data_source = (
        await db_session.execute(
            select(DataSource).where(
                DataSource.provider == provider,
                DataSource.source_type == SourceType.support,
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
    connection.status = SourceConnectionStatus.connected
    sync_run = SyncRun(
        source_connection_id=connection.id,
        run_type=SyncRunType.incremental,
        status=status,
        started_at=finished_at - timedelta(minutes=5),
        finished_at=finished_at,
        records_seen=10,
        records_created=3,
        records_updated=1,
        records_unchanged=6,
        error_summary="Connector timed out" if status == SyncRunStatus.failed else None,
    )
    db_session.add(sync_run)
    await db_session.flush()
    return sync_run


class TestHomeDashboardApi:
    @pytest.mark.asyncio
    async def test_empty_user_returns_zero_state(self, client, db_session):
        user = await _create_user(db_session, name="Empty User")

        with _auth_as(user):
            response = await client.get("/api/dashboard/home", headers=AUTH_HEADER)

        assert response.status_code == 200
        payload = response.json()
        assert payload["has_data"] is False
        assert payload["stats"] == {
            "interviews_total": 0,
            "interviews_this_week": 0,
            "active_themes_total": 0,
            "new_themes_this_week": 0,
            "signals_total": 0,
            "active_source_type_count": 0,
            "average_impact_score": 0.0,
            "average_impact_delta": None,
        }
        assert payload["active_priorities"] == []
        assert payload["recent_activity"] == []
        assert payload["emerging_trends"] == []

    @pytest.mark.asyncio
    async def test_populated_user_returns_counts_priorities_and_ordered_activity(
        self,
        client,
        db_session,
    ):
        user = await _create_user(db_session, name="Populated User")
        now = datetime.now(timezone.utc)

        high_theme = await _create_theme(
            db_session,
            user,
            name=f"Onboarding {uuid.uuid4().hex[:6]}",
            mention_count=4,
            is_new=True,
            created_at=now - timedelta(hours=2),
        )
        low_theme = await _create_theme(
            db_session,
            user,
            name=f"Search {uuid.uuid4().hex[:6]}",
            mention_count=1,
            is_new=False,
            created_at=now - timedelta(days=20),
        )

        await _create_interview_signal(
            db_session,
            user,
            high_theme,
            title="High Current One",
            quote="Current onboarding pain point one",
            created_at=now - timedelta(days=1),
        )
        await _create_interview_signal(
            db_session,
            user,
            high_theme,
            title="High Current Two",
            quote="Current onboarding pain point two",
            created_at=now - timedelta(days=2),
        )
        await _create_external_signal(
            db_session,
            user,
            provider="zendesk",
            title="High Support",
            content_text=f"{high_theme.name} ticket",
            occurred_at=now - timedelta(hours=20),
            sentiment="negative",
            metadata_json={"tags": [high_theme.name]},
        )
        await _create_interview_signal(
            db_session,
            user,
            low_theme,
            title="Low Old Signal",
            quote="Older search feedback",
            created_at=now - timedelta(days=9),
            sentiment="neutral",
        )
        event_interview = await _create_interview_event(
            db_session,
            user,
            filename="Recent_Standalone_Event.txt",
            status=InterviewStatus.done,
            updated_at=now - timedelta(minutes=45),
        )
        sync_run = await _create_sync_run(
            db_session,
            user,
            finished_at=now - timedelta(minutes=30),
        )
        await db_session.commit()

        with _auth_as(user):
            response = await client.get("/api/dashboard/home", headers=AUTH_HEADER)

        assert response.status_code == 200
        payload = response.json()
        assert payload["has_data"] is True
        assert payload["stats"]["interviews_total"] == 4
        assert payload["stats"]["interviews_this_week"] == 3
        assert payload["stats"]["active_themes_total"] == 2
        assert payload["stats"]["new_themes_this_week"] == 1
        assert payload["stats"]["signals_total"] == 4
        assert payload["stats"]["active_source_type_count"] == 2
        assert payload["stats"]["average_impact_score"] > 0

        assert payload["active_priorities"][0]["name"] == high_theme.name
        assert payload["active_priorities"][0]["primary_count_label"] in {
            "2 interviews",
            "1 ticket",
        }
        assert payload["active_priorities"][0]["source_summary_label"] == "Interview + Support"

        recent_titles = [item["title"] for item in payload["recent_activity"][:3]]
        assert recent_titles == [
            "Zendesk sync completed",
            f"{event_interview.filename} analyzed",
            f"New theme: {high_theme.name}",
        ]
        assert payload["recent_activity"][0]["href"] == "/integrations"
        assert payload["recent_activity"][1]["href"] == "/interviews"
        assert payload["recent_activity"][2]["href"] == "/insights"
        assert payload["recent_activity"][0]["occurred_at"] > payload["recent_activity"][1]["occurred_at"]
        assert payload["recent_activity"][1]["occurred_at"] > payload["recent_activity"][2]["occurred_at"]

    @pytest.mark.asyncio
    async def test_sparse_comparisons_return_null_delta_and_velocity(
        self,
        client,
        db_session,
    ):
        user = await _create_user(db_session, name="Sparse User")
        now = datetime.now(timezone.utc)

        sparse_theme = await _create_theme(
            db_session,
            user,
            name=f"Sparse {uuid.uuid4().hex[:6]}",
            is_new=True,
            created_at=now - timedelta(days=1),
        )
        await _create_interview_signal(
            db_session,
            user,
            sparse_theme,
            title="Sparse Current",
            quote="Only one recent signal",
            created_at=now - timedelta(hours=12),
        )
        await db_session.commit()

        with _auth_as(user):
            response = await client.get("/api/dashboard/home", headers=AUTH_HEADER)

        assert response.status_code == 200
        payload = response.json()
        assert payload["stats"]["average_impact_delta"] is None
        assert len(payload["emerging_trends"]) == 1
        assert payload["emerging_trends"][0]["name"] == sparse_theme.name
        assert payload["emerging_trends"][0]["velocity_delta"] is None

    @pytest.mark.asyncio
    async def test_recent_activity_is_capped_and_sorted(self, client, db_session):
        user = await _create_user(db_session, name="Activity User")
        now = datetime.now(timezone.utc)

        for idx, minutes_ago in enumerate([10, 20, 30, 40], start=1):
            await _create_interview_event(
                db_session,
                user,
                filename=f"Interview_{idx}.txt",
                status=InterviewStatus.done,
                updated_at=now - timedelta(minutes=minutes_ago),
            )

        for idx, minutes_ago in enumerate([15, 25, 35], start=1):
            await _create_theme(
                db_session,
                user,
                name=f"Theme {idx} {uuid.uuid4().hex[:4]}",
                is_new=True,
                created_at=now - timedelta(minutes=minutes_ago),
            )

        await _create_sync_run(
            db_session,
            user,
            finished_at=now - timedelta(minutes=5),
            status=SyncRunStatus.succeeded,
        )
        await _create_sync_run(
            db_session,
            user,
            finished_at=now - timedelta(minutes=45),
            status=SyncRunStatus.failed,
        )
        await db_session.commit()

        with _auth_as(user):
            response = await client.get("/api/dashboard/home", headers=AUTH_HEADER)

        assert response.status_code == 200
        payload = response.json()
        recent = payload["recent_activity"]
        assert len(recent) == 6

        occurred_at = [item["occurred_at"] for item in recent]
        assert occurred_at == sorted(occurred_at, reverse=True)
        assert [item["title"] for item in recent] == [
            "Zendesk sync completed",
            "Interview_1.txt analyzed",
            recent[2]["title"],
            "Interview_2.txt analyzed",
            recent[4]["title"],
            "Interview_3.txt analyzed",
        ]
