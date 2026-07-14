"""
Integration Tests — Themes API (Day 1)

Tests: list themes, get theme detail. Themes are auto-created by the
processing pipeline; these tests verify the API returns them correctly.
"""

import uuid
import pytest

from app.models import Theme, ThemeStatus
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


class TestUpdateThemeComment:
    """Test PATCH /api/themes/{id} comment field (v0.54 ownership polish, US-054-03-02)"""

    @pytest.mark.asyncio
    async def test_sets_comment_without_touching_name(self, client, db_session, test_user):
        theme = Theme(
            user_id=test_user.id,
            name="Slow export",
            status=ThemeStatus.active,
        )
        db_session.add(theme)
        await db_session.commit()

        response = await client.patch(
            f"/api/themes/{theme.id}",
            headers=AUTH_HEADER,
            json={"comment": "Escalated by CS — check again next sprint."},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["comment"] == "Escalated by CS — check again next sprint."
        assert body["name"] == "Slow export"
