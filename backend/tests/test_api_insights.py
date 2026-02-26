"""
Integration Tests — Insights API (Day 1 + Day 2)

Tests: create manual insight, flag insight.
Note: Insights don't have a list endpoint — they're accessed via interview detail.
"""

import uuid
import pytest

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
