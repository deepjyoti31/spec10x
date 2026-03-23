"""
Spec10x — Sync Orchestrator

Ties together the connector lifecycle (backfill / incremental sync) with
source-item upserts, signal creation, and sync-run bookkeeping.

The connector focuses on fetching + normalizing; this module handles
the database bookkeeping so connectors stay lean.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors import get_connector
from app.connectors.base import BaseConnector, ConnectorError, NormalizedSignal, SyncResult
from app.models import (
    DataSource,
    SourceConnection,
    SourceConnectionStatus,
    SyncRun,
    SyncRunStatus,
    SyncRunType,
)
from app.services.signals import upsert_external_signals
from app.services.sources import (
    complete_sync_run,
    fail_sync_run,
    start_sync_run,
)

logger = logging.getLogger(__name__)


async def _persist_signals(
    db: AsyncSession,
    *,
    connection: SourceConnection,
    data_source: DataSource,
    signals: list[NormalizedSignal],
) -> tuple[int, int, int]:
    """Upsert source items and normalized signals for a source connection."""
    return await upsert_external_signals(
        db,
        connection=connection,
        data_source=data_source,
        signals=signals,
    )


def _calculate_duration_ms(sync_run: SyncRun) -> int | None:
    if sync_run.started_at is None or sync_run.finished_at is None:
        return None
    return max(int((sync_run.finished_at - sync_run.started_at).total_seconds() * 1000), 0)


def _calculate_duplicate_rate(
    *,
    records_seen: int,
    records_unchanged: int,
) -> float:
    if records_seen <= 0:
        return 0.0
    return round(records_unchanged / records_seen, 4)


def _log_sync_event(
    *,
    event: str,
    sync_run: SyncRun,
    connection: SourceConnection,
    data_source: DataSource,
    status: str,
    duration_ms: int | None = None,
    time_to_first_insight_ms: int | None = None,
) -> None:
    payload = {
        "event": event,
        "provider": data_source.provider,
        "source_type": data_source.source_type.value,
        "workspace_id": str(connection.workspace_id),
        "connection_id": str(connection.id),
        "sync_run_id": str(sync_run.id),
        "run_type": sync_run.run_type.value,
        "status": status,
        "records_seen": sync_run.records_seen,
        "records_created": sync_run.records_created,
        "records_updated": sync_run.records_updated,
        "records_unchanged": sync_run.records_unchanged,
        "duplicate_rate": _calculate_duplicate_rate(
            records_seen=sync_run.records_seen,
            records_unchanged=sync_run.records_unchanged,
        ),
        "duration_ms": duration_ms,
        "time_to_first_insight_ms": time_to_first_insight_ms,
        "error_summary": sync_run.error_summary,
    }
    logger.info(json.dumps(payload, default=str))


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
    _log_sync_event(
        event="sync_run_started",
        sync_run=sync_run,
        connection=connection,
        data_source=data_source,
        status="running",
    )

    try:
        result: SyncResult = await connector.backfill(
            sync_run, cursor_in=cursor_in
        )

        records_created, records_updated, records_unchanged = await _persist_signals(
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
            records_unchanged=records_unchanged,
        )
        duration_ms = _calculate_duration_ms(sync_run)
        _log_sync_event(
            event="sync_run_succeeded",
            sync_run=sync_run,
            connection=connection,
            data_source=data_source,
            status="succeeded",
            duration_ms=duration_ms,
            time_to_first_insight_ms=duration_ms if last_run is None and records_created > 0 else None,
        )

    except ConnectorError as exc:
        fail_sync_run(
            sync_run,
            connection=connection,
            error_summary=str(exc),
        )
        _log_sync_event(
            event="sync_run_failed",
            sync_run=sync_run,
            connection=connection,
            data_source=data_source,
            status="failed",
            duration_ms=_calculate_duration_ms(sync_run),
        )
        logger.error("Backfill failed for connection=%s: %s", connection.id, exc)

    except Exception as exc:
        fail_sync_run(
            sync_run,
            connection=connection,
            error_summary=f"Unexpected error: {exc}",
        )
        _log_sync_event(
            event="sync_run_failed",
            sync_run=sync_run,
            connection=connection,
            data_source=data_source,
            status="failed",
            duration_ms=_calculate_duration_ms(sync_run),
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
    _log_sync_event(
        event="sync_run_started",
        sync_run=sync_run,
        connection=connection,
        data_source=data_source,
        status="running",
    )

    try:
        result: SyncResult = await connector.sync_incremental(
            sync_run, cursor_in=cursor_in
        )

        records_created, records_updated, records_unchanged = await _persist_signals(
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
            records_unchanged=records_unchanged,
        )
        duration_ms = _calculate_duration_ms(sync_run)
        _log_sync_event(
            event="sync_run_succeeded",
            sync_run=sync_run,
            connection=connection,
            data_source=data_source,
            status="succeeded",
            duration_ms=duration_ms,
            time_to_first_insight_ms=duration_ms if last_run is None and records_created > 0 else None,
        )

    except ConnectorError as exc:
        fail_sync_run(
            sync_run,
            connection=connection,
            error_summary=str(exc),
        )
        _log_sync_event(
            event="sync_run_failed",
            sync_run=sync_run,
            connection=connection,
            data_source=data_source,
            status="failed",
            duration_ms=_calculate_duration_ms(sync_run),
        )
        logger.error("Incremental sync failed for connection=%s: %s", connection.id, exc)

    except Exception as exc:
        fail_sync_run(
            sync_run,
            connection=connection,
            error_summary=f"Unexpected error: {exc}",
        )
        _log_sync_event(
            event="sync_run_failed",
            sync_run=sync_run,
            connection=connection,
            data_source=data_source,
            status="failed",
            duration_ms=_calculate_duration_ms(sync_run),
        )
        logger.exception(
            "Unexpected incremental sync error for connection=%s", connection.id
        )

    await db.flush()
    return sync_run
