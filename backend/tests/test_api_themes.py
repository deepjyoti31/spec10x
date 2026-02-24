"""
Integration Tests — Themes API (Day 1)

Tests: list themes, get theme detail, rename theme.
"""

import uuid
import pytest

from app.models import Theme, ThemeStatus


class TestListThemes:
    """Test GET /api/themes"""

    @pytest.mark.asyncio
    async def test_lists_themes(self, client, mock_user, sample_theme):
        response = await client.get(
            "/api/themes",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == "Onboarding Experience"

    @pytest.mark.asyncio
    async def test_empty_when_no_themes(self, client, mock_user):
        response = await client.get(
            "/api/themes",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        assert response.json() == []


class TestGetTheme:
    """Test GET /api/themes/{id}"""

    @pytest.mark.asyncio
    async def test_returns_theme_detail(self, client, mock_user, sample_theme):
        response = await client.get(
            f"/api/themes/{sample_theme.id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Onboarding Experience"
        assert "insights" in data

    @pytest.mark.asyncio
    async def test_404_for_nonexistent(self, client, mock_user):
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/themes/{fake_id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 404


class TestRenameTheme:
    """Test PATCH /api/themes/{id}"""

    @pytest.mark.asyncio
    async def test_renames_theme(self, client, mock_user, sample_theme):
        response = await client.patch(
            f"/api/themes/{sample_theme.id}",
            json={"name": "Onboarding Issues"},
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Onboarding Issues"
