"""
Integration Tests — Insights API (Day 1 + Day 2)

Tests: list insights, create manually, update, flag, dismiss.
"""

import uuid
import pytest

from app.models import Insight, InsightCategory


class TestListInsights:
    """Test GET /api/insights"""

    @pytest.mark.asyncio
    async def test_lists_insights(self, client, mock_user, sample_insights):
        response = await client.get(
            "/api/insights",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3

    @pytest.mark.asyncio
    async def test_filter_by_category(self, client, mock_user, sample_insights):
        response = await client.get(
            "/api/insights?category=pain_point",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert all(i["category"] == "pain_point" for i in data)


class TestCreateInsight:
    """Test POST /api/insights"""

    @pytest.mark.asyncio
    async def test_creates_manual_insight(self, client, mock_user, sample_interview):
        response = await client.post(
            "/api/insights",
            json={
                "interview_id": str(sample_interview.id),
                "category": "suggestion",
                "title": "Manual insight",
                "quote": "This is a manually added insight",
            },
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Manual insight"
        assert data["is_manual"] is True
        assert data["category"] == "suggestion"


class TestUpdateInsight:
    """Test PATCH /api/insights/{id}"""

    @pytest.mark.asyncio
    async def test_updates_insight(self, client, mock_user, sample_insights):
        insight_id = str(sample_insights[0].id)
        response = await client.patch(
            f"/api/insights/{insight_id}",
            json={"title": "Updated title"},
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated title"


class TestFlagInsight:
    """Test POST /api/insights/{id}/flag"""

    @pytest.mark.asyncio
    async def test_toggles_flag(self, client, mock_user, sample_insights):
        insight_id = str(sample_insights[0].id)

        # Flag it
        response = await client.post(
            f"/api/insights/{insight_id}/flag",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_flagged"] is True

        # Unflag it
        response = await client.post(
            f"/api/insights/{insight_id}/flag",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_flagged"] is False
