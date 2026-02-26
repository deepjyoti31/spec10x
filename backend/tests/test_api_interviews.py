"""
Integration Tests — Interviews API (Day 1 + Day 2)

All tests are self-contained: they create data via API calls.
Dev-mode mock auth is used (no Firebase needed).
"""

import uuid
import pytest

from tests.conftest import AUTH_HEADER, create_test_interview


class TestUploadUrl:
    """Test POST /api/interviews/upload-url"""

    @pytest.mark.asyncio
    async def test_returns_upload_url(self, client):
        response = await client.post(
            "/api/interviews/upload-url",
            json={
                "filename": "test.txt",
                "content_type": "text/plain",
                "file_size_bytes": 1024,
            },
            headers=AUTH_HEADER,
        )
        assert response.status_code == 200
        data = response.json()
        assert "upload_url" in data
        assert "storage_path" in data
        assert "test.txt" in data["storage_path"]


class TestCreateInterview:
    """Test POST /api/interviews"""

    @pytest.mark.asyncio
    async def test_creates_interview(self, client):
        data = await create_test_interview(client)
        assert data["filename"] == "test.txt"
        assert data["status"] == "queued"

    @pytest.mark.asyncio
    async def test_rejects_duplicate_hash(self, client):
        unique_hash = f"hash-{uuid.uuid4()}"
        # Create first
        await create_test_interview(client, file_hash=unique_hash)
        # Create second with same hash — should be rejected
        response = await client.post(
            "/api/interviews",
            json={
                "filename": "second.txt",
                "file_type": "txt",
                "file_size_bytes": 600,
                "storage_path": f"test/{uuid.uuid4()}/second.txt",
                "file_hash": unique_hash,
            },
            headers=AUTH_HEADER,
        )
        assert response.status_code == 409


class TestListInterviews:
    """Test GET /api/interviews"""

    @pytest.mark.asyncio
    async def test_lists_user_interviews(self, client):
        await create_test_interview(client, filename="list_test.txt")
        response = await client.get("/api/interviews", headers=AUTH_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1


class TestGetInterview:
    """Test GET /api/interviews/{id}"""

    @pytest.mark.asyncio
    async def test_returns_interview_detail(self, client):
        created = await create_test_interview(client, filename="detail_test.txt")
        response = await client.get(f"/api/interviews/{created['id']}", headers=AUTH_HEADER)
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "detail_test.txt"
        assert "speakers" in data
        assert "insights" in data

    @pytest.mark.asyncio
    async def test_404_for_nonexistent(self, client):
        fake_id = str(uuid.uuid4())
        response = await client.get(f"/api/interviews/{fake_id}", headers=AUTH_HEADER)
        assert response.status_code == 404


class TestDeleteInterview:
    """Test DELETE /api/interviews/{id}"""

    @pytest.mark.asyncio
    async def test_deletes_interview(self, client):
        created = await create_test_interview(client, filename="delete_test.txt")
        response = await client.delete(f"/api/interviews/{created['id']}", headers=AUTH_HEADER)
        assert response.status_code == 204

        # Verify it's gone
        response = await client.get(f"/api/interviews/{created['id']}", headers=AUTH_HEADER)
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_404_for_nonexistent_delete(self, client):
        fake_id = str(uuid.uuid4())
        response = await client.delete(f"/api/interviews/{fake_id}", headers=AUTH_HEADER)
        assert response.status_code == 404
