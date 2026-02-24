"""
Integration Tests — Billing & Usage API (Day 2)

Tests: get usage, get plan limits.
"""

import pytest


class TestGetUsage:
    """Test GET /api/billing/usage"""

    @pytest.mark.asyncio
    async def test_returns_usage(self, client, mock_user):
        response = await client.get(
            "/api/billing/usage",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "month" in data
        assert "interviews_uploaded" in data
        assert "qa_queries_used" in data
        assert "storage_bytes_used" in data
        assert data["interviews_uploaded"] == 0
        assert data["qa_queries_used"] == 0


class TestGetLimits:
    """Test GET /api/billing/limits"""

    @pytest.mark.asyncio
    async def test_returns_limits(self, client, mock_user):
        response = await client.get(
            "/api/billing/limits",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "free"
        assert "usage" in data
        assert "limits" in data
        assert "remaining" in data
        assert data["limits"]["interviews_per_month"] == 5
        assert data["remaining"]["interviews"] == 5
