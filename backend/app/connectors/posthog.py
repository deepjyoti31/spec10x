"""
Spec10x — PostHog Connector (v0.52)

First analytics connector. Imports weekly event-count metric windows via
the PostHog Query API (HogQL) and normalizes them into ``metric_window``
signals.

Guardrails (PRD-052-01):
- one signal per event per week — never raw event payloads
- top ``max_events`` events by volume only, to avoid metric spam
- signals carry no sentiment; analytics is treated as related evidence,
  not customer voice
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.connectors import register_connector
from app.connectors.base import BaseConnector, ConnectorError, NormalizedSignal, SyncResult
from app.models import SourceConnectionStatus, SyncRun
from app.services.sources import transition_source_connection

logger = logging.getLogger(__name__)

DEFAULT_POSTHOG_HOST = "https://us.posthog.com"

_POSTHOG_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# Default and maximum historical window, in whole weeks
_DEFAULT_BACKFILL_WEEKS = 12
_MAX_BACKFILL_WEEKS = 26

# Track only the highest-volume events so analytics stays signal, not noise
_DEFAULT_MAX_EVENTS = 20
_MAX_EVENTS_CAP = 50

_WEEKLY_COUNTS_QUERY = """
SELECT event, toStartOfWeek(timestamp) AS week_start, count() AS occurrences
FROM events
WHERE timestamp >= toDateTime({from_date})
GROUP BY event, week_start
ORDER BY week_start ASC
"""


def _week_start(moment: datetime) -> datetime:
    """Monday 00:00 UTC of the week containing ``moment``."""
    moment = moment.astimezone(timezone.utc)
    start = (moment - timedelta(days=moment.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return start


def _parse_week_start(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def build_metric_windows(
    rows: list[list[Any]],
    *,
    max_events: int,
) -> list[dict[str, Any]]:
    """Turn HogQL result rows into per-event weekly metric-window records.

    ``rows`` are ``[event, week_start, occurrences]`` triples. Only the top
    ``max_events`` events by total volume are kept, and each window carries
    the previous week's count so normalization can state a direction.
    """
    series: dict[str, dict[datetime, int]] = {}
    for row in rows:
        if not isinstance(row, (list, tuple)) or len(row) < 3:
            continue
        event = str(row[0] or "").strip()
        week = _parse_week_start(row[1])
        if not event or week is None:
            continue
        try:
            count = int(row[2])
        except (TypeError, ValueError):
            continue
        series.setdefault(event, {})[week] = count

    top_events = sorted(
        series,
        key=lambda name: (-sum(series[name].values()), name),
    )[:max_events]

    windows: list[dict[str, Any]] = []
    for event in top_events:
        weeks = sorted(series[event])
        for week in weeks:
            # "previous" only counts when the prior week is actually adjacent
            previous_count = series[event].get(week - timedelta(weeks=1))
            windows.append(
                {
                    "event": event,
                    "window_start": week,
                    "window_end": week + timedelta(weeks=1),
                    "count": series[event][week],
                    "previous_count": previous_count,
                }
            )
    return windows


def describe_change(count: int, previous_count: int | None) -> tuple[str, float | None]:
    """Return (direction, change_pct) comparing a window to the prior week."""
    if previous_count is None:
        return "new", None
    if previous_count == 0:
        return ("up", None) if count > 0 else ("flat", 0.0)
    change_pct = round((count - previous_count) / previous_count * 100, 1)
    if change_pct > 0:
        return "up", change_pct
    if change_pct < 0:
        return "down", change_pct
    return "flat", 0.0


@register_connector(source_type="analytics", provider="posthog")
class PostHogConnector(BaseConnector):
    """PostHog product analytics connector.

    Config expectations (stored in ``connection.config_json``):
        - ``project_id``: str | int — the PostHog project ID
        - ``host``: str (optional) — PostHog instance URL, defaults to US cloud
        - ``backfill_weeks``: int (optional) — weekly history to import
        - ``max_events``: int (optional) — top-events cap

    Credential storage (``connection.secret_ref``):
        - A read-only personal API key (in production, a Secret Manager reference)
    """

    # ── helpers ───────────────────────────────────────────

    @property
    def api_key(self) -> str:
        if not self.connection.secret_ref:
            raise ConnectorError("No API key provided for PostHog connection")
        return self.connection.secret_ref.strip()

    @property
    def host(self) -> str:
        config = self.connection.config_json or {}
        host = str(config.get("host") or DEFAULT_POSTHOG_HOST).strip()
        return host.rstrip("/") or DEFAULT_POSTHOG_HOST

    @property
    def project_id(self) -> str:
        config = self.connection.config_json or {}
        project_id = str(config.get("project_id") or "").strip()
        if not project_id:
            raise ConnectorError("Missing 'project_id' in connection config")
        return project_id

    @property
    def backfill_weeks(self) -> int:
        config = self.connection.config_json or {}
        weeks = int(config.get("backfill_weeks", _DEFAULT_BACKFILL_WEEKS))
        return max(1, min(weeks, _MAX_BACKFILL_WEEKS))

    @property
    def max_events(self) -> int:
        config = self.connection.config_json or {}
        cap = int(config.get("max_events", _DEFAULT_MAX_EVENTS))
        return max(1, min(cap, _MAX_EVENTS_CAP))

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _project_url(self) -> str:
        return f"{self.host}/api/projects/{self.project_id}"

    async def _query(
        self,
        client: httpx.AsyncClient,
        *,
        from_date: datetime,
    ) -> list[list[Any]]:
        """Run the weekly-counts HogQL query and return result rows."""
        response = await client.post(
            f"{self._project_url()}/query/",
            headers=self._headers(),
            json={
                "query": {
                    "kind": "HogQLQuery",
                    "query": _WEEKLY_COUNTS_QUERY.replace(
                        "{from_date}", f"'{from_date.strftime('%Y-%m-%d %H:%M:%S')}'"
                    ),
                }
            },
        )

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "60"))
            raise ConnectorError(
                f"PostHog rate limited — retry after {retry_after}s",
                retryable=True,
            )
        if response.status_code == 401:
            raise ConnectorError(
                "Invalid PostHog API key — check the key in PostHog → Settings → Personal API keys"
            )
        if response.status_code == 403:
            raise ConnectorError(
                "PostHog API key lacks access to this project — check the key's scopes"
            )
        if response.status_code == 404:
            raise ConnectorError(
                f"PostHog project '{self.project_id}' not found on {self.host}"
            )
        if response.status_code != 200:
            raise ConnectorError(
                f"PostHog API error: status {response.status_code}",
                retryable=response.status_code >= 500,
            )

        payload = response.json()
        results = payload.get("results")
        return results if isinstance(results, list) else []

    # ── lifecycle ─────────────────────────────────────────

    async def connect(self) -> None:
        """Store the credential reference and mark the connection configured."""
        if not self.connection.secret_ref:
            raise ConnectorError("No secret_ref provided for PostHog connection")
        config = self.connection.config_json or {}
        if not str(config.get("project_id") or "").strip():
            raise ConnectorError("Missing 'project_id' in connection config")
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.configured,
        )
        logger.info("PostHog connection configured id=%s", self.connection.id)

    async def validate(self) -> bool:
        """Test the API key by reading the configured project."""
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.validating,
        )

        if not self.connection.secret_ref:
            self.connection.last_error_summary = "No API key provided"
            transition_source_connection(
                self.connection,
                SourceConnectionStatus.error,
            )
            return False

        try:
            self.project_id
            async with httpx.AsyncClient(timeout=_POSTHOG_TIMEOUT) as client:
                response = await client.get(
                    f"{self._project_url()}/",
                    headers=self._headers(),
                )

            if response.status_code == 200:
                transition_source_connection(
                    self.connection,
                    SourceConnectionStatus.connected,
                )
                self.connection.last_error_summary = None
                logger.info(
                    "PostHog validation succeeded for connection=%s project=%s",
                    self.connection.id,
                    self.project_id,
                )
                return True

            if response.status_code == 401:
                error_msg = "Invalid PostHog API key — check the key in PostHog → Settings → Personal API keys"
            elif response.status_code == 403:
                error_msg = "PostHog API key lacks access to this project — check the key's scopes"
            elif response.status_code == 404:
                error_msg = f"PostHog project '{self.project_id}' not found on {self.host}"
            else:
                error_msg = f"PostHog API returned status {response.status_code}"

        except ConnectorError as exc:
            error_msg = str(exc)
        except httpx.ConnectError:
            error_msg = f"Cannot reach {self.host} — check the host URL and your network"
        except httpx.TimeoutException:
            error_msg = "Connection to PostHog timed out — please try again"

        logger.warning(
            "PostHog validation failed for connection=%s: %s",
            self.connection.id,
            error_msg,
        )
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.error,
        )
        self.connection.last_error_summary = error_msg
        return False

    # ── data fetching ────────────────────────────────────

    async def _run_sync(
        self,
        *,
        from_date: datetime,
    ) -> SyncResult:
        try:
            async with httpx.AsyncClient(timeout=_POSTHOG_TIMEOUT) as client:
                rows = await self._query(client, from_date=from_date)
        except ConnectorError:
            raise
        except Exception as exc:
            raise ConnectorError(f"PostHog fetch error: {exc}") from exc

        windows = build_metric_windows(rows, max_events=self.max_events)
        signals = await self.normalize(windows)

        if windows:
            latest_window_start = max(w["window_start"] for w in windows)
            cursor_out = {"last_window_start": latest_window_start.isoformat()}
        else:
            cursor_out = {"last_window_start": _week_start(from_date).isoformat()}

        return SyncResult(
            signals=signals,
            cursor_out=cursor_out,
            records_seen=len(windows),
            records_created=len(signals),  # actual count updated by orchestrator
            records_updated=0,
        )

    async def backfill(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Import bounded weekly metric-window history."""
        from_date = _week_start(
            datetime.now(timezone.utc) - timedelta(weeks=self.backfill_weeks)
        )

        logger.info(
            "PostHog backfill started for connection=%s, from=%s",
            self.connection.id,
            from_date.isoformat(),
        )
        result = await self._run_sync(from_date=from_date)
        logger.info(
            "PostHog backfill complete: connection=%s windows=%d",
            self.connection.id,
            result.records_seen,
        )
        return result

    async def sync_incremental(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Refresh the current and previous week's metric windows.

        Weekly windows keep changing while the week is in progress, so the
        incremental sync re-reads from one week before the cursor — the
        checksum on each window keeps re-reads idempotent.
        """
        cursor_week = None
        if cursor_in and cursor_in.get("last_window_start"):
            cursor_week = _parse_week_start(cursor_in["last_window_start"])

        if cursor_week is not None:
            from_date = cursor_week - timedelta(weeks=1)
        else:
            from_date = _week_start(datetime.now(timezone.utc) - timedelta(weeks=2))

        logger.info(
            "PostHog incremental sync for connection=%s, from=%s",
            self.connection.id,
            from_date.isoformat(),
        )
        result = await self._run_sync(from_date=from_date)
        logger.info(
            "PostHog incremental sync complete: connection=%s windows=%d",
            self.connection.id,
            result.records_seen,
        )
        return result

    async def normalize(
        self,
        raw_records: list[dict[str, Any]],
    ) -> list[NormalizedSignal]:
        """Convert metric-window records into NormalizedSignals.

        Wording stays correlational on purpose — a metric window is related
        evidence, never a proven cause (US-052-01-03).
        """
        signals: list[NormalizedSignal] = []
        for record in raw_records:
            event = str(record.get("event") or "").strip()
            window_start = record.get("window_start")
            if not event or not isinstance(window_start, datetime):
                continue

            window_end = record.get("window_end")
            if not isinstance(window_end, datetime):
                window_end = window_start + timedelta(weeks=1)

            count = int(record.get("count") or 0)
            previous_count = record.get("previous_count")
            direction, change_pct = describe_change(count, previous_count)

            week_label = window_start.strftime("%b %d, %Y")
            if direction == "new":
                summary = (
                    f"'{event}' recorded {count:,} events in the week of {week_label} "
                    f"(no prior week for comparison)."
                )
            elif direction == "flat":
                summary = (
                    f"'{event}' held flat at {count:,} events in the week of {week_label}."
                )
            elif change_pct is None:
                summary = (
                    f"'{event}' recorded {count:,} events in the week of {week_label}, "
                    f"up from zero the week before."
                )
            else:
                verb = "rose" if direction == "up" else "fell"
                summary = (
                    f"'{event}' {verb} {abs(change_pct)}% week over week "
                    f"({previous_count:,} → {count:,}) in the week of {week_label}."
                )

            signals.append(
                NormalizedSignal(
                    external_id=f"{event}|{window_start.date().isoformat()}",
                    source_record_type="metric_window",
                    signal_kind="metric_window",
                    occurred_at=window_end,
                    title=f"'{event}' — week of {week_label}",
                    content_text=summary,
                    author_or_speaker=None,
                    # Guardrail: analytics carries no sentiment; volume shifts
                    # are not customer voice (US-052-01-03)
                    sentiment=None,
                    source_url=f"{self.host}/project/{self.project_id}",
                    metadata_json={
                        "metric": "weekly_event_count",
                        "unit": "events",
                        "event": event,
                        "window_start": window_start.isoformat(),
                        "window_end": window_end.isoformat(),
                        "value": count,
                        "previous_value": previous_count,
                        "change_pct": change_pct,
                        "direction": direction,
                    },
                    checksum=str(count),
                )
            )
        return signals

    async def disconnect(self) -> None:
        """Stop syncs and clear the stored credential reference.

        Imported metric-window signals are kept — imported-data delete is a
        separate, explicit action.
        """
        self.connection.secret_ref = None
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.disconnected,
        )
        logger.info("PostHog connection disconnected id=%s", self.connection.id)
