"""
Integration Tests — Export API (Day 2)

Tests: markdown export of all insights and single interview.
"""

import pytest


class TestExportInsights:
    """Test GET /api/export/insights"""

    @pytest.mark.asyncio
    async def test_returns_markdown(self, client, mock_user, sample_insights):
        response = await client.get(
            "/api/export/insights",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        assert "text/plain" in response.headers["content-type"]
        text = response.text
        assert "Spec10x" in text
        assert "Export" in text

    @pytest.mark.asyncio
    async def test_empty_export(self, client, mock_user):
        response = await client.get(
            "/api/export/insights",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        assert "No insights found" in response.text


class TestExportInterview:
    """Test GET /api/export/interview/{id}"""

    @pytest.mark.asyncio
    async def test_exports_interview_markdown(self, client, mock_user, sample_interview, sample_insights):
        response = await client.get(
            f"/api/export/interview/{sample_interview.id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        text = response.text
        assert "test_interview.txt" in text
        assert "Transcript" in text or "Insights" in text

    @pytest.mark.asyncio
    async def test_404_for_nonexistent(self, client, mock_user):
        import uuid
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/export/interview/{fake_id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 404
