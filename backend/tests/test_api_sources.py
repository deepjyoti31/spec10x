"""
Integration tests for the Sprint 1 source foundation API.
"""

import pytest
from sqlalchemy import select

from app.models import DataSource, SourceConnectionStatus, SyncRunType
from app.services.sources import (
    create_source_connection,
    fail_sync_run,
    get_or_create_default_workspace,
    seed_default_data_sources,
    start_sync_run,
    transition_source_connection,
)
from tests.conftest import AUTH_HEADER


class TestDataSourcesApi:
    @pytest.mark.asyncio
    async def test_lists_seeded_data_sources(self, client):
        response = await client.get("/api/data-sources", headers=AUTH_HEADER)
        assert response.status_code == 200

        data = response.json()
        keys = {(row["source_type"], row["provider"]) for row in data}
        assert len(keys) == len(data)
        assert ("support", "zendesk") in keys
        assert ("survey", "csv_import") in keys
        assert ("interview", "native_upload") in keys


class TestSourceConnectionsApi:
    @pytest.mark.asyncio
    async def test_create_and_query_source_connection(self, client):
        sources_response = await client.get("/api/data-sources", headers=AUTH_HEADER)
        zendesk_source = next(
            source
            for source in sources_response.json()
            if source["provider"] == "zendesk"
        )

        create_response = await client.post(
            "/api/source-connections",
            json={
                "data_source_id": zendesk_source["id"],
                "secret_ref": "projects/test/secrets/zendesk-token",
                "config_json": {"subdomain": "pilot-workspace"},
            },
            headers=AUTH_HEADER,
        )
        assert create_response.status_code == 201
        created = create_response.json()
        assert created["status"] == SourceConnectionStatus.configured.value
        assert created["data_source"]["provider"] == "zendesk"
        assert created["workspace_id"]
        assert created["created_by_user_id"]
        assert "secret_ref" not in created

        list_response = await client.get("/api/source-connections", headers=AUTH_HEADER)
        assert list_response.status_code == 200
        listed = list_response.json()
        assert any(connection["id"] == created["id"] for connection in listed)

        detail_response = await client.get(
            f"/api/source-connections/{created['id']}",
            headers=AUTH_HEADER,
        )
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["id"] == created["id"]
        assert detail["data_source"]["provider"] == "zendesk"
        assert detail["sync_runs"] == []

    @pytest.mark.asyncio
    async def test_lists_failed_sync_runs_for_connection(
        self,
        client,
        db_session,
        test_user,
    ):
        workspace = await get_or_create_default_workspace(db_session, test_user)
        await seed_default_data_sources(db_session)

        zendesk_source = (
            await db_session.execute(
                select(DataSource).where(DataSource.provider == "zendesk")
            )
        ).scalar_one()
        connection = await create_source_connection(
            db_session,
            workspace=workspace,
            created_by_user=test_user,
            data_source=zendesk_source,
            secret_ref="projects/test/secrets/zendesk-token",
            config_json={"subdomain": "pilot-workspace"},
        )
        transition_source_connection(
            connection,
            SourceConnectionStatus.validating,
        )
        transition_source_connection(
            connection,
            SourceConnectionStatus.connected,
        )
        failed_run = await start_sync_run(
            db_session,
            connection=connection,
            run_type=SyncRunType.backfill,
            cursor_in={"page": 1},
        )
        fail_sync_run(
            failed_run,
            connection=connection,
            error_summary="Zendesk rate limited the backfill",
            records_seen=25,
        )
        await db_session.commit()

        list_response = await client.get(
            f"/api/source-connections/{connection.id}/sync-runs?status=failed",
            headers=AUTH_HEADER,
        )
        assert list_response.status_code == 200
        runs = list_response.json()
        assert any(run["id"] == str(failed_run.id) for run in runs)

        failed_run_payload = next(run for run in runs if run["id"] == str(failed_run.id))
        assert failed_run_payload["status"] == "failed"
        assert failed_run_payload["error_summary"] == "Zendesk rate limited the backfill"

        detail_response = await client.get(
            f"/api/source-connections/{connection.id}/sync-runs/{failed_run.id}",
            headers=AUTH_HEADER,
        )
        assert detail_response.status_code == 200
        assert detail_response.json()["id"] == str(failed_run.id)
