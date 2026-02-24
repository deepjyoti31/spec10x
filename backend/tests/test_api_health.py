"""
Integration Tests — Health & Root Endpoints (Day 1)

Tests that the app loads and basic endpoints respond.
"""

import pytest


class TestHealthEndpoint:
    """Test the /health endpoint."""

    @pytest.mark.asyncio
    async def test_health_returns_ok(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

    @pytest.mark.asyncio
    async def test_root_returns_welcome(self, client):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "Spec10x" in data.get("app", "")
