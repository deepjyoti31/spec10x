"""
Tests for the connector contract, registry, and Zendesk stub.
"""

import pytest
from unittest.mock import AsyncMock

from sqlalchemy import select

from app.connectors import CONNECTOR_REGISTRY, get_connector
from app.connectors.base import BaseConnector, ConnectorError, NormalizedSignal, SyncResult
from app.connectors.zendesk import ZendeskConnector
from app.models import DataSource, SourceConnectionStatus
from app.services.sources import (
    create_source_connection,
    get_or_create_default_workspace,
    seed_default_data_sources,
    transition_source_connection,
)
from tests.conftest import AUTH_HEADER


class TestBaseConnector:
    def test_cannot_instantiate_directly(self):
        with pytest.raises(TypeError):
            BaseConnector(db=None, connection=None)


class TestConnectorRegistry:
    def test_zendesk_is_registered(self):
        cls = get_connector("support", "zendesk")
        assert cls is ZendeskConnector

    def test_unregistered_provider_returns_none(self):
        assert get_connector("analytics", "nonexistent") is None

    def test_registry_has_zendesk_entry(self):
        assert ("support", "zendesk") in CONNECTOR_REGISTRY


class TestZendeskConnector:
    @pytest.mark.asyncio
    async def test_can_instantiate(self, db_session, test_user):
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
            secret_ref="projects/test/secrets/zd-token",
            config_json={"subdomain": "test-workspace"},
        )

        connector = ZendeskConnector(db=db_session, connection=connection)
        assert connector.subdomain == "test-workspace"
        assert connector.base_url == "https://test-workspace.zendesk.com/api/v2"

    @pytest.mark.asyncio
    async def test_validate_succeeds_with_mocked_api(self, db_session, test_user):
        """Validate now calls the real Zendesk API — mock it to test flow."""
        from unittest.mock import patch, AsyncMock
        from httpx import Response, Request

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
            secret_ref="projects/test/secrets/zd-token",
            config_json={"subdomain": "test-workspace", "email": "admin@test.com"},
        )

        connector = ZendeskConnector(db=db_session, connection=connection)

        mock_response = Response(
            200,
            json={"user": {"email": "admin@test.com", "role": "admin"}},
            request=Request("GET", "https://test-workspace.zendesk.com/api/v2/users/me.json"),
        )

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.validate()

        assert result is True
        assert connection.status == SourceConnectionStatus.connected

    @pytest.mark.asyncio
    async def test_normalize_converts_raw_records(self, db_session, test_user):
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
            config_json={"subdomain": "test-workspace"},
        )

        connector = ZendeskConnector(db=db_session, connection=connection)
        raw = [
            {
                "id": 12345,
                "subject": "Login broken",
                "description": "I cannot log in since the update.",
                "created_at": "2026-03-15T10:00:00Z",
                "requester": {"name": "Alice"},
                "priority": "high",
                "status": "open",
                "tags": ["login", "urgent"],
                "url": "https://test.zendesk.com/tickets/12345",
            }
        ]
        signals = await connector.normalize(raw)
        assert len(signals) == 1
        assert signals[0].external_id == "12345"
        assert signals[0].signal_kind == "ticket"
        assert signals[0].title == "Login broken"

    @pytest.mark.asyncio
    async def test_disconnect_clears_secret(self, db_session, test_user):
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
            secret_ref="projects/test/secrets/zd-token",
            config_json={"subdomain": "test-workspace"},
        )

        connector = ZendeskConnector(db=db_session, connection=connection)
        await connector.disconnect()
        assert connection.status == SourceConnectionStatus.disconnected
        assert connection.secret_ref is None


class TestDisconnectApi:
    @pytest.mark.asyncio
    async def test_disconnect_endpoint(self, client):
        sources_response = await client.get("/api/data-sources", headers=AUTH_HEADER)
        zendesk_source = next(
            s for s in sources_response.json() if s["provider"] == "zendesk"
        )

        create_response = await client.post(
            "/api/source-connections",
            json={
                "data_source_id": zendesk_source["id"],
                "secret_ref": "projects/test/secrets/zd-token",
                "config_json": {"subdomain": "test-workspace"},
            },
            headers=AUTH_HEADER,
        )
        assert create_response.status_code == 201
        connection_id = create_response.json()["id"]

        disconnect_response = await client.delete(
            f"/api/source-connections/{connection_id}",
            headers=AUTH_HEADER,
        )
        assert disconnect_response.status_code == 200
        data = disconnect_response.json()
        assert data["status"] == "disconnected"
        assert "secret_ref" not in data  # should not be exposed

    @pytest.mark.asyncio
    async def test_disconnect_not_found(self, client):
        import uuid
        response = await client.delete(
            f"/api/source-connections/{uuid.uuid4()}",
            headers=AUTH_HEADER,
        )
        assert response.status_code == 404
