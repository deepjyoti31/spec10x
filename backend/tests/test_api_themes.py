"""
Integration Tests — Themes API (Day 1)

Tests: list themes, get theme detail. Themes are auto-created by the
processing pipeline; these tests verify the API returns them correctly.
"""

import uuid
import pytest

from tests.conftest import AUTH_HEADER


class TestListThemes:
    """Test GET /api/themes"""

    @pytest.mark.asyncio
    async def test_lists_themes_returns_list(self, client):
        response = await client.get("/api/themes", headers=AUTH_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestGetTheme:
    """Test GET /api/themes/{id}"""

    @pytest.mark.asyncio
    async def test_404_for_nonexistent(self, client):
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/themes/{fake_id}", headers=AUTH_HEADER)
        assert response.status_code == 404
