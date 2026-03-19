"""
Spec10x — Sync Orchestrator

Ties together the connector lifecycle (backfill / incremental sync) with
source-item upserts, signal creation, and sync-run bookkeeping.

The connector focuses on fetching + normalizing; this module handles
the database bookkeeping so connectors stay lean.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors import get_connector
from app.connectors.base import BaseConnector, ConnectorError, NormalizedSignal, SyncResult
from app.models import (
    DataSource,
    Signal,
    SignalKind,
    SignalStatus,
    SourceConnection,
    SourceConnectionStatus,
    SourceItem,
    SourceType,
    SyncRun,
    SyncRunStatus,
    SyncRunType,
)
from app.services.sources import (
    complete_sync_run,
    fail_sync_run,
    start_sync_run,
    upsert_source_item,
)

logger = logging.getLogger(__name__)


async def _persist_signals(
    db: AsyncSession,
    *,
    connection: SourceConnection,
    data_source: DataSource,
    signals: list[NormalizedSignal],
) -> tuple[int, int]:
    """Upsert source items and create signals for each NormalizedSignal.

    Returns (records_created, records_updated).
    """
    created = 0
    updated = 0

    for sig in signals:
        source_item, is_new = await upsert_source_item(
            db,
            workspace_id=connection.workspace_id,
            source_connection_id=connection.id,
            external_id=sig.external_id,
            source_record_type=sig.source_record_type,
            external_updated_at=(
                sig.occurred_at if isinstance(sig.occurred_at, datetime) else None
            ),
            checksum=sig.checksum,
        )

        if is_new:
            created += 1

            # Parse signal_kind to enum
            try:
                kind = SignalKind(sig.signal_kind)
            except ValueError:
                kind = SignalKind.ticket

            # Parse occurred_at
            if isinstance(sig.occurred_at, datetime):
                occurred_at = sig.occurred_at
            elif isinstance(sig.occurred_at, str):
                try:
                    occurred_at = datetime.fromisoformat(
                        sig.occurred_at.replace("Z", "+00:00")
                    )
                except ValueError:
                    occurred_at = datetime.now(timezone.utc)
            else:
                occurred_at = datetime.now(timezone.utc)

            signal_row = Signal(
                workspace_id=connection.workspace_id,
                source_connection_id=connection.id,
                source_item_id=source_item.id,
                source_type=data_source.source_type,
                provider=data_source.provider,
                signal_kind=kind,
                occurred_at=occurred_at,
                title=sig.title,
                content_text=sig.content_text or "",
                author_or_speaker=sig.author_or_speaker,
                sentiment=sig.sentiment,
                source_url=sig.source_url,
                metadata_json=sig.metadata_json,
                status=SignalStatus.active,
            )
            db.add(signal_row)
        else:
            updated += 1
            # Optionally: update existing signal content if checksum changed.
            # For Sprint 3 MVP we just count re-seen items.

    await db.flush()
    return created, updated


async def run_backfill(
    db: AsyncSession,
    *,
    connection: SourceConnection,
    data_source: DataSource,
) -> SyncRun:
    """Orchestrate a full backfill flow for the given connection."""

    connector_cls = get_connector(
        data_source.source_type.value,
        data_source.provider,
    )
    if connector_cls is None:
        raise ConnectorError(
            f"No connector for {data_source.provider}", retryable=False
        )

    connector: BaseConnector = connector_cls(db=db, connection=connection)

    # Determine cursor_in from last successful backfill (for resumability)
    last_run_stmt = (
        select(SyncRun)
        .where(
            SyncRun.source_connection_id == connection.id,
            SyncRun.run_type == SyncRunType.backfill,
            SyncRun.status == SyncRunStatus.succeeded,
        )
        .order_by(SyncRun.started_at.desc())
        .limit(1)
    )
    last_run_result = await db.execute(last_run_stmt)
    last_run = last_run_result.scalar_one_or_none()
    cursor_in = last_run.cursor_out if last_run else None

    sync_run = await start_sync_run(
        db,
        connection=connection,
        run_type=SyncRunType.backfill,
        cursor_in=cursor_in,
    )

    try:
        result: SyncResult = await connector.backfill(
            sync_run, cursor_in=cursor_in
        )

        records_created, records_updated = await _persist_signals(
            db,
            connection=connection,
            data_source=data_source,
            signals=result.signals,
        )

        complete_sync_run(
            sync_run,
            connection=connection,
            cursor_out=result.cursor_out,
            records_seen=result.records_seen,
            records_created=records_created,
            records_updated=records_updated,
        )

    except ConnectorError as exc:
        fail_sync_run(
            sync_run,
            connection=connection,
            error_summary=str(exc),
        )
        logger.error("Backfill failed for connection=%s: %s", connection.id, exc)

    except Exception as exc:
        fail_sync_run(
            sync_run,
            connection=connection,
            error_summary=f"Unexpected error: {exc}",
        )
        logger.exception("Unexpected backfill error for connection=%s", connection.id)

    await db.flush()
    return sync_run


async def run_incremental_sync(
    db: AsyncSession,
    *,
    connection: SourceConnection,
    data_source: DataSource,
) -> SyncRun:
    """Orchestrate an incremental sync for the given connection."""

    connector_cls = get_connector(
        data_source.source_type.value,
        data_source.provider,
    )
    if connector_cls is None:
        raise ConnectorError(
            f"No connector for {data_source.provider}", retryable=False
        )

    connector: BaseConnector = connector_cls(db=db, connection=connection)

    # Grab cursor from last successful sync (backfill or incremental)
    last_run_stmt = (
        select(SyncRun)
        .where(
            SyncRun.source_connection_id == connection.id,
            SyncRun.status == SyncRunStatus.succeeded,
        )
        .order_by(SyncRun.started_at.desc())
        .limit(1)
    )
    last_run_result = await db.execute(last_run_stmt)
    last_run = last_run_result.scalar_one_or_none()
    cursor_in = last_run.cursor_out if last_run else None

    sync_run = await start_sync_run(
        db,
        connection=connection,
        run_type=SyncRunType.incremental,
        cursor_in=cursor_in,
    )

    try:
        result: SyncResult = await connector.sync_incremental(
            sync_run, cursor_in=cursor_in
        )

        records_created, records_updated = await _persist_signals(
            db,
            connection=connection,
            data_source=data_source,
            signals=result.signals,
        )

        complete_sync_run(
            sync_run,
            connection=connection,
            cursor_out=result.cursor_out,
            records_seen=result.records_seen,
            records_created=records_created,
            records_updated=records_updated,
        )

    except ConnectorError as exc:
        fail_sync_run(
            sync_run,
            connection=connection,
            error_summary=str(exc),
        )
        logger.error("Incremental sync failed for connection=%s: %s", connection.id, exc)

    except Exception as exc:
        fail_sync_run(
            sync_run,
            connection=connection,
            error_summary=f"Unexpected error: {exc}",
        )
        logger.exception(
            "Unexpected incremental sync error for connection=%s", connection.id
        )

    await db.flush()
    return sync_run
