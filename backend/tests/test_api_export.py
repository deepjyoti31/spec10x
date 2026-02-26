"""
Integration Tests — Export API (Day 2)

Tests: markdown export endpoints.
"""

import uuid
import pytest

from tests.conftest import AUTH_HEADER


class TestExportInsights:
    """Test GET /api/export/insights"""

    @pytest.mark.asyncio
    async def test_returns_text_response(self, client):
        response = await client.get("/api/export/insights", headers=AUTH_HEADER)
        assert response.status_code == 200
        # Should return text content (not JSON)
        assert "text" in response.headers.get("content-type", "")


class TestExportInterview:
    """Test GET /api/export/interview/{id}"""

    @pytest.mark.asyncio
    async def test_404_for_nonexistent(self, client):
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/export/interview/{fake_id}", headers=AUTH_HEADER)
        assert response.status_code == 404
