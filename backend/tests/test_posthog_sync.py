"""
Tests — PostHog backfill, incremental sync, and normalization
(US-052-02-02, US-052-02-03, US-052-01-01, US-052-01-03, US-052-04-02)
"""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from httpx import Response, Request

from app.connectors.base import ConnectorError
from app.connectors.posthog import (
    PostHogConnector,
    build_metric_windows,
    describe_change,
    _week_start,
)
from app.models import SourceConnectionStatus
from tests.conftest import AUTH_HEADER

FIXTURES_DIR = Path(__file__).parent / "fixtures"


# ── helpers ────────────────────────────────────────────────

def _make_connector(api_key="phx_key_123", project_id="123", config_extra=None):
    conn = MagicMock()
    conn.config_json = {"project_id": project_id, **(config_extra or {})}
    conn.secret_ref = api_key
    conn.status = SourceConnectionStatus.connected
    conn.last_error_summary = None

    connector = PostHogConnector.__new__(PostHogConnector)
    connector.db = MagicMock()
    connector.connection = conn
    return connector


def _fixture_rows():
    payload = json.loads((FIXTURES_DIR / "posthog_query_weekly.json").read_text())
    return payload["results"]


async def _create_validated_connection(client, project_id="123"):
    sources_resp = await client.get("/api/data-sources", headers=AUTH_HEADER)
    posthog_source = next(
        s for s in sources_resp.json() if s["provider"] == "posthog"
    )
    create_resp = await client.post(
        "/api/source-connections",
        json={
            "data_source_id": posthog_source["id"],
            "secret_ref": "phx_test_key_123",
            "config_json": {"project_id": project_id},
        },
        headers=AUTH_HEADER,
    )
    assert create_resp.status_code == 201
    conn_id = create_resp.json()["id"]

    project_ok = Response(
        200,
        json={"id": 123, "name": "Spec10x"},
        request=Request("GET", "https://us.posthog.com/api/projects/123/"),
    )
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=project_ok):
        validate_resp = await client.post(
            f"/api/source-connections/{conn_id}/validate",
            headers=AUTH_HEADER,
        )
    assert validate_resp.status_code == 200
    return conn_id


def _recent_rows(now=None):
    """Two events across the last three fully-started weeks."""
    now = now or datetime.now(timezone.utc)
    w0 = _week_start(now)
    w1 = w0 - timedelta(weeks=1)
    w2 = w0 - timedelta(weeks=2)
    return [
        ["search_performed", w2.isoformat(), 1240],
        ["search_performed", w1.isoformat(), 1017],
        ["search_performed", w0.isoformat(), 310],
        ["signup_completed", w2.isoformat(), 55],
        ["signup_completed", w1.isoformat(), 61],
    ]


# ── unit: window building and change math ──────────────────

def test_build_metric_windows_caps_top_events():
    """Only the top max_events events by volume become windows (US-052-01-03)."""
    week = "2026-06-08T00:00:00Z"
    rows = [[f"event_{i}", week, 100 - i] for i in range(30)]

    windows = build_metric_windows(rows, max_events=5)

    assert len(windows) == 5
    assert {w["event"] for w in windows} == {f"event_{i}" for i in range(5)}


def test_build_metric_windows_previous_requires_adjacent_week():
    """A gap week means no previous_count, so no bogus percent change."""
    rows = [
        ["search", "2026-06-01T00:00:00Z", 100],
        ["search", "2026-06-08T00:00:00Z", 120],
        # gap: week of 2026-06-15 missing
        ["search", "2026-06-22T00:00:00Z", 90],
    ]
    windows = build_metric_windows(rows, max_events=10)
    by_week = {w["window_start"].date().isoformat(): w for w in windows}

    assert by_week["2026-06-01"]["previous_count"] is None
    assert by_week["2026-06-08"]["previous_count"] == 100
    assert by_week["2026-06-22"]["previous_count"] is None


def test_describe_change_directions():
    assert describe_change(110, 100) == ("up", 10.0)
    assert describe_change(82, 100) == ("down", -18.0)
    assert describe_change(100, 100) == ("flat", 0.0)
    assert describe_change(50, None) == ("new", None)
    assert describe_change(50, 0) == ("up", None)
    assert describe_change(0, 0) == ("flat", 0.0)


# ── unit: normalization semantics ──────────────────────────

@pytest.mark.asyncio
async def test_normalize_metric_window_semantics():
    """Windows become metric_window signals with metric semantics and no sentiment."""
    connector = _make_connector()
    week = datetime(2026, 6, 15, tzinfo=timezone.utc)
    windows = [
        {
            "event": "search_performed",
            "window_start": week,
            "window_end": week + timedelta(weeks=1),
            "count": 1017,
            "previous_count": 1240,
        }
    ]

    signals = await connector.normalize(windows)

    assert len(signals) == 1
    signal = signals[0]
    assert signal.external_id == "search_performed|2026-06-15"
    assert signal.signal_kind == "metric_window"
    assert signal.sentiment is None  # guardrail: analytics is not customer voice
    assert signal.checksum == "1017"
    assert "fell 18.0%" in signal.content_text
    assert "1,240" in signal.content_text and "1,017" in signal.content_text
    assert signal.metadata_json["metric"] == "weekly_event_count"
    assert signal.metadata_json["direction"] == "down"
    assert signal.metadata_json["change_pct"] == -18.0
    assert signal.source_url == "https://us.posthog.com/project/123"
    # correlational wording only — no causal claims
    assert "because" not in signal.content_text.lower()
    assert "caused" not in signal.content_text.lower()


@pytest.mark.asyncio
async def test_normalize_fixture_replay():
    """Replay a captured Query API response end to end (US-052-04-02)."""
    connector = _make_connector()
    windows = build_metric_windows(_fixture_rows(), max_events=20)
    signals = await connector.normalize(windows)

    assert len(signals) == 8
    by_id = {s.external_id: s for s in signals}
    dashboard_w2 = by_id["dashboard_viewed|2026-06-15"]
    assert dashboard_w2.metadata_json["direction"] == "up"
    assert dashboard_w2.metadata_json["value"] == 902
    export_first = by_id["export_clicked|2026-06-15"]
    assert export_first.metadata_json["direction"] == "new"
    assert export_first.metadata_json["previous_value"] is None


# ── unit: rate limiting ────────────────────────────────────

@pytest.mark.asyncio
async def test_backfill_rate_limited_is_retryable():
    """429 from the Query API surfaces as a retryable ConnectorError."""
    connector = _make_connector()
    rate_limited = Response(
        429,
        json={"detail": "Rate limited"},
        headers={"Retry-After": "120"},
        request=Request("POST", "https://us.posthog.com/api/projects/123/query/"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=rate_limited):
        with pytest.raises(ConnectorError) as exc_info:
            await connector.backfill(MagicMock())

    assert exc_info.value.retryable is True
    assert "rate limited" in str(exc_info.value).lower()


# ── integration: backfill via API ──────────────────────────

@pytest.mark.asyncio
async def test_backfill_creates_analytics_signals(client):
    """POST /backfill imports weekly metric windows as analytics feed signals."""
    conn_id = await _create_validated_connection(client)
    rows = _recent_rows()

    with patch.object(
        PostHogConnector, "_query", new_callable=AsyncMock, return_value=rows
    ):
        backfill_resp = await client.post(
            f"/api/source-connections/{conn_id}/backfill",
            headers=AUTH_HEADER,
        )

    assert backfill_resp.status_code == 200
    run = backfill_resp.json()
    assert run["status"] == "succeeded"
    assert run["records_seen"] == 5
    assert run["records_created"] == 5
    assert run["cursor_out"]["last_window_start"] is not None

    feed_resp = await client.get("/api/feed?source=analytics", headers=AUTH_HEADER)
    assert feed_resp.status_code == 200
    feed_rows = feed_resp.json()
    posthog_rows = [r for r in feed_rows if r["provider"] == "posthog"]
    assert len(posthog_rows) >= 5
    sample = next(r for r in posthog_rows if "search_performed" in (r["title"] or ""))
    assert sample["source_type"] == "analytics"
    assert sample["signal_kind"] == "metric_window"
    assert sample["sentiment"] is None
    assert sample["link"]["label"] == "Open in PostHog"


@pytest.mark.asyncio
async def test_backfill_is_idempotent(client):
    """Re-running a backfill with identical data creates nothing new."""
    conn_id = await _create_validated_connection(client)
    rows = _recent_rows()

    with patch.object(
        PostHogConnector, "_query", new_callable=AsyncMock, return_value=rows
    ):
        first = await client.post(
            f"/api/source-connections/{conn_id}/backfill",
            headers=AUTH_HEADER,
        )
        second = await client.post(
            f"/api/source-connections/{conn_id}/backfill",
            headers=AUTH_HEADER,
        )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["records_created"] == 5
    assert second.json()["records_created"] == 0
    assert second.json()["records_unchanged"] == 5


@pytest.mark.asyncio
async def test_incremental_sync_resumes_from_cursor(client):
    """Incremental sync re-reads from one week before the stored cursor."""
    conn_id = await _create_validated_connection(client)
    rows = _recent_rows()
    seen_from_dates: list[datetime] = []

    async def _capture_query(self, http_client, *, from_date):
        seen_from_dates.append(from_date)
        return rows

    with patch.object(PostHogConnector, "_query", _capture_query):
        backfill_resp = await client.post(
            f"/api/source-connections/{conn_id}/backfill",
            headers=AUTH_HEADER,
        )
        assert backfill_resp.status_code == 200
        cursor_week = datetime.fromisoformat(
            backfill_resp.json()["cursor_out"]["last_window_start"]
        )

        sync_resp = await client.post(
            f"/api/source-connections/{conn_id}/sync",
            headers=AUTH_HEADER,
        )
        assert sync_resp.status_code == 200

    assert len(seen_from_dates) == 2
    # the incremental read starts one week before the cursor so the previous
    # (possibly still-changing) window is refreshed too
    assert seen_from_dates[1] == cursor_week - timedelta(weeks=1)
    assert sync_resp.json()["status"] == "succeeded"
    assert sync_resp.json()["records_created"] == 0
    assert sync_resp.json()["records_unchanged"] == 5
