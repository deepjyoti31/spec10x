"""
Integration Tests — Saved Views API (v0.54, US-054-01-01/02)
"""

from __future__ import annotations

import uuid

import pytest

from tests.conftest import AUTH_HEADER


class TestCreateSavedView:
    @pytest.mark.asyncio
    async def test_create_and_list_saved_view(self, client):
        name = f"Enterprise churn risk {uuid.uuid4()}"
        create_response = await client.post(
            "/api/saved-views",
            headers=AUTH_HEADER,
            json={
                "name": name,
                "filters": {"source": "support", "sentiment": "negative"},
            },
        )
        assert create_response.status_code == 201
        created = create_response.json()
        assert created["name"] == name
        assert created["filters"]["source"] == "support"
        assert created["filters"]["sentiment"] == "negative"

        list_response = await client.get("/api/saved-views", headers=AUTH_HEADER)
        assert list_response.status_code == 200
        rows = list_response.json()
        assert any(row["id"] == created["id"] for row in rows)

    @pytest.mark.asyncio
    async def test_create_rejects_empty_name(self, client):
        response = await client.post(
            "/api/saved-views",
            headers=AUTH_HEADER,
            json={"name": "   ", "filters": {}},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_rejects_duplicate_name(self, client):
        body = {"name": f"Duplicate view name {uuid.uuid4()}", "filters": {"source": "survey"}}
        first = await client.post("/api/saved-views", headers=AUTH_HEADER, json=body)
        assert first.status_code == 201

        second = await client.post("/api/saved-views", headers=AUTH_HEADER, json=body)
        assert second.status_code == 409


class TestDeleteSavedView:
    @pytest.mark.asyncio
    async def test_delete_removes_view(self, client):
        create_response = await client.post(
            "/api/saved-views",
            headers=AUTH_HEADER,
            json={"name": f"Temporary view {uuid.uuid4()}", "filters": {}},
        )
        saved_view_id = create_response.json()["id"]

        delete_response = await client.delete(
            f"/api/saved-views/{saved_view_id}", headers=AUTH_HEADER
        )
        assert delete_response.status_code == 204

        list_response = await client.get("/api/saved-views", headers=AUTH_HEADER)
        ids = [row["id"] for row in list_response.json()]
        assert saved_view_id not in ids

    @pytest.mark.asyncio
    async def test_delete_404_for_nonexistent(self, client):
        fake_id = str(uuid.uuid4())
        response = await client.delete(f"/api/saved-views/{fake_id}", headers=AUTH_HEADER)
        assert response.status_code == 404
