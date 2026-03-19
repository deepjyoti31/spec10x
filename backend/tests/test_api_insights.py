"""
Integration Tests — Insights API (Day 1 + Day 2)

Tests: create manual insight, flag insight.
Note: Insights don't have a list endpoint — they're accessed via interview detail.
"""

import uuid
import pytest
from sqlalchemy import select

from app.models import Signal, Theme, ThemeStatus
from app.services.sources import get_or_create_default_workspace
from tests.conftest import AUTH_HEADER, create_test_interview


class TestCreateInsight:
    """Test POST /api/insights"""

    @pytest.mark.asyncio
    async def test_creates_manual_insight(self, client):
        # First create an interview to attach the insight to
        interview = await create_test_interview(client)
        response = await client.post(
            "/api/insights",
            json={
                "interview_id": interview["id"],
                "category": "suggestion",
                "title": "Manual insight via test",
                "quote": "This is a manually added insight from test",
            },
            headers=AUTH_HEADER,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Manual insight via test"
        assert data["category"] == "suggestion"

    @pytest.mark.asyncio
    async def test_manual_insight_syncs_native_signal_and_dismiss_cleans_it_up(
        self,
        client,
        db_session,
        test_user,
    ):
        interview = await create_test_interview(client, filename="signal_sync_test.txt")
        theme = Theme(
            user_id=test_user.id,
            name=f"Signal Sync Theme {uuid.uuid4()}",
            mention_count=1,
            sentiment_positive=0.0,
            sentiment_neutral=0.0,
            sentiment_negative=1.0,
            status=ThemeStatus.active,
        )
        db_session.add(theme)
        await db_session.commit()

        create_response = await client.post(
            "/api/insights",
            json={
                "interview_id": interview["id"],
                "category": "pain_point",
                "title": "Signal synced insight",
                "quote": "Customers said onboarding was frustrating",
                "theme_id": str(theme.id),
            },
            headers=AUTH_HEADER,
        )
        assert create_response.status_code == 201
        insight = create_response.json()

        workspace = await get_or_create_default_workspace(db_session, test_user)
        signal_result = await db_session.execute(
            select(Signal).where(
                Signal.workspace_id == workspace.id,
                Signal.provider == "native_upload",
                Signal.native_entity_id == insight["id"],
            )
        )
        signal = signal_result.scalar_one_or_none()
        assert signal is not None
        assert signal.title == "Signal synced insight"
        assert signal.sentiment == "negative"
        assert signal.metadata_json["theme_match"]["theme_id"] == str(theme.id)
        assert signal.metadata_json["theme_match"]["strategy"] == "native"

        update_response = await client.patch(
            f"/api/insights/{insight['id']}",
            json={"title": "Updated signal title"},
            headers=AUTH_HEADER,
        )
        assert update_response.status_code == 200

        updated_signal_result = await db_session.execute(
            select(Signal)
            .execution_options(populate_existing=True)
            .where(
                Signal.workspace_id == workspace.id,
                Signal.provider == "native_upload",
                Signal.native_entity_id == insight["id"],
            )
        )
        updated_signal = updated_signal_result.scalar_one()
        assert updated_signal.title == "Updated signal title"

        dismiss_response = await client.delete(
            f"/api/insights/{insight['id']}",
            headers=AUTH_HEADER,
        )
        assert dismiss_response.status_code == 204

        deleted_signal_result = await db_session.execute(
            select(Signal).where(
                Signal.workspace_id == workspace.id,
                Signal.provider == "native_upload",
                Signal.native_entity_id == insight["id"],
            )
        )
        assert deleted_signal_result.scalar_one_or_none() is None


class TestFlagInsight:
    """Test POST /api/insights/{id}/flag"""

    @pytest.mark.asyncio
    async def test_toggles_flag(self, client):
        # Create interview and manual insight first
        interview = await create_test_interview(client)
        create_resp = await client.post(
            "/api/insights",
            json={
                "interview_id": interview["id"],
                "category": "pain_point",
                "title": "Flag test insight",
                "quote": "test quote",
            },
            headers=AUTH_HEADER,
        )
        assert create_resp.status_code == 201
        insight_id = create_resp.json()["id"]

        # Flag it
        response = await client.post(f"/api/insights/{insight_id}/flag", headers=AUTH_HEADER)
        assert response.status_code == 200
        assert response.json()["is_flagged"] is True

        # Unflag it
        response = await client.post(f"/api/insights/{insight_id}/flag", headers=AUTH_HEADER)
        assert response.status_code == 200
        assert response.json()["is_flagged"] is False
