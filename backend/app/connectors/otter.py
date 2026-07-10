"""
Spec10x — Otter.ai Connector (v0.53)

Automatic interview sync via the Otter.ai REST API.
Each Otter speech/transcript materializes into a native ``Interview`` and flows
through the standard processing pipeline. Idempotency lives in ``source_items``.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx

from app.connectors import register_connector
from app.connectors.base import BaseConnector, ConnectorError, NormalizedSignal, SyncResult
from app.models import SourceConnectionStatus, SyncRun
from app.services.interview_materialization import (
    MaterializedMeeting,
    materialize_meetings,
)
from app.services.sources import transition_source_connection

logger = logging.getLogger(__name__)

OTTER_API_BASE_URL = "https://api.otter.ai/v1"
_OTTER_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# Otter pagination page size limit
_PAGE_SIZE = 50
# Maximum pages to fetch per sync run (safety valve)
_MAX_PAGES = 40
# Default backfill window in days
_DEFAULT_BACKFILL_DAYS = 90


def _parse_meeting_date(value: Any) -> datetime | None:
    """Leniently parse datetime from string or timestamp."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value), tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            return None
    return None


def build_transcript_text(transcripts: list[dict[str, Any]] | None) -> str:
    """Render Otter transcripts as a speaker-labelled text block."""
    if not transcripts:
        return ""
    lines: list[str] = []
    for turn in transcripts:
        text = (turn.get("text") or "").strip()
        if not text:
            continue
        speaker = (turn.get("speaker") or "Speaker").strip() or "Speaker"
        lines.append(f"{speaker}: {text}")
    return "\n".join(lines)


@register_connector(source_type="interview", provider="otter")
class OtterConnector(BaseConnector):
    """Otter.ai automatic interview sync connector.

    Config expectations (stored in ``connection.config_json``):
        - ``backfill_days``: int (optional) — meeting history window to import

    Credential storage (``connection.secret_ref``):
        - The Otter.ai API key (in production, a Secret Manager reference)
    """

    # ── helpers ───────────────────────────────────────────

    @property
    def api_key(self) -> str:
        if not self.connection.secret_ref:
            raise ConnectorError("No API key provided for Otter.ai connection")
        return self.connection.secret_ref.strip()

    @property
    def backfill_days(self) -> int:
        config = self.connection.config_json or {}
        return int(config.get("backfill_days", _DEFAULT_BACKFILL_DAYS))

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        client: httpx.AsyncClient,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute one REST API request and surface errors as ConnectorErrors."""
        url = f"{OTTER_API_BASE_URL.rstrip('/')}/{path.lstrip('/')}"
        response = await client.request(
            method,
            url,
            headers=self._headers(),
            params=params,
            json=json_data,
        )

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "60"))
            raise ConnectorError(
                f"Otter.ai rate limited — retry after {retry_after}s",
                retryable=True,
            )
        if response.status_code in (401, 403):
            raise ConnectorError(
                "Invalid Otter.ai API key — check your key in Otter.ai account settings"
            )
        if response.status_code != 200:
            raise ConnectorError(
                f"Otter.ai API error: status {response.status_code}",
                retryable=response.status_code >= 500,
            )

        payload = response.json()
        error = payload.get("error")
        if error:
            message = error.get("message", "Unknown Otter.ai API error")
            lowered = message.lower()
            if "auth" in lowered or "api key" in lowered or "forbidden" in lowered:
                raise ConnectorError(f"Otter.ai rejected the API key: {message}")
            raise ConnectorError(f"Otter.ai API error: {message}")

        return payload

    # ── lifecycle ─────────────────────────────────────────

    async def connect(self) -> None:
        """Store the credential reference and mark the connection configured."""
        if not self.connection.secret_ref:
            raise ConnectorError("No secret_ref provided for Otter.ai connection")
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.configured,
        )
        logger.info("Otter.ai connection configured id=%s", self.connection.id)

    async def validate(self) -> bool:
        """Test the API key with a minimal validation query."""
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
            async with httpx.AsyncClient(timeout=_OTTER_TIMEOUT) as client:
                await self._request(client, "GET", "/me")

            transition_source_connection(
                self.connection,
                SourceConnectionStatus.connected,
            )
            self.connection.last_error_summary = None
            logger.info(
                "Otter.ai validation succeeded for connection=%s", self.connection.id
            )
            return True

        except ConnectorError as exc:
            error_msg = str(exc)
        except httpx.ConnectError:
            error_msg = "Cannot reach api.otter.ai — check your network"
        except httpx.TimeoutException:
            error_msg = "Connection to Otter.ai timed out — please try again"

        logger.warning(
            "Otter.ai validation failed for connection=%s: %s",
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

    async def _fetch_speeches(
        self,
        client: httpx.AsyncClient,
        *,
        from_date: datetime,
    ) -> list[dict[str, Any]]:
        """Paginate through all speeches since ``from_date``."""
        all_speeches: list[dict[str, Any]] = []
        skip = 0
        pages = 0

        while pages < _MAX_PAGES:
            pages += 1
            payload = await self._request(
                client,
                "GET",
                "/speeches",
                params={
                    "limit": _PAGE_SIZE,
                    "skip": skip,
                    "from_date": from_date.isoformat(),
                    "to_date": datetime.now(timezone.utc).isoformat(),
                },
            )
            batch = payload.get("speeches") or []
            all_speeches.extend(batch)

            logger.info(
                "Otter.ai page %d: fetched %d speeches", pages, len(batch)
            )
            if len(batch) < _PAGE_SIZE:
                break
            skip += _PAGE_SIZE

        return all_speeches

    def _to_meeting(self, record: dict[str, Any]) -> MaterializedMeeting | None:
        external_id = str(record.get("id") or "").strip()
        if not external_id:
            return None

        duration = record.get("duration")
        duration_seconds = None
        if isinstance(duration, (int, float)) and duration >= 0:
            duration_seconds = int(duration)

        participants = record.get("participants") or []
        if not isinstance(participants, list):
            participants = []

        return MaterializedMeeting(
            external_id=external_id,
            title=(record.get("title") or "Otter.ai meeting").strip(),
            transcript_text=build_transcript_text(record.get("transcript")),
            occurred_at=_parse_meeting_date(record.get("created_at")),
            duration_seconds=duration_seconds,
            source_url=record.get("url"),
            participants=[str(p) for p in participants if p],
            provider="otter",
        )

    async def _run_sync(
        self,
        *,
        from_date: datetime,
        cursor_in: dict[str, Any] | None,
    ) -> SyncResult:
        try:
            async with httpx.AsyncClient(timeout=_OTTER_TIMEOUT) as client:
                raw_speeches = await self._fetch_speeches(
                    client, from_date=from_date
                )
        except ConnectorError:
            raise
        except Exception as exc:
            raise ConnectorError(f"Otter.ai fetch error: {exc}") from exc

        meetings = [
            meeting
            for meeting in (self._to_meeting(record) for record in raw_speeches)
            if meeting is not None
        ]

        created, updated, unchanged = await materialize_meetings(
            self.db,
            connection=self.connection,
            meetings=meetings,
        )

        # Advance cursor
        meeting_dates = [m.occurred_at for m in meetings if m.occurred_at is not None]
        if meeting_dates:
            cursor_out = {"last_synced_at": max(meeting_dates).isoformat()}
        elif cursor_in and cursor_in.get("last_synced_at"):
            cursor_out = {"last_synced_at": cursor_in["last_synced_at"]}
        else:
            cursor_out = {"last_synced_at": from_date.isoformat()}

        return SyncResult(
            signals=[],
            cursor_out=cursor_out,
            records_seen=len(raw_speeches),
            records_created=created,
            records_updated=updated,
            records_unchanged=unchanged,
        )

    async def backfill(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Import bounded meeting history and materialize interviews."""
        if cursor_in and cursor_in.get("last_synced_at"):
            from_date = _parse_meeting_date(cursor_in["last_synced_at"]) or (
                datetime.now(timezone.utc) - timedelta(days=self.backfill_days)
            )
        else:
            from_date = datetime.now(timezone.utc) - timedelta(days=self.backfill_days)

        logger.info(
            "Otter.ai backfill started for connection=%s, from=%s",
            self.connection.id,
            from_date.isoformat(),
        )
        result = await self._run_sync(from_date=from_date, cursor_in=cursor_in)
        logger.info(
            "Otter.ai backfill complete: connection=%s seen=%d created=%d updated=%d unchanged=%d",
            self.connection.id,
            result.records_seen,
            result.records_created,
            result.records_updated,
            result.records_unchanged,
        )
        return result

    async def sync_incremental(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Fetch meetings since the last cursor and materialize new ones."""
        if cursor_in and cursor_in.get("last_synced_at"):
            from_date = _parse_meeting_date(cursor_in["last_synced_at"]) or (
                datetime.now(timezone.utc) - timedelta(hours=24)
            )
        else:
            from_date = datetime.now(timezone.utc) - timedelta(hours=24)

        logger.info(
            "Otter.ai incremental sync for connection=%s, from=%s",
            self.connection.id,
            from_date.isoformat(),
        )
        result = await self._run_sync(from_date=from_date, cursor_in=cursor_in)
        logger.info(
            "Otter.ai incremental sync complete: connection=%s seen=%d created=%d updated=%d unchanged=%d",
            self.connection.id,
            result.records_seen,
            result.records_created,
            result.records_updated,
            result.records_unchanged,
        )
        return result

    async def normalize(
        self,
        raw_records: list[dict[str, Any]],
    ) -> list[NormalizedSignal]:
        """Otter.ai does not emit provider signal rows.

        Meetings materialize into native interviews.
        """
        return []

    async def disconnect(self) -> None:
        """Stop syncs and clear the stored credential reference."""
        self.connection.secret_ref = None
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.disconnected,
        )
        logger.info(
            "Otter.ai connection disconnected id=%s", self.connection.id
        )
