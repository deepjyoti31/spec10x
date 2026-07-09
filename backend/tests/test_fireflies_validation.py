"""
Tests — Fireflies credential validation (US-051-01-02)
"""

import pytest
from contextlib import contextmanager
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import Response, Request

from app.connectors.fireflies import FIREFLIES_GRAPHQL_URL, FirefliesConnector
from app.models import SourceConnectionStatus
from tests.conftest import AUTH_HEADER


# ── Unit Tests: FirefliesConnector.validate ────────────────

@contextmanager
def _make_mock_connection(api_key="ff_key_123"):
    """Create a mock SourceConnection object with patched transition."""
    conn = MagicMock()
    conn.config_json = {}
    conn.secret_ref = api_key
    conn.status = SourceConnectionStatus.configured
    conn.last_error_summary = None

    with patch("app.connectors.fireflies.transition_source_connection") as mock_transition:
        mock_transition.side_effect = lambda c, status: setattr(c, "status", status)
        yield conn, mock_transition


def _make_connector(conn):
    """Create a FirefliesConnector with a mock connection, bypassing ABC."""
    connector = FirefliesConnector.__new__(FirefliesConnector)
    connector.db = MagicMock()
    connector.connection = conn
    return connector


def _graphql_response(status_code=200, payload=None):
    return Response(
        status_code,
        json=payload if payload is not None else {"data": {"users": []}},
        request=Request("POST", FIREFLIES_GRAPHQL_URL),
    )


@pytest.mark.asyncio
async def test_validate_success():
    """Valid API key → status=connected."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        mock_response = _graphql_response(
            200,
            {"data": {"users": [{"user_id": "u1", "name": "Deep", "email": "d@x.com"}]}},
        )

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.validate()

        assert result is True
        assert conn.status == SourceConnectionStatus.connected
        assert conn.last_error_summary is None


@pytest.mark.asyncio
async def test_validate_invalid_key_http_403():
    """401/403 response → status=error with clear message."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        mock_response = _graphql_response(403, {"errors": [{"message": "Forbidden"}]})

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        assert "api key" in conn.last_error_summary.lower()


@pytest.mark.asyncio
async def test_validate_invalid_key_graphql_error():
    """200 with a GraphQL auth error → status=error."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        mock_response = _graphql_response(
            200,
            {"errors": [{"message": "Not authorized: invalid api key"}]},
        )

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        assert "api key" in conn.last_error_summary.lower()


@pytest.mark.asyncio
async def test_validate_missing_key():
    """No stored secret → status=error without any network call."""
    with _make_mock_connection(api_key=None) as (conn, _):
        connector = _make_connector(conn)

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_validate_timeout():
    """Network timeout → status=error with timeout message."""
    import httpx

    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        with patch(
            "httpx.AsyncClient.post",
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
    """POST /api/source-connections/{id}/validate calls FirefliesConnector.validate()."""
    sources_resp = await client.get("/api/data-sources", headers=AUTH_HEADER)
    assert sources_resp.status_code == 200
    fireflies_source = next(
        (s for s in sources_resp.json() if s["provider"] == "fireflies"), None
    )
    assert fireflies_source is not None, "Fireflies data source should be seeded"

    create_resp = await client.post(
        "/api/source-connections",
        json={
            "data_source_id": fireflies_source["id"],
            "secret_ref": "ff_test_key_123",
            "config_json": {},
        },
        headers=AUTH_HEADER,
    )
    assert create_resp.status_code == 201
    conn_id = create_resp.json()["id"]

    # Patch the connector's GraphQL call — patching httpx.AsyncClient.post
    # directly would also intercept the ASGI test client's own request.
    with patch.object(
        FirefliesConnector,
        "_graphql",
        new_callable=AsyncMock,
        return_value={"users": [{"user_id": "u1", "name": "Deep", "email": "d@x.com"}]},
    ):
        validate_resp = await client.post(
            f"/api/source-connections/{conn_id}/validate",
            headers=AUTH_HEADER,
        )

    assert validate_resp.status_code == 200
    assert validate_resp.json()["status"] == "connected"
