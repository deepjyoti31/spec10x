"""
Tests — Zendesk Incremental Sync (US-05-02-03)

Covers:
  - Incremental sync with cursor resumption
  - Idempotent retry (same cursor produces no duplicates)
  - Cursor continuity in sync run records
  - Integration test for POST /api/source-connections/{id}/sync
"""

from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock, MagicMock
from contextlib import contextmanager

import pytest
from httpx import Response, Request

from app.connectors.zendesk import ZendeskConnector
from app.connectors.base import NormalizedSignal, SyncResult
from app.models import SourceConnectionStatus, SyncRunStatus
from tests.conftest import AUTH_HEADER


# ── Helpers ───────────────────────────────────────────────

def _make_ticket(ticket_id: int, subject: str = "Test ticket"):
    created = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    return {
        "id": ticket_id,
        "subject": subject,
        "description": f"Description for ticket {ticket_id}",
        "status": "open",
        "priority": "normal",
        "tags": ["support"],
        "type": "incident",
        "created_at": created,
        "updated_at": created,
        "requester": {"name": f"User {ticket_id}", "email": f"user{ticket_id}@test.com"},
        "url": f"https://acme.zendesk.com/api/v2/tickets/{ticket_id}.json",
    }


def _make_zendesk_page(tickets, after_cursor="cursor_abc", end_of_stream=False):
    return {
        "tickets": tickets,
        "after_cursor": after_cursor,
        "after_url": None if end_of_stream else f"https://acme.zendesk.com/api/v2/incremental/tickets/cursor.json?cursor={after_cursor}",
        "end_of_stream": end_of_stream,
        "count": len(tickets),
    }


@contextmanager
def _make_mock_connection(subdomain="acme", email="admin@acme.com", api_token="tok_123"):
    conn = MagicMock()
    conn.id = "test-conn-id"
    conn.workspace_id = "test-workspace-id"
    conn.config_json = {"subdomain": subdomain, "email": email}
    conn.secret_ref = api_token
    conn.status = SourceConnectionStatus.connected
    conn.last_error_summary = None

    with patch("app.connectors.zendesk.transition_source_connection") as mock_transition:
        mock_transition.side_effect = lambda c, status: setattr(c, "status", status)
        yield conn, mock_transition


def _make_connector(conn):
    connector = ZendeskConnector.__new__(ZendeskConnector)
    connector.db = MagicMock()
    connector.connection = conn
    return connector


# ── Unit Tests: Incremental Sync ─────────────────────────

@pytest.mark.asyncio
async def test_incremental_sync_with_cursor():
    """Incremental sync uses stored cursor to resume from correct position."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)
        sync_run = MagicMock()

        page_data = _make_zendesk_page(
            [_make_ticket(10)], after_cursor="new_cursor", end_of_stream=True
        )
        mock_response = Response(200, json=page_data, request=Request("GET", "https://test.zendesk.com"))

        captured_urls = []

        async def capture_get(url, **kwargs):
            captured_urls.append(url)
            return mock_response

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, side_effect=capture_get):
            result = await connector.sync_incremental(
                sync_run,
                cursor_in={"after_cursor": "previous_cursor"},
            )

        # Should use the cursor, not start_time
        assert "cursor=previous_cursor" in captured_urls[0]
        assert result.records_seen == 1
        assert result.cursor_out == {"after_cursor": "new_cursor"}


@pytest.mark.asyncio
async def test_incremental_sync_no_cursor_uses_24h():
    """Without a cursor, incremental sync falls back to last 24 hours."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)
        sync_run = MagicMock()

        page_data = _make_zendesk_page([], end_of_stream=True)
        mock_response = Response(200, json=page_data, request=Request("GET", "https://test.zendesk.com"))

        captured_urls = []

        async def capture_get(url, **kwargs):
            captured_urls.append(url)
            return mock_response

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, side_effect=capture_get):
            result = await connector.sync_incremental(sync_run, cursor_in=None)

        # Should use start_time parameter
        assert "start_time=" in captured_urls[0]
        assert "cursor=" not in captured_urls[0]


@pytest.mark.asyncio
async def test_incremental_sync_preserves_cursor():
    """Incremental sync returns correct cursor_out for next run."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)
        sync_run = MagicMock()

        page_data = _make_zendesk_page(
            [_make_ticket(20), _make_ticket(21)],
            after_cursor="cursor_after_sync",
            end_of_stream=True,
        )
        mock_response = Response(200, json=page_data, request=Request("GET", "https://test.zendesk.com"))

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.sync_incremental(
                sync_run, cursor_in={"after_cursor": "old_cursor"}
            )

        assert result.cursor_out == {"after_cursor": "cursor_after_sync"}
        assert result.records_seen == 2


@pytest.mark.asyncio
async def test_incremental_sync_idempotent():
    """Running sync twice with same cursor is idempotent — same signals returned."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)

        page_data = _make_zendesk_page(
            [_make_ticket(30)], after_cursor="same_cursor", end_of_stream=True
        )
        mock_response = Response(200, json=page_data, request=Request("GET", "https://test.zendesk.com"))

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result1 = await connector.sync_incremental(
                MagicMock(), cursor_in={"after_cursor": "start"}
            )
            result2 = await connector.sync_incremental(
                MagicMock(), cursor_in={"after_cursor": "start"}
            )

        # Same input = same output (idempotent at connector level)
        assert len(result1.signals) == len(result2.signals)
        assert result1.signals[0].external_id == result2.signals[0].external_id


# ── Integration Test: Sync Endpoint ──────────────────────

@pytest.mark.asyncio
async def test_sync_endpoint(client):
    """POST /api/source-connections/{id}/sync triggers incremental sync."""
    # Step 1: setup
    sources_resp = await client.get("/api/data-sources", headers=AUTH_HEADER)
    zendesk_source = next(
        (s for s in sources_resp.json() if s["provider"] == "zendesk"), None
    )
    assert zendesk_source is not None

    # Step 2: create connection
    create_resp = await client.post(
        "/api/source-connections",
        json={
            "data_source_id": zendesk_source["id"],
            "secret_ref": "test_token",
            "config_json": {"subdomain": "testco", "email": "admin@testco.com"},
        },
        headers=AUTH_HEADER,
    )
    assert create_resp.status_code == 201
    conn_id = create_resp.json()["id"]

    # Step 3: validate to get connected
    from httpx import Response as HttpxResponse, Request as HttpxRequest

    mock_validate = HttpxResponse(
        200,
        json={"user": {"email": "admin@testco.com", "role": "admin"}},
        request=HttpxRequest("GET", "https://testco.zendesk.com/api/v2/users/me.json"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_validate):
        validate_resp = await client.post(
            f"/api/source-connections/{conn_id}/validate",
            headers=AUTH_HEADER,
        )
    assert validate_resp.status_code == 200

    # Step 4: trigger sync
    ticket = _make_ticket(200, subject="Incremental ticket")
    page_data = _make_zendesk_page([ticket], after_cursor="sync_cursor", end_of_stream=True)
    mock_sync = HttpxResponse(
        200,
        json=page_data,
        request=HttpxRequest("GET", "https://testco.zendesk.com/api/v2/incremental/tickets/cursor.json"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_sync):
        sync_resp = await client.post(
            f"/api/source-connections/{conn_id}/sync",
            headers=AUTH_HEADER,
        )

    assert sync_resp.status_code == 200
    data = sync_resp.json()
    assert data["status"] == "succeeded"
    assert data["run_type"] == "incremental"


@pytest.mark.asyncio
async def test_sync_endpoint_requires_connected_state(client):
    """POST /api/source-connections/{id}/sync fails for 'configured' connections."""
    sources_resp = await client.get("/api/data-sources", headers=AUTH_HEADER)
    zendesk_source = next(
        (s for s in sources_resp.json() if s["provider"] == "zendesk"), None
    )

    create_resp = await client.post(
        "/api/source-connections",
        json={
            "data_source_id": zendesk_source["id"],
            "secret_ref": "test_token",
            "config_json": {"subdomain": "testco", "email": "admin@testco.com"},
        },
        headers=AUTH_HEADER,
    )
    conn_id = create_resp.json()["id"]

    # Attempt sync without validating first
    sync_resp = await client.post(
        f"/api/source-connections/{conn_id}/sync",
        headers=AUTH_HEADER,
    )
    assert sync_resp.status_code == 400
    assert "connected" in sync_resp.json()["detail"].lower()
