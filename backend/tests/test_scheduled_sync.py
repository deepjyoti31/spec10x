"""
Tests — hourly scheduled connector sync cron (US-051-03-01)
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import text

import app.core.database as database_module
from app.models import SourceConnectionStatus, SyncRunStatus
from app.workers.worker import scheduled_connector_sync
from tests.test_fireflies_sync import _make_connection


@pytest.mark.asyncio
async def test_one_failing_connection_does_not_abort_the_cron(db_session, test_user):
    """A connection whose sync raises must be skipped, and every other
    eligible connection must still be synced in the same run."""
    _, first, _ = await _make_connection(db_session, test_user)
    _, second, _ = await _make_connection(db_session, test_user)
    for connection in (first, second):
        connection.status = SourceConnectionStatus.connected
    await db_session.commit()
    mine = {first.id, second.id}

    calls: list = []

    async def fake_sync(db, *, connection, data_source):
        if connection.id not in mine:
            return MagicMock(status=SyncRunStatus.succeeded)
        calls.append(connection.id)
        # Real syncs write (sync run rows) before they can fail, so the
        # session has an open transaction that the cron must roll back.
        await db.execute(text("SELECT 1"))
        if len(calls) == 1:
            raise RuntimeError("boom")
        return MagicMock(status=SyncRunStatus.succeeded)

    # The cron uses the app's global engine; build it on this test's loop.
    database_module._engine = None
    database_module._session_factory = None
    try:
        with patch(
            "app.services.sync_orchestrator.run_incremental_sync",
            new=AsyncMock(side_effect=fake_sync),
        ):
            result = await scheduled_connector_sync({})
    finally:
        if database_module._engine is not None:
            await database_module._engine.dispose()
        database_module._engine = None
        database_module._session_factory = None

    assert sorted(calls) == sorted(mine)
    assert result["failed"] >= 1
    assert result["synced"] >= 1
