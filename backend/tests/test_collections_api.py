"""
Integration Tests — Collections API (v0.54, US-054-02-01/02/03)
"""

from __future__ import annotations

import uuid

import pytest

from tests.conftest import AUTH_HEADER, create_test_interview


class TestCreateCollection:
    @pytest.mark.asyncio
    async def test_create_and_list_collection(self, client):
        create_response = await client.post(
            "/api/collections",
            headers=AUTH_HEADER,
            json={"name": "Enterprise renewal risk", "description": "Q3 renewal blockers"},
        )
        assert create_response.status_code == 201
        created = create_response.json()
        assert created["name"] == "Enterprise renewal risk"
        assert created["interview_count"] == 0

        list_response = await client.get("/api/collections", headers=AUTH_HEADER)
        assert list_response.status_code == 200
        assert any(row["id"] == created["id"] for row in list_response.json())

    @pytest.mark.asyncio
    async def test_create_rejects_empty_name(self, client):
        response = await client.post(
            "/api/collections", headers=AUTH_HEADER, json={"name": "  "}
        )
        assert response.status_code == 422


class TestCollectionMembership:
    @pytest.mark.asyncio
    async def test_add_and_remove_interviews(self, client):
        collection_response = await client.post(
            "/api/collections", headers=AUTH_HEADER, json={"name": "Onboarding pain points"}
        )
        collection_id = collection_response.json()["id"]

        interview_a = await create_test_interview(client, filename="a.txt")
        interview_b = await create_test_interview(client, filename="b.txt")

        add_response = await client.post(
            f"/api/collections/{collection_id}/interviews",
            headers=AUTH_HEADER,
            json={"interview_ids": [interview_a["id"], interview_b["id"]]},
        )
        assert add_response.status_code == 200
        detail = add_response.json()
        assert detail["interview_count"] == 2
        interview_ids = {row["id"] for row in detail["interviews"]}
        assert interview_ids == {interview_a["id"], interview_b["id"]}

        # Re-adding the same interview is idempotent, not an error.
        readd_response = await client.post(
            f"/api/collections/{collection_id}/interviews",
            headers=AUTH_HEADER,
            json={"interview_ids": [interview_a["id"]]},
        )
        assert readd_response.status_code == 200
        assert readd_response.json()["interview_count"] == 2

        remove_response = await client.delete(
            f"/api/collections/{collection_id}/interviews/{interview_a['id']}",
            headers=AUTH_HEADER,
        )
        assert remove_response.status_code == 204

        detail_response = await client.get(
            f"/api/collections/{collection_id}", headers=AUTH_HEADER
        )
        remaining_ids = {row["id"] for row in detail_response.json()["interviews"]}
        assert remaining_ids == {interview_b["id"]}

    @pytest.mark.asyncio
    async def test_remove_404_when_not_a_member(self, client):
        collection_response = await client.post(
            "/api/collections", headers=AUTH_HEADER, json={"name": "Empty collection"}
        )
        collection_id = collection_response.json()["id"]
        fake_interview_id = str(uuid.uuid4())

        response = await client.delete(
            f"/api/collections/{collection_id}/interviews/{fake_interview_id}",
            headers=AUTH_HEADER,
        )
        assert response.status_code == 404


class TestUpdateAndDeleteCollection:
    @pytest.mark.asyncio
    async def test_rename_collection(self, client):
        create_response = await client.post(
            "/api/collections", headers=AUTH_HEADER, json={"name": "Old name"}
        )
        collection_id = create_response.json()["id"]

        update_response = await client.patch(
            f"/api/collections/{collection_id}",
            headers=AUTH_HEADER,
            json={"name": "New name"},
        )
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "New name"

    @pytest.mark.asyncio
    async def test_delete_collection(self, client):
        create_response = await client.post(
            "/api/collections", headers=AUTH_HEADER, json={"name": "Disposable"}
        )
        collection_id = create_response.json()["id"]

        delete_response = await client.delete(
            f"/api/collections/{collection_id}", headers=AUTH_HEADER
        )
        assert delete_response.status_code == 204

        get_response = await client.get(f"/api/collections/{collection_id}", headers=AUTH_HEADER)
        assert get_response.status_code == 404
