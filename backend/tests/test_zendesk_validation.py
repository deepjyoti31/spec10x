"""
Tests — Zendesk credential validation (US-05-02-01)
"""

import pytest
from contextlib import contextmanager
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import Response, Request

from app.connectors.zendesk import ZendeskConnector
from app.models import SourceConnectionStatus
from tests.conftest import AUTH_HEADER


# ── Unit Tests: ZendeskConnector.validate ──────────────────

@contextmanager
def _make_mock_connection(subdomain="acme", email="admin@acme.com", api_token="tok_123"):
    """Create a mock SourceConnection object with patched transition."""
    conn = MagicMock()
    conn.config_json = {"subdomain": subdomain, "email": email}
    conn.secret_ref = api_token
    conn.status = SourceConnectionStatus.configured
    conn.last_error_summary = None

    with patch("app.connectors.zendesk.transition_source_connection") as mock_transition:
        mock_transition.side_effect = lambda c, status: setattr(c, "status", status)
        yield conn, mock_transition


def _make_connector(conn):
    """Create a ZendeskConnector with a mock connection, bypassing ABC."""
    connector = ZendeskConnector.__new__(ZendeskConnector)
    connector.db = MagicMock()
    connector.connection = conn
    return connector


@pytest.mark.asyncio
async def test_validate_success():
    """Valid credentials → status=connected."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        mock_response = Response(
            200,
            json={"user": {"email": "admin@acme.com", "role": "admin"}},
            request=Request("GET", "https://acme.zendesk.com/api/v2/users/me.json"),
        )

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.validate()

        assert result is True
        assert conn.status == SourceConnectionStatus.connected
        assert conn.last_error_summary is None


@pytest.mark.asyncio
async def test_validate_invalid_credentials():
    """401 response → status=error with clear message."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        mock_response = Response(
            401,
            json={"error": "Couldn't authenticate you"},
            request=Request("GET", "https://acme.zendesk.com/api/v2/users/me.json"),
        )

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        assert "credentials" in conn.last_error_summary.lower()


@pytest.mark.asyncio
async def test_validate_bad_subdomain():
    """404 response → status=error with subdomain message."""
    with _make_mock_connection(subdomain="nonexistent") as (conn, _):
        connector = _make_connector(conn)

        mock_response = Response(
            404,
            json={"error": "Not found"},
            request=Request("GET", "https://nonexistent.zendesk.com/api/v2/users/me.json"),
        )

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        assert "nonexistent" in conn.last_error_summary.lower()


@pytest.mark.asyncio
async def test_validate_timeout():
    """Network timeout → status=error with timeout message."""
    import httpx

    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            side_effect=httpx.TimeoutException("timeout"),
        ):
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        assert "timed out" in conn.last_error_summary.lower()


# ── Integration Test: validate endpoint ───────────────────

@pytest.mark.asyncio
async def test_validate_endpoint(client):
    """POST /api/source-connections/{id}/validate calls connector.validate()."""
    # Step 1: get data sources and find zendesk
    sources_resp = await client.get("/api/data-sources", headers=AUTH_HEADER)
    assert sources_resp.status_code == 200
    sources = sources_resp.json()
    zendesk_source = next((s for s in sources if s["provider"] == "zendesk"), None)
    assert zendesk_source is not None, "Zendesk data source should be seeded"

    # Step 2: create a connection
    create_resp = await client.post(
        "/api/source-connections",
        json={
            "data_source_id": zendesk_source["id"],
            "secret_ref": "test_token_123",
            "config_json": {"subdomain": "testco", "email": "admin@testco.com"},
        },
        headers=AUTH_HEADER,
    )
    assert create_resp.status_code == 201
    conn_id = create_resp.json()["id"]

    # Step 3: validate — mock the HTTP call to succeed
    mock_response = Response(
        200,
        json={"user": {"email": "admin@testco.com", "role": "admin"}},
        request=Request("GET", "https://testco.zendesk.com/api/v2/users/me.json"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        validate_resp = await client.post(
            f"/api/source-connections/{conn_id}/validate",
            headers=AUTH_HEADER,
        )

    assert validate_resp.status_code == 200
    data = validate_resp.json()
    assert data["status"] == "connected"
