"""
Tests — PostHog credential validation (US-052-02-01)
"""

import pytest
from contextlib import contextmanager
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import Response, Request

from app.connectors.posthog import PostHogConnector
from app.models import SourceConnectionStatus
from tests.conftest import AUTH_HEADER


# ── Unit Tests: PostHogConnector.validate ──────────────────

@contextmanager
def _make_mock_connection(api_key="phx_key_123", project_id="123"):
    """Create a mock SourceConnection object with patched transition."""
    conn = MagicMock()
    conn.config_json = {"project_id": project_id} if project_id else {}
    conn.secret_ref = api_key
    conn.status = SourceConnectionStatus.configured
    conn.last_error_summary = None

    with patch("app.connectors.posthog.transition_source_connection") as mock_transition:
        mock_transition.side_effect = lambda c, status: setattr(c, "status", status)
        yield conn, mock_transition


def _make_connector(conn):
    """Create a PostHogConnector with a mock connection, bypassing ABC."""
    connector = PostHogConnector.__new__(PostHogConnector)
    connector.db = MagicMock()
    connector.connection = conn
    return connector


def _project_response(status_code=200, payload=None):
    return Response(
        status_code,
        json=payload if payload is not None else {"id": 123, "name": "Spec10x"},
        request=Request("GET", "https://us.posthog.com/api/projects/123/"),
    )


@pytest.mark.asyncio
async def test_validate_success():
    """Valid API key and project → status=connected."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            return_value=_project_response(200),
        ):
            result = await connector.validate()

        assert result is True
        assert conn.status == SourceConnectionStatus.connected
        assert conn.last_error_summary is None


@pytest.mark.asyncio
async def test_validate_invalid_key_401():
    """401 response → status=error with a clear API-key message."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            return_value=_project_response(401, {"detail": "Invalid token"}),
        ):
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        assert "api key" in conn.last_error_summary.lower()


@pytest.mark.asyncio
async def test_validate_key_lacks_scope_403():
    """403 response → status=error mentioning key scopes."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            return_value=_project_response(403, {"detail": "Forbidden"}),
        ):
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        assert "scope" in conn.last_error_summary.lower()


@pytest.mark.asyncio
async def test_validate_project_not_found_404():
    """404 response → status=error naming the missing project."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            return_value=_project_response(404, {"detail": "Not found."}),
        ):
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        assert "not found" in conn.last_error_summary.lower()


@pytest.mark.asyncio
async def test_validate_missing_key():
    """No stored secret → status=error without any network call."""
    with _make_mock_connection(api_key=None) as (conn, _):
        connector = _make_connector(conn)

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        mock_get.assert_not_called()


@pytest.mark.asyncio
async def test_validate_missing_project_id():
    """No project_id in config → status=error without any network call."""
    with _make_mock_connection(project_id=None) as (conn, _):
        connector = _make_connector(conn)

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            result = await connector.validate()

        assert result is False
        assert conn.status == SourceConnectionStatus.error
        assert "project_id" in conn.last_error_summary
        mock_get.assert_not_called()


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
    """POST /api/source-connections/{id}/validate calls PostHogConnector.validate()."""
    sources_resp = await client.get("/api/data-sources", headers=AUTH_HEADER)
    assert sources_resp.status_code == 200
    posthog_source = next(
        (s for s in sources_resp.json() if s["provider"] == "posthog"), None
    )
    assert posthog_source is not None, "PostHog data source should be seeded"
    assert posthog_source["source_type"] == "analytics"

    create_resp = await client.post(
        "/api/source-connections",
        json={
            "data_source_id": posthog_source["id"],
            "secret_ref": "phx_test_key_123",
            "config_json": {"project_id": "123"},
        },
        headers=AUTH_HEADER,
    )
    assert create_resp.status_code == 201
    conn_id = create_resp.json()["id"]

    # The connector validates via GET; the ASGI test client sends POSTs, so
    # patching httpx.AsyncClient.get does not intercept the test's own request.
    with patch(
        "httpx.AsyncClient.get",
        new_callable=AsyncMock,
        return_value=_project_response(200),
    ):
        validate_resp = await client.post(
            f"/api/source-connections/{conn_id}/validate",
            headers=AUTH_HEADER,
        )

    assert validate_resp.status_code == 200
    assert validate_resp.json()["status"] == "connected"
