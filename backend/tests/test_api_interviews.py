"""
Integration Tests — Interviews API (Day 1 + Day 2)

All tests are self-contained: they create data via API calls.
Dev-mode mock auth is used (no Firebase needed).
"""

import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy import select

from app.models import (
    FileType,
    Insight,
    InsightCategory,
    Interview,
    InterviewStatus,
    Signal,
    Speaker,
    Theme,
    ThemeStatus,
    TranscriptChunk,
)
from app.services.signals import sync_interview_signals_for_interview
from app.services.sources import get_or_create_default_workspace
from tests.conftest import AUTH_HEADER, create_test_interview


class TestUploadUrl:
    """Test POST /api/interviews/upload-url"""

    @pytest.mark.asyncio
    async def test_returns_upload_url(self, client):
        response = await client.post(
            "/api/interviews/upload-url",
            json={
                "filename": "test.txt",
                "content_type": "text/plain",
                "file_size_bytes": 1024,
            },
            headers=AUTH_HEADER,
        )
        assert response.status_code == 200
        data = response.json()
        assert "upload_url" in data
        assert "storage_path" in data
        assert "test.txt" in data["storage_path"]


class TestCreateInterview:
    """Test POST /api/interviews"""

    @pytest.mark.asyncio
    async def test_creates_interview(self, client):
        data = await create_test_interview(client)
        assert data["filename"] == "test.txt"
        assert data["status"] == "queued"

    @pytest.mark.asyncio
    async def test_rejects_duplicate_hash(self, client):
        unique_hash = f"hash-{uuid.uuid4()}"
        # Create first
        await create_test_interview(client, file_hash=unique_hash)
        # Create second with same hash — should be rejected
        response = await client.post(
            "/api/interviews",
            json={
                "filename": "second.txt",
                "file_type": "txt",
                "file_size_bytes": 600,
                "storage_path": f"test/{uuid.uuid4()}/second.txt",
                "file_hash": unique_hash,
            },
            headers=AUTH_HEADER,
        )
        assert response.status_code == 409


class TestListInterviews:
    """Test GET /api/interviews"""

    @pytest.mark.asyncio
    async def test_lists_user_interviews(self, client):
        await create_test_interview(client, filename="list_test.txt")
        response = await client.get("/api/interviews", headers=AUTH_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1


class TestGetInterview:
    """Test GET /api/interviews/{id}"""

    @pytest.mark.asyncio
    async def test_returns_interview_detail(self, client):
        created = await create_test_interview(client, filename="detail_test.txt")
        response = await client.get(f"/api/interviews/{created['id']}", headers=AUTH_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "detail_test.txt"
        assert "speakers" in data
        assert "insights" in data

    @pytest.mark.asyncio
    async def test_404_for_nonexistent(self, client):
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/interviews/{fake_id}", headers=AUTH_HEADER)
        assert response.status_code == 404


class TestDeleteInterview:
    """Test DELETE /api/interviews/{id}"""

    @pytest.mark.asyncio
    async def test_deletes_interview(self, client):
        created = await create_test_interview(client, filename="delete_test.txt")
        response = await client.delete(f"/api/interviews/{created['id']}", headers=AUTH_HEADER)
        assert response.status_code == 204

        # Verify it's gone
        response = await client.get(f"/api/interviews/{created['id']}", headers=AUTH_HEADER)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_404_for_nonexistent_delete(self, client):
        fake_id = str(uuid.uuid4())
        response = await client.delete(f"/api/interviews/{fake_id}", headers=AUTH_HEADER)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_cleans_up_native_signals(
        self,
        client,
        db_session,
        test_user,
    ):
        theme = Theme(
            user_id=test_user.id,
            name=f"Delete Cleanup Theme {uuid.uuid4()}",
            mention_count=1,
            sentiment_positive=0.0,
            sentiment_neutral=0.0,
            sentiment_negative=1.0,
            status=ThemeStatus.active,
        )
        db_session.add(theme)
        await db_session.flush()

        interview = Interview(
            user_id=test_user.id,
            filename="delete_cleanup.txt",
            file_type=FileType.txt,
            file_size_bytes=42,
            storage_path=f"tests/{uuid.uuid4()}.txt",
            status=InterviewStatus.done,
            transcript="Delete cleanup transcript",
        )
        db_session.add(interview)
        await db_session.flush()

        speaker = Speaker(
            interview_id=interview.id,
            speaker_label="Speaker 1",
            name="Cleanup User",
            auto_detected=True,
        )
        db_session.add(speaker)
        await db_session.flush()

        insight = Insight(
            user_id=test_user.id,
            interview_id=interview.id,
            theme_id=theme.id,
            category=InsightCategory.pain_point,
            title="Delete cleanup insight",
            quote="This should disappear from signals",
            speaker_id=speaker.id,
            confidence=0.9,
            theme_suggestion=theme.name,
            sentiment="negative",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(insight)
        await db_session.flush()
        await sync_interview_signals_for_interview(db_session, interview_id=interview.id)
        await db_session.commit()

        workspace = await get_or_create_default_workspace(db_session, test_user)
        pre_delete_signal = await db_session.execute(
            select(Signal).where(
                Signal.workspace_id == workspace.id,
                Signal.provider == "native_upload",
                Signal.native_entity_id == insight.id,
            )
        )
        assert pre_delete_signal.scalar_one_or_none() is not None

        response = await client.delete(f"/api/interviews/{interview.id}", headers=AUTH_HEADER)
        assert response.status_code == 204

        signal_result = await db_session.execute(
            select(Signal).where(
                Signal.workspace_id == workspace.id,
                Signal.provider == "native_upload",
                Signal.native_entity_id == insight.id,
            )
        )
        assert signal_result.scalar_one_or_none() is None


class TestReanalyzeInterview:
    @pytest.mark.asyncio
    async def test_reanalyze_cleans_existing_interview_artifacts(
        self,
        client,
        db_session,
        test_user,
    ):
        theme = Theme(
            user_id=test_user.id,
            name=f"Reanalyze Theme {uuid.uuid4()}",
            mention_count=1,
            sentiment_positive=0.0,
            sentiment_neutral=0.0,
            sentiment_negative=1.0,
            status=ThemeStatus.active,
        )
        db_session.add(theme)
        await db_session.flush()

        interview = Interview(
            user_id=test_user.id,
            filename="reanalyze_cleanup.txt",
            file_type=FileType.txt,
            file_size_bytes=100,
            storage_path=f"tests/{uuid.uuid4()}.txt",
            status=InterviewStatus.done,
            transcript="Old transcript",
        )
        db_session.add(interview)
        await db_session.flush()

        speaker = Speaker(
            interview_id=interview.id,
            speaker_label="Speaker 1",
            name="Cleanup User",
            auto_detected=True,
        )
        db_session.add(speaker)
        await db_session.flush()

        insight = Insight(
            user_id=test_user.id,
            interview_id=interview.id,
            theme_id=theme.id,
            category=InsightCategory.pain_point,
            title="Old insight",
            quote="Old quote",
            speaker_id=speaker.id,
            confidence=0.9,
            theme_suggestion=theme.name,
            sentiment="negative",
            created_at=datetime.now(timezone.utc),
        )
        db_session.add(insight)
        db_session.add(
            TranscriptChunk(
                interview_id=interview.id,
                chunk_index=0,
                content="Old chunk",
            )
        )
        await db_session.flush()
        await sync_interview_signals_for_interview(db_session, interview_id=interview.id)
        await db_session.commit()

        workspace = await get_or_create_default_workspace(db_session, test_user)

        response = await client.post(
            f"/api/interviews/{interview.id}/reanalyze",
            headers=AUTH_HEADER,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "queued"

        signal_result = await db_session.execute(
            select(Signal).where(
                Signal.workspace_id == workspace.id,
                Signal.provider == "native_upload",
                Signal.native_entity_id == insight.id,
            )
        )
        assert signal_result.scalar_one_or_none() is None

        insight_result = await db_session.execute(
            select(Insight).where(Insight.interview_id == interview.id)
        )
        assert insight_result.scalars().all() == []

        chunk_result = await db_session.execute(
            select(TranscriptChunk).where(TranscriptChunk.interview_id == interview.id)
        )
        assert chunk_result.scalars().all() == []

        speaker_result = await db_session.execute(
            select(Speaker).where(Speaker.interview_id == interview.id)
        )
        assert speaker_result.scalars().all() == []
