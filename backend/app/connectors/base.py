"""
Spec10x — Base Connector Contract

Every external data-source connector must subclass ``BaseConnector``
and implement the six lifecycle methods described in the v0.5 connector
architecture (§ 8.2):

    connect → validate → backfill / sync_incremental → normalize → disconnect

The platform orchestrates these methods; the connector itself should
**never** contain product logic, scoring logic, or UI logic.
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SourceConnection, SyncRun


# ── Result types ─────────────────────────────────────────

@dataclass
class NormalizedSignal:
    """One evidence row ready to be written into the ``signals`` table."""

    external_id: str
    source_record_type: str
    signal_kind: str
    occurred_at: datetime
    content_text: str
    title: str | None = None
    author_or_speaker: str | None = None
    sentiment: str | None = None
    source_url: str | None = None
    metadata_json: dict[str, Any] | None = None
    checksum: str | None = None


@dataclass
class SyncResult:
    """Outcome of a ``backfill`` or ``sync_incremental`` run."""

    signals: list[NormalizedSignal] = field(default_factory=list)
    cursor_out: dict[str, Any] | None = None
    records_seen: int = 0
    records_created: int = 0
    records_updated: int = 0
    error_summary: str | None = None

    @property
    def succeeded(self) -> bool:
        return self.error_summary is None


class ConnectorError(Exception):
    """Raised when a connector operation fails in a recoverable way."""

    def __init__(self, message: str, *, retryable: bool = False) -> None:
        super().__init__(message)
        self.retryable = retryable


# ── Abstract base class ──────────────────────────────────

class BaseConnector(ABC):
    """Abstract base for all Spec10x data-source connectors.

    Constructor receives the DB session and current connection record.
    Subclasses should store any provider-specific helpers (HTTP clients,
    parsed config, etc.) as instance attributes initialised in
    ``__init__``.
    """

    def __init__(
        self,
        db: AsyncSession,
        connection: SourceConnection,
    ) -> None:
        self.db = db
        self.connection = connection

    # ── Lifecycle methods ─────────────────────────────────

    @abstractmethod
    async def connect(self) -> None:
        """Store credential references and mark the connection as configured.

        Called exactly once when the user first sets up the connection.
        """

    @abstractmethod
    async def validate(self) -> bool:
        """Test that stored credentials and required scopes are usable.

        Returns ``True`` if the credentials are valid, ``False`` otherwise.
        On failure, should populate ``connection.last_error_summary``.
        """

    @abstractmethod
    async def backfill(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Import historical records from the upstream provider.

        May be called multiple times with successive cursors if the
        history is paginated.
        """

    @abstractmethod
    async def sync_incremental(
        self,
        sync_run: SyncRun,
        *,
        cursor_in: dict[str, Any] | None = None,
    ) -> SyncResult:
        """Fetch only new or changed records since the last cursor.

        The platform will supply ``cursor_in`` from the previous run's
        ``cursor_out``.
        """

    @abstractmethod
    async def normalize(
        self,
        raw_records: list[dict[str, Any]],
    ) -> list[NormalizedSignal]:
        """Convert provider-specific payloads into ``NormalizedSignal``s.

        Called by ``backfill`` / ``sync_incremental`` internally, but
        exposed as a standalone method so the platform can also call it
        for re-normalization or testing.
        """

    @abstractmethod
    async def disconnect(self) -> None:
        """Stop future syncs and remove stored secret references.

        After this call the connection status should be ``disconnected``
        and ``secret_ref`` should be ``None``.
        """
