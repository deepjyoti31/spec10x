"""
Spec10x — Zendesk Connector (Stub)

Sprint 1 scaffold.  Real API integration is Sprint 2 work
(US-05-02-01 and beyond).  All lifecycle methods are wired but
raise ``NotImplementedError`` where real HTTP calls will go.
"""

from __future__ import annotations

import logging
from typing import Any

from app.connectors import register_connector
from app.connectors.base import BaseConnector, ConnectorError, NormalizedSignal, SyncResult
from app.models import SourceConnectionStatus, SyncRun
from app.services.sources import transition_source_connection

logger = logging.getLogger(__name__)


@register_connector(source_type="support", provider="zendesk")
class ZendeskConnector(BaseConnector):
    """Zendesk Support connector.

    Config expectations (stored in ``connection.config_json``):
        - ``subdomain``: str — the Zendesk account subdomain
        - ``email``: str (optional) — admin/agent email for API-token auth

    Credential storage (``connection.secret_ref``):
        - Secret Manager resource name holding the API token
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
    def base_url(self) -> str:
        return f"https://{self.subdomain}.zendesk.com/api/v2"

    # ── lifecycle ─────────────────────────────────────────

    async def connect(self) -> None:
        """Store credentials and mark connection as configured."""
        if not self.connection.secret_ref:
            raise ConnectorError("No secret_ref provided for Zendesk connection")
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.configured,
        )
        logger.info("Zendesk connection configured for subdomain=%s", self.subdomain)

    async def validate(self) -> bool:
        """Test Zendesk credentials by calling /api/v2/users/me.

        TODO (Sprint 2): implement real API call.
        """
        logger.info(
            "Validating Zendesk credentials for subdomain=%s (stub)",
            self.subdomain,
        )
        # Sprint 2: fetch self.base_url + "/users/me.json" with token auth
        # For now, transition to validating then connected as a stub
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.validating,
        )
        transition_source_connection(
            self.connection,
            SourceConnectionStatus.connected,
        )
        return True

    async def backfill(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Import historical Zendesk tickets.

        TODO (Sprint 2): paginate through /api/v2/incremental/tickets/cursor.
        """
        logger.info(
            "Zendesk backfill started for connection=%s (stub)",
            self.connection.id,
        )
        # Sprint 2: implement real ticket fetching
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

        TODO (Sprint 2): implement incremental sync via cursor API.
        """
        logger.info(
            "Zendesk incremental sync for connection=%s (stub)",
            self.connection.id,
        )
        # Sprint 2: implement real incremental sync
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
        """Convert Zendesk ticket payloads to NormalizedSignals.

        TODO (Sprint 2): implement real normalization.
        """
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
