"""
Spec10x — Fireflies Connector (v0.51)

Automatic interview sync via the Fireflies GraphQL API.

Unlike Zendesk/CSV, this connector does not emit signal rows from
``normalize()``. Each Fireflies meeting materializes into a native
``Interview`` (see ``app.services.interview_materialization``) and flows
through the standard processing pipeline, which produces per-insight
signals. Idempotency lives in ``source_items``.
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

FIREFLIES_GRAPHQL_URL = "https://api.fireflies.ai/graphql"

_FIREFLIES_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# Fireflies caps transcript queries at 50 per page
_PAGE_SIZE = 50

# Maximum pages to fetch per sync run (safety valve)
_MAX_PAGES = 40

# Default backfill window in days
_DEFAULT_BACKFILL_DAYS = 90

_VALIDATE_QUERY = """
query ValidateKey {
  users {
    user_id
    name
    email
  }
}
"""

_TRANSCRIPTS_QUERY = """
query Transcripts($limit: Int, $skip: Int, $fromDate: DateTime, $toDate: DateTime) {
  transcripts(limit: $limit, skip: $skip, fromDate: $fromDate, toDate: $toDate) {
    id
    title
    date
    duration
    transcript_url
    participants
    sentences {
      text
      speaker_name
    }
  }
}
"""


def _parse_meeting_date(value: Any) -> datetime | None:
    """Fireflies returns ``date`` as epoch milliseconds; be lenient anyway."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value) / 1000.0, tz=timezone.utc)
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


def build_transcript_text(sentences: list[dict[str, Any]] | None) -> str:
    """Render Fireflies sentences as a speaker-labelled transcript."""
    if not sentences:
        return ""
    lines: list[str] = []
    for sentence in sentences:
        text = (sentence.get("text") or "").strip()
        if not text:
            continue
        speaker = (sentence.get("speaker_name") or "Speaker").strip() or "Speaker"
        lines.append(f"{speaker}: {text}")
    return "\n".join(lines)


@register_connector(source_type="interview", provider="fireflies")
class FirefliesConnector(BaseConnector):
    """Fireflies automatic interview sync connector.

    Config expectations (stored in ``connection.config_json``):
        - ``backfill_days``: int (optional) — meeting history window to import

    Credential storage (``connection.secret_ref``):
        - The Fireflies API key (in production, a Secret Manager reference)
    """

    # ── helpers ───────────────────────────────────────────

    @property
    def api_key(self) -> str:
        if not self.connection.secret_ref:
            raise ConnectorError("No API key provided for Fireflies connection")
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

    async def _graphql(
        self,
        client: httpx.AsyncClient,
        query: str,
        variables: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute one GraphQL request and surface errors as ConnectorErrors."""
        response = await client.post(
            FIREFLIES_GRAPHQL_URL,
            headers=self._headers(),
            json={"query": query, "variables": variables or {}},
        )

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "60"))
            raise ConnectorError(
                f"Fireflies rate limited — retry after {retry_after}s",
                retryable=True,
            )
        if response.status_code in (401, 403):
            raise ConnectorError(
                "Invalid Fireflies API key — check the key in Fireflies → Integrations"
            )
        if response.status_code != 200:
            raise ConnectorError(
                f"Fireflies API error: status {response.status_code}",
                retryable=response.status_code >= 500,
            )

        payload = response.json()
        errors = payload.get("errors")
        if errors:
            message = errors[0].get("message", "Unknown Fireflies API error")
            lowered = message.lower()
            if "auth" in lowered or "api key" in lowered or "forbidden" in lowered:
                raise ConnectorError(f"Fireflies rejected the API key: {message}")
            raise ConnectorError(f"Fireflies API error: {message}")

        return payload.get("data") or {}

    # ── lifecycle ─────────────────────────────────────────

    async def connect(self) -> None:
        """Store the credential reference and mark the connection configured."""
        if not self.connection.secret_ref:
            raise ConnectorError("No secret_ref provided for Fireflies connection")
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.configured,
        )
        logger.info("Fireflies connection configured id=%s", self.connection.id)

    async def validate(self) -> bool:
        """Test the API key with a minimal users query."""
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
            async with httpx.AsyncClient(timeout=_FIREFLIES_TIMEOUT) as client:
                await self._graphql(client, _VALIDATE_QUERY)

            transition_source_connection(
                self.connection,
                SourceConnectionStatus.connected,
            )
            self.connection.last_error_summary = None
            logger.info(
                "Fireflies validation succeeded for connection=%s", self.connection.id
            )
            return True

        except ConnectorError as exc:
            error_msg = str(exc)
        except httpx.ConnectError:
            error_msg = "Cannot reach api.fireflies.ai — check your network"
        except httpx.TimeoutException:
            error_msg = "Connection to Fireflies timed out — please try again"

        logger.warning(
            "Fireflies validation failed for connection=%s: %s",
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

    async def _fetch_transcripts(
        self,
        client: httpx.AsyncClient,
        *,
        from_date: datetime,
    ) -> list[dict[str, Any]]:
        """Paginate through all transcripts since ``from_date``."""
        all_transcripts: list[dict[str, Any]] = []
        skip = 0
        pages = 0

        while pages < _MAX_PAGES:
            pages += 1
            data = await self._graphql(
                client,
                _TRANSCRIPTS_QUERY,
                {
                    "limit": _PAGE_SIZE,
                    "skip": skip,
                    "fromDate": from_date.isoformat(),
                    "toDate": datetime.now(timezone.utc).isoformat(),
                },
            )
            batch = data.get("transcripts") or []
            all_transcripts.extend(batch)

            logger.info(
                "Fireflies page %d: fetched %d transcripts", pages, len(batch)
            )
            if len(batch) < _PAGE_SIZE:
                break
            skip += _PAGE_SIZE

        return all_transcripts

    def _to_meeting(self, record: dict[str, Any]) -> MaterializedMeeting | None:
        external_id = str(record.get("id") or "").strip()
        if not external_id:
            return None

        duration = record.get("duration")
        duration_seconds = None
        if isinstance(duration, (int, float)) and duration >= 0:
            # Fireflies reports duration in minutes
            duration_seconds = int(float(duration) * 60)

        participants = record.get("participants") or []
        if not isinstance(participants, list):
            participants = []

        return MaterializedMeeting(
            external_id=external_id,
            title=(record.get("title") or "Fireflies meeting").strip(),
            transcript_text=build_transcript_text(record.get("sentences")),
            occurred_at=_parse_meeting_date(record.get("date")),
            duration_seconds=duration_seconds,
            source_url=record.get("transcript_url"),
            participants=[str(p) for p in participants if p],
            provider="fireflies",
        )

    async def _run_sync(
        self,
        *,
        from_date: datetime,
        cursor_in: dict[str, Any] | None,
    ) -> SyncResult:
        try:
            async with httpx.AsyncClient(timeout=_FIREFLIES_TIMEOUT) as client:
                raw_transcripts = await self._fetch_transcripts(
                    client, from_date=from_date
                )
        except ConnectorError:
            raise
        except Exception as exc:
            raise ConnectorError(f"Fireflies fetch error: {exc}") from exc

        meetings = [
            meeting
            for meeting in (self._to_meeting(record) for record in raw_transcripts)
            if meeting is not None
        ]

        created, updated, unchanged = await materialize_meetings(
            self.db,
            connection=self.connection,
            meetings=meetings,
        )

        # Advance the cursor to the newest meeting seen; if nothing came
        # back, carry the previous cursor forward so no window is skipped.
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
            records_seen=len(raw_transcripts),
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
            "Fireflies backfill started for connection=%s, from=%s",
            self.connection.id,
            from_date.isoformat(),
        )
        result = await self._run_sync(from_date=from_date, cursor_in=cursor_in)
        logger.info(
            "Fireflies backfill complete: connection=%s seen=%d created=%d updated=%d unchanged=%d",
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
            "Fireflies incremental sync for connection=%s, from=%s",
            self.connection.id,
            from_date.isoformat(),
        )
        result = await self._run_sync(from_date=from_date, cursor_in=cursor_in)
        logger.info(
            "Fireflies incremental sync complete: connection=%s seen=%d created=%d updated=%d unchanged=%d",
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
        """Fireflies does not emit provider signal rows.

        Meetings materialize into native interviews; per-insight signals are
        produced by the standard processing pipeline (see PRD-051-01).
        """
        return []

    async def disconnect(self) -> None:
        """Stop syncs and clear the stored credential reference.

        Materialized interviews are kept — imported-data delete is a
        separate, explicit action.
        """
        self.connection.secret_ref = None
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.disconnected,
        )
        logger.info(
            "Fireflies connection disconnected id=%s", self.connection.id
        )
