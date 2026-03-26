"""
Spec10x — Connector Replay & Contract Tests (US-05-06-02)

Sprint 7 hardening: deterministic replay tests that verify connector
behaviour using recorded API responses.  No real network calls or
database connections are made — everything is mocked.

Covers:
  1. Zendesk backfill happy path
  2. Incremental sync with cursor resumption
  3. Rate-limit 429 raises retryable ConnectorError
  4. Idempotent backfill re-run produces no new signals
  5. CSV normalize produces correct signals
  6. CSV connector lifecycle (connect → validate → disconnect)
"""

from __future__ import annotations

import json
import pathlib
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from httpx import Request, Response

from app.connectors.base import ConnectorError, NormalizedSignal, SyncResult
from app.connectors.csv_import import CSVImportConnector
from app.connectors.zendesk import ZendeskConnector
from app.models import SourceConnectionStatus, SyncRunStatus, SyncRunType

FIXTURES_DIR = pathlib.Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / name).read_text())


# ─── Stub Factories ──────────────────────────────────────


def _stub_connection(
    *,
    provider: str = "zendesk",
    subdomain: str = "test-workspace",
    email: str = "admin@test.com",
    secret_ref: str | None = "projects/test/secrets/zd-token",
    status: SourceConnectionStatus = SourceConnectionStatus.connected,
) -> MagicMock:
    """Create a minimal SourceConnection-like stub."""
    conn = MagicMock()
    conn.id = uuid4()
    conn.workspace_id = uuid4()
    conn.secret_ref = secret_ref
    conn.status = status
    conn.last_error_summary = None

    config: dict[str, Any] = {}
    if provider == "zendesk":
        config = {"subdomain": subdomain, "email": email}
    elif provider == "csv_import":
        config = {"import_name": "Q1 NPS Survey"}
    conn.config_json = config

    return conn


def _stub_sync_run(
    *,
    connection_id=None,
    run_type: SyncRunType = SyncRunType.backfill,
) -> MagicMock:
    """Create a minimal SyncRun-like stub."""
    sr = MagicMock()
    sr.id = uuid4()
    sr.source_connection_id = connection_id or uuid4()
    sr.run_type = run_type
    sr.status = SyncRunStatus.running
    sr.started_at = datetime.now(timezone.utc)
    sr.finished_at = None
    sr.cursor_in = None
    sr.cursor_out = None
    sr.records_seen = 0
    sr.records_created = 0
    sr.records_updated = 0
    sr.records_unchanged = 0
    sr.error_summary = None
    return sr


def _mock_zendesk_response(fixture_name: str) -> Response:
    """Build a fake httpx.Response from a fixture file."""
    data = _load_fixture(fixture_name)
    return Response(
        200,
        json=data,
        request=Request(
            "GET",
            "https://test-workspace.zendesk.com/api/v2/incremental/tickets/cursor.json",
        ),
    )


# ─── 1. Zendesk backfill happy path ──────────────────────


class TestZendeskBackfillReplay:
    @pytest.mark.asyncio
    async def test_backfill_happy_path(self):
        """Backfill with 3-ticket fixture produces exactly 3 NormalizedSignals."""
        connection = _stub_connection()
        connector = ZendeskConnector(db=MagicMock(), connection=connection)
        sync_run = _stub_sync_run(connection_id=connection.id)

        mock_response = _mock_zendesk_response("zendesk_backfill_page1.json")

        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await connector.backfill(sync_run)

        assert result.succeeded
        assert result.records_seen == 3
        assert len(result.signals) == 3

        ids = {s.external_id for s in result.signals}
        assert ids == {"1001", "1002", "1003"}

        billing_signal = next(s for s in result.signals if s.external_id == "1001")
        assert billing_signal.title == "Cannot access billing portal"
        assert billing_signal.signal_kind == "ticket"
        assert billing_signal.author_or_speaker == "Alice Chen"
        assert billing_signal.source_url == (
            "https://test-workspace.zendesk.com/agent/tickets/1001"
        )

        # Cursor is returned for resumability
        assert result.cursor_out is not None
        assert "after_cursor" in result.cursor_out


# ─── 2. Incremental sync with cursor ────────────────────


class TestZendeskIncrementalReplay:
    @pytest.mark.asyncio
    async def test_incremental_sync_with_cursor(self):
        """Incremental sync with cursor_in returns correct cursor_out."""
        connection = _stub_connection()
        connector = ZendeskConnector(db=MagicMock(), connection=connection)
        sync_run = _stub_sync_run(
            connection_id=connection.id,
            run_type=SyncRunType.incremental,
        )

        mock_response = _mock_zendesk_response("zendesk_incremental.json")
        cursor_in = {"after_cursor": "eyJhZnRlciI6MTAwM30="}

        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await connector.sync_incremental(
                sync_run, cursor_in=cursor_in
            )

        assert result.succeeded
        assert result.records_seen == 1
        assert len(result.signals) == 1
        assert result.signals[0].external_id == "1004"
        assert result.signals[0].title == "Export fails for large datasets"

        # New cursor for next run
        assert result.cursor_out is not None
        assert result.cursor_out["after_cursor"] == "eyJhZnRlciI6MTAwNH0="


# ─── 3. Rate-limit 429 ──────────────────────────────────


class TestZendeskRateLimitReplay:
    @pytest.mark.asyncio
    async def test_rate_limit_raises_retryable_error(self):
        """429 response raises ConnectorError with retryable=True."""
        connection = _stub_connection()
        connector = ZendeskConnector(db=MagicMock(), connection=connection)
        sync_run = _stub_sync_run(connection_id=connection.id)

        rate_limit_response = Response(
            429,
            json={"error": "Rate limited"},
            headers={"Retry-After": "30"},
            request=Request(
                "GET",
                "https://test-workspace.zendesk.com/api/v2/incremental/tickets/cursor.json",
            ),
        )

        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            return_value=rate_limit_response,
        ):
            with pytest.raises(ConnectorError) as exc_info:
                await connector.backfill(sync_run)

        assert exc_info.value.retryable is True
        assert "rate limited" in str(exc_info.value).lower()


# ─── 4. Idempotent re-run ───────────────────────────────


class TestIdempotentRerun:
    @pytest.mark.asyncio
    async def test_backfill_idempotent_rerun(self):
        """Running the same backfill fixture twice produces identical
        NormalizedSignals — the connector itself is deterministic."""
        connection = _stub_connection()
        connector = ZendeskConnector(db=MagicMock(), connection=connection)

        mock_response = _mock_zendesk_response("zendesk_backfill_page1.json")

        # First run
        sync_run_1 = _stub_sync_run(connection_id=connection.id)
        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result_1 = await connector.backfill(sync_run_1)

        # Second run (same fixture)
        sync_run_2 = _stub_sync_run(connection_id=connection.id)
        with patch(
            "httpx.AsyncClient.get",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result_2 = await connector.backfill(sync_run_2)

        # Both runs produce the same signals
        assert len(result_1.signals) == len(result_2.signals) == 3

        ids_1 = sorted(s.external_id for s in result_1.signals)
        ids_2 = sorted(s.external_id for s in result_2.signals)
        assert ids_1 == ids_2

        # Same checksums — the upsert layer will treat these as unchanged
        checksums_1 = sorted(s.checksum for s in result_1.signals)
        checksums_2 = sorted(s.checksum for s in result_2.signals)
        assert checksums_1 == checksums_2


# ─── 5. CSV normalize ───────────────────────────────────


class TestCSVNormalizeReplay:
    @pytest.mark.asyncio
    async def test_csv_normalize_produces_correct_signals(self):
        """CSV connector normalize converts raw rows to NormalizedSignals
        with correct fields and metadata."""
        connection = _stub_connection(provider="csv_import")
        connector = CSVImportConnector(db=MagicMock(), connection=connection)

        raw_rows = [
            {
                "response_text": "The onboarding flow was confusing",
                "submitted_at": "2026-03-15T10:30:00Z",
                "respondent_id": "resp-101",
                "nps_score": "6",
                "question": "How easy was onboarding?",
                "channel": "email",
                "sentiment": "negative",
                "tags": "onboarding;ux",
            },
            {
                "response_text": "Love the new dashboard design",
                "submitted_at": "2026-03-16T09:00:00Z",
                "respondent_id": "resp-102",
                "nps_score": "9",
                "question": "Rate your experience",
                "channel": "in-app",
                "sentiment": "positive",
                "tags": "dashboard",
            },
        ]

        signals = await connector.normalize(raw_rows)

        assert len(signals) == 2

        first = signals[0]
        assert first.external_id == "resp-101"
        assert first.signal_kind == "survey_response"
        assert first.source_record_type == "survey_response"
        assert first.content_text == "The onboarding flow was confusing"
        assert first.sentiment == "negative"
        assert first.metadata_json["nps_score"] == 6
        assert first.metadata_json["tags"] == ["onboarding", "ux"]
        assert first.metadata_json["channel"] == "email"

        second = signals[1]
        assert second.external_id == "resp-102"
        assert second.sentiment == "positive"
        assert second.metadata_json["nps_score"] == 9


# ─── 6. CSV connector lifecycle ──────────────────────────


class TestCSVConnectorLifecycle:
    @pytest.mark.asyncio
    async def test_csv_lifecycle_connect_validate_disconnect(self):
        """CSV connector lifecycle: connect → validate → disconnect
        transitions status correctly.

        We patch ``transition_source_connection`` to bypass the FSM
        guard so we can verify that each lifecycle method requests the
        correct target state without coupling to the state-machine rules.
        """
        connection = _stub_connection(
            provider="csv_import",
            status=SourceConnectionStatus.configured,
        )

        def _simple_transition(conn, next_status, **kwargs):
            conn.status = next_status
            return conn

        connector = CSVImportConnector(db=MagicMock(), connection=connection)

        with patch(
            "app.connectors.csv_import.transition_source_connection",
            side_effect=_simple_transition,
        ):
            # connect → configured
            await connector.connect()
            assert connection.status == SourceConnectionStatus.configured

            # validate → connected
            result = await connector.validate()
            assert result is True
            assert connection.status == SourceConnectionStatus.connected

            # disconnect → disconnected
            await connector.disconnect()
            assert connection.status == SourceConnectionStatus.disconnected
