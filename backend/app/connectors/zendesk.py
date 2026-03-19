"""
Spec10x — Zendesk Connector

Sprint 2: real credential validation via Zendesk API.
Sprint 3: real backfill and incremental sync via Incremental Cursor API.
"""

from __future__ import annotations

import base64
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx

from app.connectors import register_connector
from app.connectors.base import BaseConnector, ConnectorError, NormalizedSignal, SyncResult
from app.models import SourceConnectionStatus, SyncRun
from app.services.sources import transition_source_connection

logger = logging.getLogger(__name__)

# Timeout for Zendesk API calls
_ZENDESK_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# Maximum pages to fetch per sync run (safety valve)
_MAX_PAGES = 100

# Default backfill window in days
_DEFAULT_BACKFILL_DAYS = 90


@register_connector(source_type="support", provider="zendesk")
class ZendeskConnector(BaseConnector):
    """Zendesk Support connector.

    Config expectations (stored in ``connection.config_json``):
        - ``subdomain``: str — the Zendesk account subdomain
        - ``email``: str — admin/agent email for API-token auth
        - ``backfill_days``: int (optional) — how many days of history to import

    Credential storage (``connection.secret_ref``):
        - The API token string (in production, a Secret Manager reference)
    """

    # ── helpers ───────────────────────────────────────────

    @property
    def subdomain(self) -> str:
        config = self.connection.config_json or {}
        subdomain = config.get("subdomain")
        if not subdomain:
            raise ConnectorError("Missing 'subdomain' in connection config")
        return subdomain

    @property
    def email(self) -> str:
        config = self.connection.config_json or {}
        email = config.get("email")
        if not email:
            raise ConnectorError("Missing 'email' in connection config")
        return email

    @property
    def api_token(self) -> str:
        if not self.connection.secret_ref:
            raise ConnectorError("No API token provided for Zendesk connection")
        return self.connection.secret_ref

    @property
    def base_url(self) -> str:
        return f"https://{self.subdomain}.zendesk.com/api/v2"

    @property
    def backfill_days(self) -> int:
        config = self.connection.config_json or {}
        return int(config.get("backfill_days", _DEFAULT_BACKFILL_DAYS))

    def _auth_header(self) -> dict[str, str]:
        """Build Basic auth header for Zendesk API-token authentication."""
        # Zendesk API-token auth: {email}/token:{api_token}
        credentials = f"{self.email}/token:{self.api_token}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return {"Authorization": f"Basic {encoded}"}

    # ── lifecycle ─────────────────────────────────────────

    async def connect(self) -> None:
        """Store credentials and mark connection as configured."""
        if not self.connection.secret_ref:
            raise ConnectorError("No secret_ref provided for Zendesk connection")

        config = self.connection.config_json or {}
        if not config.get("subdomain"):
            raise ConnectorError("Missing 'subdomain' in connection config")
        if not config.get("email"):
            raise ConnectorError("Missing 'email' in connection config")

        transition_source_connection(
            self.connection,
            SourceConnectionStatus.configured,
        )
        logger.info("Zendesk connection configured for subdomain=%s", self.subdomain)

    async def validate(self) -> bool:
        """Test Zendesk credentials by calling /api/v2/users/me.json.

        Returns True if credentials are valid, False otherwise.
        Updates connection status to 'connected' or 'error'.
        """
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.validating,
        )

        try:
            async with httpx.AsyncClient(timeout=_ZENDESK_TIMEOUT) as client:
                response = await client.get(
                    f"{self.base_url}/users/me.json",
                    headers=self._auth_header(),
                )

            if response.status_code == 200:
                data = response.json()
                user_info = data.get("user", {})
                logger.info(
                    "Zendesk validation succeeded: subdomain=%s, user=%s, role=%s",
                    self.subdomain,
                    user_info.get("email"),
                    user_info.get("role"),
                )
                transition_source_connection(
                    self.connection,
                    SourceConnectionStatus.connected,
                )
                self.connection.last_error_summary = None
                return True

            elif response.status_code == 401:
                error_msg = "Invalid credentials — check your email and API token"
                logger.warning(
                    "Zendesk validation failed (401) for subdomain=%s",
                    self.subdomain,
                )
            elif response.status_code == 404:
                error_msg = f"Zendesk subdomain '{self.subdomain}' not found"
                logger.warning(
                    "Zendesk validation failed (404) for subdomain=%s",
                    self.subdomain,
                )
            else:
                error_msg = f"Zendesk API returned status {response.status_code}"
                logger.warning(
                    "Zendesk validation failed (%d) for subdomain=%s",
                    response.status_code,
                    self.subdomain,
                )

            transition_source_connection(
                self.connection,
                SourceConnectionStatus.error,
            )
            self.connection.last_error_summary = error_msg
            return False

        except httpx.ConnectError:
            error_msg = f"Cannot reach {self.subdomain}.zendesk.com — check subdomain"
            logger.error("Zendesk connect error for subdomain=%s", self.subdomain)
            transition_source_connection(
                self.connection,
                SourceConnectionStatus.error,
            )
            self.connection.last_error_summary = error_msg
            return False

        except httpx.TimeoutException:
            error_msg = "Connection to Zendesk timed out — please try again"
            logger.error("Zendesk timeout for subdomain=%s", self.subdomain)
            transition_source_connection(
                self.connection,
                SourceConnectionStatus.error,
            )
            self.connection.last_error_summary = error_msg
            return False

    # ── data fetching ────────────────────────────────────

    async def _fetch_tickets_page(
        self,
        client: httpx.AsyncClient,
        url: str,
    ) -> dict[str, Any]:
        """Fetch a single page from the Zendesk Incremental Cursor API."""
        response = await client.get(url, headers=self._auth_header())

        if response.status_code == 429:
            # Rate limited — respect Retry-After header
            retry_after = int(response.headers.get("Retry-After", "60"))
            raise ConnectorError(
                f"Zendesk rate limited — retry after {retry_after}s",
                retryable=True,
            )

        if response.status_code != 200:
            raise ConnectorError(
                f"Zendesk API error: status {response.status_code}",
                retryable=response.status_code >= 500,
            )

        return response.json()

    async def _paginate_tickets(
        self,
        client: httpx.AsyncClient,
        start_url: str,
    ) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
        """Paginate through all ticket pages.

        Returns (all_tickets, cursor_out).
        """
        all_tickets: list[dict[str, Any]] = []
        url = start_url
        pages = 0

        while url and pages < _MAX_PAGES:
            pages += 1
            data = await self._fetch_tickets_page(client, url)

            tickets = data.get("tickets", [])
            all_tickets.extend(tickets)

            end_of_stream = data.get("end_of_stream", False)
            after_cursor = data.get("after_cursor")

            logger.info(
                "Zendesk page %d: fetched %d tickets, end_of_stream=%s",
                pages,
                len(tickets),
                end_of_stream,
            )

            if end_of_stream or not data.get("after_url"):
                cursor_out = {"after_cursor": after_cursor} if after_cursor else None
                return all_tickets, cursor_out

            url = data["after_url"]

        # Hit max pages
        after_cursor = None
        cursor_out = {"after_cursor": after_cursor} if after_cursor else None
        return all_tickets, cursor_out

    async def backfill(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Import historical Zendesk tickets via Incremental Cursor API.

        Bounded by backfill_days config (default 90 days).
        """
        logger.info(
            "Zendesk backfill started for connection=%s, backfill_days=%d",
            self.connection.id,
            self.backfill_days,
        )

        # Build the initial URL
        if cursor_in and cursor_in.get("after_cursor"):
            # Resume from cursor
            start_url = (
                f"{self.base_url}/incremental/tickets/cursor.json"
                f"?cursor={cursor_in['after_cursor']}"
            )
        else:
            # Start from backfill_days ago
            start_time = int(
                (datetime.now(timezone.utc) - timedelta(days=self.backfill_days))
                .timestamp()
            )
            start_url = (
                f"{self.base_url}/incremental/tickets/cursor.json"
                f"?start_time={start_time}"
            )

        try:
            async with httpx.AsyncClient(timeout=_ZENDESK_TIMEOUT) as client:
                raw_tickets, cursor_out = await self._paginate_tickets(
                    client, start_url
                )
        except ConnectorError:
            raise
        except Exception as exc:
            raise ConnectorError(f"Zendesk backfill fetch error: {exc}") from exc

        # Normalize
        signals = await self.normalize(raw_tickets)

        logger.info(
            "Zendesk backfill complete: connection=%s, tickets=%d, signals=%d",
            self.connection.id,
            len(raw_tickets),
            len(signals),
        )

        return SyncResult(
            signals=signals,
            cursor_out=cursor_out,
            records_seen=len(raw_tickets),
            records_created=len(signals),  # actual count updated by orchestrator
            records_updated=0,
        )

    async def sync_incremental(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Fetch new/updated tickets since last cursor."""
        logger.info(
            "Zendesk incremental sync for connection=%s, cursor=%s",
            self.connection.id,
            cursor_in,
        )

        if not cursor_in or not cursor_in.get("after_cursor"):
            # No cursor — fall back to last 24 hours
            start_time = int(
                (datetime.now(timezone.utc) - timedelta(hours=24)).timestamp()
            )
            start_url = (
                f"{self.base_url}/incremental/tickets/cursor.json"
                f"?start_time={start_time}"
            )
        else:
            start_url = (
                f"{self.base_url}/incremental/tickets/cursor.json"
                f"?cursor={cursor_in['after_cursor']}"
            )

        try:
            async with httpx.AsyncClient(timeout=_ZENDESK_TIMEOUT) as client:
                raw_tickets, cursor_out = await self._paginate_tickets(
                    client, start_url
                )
        except ConnectorError:
            raise
        except Exception as exc:
            raise ConnectorError(
                f"Zendesk incremental sync fetch error: {exc}"
            ) from exc

        signals = await self.normalize(raw_tickets)

        logger.info(
            "Zendesk incremental sync complete: connection=%s, tickets=%d, signals=%d",
            self.connection.id,
            len(raw_tickets),
            len(signals),
        )

        return SyncResult(
            signals=signals,
            cursor_out=cursor_out,
            records_seen=len(raw_tickets),
            records_created=len(signals),
            records_updated=0,
        )

    async def normalize(
        self,
        raw_records: list[dict[str, Any]],
    ) -> list[NormalizedSignal]:
        """Convert Zendesk ticket payloads to NormalizedSignals."""
        signals: list[NormalizedSignal] = []
        for record in raw_records:
            ticket_id = str(record.get("id", ""))
            if not ticket_id:
                continue

            # Parse created_at
            created_at_str = record.get("created_at")
            if created_at_str:
                try:
                    occurred_at = datetime.fromisoformat(
                        created_at_str.replace("Z", "+00:00")
                    )
                except ValueError:
                    occurred_at = datetime.now(timezone.utc)
            else:
                occurred_at = datetime.now(timezone.utc)

            # Build source URL
            subdomain = (self.connection.config_json or {}).get("subdomain", "")
            source_url = (
                f"https://{subdomain}.zendesk.com/agent/tickets/{ticket_id}"
                if subdomain else record.get("url")
            )

            signals.append(
                NormalizedSignal(
                    external_id=ticket_id,
                    source_record_type="ticket",
                    signal_kind="ticket",
                    occurred_at=occurred_at,
                    title=record.get("subject", ""),
                    content_text=record.get("description", ""),
                    author_or_speaker=record.get("requester", {}).get("name")
                    if isinstance(record.get("requester"), dict)
                    else None,
                    sentiment=None,
                    source_url=source_url,
                    metadata_json={
                        "priority": record.get("priority"),
                        "status": record.get("status"),
                        "tags": record.get("tags", []),
                        "ticket_type": record.get("type"),
                        "updated_at": record.get("updated_at"),
                    },
                    checksum=record.get("updated_at"),
                )
            )
        return signals

    async def disconnect(self) -> None:
        """Stop syncs and clear stored credentials."""
        self.connection.secret_ref = None
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.disconnected,
        )
        logger.info(
            "Zendesk connection disconnected for subdomain=%s",
            self.subdomain if self.connection.config_json else "unknown",
        )


