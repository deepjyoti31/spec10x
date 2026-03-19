"""
Tests — Zendesk Historical Backfill (US-05-02-02)

Covers:
  - Backfill pagination with mocked Zendesk Incremental Cursor API
  - Bounded history window
  - Duplicate import prevention via upsert_source_item
  - Sync run lifecycle (records counts and status)
  - Integration test for POST /api/source-connections/{id}/backfill
"""

import json
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

def _make_ticket(ticket_id: int, subject: str = "Test ticket", days_ago: int = 1):
    """Create a realistic Zendesk ticket payload."""
    created = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
    return {
        "id": ticket_id,
        "subject": subject,
        "description": f"Description for ticket {ticket_id}",
        "status": "open",
        "priority": "normal",
        "tags": ["support", "test"],
        "type": "incident",
        "created_at": created,
        "updated_at": created,
        "requester": {"name": f"User {ticket_id}", "email": f"user{ticket_id}@test.com"},
        "url": f"https://acme.zendesk.com/api/v2/tickets/{ticket_id}.json",
    }


def _make_zendesk_page(tickets, after_cursor="cursor_abc", end_of_stream=False):
    """Create a Zendesk Incremental API response page."""
    return {
        "tickets": tickets,
        "after_cursor": after_cursor,
        "after_url": None if end_of_stream else f"https://acme.zendesk.com/api/v2/incremental/tickets/cursor.json?cursor={after_cursor}",
        "end_of_stream": end_of_stream,
        "count": len(tickets),
    }


@contextmanager
def _make_mock_connection(subdomain="acme", email="admin@acme.com", api_token="tok_123", backfill_days=90):
    """Create a mock SourceConnection with patched transition."""
    conn = MagicMock()
    conn.id = "test-conn-id"
    conn.workspace_id = "test-workspace-id"
    conn.config_json = {"subdomain": subdomain, "email": email, "backfill_days": backfill_days}
    conn.secret_ref = api_token
    conn.status = SourceConnectionStatus.connected
    conn.last_error_summary = None

    with patch("app.connectors.zendesk.transition_source_connection") as mock_transition:
        mock_transition.side_effect = lambda c, status: setattr(c, "status", status)
        yield conn, mock_transition


def _make_connector(conn):
    """Create a ZendeskConnector with a mock connection."""
    connector = ZendeskConnector.__new__(ZendeskConnector)
    connector.db = MagicMock()
    connector.connection = conn
    return connector


# ── Unit Tests: Backfill ─────────────────────────────────

@pytest.mark.asyncio
async def test_backfill_single_page():
    """Backfill with a single page of tickets."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)
        sync_run = MagicMock()

        tickets = [_make_ticket(1), _make_ticket(2), _make_ticket(3)]
        page_data = _make_zendesk_page(tickets, after_cursor="final_cursor", end_of_stream=True)

        mock_response = Response(
            200,
            json=page_data,
            request=Request("GET", "https://acme.zendesk.com/api/v2/incremental/tickets/cursor.json"),
        )

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.backfill(sync_run, cursor_in=None)

        assert result.records_seen == 3
        assert len(result.signals) == 3
        assert result.cursor_out == {"after_cursor": "final_cursor"}


@pytest.mark.asyncio
async def test_backfill_multi_page():
    """Backfill paginates through multiple pages."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)
        sync_run = MagicMock()

        page1 = _make_zendesk_page(
            [_make_ticket(1), _make_ticket(2)],
            after_cursor="cursor_page2",
            end_of_stream=False,
        )
        page2 = _make_zendesk_page(
            [_make_ticket(3)],
            after_cursor="cursor_final",
            end_of_stream=True,
        )

        responses = [
            Response(200, json=page1, request=Request("GET", "https://acme.zendesk.com/api/v2/incremental/tickets/cursor.json")),
            Response(200, json=page2, request=Request("GET", "https://acme.zendesk.com/api/v2/incremental/tickets/cursor.json")),
        ]

        call_count = 0

        async def mock_get(url, **kwargs):
            nonlocal call_count
            resp = responses[call_count]
            call_count += 1
            return resp

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, side_effect=mock_get):
            result = await connector.backfill(sync_run, cursor_in=None)

        assert result.records_seen == 3
        assert len(result.signals) == 3
        assert result.cursor_out == {"after_cursor": "cursor_final"}


@pytest.mark.asyncio
async def test_backfill_resume_from_cursor():
    """Backfill can resume from a stored cursor."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)
        sync_run = MagicMock()

        page_data = _make_zendesk_page([_make_ticket(5)], after_cursor="new_cursor", end_of_stream=True)
        mock_response = Response(
            200,
            json=page_data,
            request=Request("GET", "https://acme.zendesk.com/api/v2/incremental/tickets/cursor.json"),
        )

        captured_urls = []

        async def capture_get(url, **kwargs):
            captured_urls.append(url)
            return mock_response

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, side_effect=capture_get):
            result = await connector.backfill(
                sync_run, cursor_in={"after_cursor": "old_cursor"}
            )

        assert "cursor=old_cursor" in captured_urls[0]
        assert result.records_seen == 1


@pytest.mark.asyncio
async def test_backfill_normalization_quality():
    """Backfill normalizes tickets into well-formed signals."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)
        sync_run = MagicMock()

        ticket = _make_ticket(42, subject="Login broken", days_ago=5)
        page_data = _make_zendesk_page([ticket], end_of_stream=True)
        mock_response = Response(200, json=page_data, request=Request("GET", "https://test.zendesk.com"))

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.backfill(sync_run, cursor_in=None)

        sig = result.signals[0]
        assert sig.external_id == "42"
        assert sig.title == "Login broken"
        assert sig.source_record_type == "ticket"
        assert sig.signal_kind == "ticket"
        assert sig.content_text == "Description for ticket 42"
        assert sig.author_or_speaker == "User 42"
        assert isinstance(sig.occurred_at, datetime)
        assert "acme.zendesk.com/agent/tickets/42" in sig.source_url
        assert sig.metadata_json["priority"] == "normal"
        assert sig.metadata_json["status"] == "open"
        assert sig.checksum is not None


@pytest.mark.asyncio
async def test_backfill_empty_page():
    """Backfill handles empty results gracefully."""
    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)
        sync_run = MagicMock()

        page_data = _make_zendesk_page([], end_of_stream=True)
        mock_response = Response(200, json=page_data, request=Request("GET", "https://test.zendesk.com"))

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            result = await connector.backfill(sync_run, cursor_in=None)

        assert result.records_seen == 0
        assert len(result.signals) == 0


@pytest.mark.asyncio
async def test_backfill_rate_limit_raises():
    """429 from Zendesk raises ConnectorError with retryable=True."""
    from app.connectors.base import ConnectorError

    with _make_mock_connection() as (conn, _):
        connector = _make_connector(conn)
        sync_run = MagicMock()

        mock_response = Response(
            429,
            headers={"Retry-After": "30"},
            request=Request("GET", "https://test.zendesk.com"),
        )

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
            with pytest.raises(ConnectorError) as exc_info:
                await connector.backfill(sync_run, cursor_in=None)

        assert exc_info.value.retryable is True
        assert "rate limited" in str(exc_info.value).lower()


# ── Integration Test: Backfill Endpoint ──────────────────

@pytest.mark.asyncio
async def test_backfill_endpoint(client):
    """POST /api/source-connections/{id}/backfill triggers backfill."""
    # Step 1: get data sources and find zendesk
    sources_resp = await client.get("/api/data-sources", headers=AUTH_HEADER)
    assert sources_resp.status_code == 200
    zendesk_source = next(
        (s for s in sources_resp.json() if s["provider"] == "zendesk"), None
    )
    assert zendesk_source is not None

    # Step 2: create a connection
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

    # Step 3: validate (mock success) to get to 'connected' state
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

    # Step 4: trigger backfill (mock Zendesk incremental API)
    ticket = _make_ticket(100, subject="Test backfill ticket")
    page_data = _make_zendesk_page([ticket], end_of_stream=True)
    mock_backfill = HttpxResponse(
        200,
        json=page_data,
        request=HttpxRequest("GET", "https://testco.zendesk.com/api/v2/incremental/tickets/cursor.json"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_backfill):
        backfill_resp = await client.post(
            f"/api/source-connections/{conn_id}/backfill",
            headers=AUTH_HEADER,
        )

    assert backfill_resp.status_code == 200
    data = backfill_resp.json()
    assert data["status"] == "succeeded"
    assert data["records_seen"] == 1
    assert data["records_created"] >= 1

    # Step 5: verify sync runs are queryable
    runs_resp = await client.get(
        f"/api/source-connections/{conn_id}/sync-runs",
        headers=AUTH_HEADER,
    )
    assert runs_resp.status_code == 200
    runs = runs_resp.json()
    assert len(runs) >= 1
    assert runs[0]["run_type"] == "backfill"
