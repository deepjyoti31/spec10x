"""
Integration Tests — Billing & Usage API (Day 2)

Tests: get usage, get plan limits.
"""

import uuid
import pytest

from tests.conftest import AUTH_HEADER


class TestGetUsage:
    """Test GET /api/billing/usage"""

    @pytest.mark.asyncio
    async def test_returns_usage(self, client):
        response = await client.get("/api/billing/usage", headers=AUTH_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert "month" in data
        assert "interviews_uploaded" in data
        assert "qa_queries_used" in data
        assert "storage_bytes_used" in data


class TestGetLimits:
    """Test GET /api/billing/limits"""

    @pytest.mark.asyncio
    async def test_returns_limits(self, client):
        response = await client.get("/api/billing/limits", headers=AUTH_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "free"
        assert "usage" in data
        assert "limits" in data
        assert "remaining" in data
        assert data["limits"]["interviews_per_month"] == 10

    @pytest.mark.asyncio
    async def test_usage_matches_database(self, client):
        """Verify that usage numbers match actual database records, not just counters."""
        # 1. Check initial usage
        resp = await client.get("/api/billing/limits", headers=AUTH_HEADER)
        initial_interviews = resp.json()["usage"]["interviews_uploaded"]
        initial_storage = resp.json()["usage"]["storage_bytes_used"]
        
        # 2. Add an interview via API
        from tests.conftest import create_test_interview
        filename = f"test-{uuid.uuid4()}.txt"
        created = await create_test_interview(client, filename=filename)
        interview_id = created["id"]
        
        # 3. Check usage again
        resp = await client.get("/api/billing/limits", headers=AUTH_HEADER)
        usage = resp.json()["usage"]
        assert usage["interviews_uploaded"] == initial_interviews + 1
        assert usage["storage_bytes_used"] > initial_storage
        
        # 4. Delete the interview via API
        await client.delete(f"/api/interviews/{interview_id}", headers=AUTH_HEADER)
        
        # 5. Check usage again (should be back to initial)
        resp = await client.get("/api/billing/limits", headers=AUTH_HEADER)
        usage = resp.json()["usage"]
        assert usage["interviews_uploaded"] == initial_interviews
        assert usage["storage_bytes_used"] == initial_storage

    @pytest.mark.asyncio
    async def test_qa_increment_usage(self, client):
        """Verify that QA usage increments when a question is asked."""
        # 1. Create an interview so we can ask questions
        from tests.conftest import create_test_interview
        created = await create_test_interview(client)
        interview_id = created["id"]
        
        # 2. Check initial QA usage
        resp = await client.get("/api/billing/limits", headers=AUTH_HEADER)
        initial_qa = resp.json()["usage"]["qa_queries_used"]
        
        # 3. Ask a question
        # Note: In tests, the QA service might be mocked or fail if no vector indices exist,
        # but the increment_usage call should still trigger if the endpoint succeeds.
        # The conftest mocks genai, which should allow the endpoint to succeed.
        ask_resp = await client.post(
            "/api/ask",
            json={"question": "What is this interview about?", "interview_ids": [interview_id]},
            headers=AUTH_HEADER
        )
        assert ask_resp.status_code == 200
        
        # 4. Check usage again
        resp = await client.get("/api/billing/limits", headers=AUTH_HEADER)
        assert resp.json()["usage"]["qa_queries_used"] == initial_qa + 1




