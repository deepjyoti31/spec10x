"""
Tests — Retry and dead-letter connection suspension (US-053-02-01)
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.connectors.base import ConnectorError
from app.models import SourceConnectionStatus, SyncRunStatus
from app.services.sync_orchestrator import (
    CONSECUTIVE_FAILURE_THRESHOLD,
    run_incremental_sync,
)
from tests.conftest import AUTH_HEADER
from tests.test_fireflies_sync import _make_connection


@pytest.mark.asyncio
async def test_auto_suspension_after_threshold_failures(db_session, test_user):
    """If sync fails CONSECUTIVE_FAILURE_THRESHOLD times, connection is suspended."""
    _, connection, data_source = await _make_connection(db_session, test_user)

    # Initial state
    connection.status = SourceConnectionStatus.connected
    await db_session.commit()

    # Stub the connector to throw errors
    with patch("app.services.sync_orchestrator.get_connector") as mock_get_connector:
        mock_connector_cls = MagicMock()
        mock_connector_instance = mock_connector_cls.return_value
        mock_connector_instance.sync_incremental = AsyncMock(
            side_effect=ConnectorError("Sync failed persistently", retryable=True)
        )
        mock_get_connector.return_value = mock_connector_cls

        # Run sync threshold times
        for i in range(CONSECUTIVE_FAILURE_THRESHOLD):
            # Refresh connection state to avoid cache issues
            await db_session.refresh(connection)
            # Re-set state to connected so run_incremental_sync will run it
            if connection.status == SourceConnectionStatus.error:
                # Normal failure state transitions between syncing -> error
                pass
            elif connection.status == SourceConnectionStatus.error_suspended:
                # Should not reach here before threshold
                pytest.fail("Connection suspended prematurely")

            run = await run_incremental_sync(
                db_session,
                connection=connection,
                data_source=data_source,
            )
            await db_session.commit()
            assert run.status == SyncRunStatus.failed

        # Verify connection is now suspended
        await db_session.refresh(connection)
        assert connection.status == SourceConnectionStatus.error_suspended
        assert "Auto-suspended" in connection.last_error_summary


@pytest.mark.asyncio
async def test_re_enabling_suspended_connection(client, db_session, test_user):
    """POST /api/source-connections/{id}/reenable revalidates the stored key
    and moves the connection to connected."""
    from app.connectors.fireflies import FirefliesConnector

    _, connection, _ = await _make_connection(db_session, test_user)

    # Force suspended status
    connection.status = SourceConnectionStatus.error_suspended
    connection.last_error_summary = "Auto-suspended after consecutive failures"
    await db_session.commit()

    # Re-enable via API — validation runs with the existing key
    with patch.object(
        FirefliesConnector,
        "_graphql",
        new_callable=AsyncMock,
        return_value={"users": [{"user_id": "u1", "name": "Deep", "email": "d@x.com"}]},
    ):
        resp = await client.post(
            f"/api/source-connections/{connection.id}/reenable",
            headers=AUTH_HEADER,
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "connected"
    assert resp.json()["last_error_summary"] is None

    # Verify database state
    await db_session.refresh(connection)
    assert connection.status == SourceConnectionStatus.connected
    assert connection.last_error_summary is None


@pytest.mark.asyncio
async def test_re_enable_with_bad_key_stays_suspended(client, db_session, test_user):
    """If revalidation fails, the connection stays error_suspended so the
    scheduled sync keeps skipping it."""
    from app.connectors.fireflies import FirefliesConnector

    _, connection, _ = await _make_connection(db_session, test_user)

    connection.status = SourceConnectionStatus.error_suspended
    connection.last_error_summary = "Auto-suspended after consecutive failures"
    await db_session.commit()

    with patch.object(
        FirefliesConnector,
        "_graphql",
        new_callable=AsyncMock,
        side_effect=ConnectorError("Fireflies rejected the API key"),
    ):
        resp = await client.post(
            f"/api/source-connections/{connection.id}/reenable",
            headers=AUTH_HEADER,
        )
    assert resp.status_code == 400
    assert "Re-enable failed" in resp.json()["detail"]

    await db_session.refresh(connection)
    assert connection.status == SourceConnectionStatus.error_suspended
    assert "Re-enable failed" in connection.last_error_summary


@pytest.mark.asyncio
async def test_re_enable_rejects_non_suspended_connection(client, db_session, test_user):
    """Re-enable only applies to error_suspended connections."""
    _, connection, _ = await _make_connection(db_session, test_user)

    connection.status = SourceConnectionStatus.connected
    await db_session.commit()

    resp = await client.post(
        f"/api/source-connections/{connection.id}/reenable",
        headers=AUTH_HEADER,
    )
    assert resp.status_code == 400
    assert "error_suspended" in resp.json()["detail"]
