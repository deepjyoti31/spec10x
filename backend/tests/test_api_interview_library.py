"""
Integration tests for interview library and bulk interview actions.
"""

from __future__ import annotations

from contextlib import contextmanager
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models import (
    FileType,
    Insight,
    InsightCategory,
    Interview,
    InterviewStatus,
    Speaker,
    Theme,
    ThemeStatus,
    TranscriptChunk,
    User,
)
from app.core.auth import get_current_user
from app.main import app
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


async def _create_user(db_session, *, name: str = "Interview Library User") -> User:
    unique = uuid.uuid4().hex[:10]
    user = User(
        firebase_uid=f"interview-user-{unique}",
        email=f"interview-{unique}@spec10x.local",
        name=name,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_other_user(db_session) -> User:
    return await _create_user(db_session, name="Other User")


async def _create_theme(db_session, user: User, *, name: str) -> Theme:
    theme = Theme(
        user_id=user.id,
        name=name,
        mention_count=1,
        sentiment_positive=0.0,
        sentiment_neutral=0.0,
        sentiment_negative=1.0,
        status=ThemeStatus.active,
    )
    db_session.add(theme)
    await db_session.flush()
    return theme


async def _create_interview(
    db_session,
    user: User,
    *,
    filename: str,
    status: InterviewStatus = InterviewStatus.done,
    file_size_bytes: int = 1024,
    created_at: datetime | None = None,
    metadata_json: dict | None = None,
    transcript: str | None = "Transcript text",
) -> Interview:
    created_at = created_at or datetime.now(timezone.utc)
    interview = Interview(
        user_id=user.id,
        filename=filename,
        file_type=FileType.txt,
        file_size_bytes=file_size_bytes,
        storage_path=f"tests/{uuid.uuid4()}/{filename}",
        status=status,
        transcript=transcript,
        metadata_json=metadata_json,
        created_at=created_at,
        updated_at=created_at,
    )
    db_session.add(interview)
    await db_session.flush()
    return interview


async def _create_speaker(
    db_session,
    interview: Interview,
    *,
    speaker_label: str,
    name: str | None = None,
    is_interviewer: bool = False,
) -> Speaker:
    speaker = Speaker(
        interview_id=interview.id,
        speaker_label=speaker_label,
        name=name,
        is_interviewer=is_interviewer,
        auto_detected=True,
    )
    db_session.add(speaker)
    await db_session.flush()
    return speaker


async def _create_insight(
    db_session,
    user: User,
    interview: Interview,
    *,
    title: str,
    quote: str,
    theme: Theme | None = None,
    speaker: Speaker | None = None,
    dismissed: bool = False,
    created_at: datetime | None = None,
) -> Insight:
    created_at = created_at or datetime.now(timezone.utc)
    insight = Insight(
        user_id=user.id,
        interview_id=interview.id,
        theme_id=theme.id if theme else None,
        category=InsightCategory.pain_point,
        title=title,
        quote=quote,
        speaker_id=speaker.id if speaker else None,
        confidence=0.95,
        is_dismissed=dismissed,
        theme_suggestion=theme.name if theme else None,
        sentiment="negative",
        created_at=created_at,
        updated_at=created_at,
    )
    db_session.add(insight)
    await db_session.flush()
    return insight


class TestInterviewLibraryApi:
    @pytest.mark.asyncio
    async def test_library_returns_empty_state(self, client, db_session):
        user = await _create_user(db_session, name="Empty Library User")
        with _auth_as(user):
            response = await client.get("/api/interviews/library", headers=AUTH_HEADER)
        assert response.status_code == 200
        payload = response.json()
        assert payload["summary"]["total_count"] == 0
        assert payload["summary"]["filtered_count"] == 0
        assert payload["summary"]["has_data"] is False
        assert payload["summary"]["available_sources"] == []
        assert payload["items"] == []

    @pytest.mark.asyncio
    async def test_library_search_sort_status_and_theme_chip_aggregation(
        self,
        client,
        db_session,
    ):
        user = await _create_user(db_session, name="Search Library User")
        now = datetime.now(timezone.utc)
        alpha = await _create_interview(
            db_session,
            user,
            filename="Alpha Interview.txt",
            file_size_bytes=1200,
            created_at=now - timedelta(days=1),
        )
        beta = await _create_interview(
            db_session,
            user,
            filename="Beta Notes.txt",
            file_size_bytes=800,
            created_at=now - timedelta(days=2),
        )
        gamma = await _create_interview(
            db_session,
            user,
            filename="Gamma Processing.txt",
            status=InterviewStatus.analyzing,
            file_size_bytes=900,
            created_at=now - timedelta(hours=6),
            transcript=None,
        )
        delta = await _create_interview(
            db_session,
            user,
            filename="Delta Error.txt",
            status=InterviewStatus.error,
            created_at=now - timedelta(hours=3),
            transcript=None,
        )

        customer = await _create_speaker(
            db_session,
            alpha,
            speaker_label="Speaker 1",
            name="Sarah Stripe",
        )
        await _create_speaker(
            db_session,
            alpha,
            speaker_label="Interviewer",
            name="Deep",
            is_interviewer=True,
        )
        onboarding = await _create_theme(db_session, user, name="Onboarding")
        pricing = await _create_theme(db_session, user, name="Pricing")
        await _create_insight(
            db_session,
            user,
            alpha,
            title="Activation friction",
            quote="Activation is too slow for enterprise onboarding.",
            theme=onboarding,
            speaker=customer,
        )
        await _create_insight(
            db_session,
            user,
            alpha,
            title="Pricing confusion",
            quote="Pricing feels unclear during onboarding.",
            theme=pricing,
            speaker=customer,
        )
        await db_session.commit()

        with _auth_as(user):
            response = await client.get("/api/interviews/library?sort=insights", headers=AUTH_HEADER)
        assert response.status_code == 200
        payload = response.json()

        assert payload["summary"]["total_count"] == 4
        assert payload["summary"]["filtered_count"] == 4
        assert payload["summary"]["storage_bytes_used"] == 1200 + 800 + 900 + 1024
        assert payload["summary"]["storage_bytes_limit"] == 100 * 1024 * 1024
        assert payload["summary"]["plan"] == "free"
        assert payload["items"][0]["id"] == str(alpha.id)
        assert payload["items"][0]["participant_summary"] == "Sarah Stripe"
        assert payload["items"][0]["insights_count"] == 2
        assert payload["items"][0]["themes_count"] == 2
        assert payload["items"][0]["theme_chips"] == [
            {"id": str(onboarding.id), "name": "Onboarding"},
            {"id": str(pricing.id), "name": "Pricing"},
        ]
        assert any(
            item["id"] == str(beta.id) and item["display_status"] == "low_insight"
            for item in payload["items"]
        )
        assert any(item["id"] == str(gamma.id) and item["display_status"] == "processing" for item in payload["items"])
        assert any(item["id"] == str(delta.id) and item["display_status"] == "error" for item in payload["items"])

        with _auth_as(user):
            search_response = await client.get(
                "/api/interviews/library?q=activation",
                headers=AUTH_HEADER,
            )
        assert search_response.status_code == 200
        search_payload = search_response.json()
        assert search_payload["summary"]["filtered_count"] == 1
        assert search_payload["items"][0]["id"] == str(alpha.id)

        with _auth_as(user):
            low_insight_response = await client.get(
                "/api/interviews/library?status=low_insight",
                headers=AUTH_HEADER,
            )
        assert low_insight_response.status_code == 200
        low_insight_payload = low_insight_response.json()
        assert low_insight_payload["summary"]["filtered_count"] == 1
        assert low_insight_payload["items"][0]["id"] == str(beta.id)

    @pytest.mark.asyncio
    async def test_library_supports_source_filter_and_available_sources(
        self,
        client,
        db_session,
    ):
        user = await _create_user(db_session, name="Source Filter User")
        await _create_interview(
            db_session,
            user,
            filename="Manual Interview.txt",
        )
        fireflies = await _create_interview(
            db_session,
            user,
            filename="Synced Interview.txt",
            metadata_json={
                "source_provider": "fireflies",
                "source_label": "Fireflies",
            },
        )
        await db_session.commit()

        with _auth_as(user):
            response = await client.get(
                "/api/interviews/library?source=fireflies",
                headers=AUTH_HEADER,
            )
        assert response.status_code == 200
        payload = response.json()
        assert payload["summary"]["filtered_count"] == 1
        assert payload["items"][0]["id"] == str(fireflies.id)
        assert payload["items"][0]["source_provider"] == "fireflies"
        assert payload["items"][0]["source_label"] == "Fireflies"
        assert payload["summary"]["available_sources"] == [
            {"provider": "native_upload", "label": "Interview Upload", "count": 1},
            {"provider": "fireflies", "label": "Fireflies", "count": 1},
        ]


class TestInterviewBulkActionsApi:
    @pytest.mark.asyncio
    async def test_bulk_reanalyze_returns_partial_success(
        self,
        client,
        db_session,
    ):
        user = await _create_user(db_session, name="Bulk Reanalyze User")
        theme = await _create_theme(db_session, user, name="Search")
        done_interview = await _create_interview(
            db_session,
            user,
            filename="Done Interview.txt",
        )
        done_speaker = await _create_speaker(
            db_session,
            done_interview,
            speaker_label="Speaker 1",
            name="Customer",
        )
        insight = await _create_insight(
            db_session,
            user,
            done_interview,
            title="Search pain",
            quote="Search is hard to use.",
            theme=theme,
            speaker=done_speaker,
        )
        db_session.add(
            TranscriptChunk(
                interview_id=done_interview.id,
                chunk_index=0,
                content="Search is hard to use.",
            )
        )

        processing_interview = await _create_interview(
            db_session,
            user,
            filename="Still Processing.txt",
            status=InterviewStatus.analyzing,
            transcript=None,
        )
        other_user = await _create_other_user(db_session)
        other_interview = await _create_interview(
            db_session,
            other_user,
            filename="Other User.txt",
        )
        await db_session.commit()

        with _auth_as(user):
            response = await client.post(
                "/api/interviews/bulk-reanalyze",
                json={
                    "interview_ids": [
                        str(done_interview.id),
                        str(processing_interview.id),
                        str(other_interview.id),
                    ]
                },
                headers=AUTH_HEADER,
            )
        assert response.status_code == 200
        payload = response.json()
        assert payload["requested_count"] == 3
        assert payload["success_count"] == 1
        assert payload["failed_count"] == 2
        assert payload["succeeded_ids"] == [str(done_interview.id)]
        assert payload["failures"] == [
            {
                "interview_id": str(processing_interview.id),
                "error": "Interview is still processing",
            },
            {
                "interview_id": str(other_interview.id),
                "error": "Interview not found",
            },
        ]

        await db_session.refresh(done_interview)
        assert done_interview.status == InterviewStatus.queued
        assert done_interview.transcript is None

        insight_result = await db_session.execute(
            select(Insight).where(Insight.interview_id == done_interview.id)
        )
        assert insight_result.scalars().all() == []

        chunk_result = await db_session.execute(
            select(TranscriptChunk).where(TranscriptChunk.interview_id == done_interview.id)
        )
        assert chunk_result.scalars().all() == []

        speaker_result = await db_session.execute(
            select(Speaker).where(Speaker.interview_id == done_interview.id)
        )
        assert speaker_result.scalars().all() == []

        # Sanity-check that the removed insight belonged to the interview we mutated.
        assert insight.interview_id == done_interview.id

    @pytest.mark.asyncio
    async def test_bulk_delete_returns_partial_success(
        self,
        client,
        db_session,
    ):
        user = await _create_user(db_session, name="Bulk Delete User")
        own_interview = await _create_interview(
            db_session,
            user,
            filename="Delete Me.txt",
        )
        other_user = await _create_other_user(db_session)
        other_interview = await _create_interview(
            db_session,
            other_user,
            filename="Keep Me.txt",
        )
        await db_session.commit()

        with _auth_as(user):
            response = await client.post(
                "/api/interviews/bulk-delete",
                json={
                    "interview_ids": [str(own_interview.id), str(other_interview.id)]
                },
                headers=AUTH_HEADER,
            )
        assert response.status_code == 200
        payload = response.json()
        assert payload["requested_count"] == 2
        assert payload["success_count"] == 1
        assert payload["failed_count"] == 1
        assert payload["succeeded_ids"] == [str(own_interview.id)]
        assert payload["failures"] == [
            {
                "interview_id": str(other_interview.id),
                "error": "Interview not found",
            }
        ]

        own_result = await db_session.execute(
            select(Interview).where(Interview.id == own_interview.id)
        )
        assert own_result.scalar_one_or_none() is None

        other_result = await db_session.execute(
            select(Interview).where(Interview.id == other_interview.id)
        )
        assert other_result.scalar_one_or_none() is not None
