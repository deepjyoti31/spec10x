"""
Tests — Credential rotation (US-053-02-02)
"""

import pytest
from sqlalchemy import select

from app.models import SourceConnection, SourceConnectionStatus
from app.services.sources import rotate_credentials
from tests.conftest import AUTH_HEADER
from tests.test_fireflies_sync import _make_connection


@pytest.mark.asyncio
async def test_rotate_credentials_service(db_session, test_user):
    """rotate_credentials updates the secret_ref and moves connection to configured."""
    _, connection, _ = await _make_connection(db_session, test_user)

    connection.status = SourceConnectionStatus.connected
    await db_session.commit()

    # Rotate credentials
    new_key = "new_ff_key_456"
    updated_conn = await rotate_credentials(
        db_session,
        connection=connection,
        new_secret_ref=new_key,
    )
    await db_session.commit()

    assert updated_conn.secret_ref == new_key
    assert updated_conn.status == SourceConnectionStatus.configured
    assert updated_conn.last_error_summary is None


@pytest.mark.asyncio
async def test_rotate_credentials_api(client, db_session, test_user):
    """PUT /api/source-connections/{id}/credentials rotates key and updates config."""
    _, connection, _ = await _make_connection(db_session, test_user)

    connection.status = SourceConnectionStatus.error_suspended
    connection.last_error_summary = "Suspended due to failures"
    await db_session.commit()

    # Rotate via API
    new_key = "rotated_api_key_789"
    new_config = {"backfill_days": 30, "other_option": True}

    resp = await client.put(
        f"/api/source-connections/{connection.id}/credentials",
        json={
            "data_source_id": str(connection.data_source_id),
            "secret_ref": new_key,
            "config_json": new_config,
        },
        headers=AUTH_HEADER,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "configured"

    # Verify secret_ref updated in DB
    await db_session.refresh(connection)
    assert connection.secret_ref == new_key
    assert connection.config_json == new_config
    assert connection.status == SourceConnectionStatus.configured
    assert connection.last_error_summary is None
