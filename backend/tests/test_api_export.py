"""
Integration Tests - Export API

Tests: markdown export endpoints.
"""

from datetime import datetime, timedelta, timezone
import uuid

import pytest

from app.models import User
from tests.conftest import AUTH_HEADER
from tests.test_feed_api import _create_external_signal, _create_interview_signal, _create_theme


class TestExportInsights:
    """Test GET /api/export/insights"""

    @pytest.mark.asyncio
    async def test_returns_text_response(self, client):
        response = await client.get("/api/export/insights", headers=AUTH_HEADER)
        assert response.status_code == 200
        assert "text" in response.headers.get("content-type", "")


class TestExportInterview:
    """Test GET /api/export/interview/{id}"""

    @pytest.mark.asyncio
    async def test_404_for_nonexistent(self, client):
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/export/interview/{fake_id}", headers=AUTH_HEADER)
        assert response.status_code == 404


class TestExportFeed:
    """Test GET /api/export/feed"""

    @pytest.mark.asyncio
    async def test_returns_empty_markdown_when_no_matching_signals(self, client):
        future_start = (datetime.now(timezone.utc) + timedelta(days=365)).date().isoformat()
        future_end = (datetime.now(timezone.utc) + timedelta(days=366)).date().isoformat()
        response = await client.get(
            f"/api/export/feed?date_from={future_start}&date_to={future_end}",
            headers=AUTH_HEADER,
        )
        assert response.status_code == 200
        assert "text" in response.headers.get("content-type", "")
        assert "No feed signals matched the current filters." in response.text

    @pytest.mark.asyncio
    async def test_applies_filters_and_exports_matching_rows(
        self,
        client,
        db_session,
        test_user,
    ):
        base_time = datetime.now(timezone.utc)
        theme = await _create_theme(db_session, test_user, f"Export {uuid.uuid4().hex[:8]}")

        await _create_interview_signal(
            db_session,
            test_user,
            theme,
            title="Export Native Signal",
            quote="Interview pain point for the export test",
            created_at=base_time - timedelta(days=3),
        )
        await _create_external_signal(
            db_session,
            test_user,
            provider="zendesk",
            title="Export Zendesk Signal",
            content_text="Support evidence for the export test",
            occurred_at=base_time - timedelta(days=1),
            sentiment="negative",
            source_url="https://acme.zendesk.com/agent/tickets/999",
            metadata_json={"tags": ["Export Theme", "Support"]},
        )
        await db_session.commit()

        date_from = (base_time - timedelta(days=2)).date().isoformat()
        response = await client.get(
            f"/api/export/feed?source=support&sentiment=negative&date_from={date_from}",
            headers=AUTH_HEADER,
        )

        assert response.status_code == 200
        assert "# Spec10x - Feed Export" in response.text
        assert "Filters: Source: Support | Sentiment: Negative" in response.text
        assert "Export Zendesk Signal" in response.text
        assert "Export Native Signal" not in response.text

    @pytest.mark.asyncio
    async def test_only_exports_current_users_signals(
        self,
        client,
        db_session,
        test_user,
    ):
        base_time = datetime.now(timezone.utc)

        await _create_external_signal(
            db_session,
            test_user,
            provider="zendesk",
            title="Current User Signal",
            content_text="Current user support ticket",
            occurred_at=base_time,
            sentiment="negative",
            source_url="https://acme.zendesk.com/agent/tickets/101",
            metadata_json={"tags": ["Current User"]},
        )

        other_user = User(
            firebase_uid=f"other-{uuid.uuid4()}",
            email=f"other-{uuid.uuid4().hex[:6]}@spec10x.local",
            name="Other User",
        )
        db_session.add(other_user)
        await db_session.flush()

        other_theme = await _create_theme(db_session, other_user, f"Other {uuid.uuid4().hex[:8]}")
        await _create_interview_signal(
            db_session,
            other_user,
            other_theme,
            title="Other User Signal",
            quote="This should not appear in another user's export",
            created_at=base_time - timedelta(hours=1),
        )
        await db_session.commit()

        response = await client.get("/api/export/feed", headers=AUTH_HEADER)
        assert response.status_code == 200
        assert "Current User Signal" in response.text
        assert "Other User Signal" not in response.text
