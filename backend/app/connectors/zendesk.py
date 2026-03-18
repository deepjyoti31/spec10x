"""
Spec10x — Zendesk Connector

Sprint 2: real credential validation via Zendesk API.
Backfill and incremental sync remain stubs for Sprint 3.
"""

from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

from app.connectors import register_connector
from app.connectors.base import BaseConnector, ConnectorError, NormalizedSignal, SyncResult
from app.models import SourceConnectionStatus, SyncRun
from app.services.sources import transition_source_connection

logger = logging.getLogger(__name__)

# Timeout for Zendesk API calls
_ZENDESK_TIMEOUT = httpx.Timeout(15.0, connect=10.0)


@register_connector(source_type="support", provider="zendesk")
class ZendeskConnector(BaseConnector):
    """Zendesk Support connector.

    Config expectations (stored in ``connection.config_json``):
        - ``subdomain``: str — the Zendesk account subdomain
        - ``email``: str — admin/agent email for API-token auth

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

    async def backfill(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Import historical Zendesk tickets.

        TODO (Sprint 3): paginate through /api/v2/incremental/tickets/cursor.
        """
        logger.info(
            "Zendesk backfill started for connection=%s (stub)",
            self.connection.id,
        )
        return SyncResult(
            signals=[],
            cursor_out=cursor_in,
            records_seen=0,
            records_created=0,
            records_updated=0,
        )

    async def sync_incremental(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Fetch new/updated tickets since last cursor.

        TODO (Sprint 3): implement incremental sync via cursor API.
        """
        logger.info(
            "Zendesk incremental sync for connection=%s (stub)",
            self.connection.id,
        )
        return SyncResult(
            signals=[],
            cursor_out=cursor_in,
            records_seen=0,
            records_created=0,
            records_updated=0,
        )

    async def normalize(
        self,
        raw_records: list[dict[str, Any]],
    ) -> list[NormalizedSignal]:
        """Convert Zendesk ticket payloads to NormalizedSignals."""
        signals: list[NormalizedSignal] = []
        for record in raw_records:
            signals.append(
                NormalizedSignal(
                    external_id=str(record.get("id", "")),
                    source_record_type="ticket",
                    signal_kind="ticket",
                    occurred_at=record.get("created_at"),
                    title=record.get("subject", ""),
                    content_text=record.get("description", ""),
                    author_or_speaker=record.get("requester", {}).get("name"),
                    sentiment=None,
                    source_url=record.get("url"),
                    metadata_json={
                        "priority": record.get("priority"),
                        "status": record.get("status"),
                        "tags": record.get("tags", []),
                    },
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

