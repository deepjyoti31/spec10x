"""
Integration Tests — Interviews API (Day 1 + Day 2)

Tests: upload URL, create interview, list, get detail, delete, reanalyze.
All use dev-mode mock auth (no Firebase needed).
"""

import uuid
import pytest

from app.models import User, Interview, InterviewStatus, FileType


class TestUploadUrl:
    """Test POST /api/interviews/upload-url"""

    @pytest.mark.asyncio
    async def test_returns_upload_url(self, client, mock_user):
        response = await client.post(
            "/api/interviews/upload-url",
            json={
                "filename": "test.txt",
                "content_type": "text/plain",
                "file_size_bytes": 1024,
            },
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "upload_url" in data
        assert "storage_path" in data
        assert "test.txt" in data["storage_path"]


class TestCreateInterview:
    """Test POST /api/interviews"""

    @pytest.mark.asyncio
    async def test_creates_interview(self, client, mock_user):
        response = await client.post(
            "/api/interviews",
            json={
                "filename": "interview1.txt",
                "file_type": "txt",
                "file_size_bytes": 2048,
                "storage_path": f"{mock_user.id}/test/interview1.txt",
            },
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["filename"] == "interview1.txt"
        assert data["status"] == "queued"

    @pytest.mark.asyncio
    async def test_rejects_duplicate_hash(self, client, mock_user, db_session):
        # Create first interview with a hash
        interview = Interview(
            user_id=mock_user.id,
            filename="first.txt",
            file_type=FileType.txt,
            file_size_bytes=500,
            storage_path="test/first.txt",
            file_hash="abc123hash",
            status=InterviewStatus.done,
        )
        db_session.add(interview)
        await db_session.flush()

        # Try to create another with same hash
        response = await client.post(
            "/api/interviews",
            json={
                "filename": "second.txt",
                "file_type": "txt",
                "file_size_bytes": 600,
                "storage_path": "test/second.txt",
                "file_hash": "abc123hash",
            },
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 409


class TestListInterviews:
    """Test GET /api/interviews"""

    @pytest.mark.asyncio
    async def test_lists_user_interviews(self, client, mock_user, sample_interview):
        response = await client.get(
            "/api/interviews",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_empty_when_no_interviews(self, client, mock_user):
        response = await client.get(
            "/api/interviews",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data == []


class TestGetInterview:
    """Test GET /api/interviews/{id}"""

    @pytest.mark.asyncio
    async def test_returns_interview_detail(self, client, mock_user, sample_interview):
        response = await client.get(
            f"/api/interviews/{sample_interview.id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "test_interview.txt"
        assert "speakers" in data
        assert "insights" in data

    @pytest.mark.asyncio
    async def test_404_for_nonexistent(self, client, mock_user):
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/interviews/{fake_id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 404


class TestDeleteInterview:
    """Test DELETE /api/interviews/{id}"""

    @pytest.mark.asyncio
    async def test_deletes_interview(self, client, mock_user, sample_interview):
        response = await client.delete(
            f"/api/interviews/{sample_interview.id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 204

        # Verify it's gone
        response = await client.get(
            f"/api/interviews/{sample_interview.id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_404_for_nonexistent_delete(self, client, mock_user):
        fake_id = str(uuid.uuid4())
        response = await client.delete(
            f"/api/interviews/{fake_id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 404
