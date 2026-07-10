"""
Tests — Otter.ai backfill, incremental sync, and interview
materialization (US-053-01-03)
"""

import uuid
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from httpx import Response, Request
from sqlalchemy import select

from app.connectors.otter import (
    OTTER_API_BASE_URL,
    OtterConnector,
    build_transcript_text,
)
from app.models import (
    DataSource,
    Interview,
    SourceConnectionStatus,
    SourceItem,
    SyncRunStatus,
)
from app.services.interview_materialization import delete_imported_connection_data
from app.services.sources import (
    create_source_connection,
    get_or_create_default_workspace,
    seed_default_data_sources,
)


# ── Helpers ────────────────────────────────────────────────

def _speech_record(
    sid="otter-speech-1",
    title="Otter Interview call",
    created_at="2025-07-03T12:00:00+00:00",
    transcript=None,
):
    if transcript is None:
        transcript = [
            {"text": "Onboarding took us three weeks.", "speaker": "Alice"},
            {"text": "That is really painful to hear.", "speaker": "Deep"},
        ]
    return {
        "id": sid,
        "title": title,
        "created_at": created_at,
        "duration": 1950, # 32.5 mins in seconds
        "url": f"https://otter.ai/speeches/{sid}",
        "participants": ["alice@acme.com", "deep@spec10x.com"],
        "transcript": transcript,
    }


def _rest_page(speeches):
    return Response(
        200,
        json={"speeches": speeches},
        request=Request("GET", f"{OTTER_API_BASE_URL}/speeches"),
    )


async def _make_connection(db_session, test_user, secret_ref="otter_key_123"):
    workspace = await get_or_create_default_workspace(db_session, test_user)
    await seed_default_data_sources(db_session)
    otter_source = (
        await db_session.execute(
            select(DataSource).where(DataSource.provider == "otter")
        )
    ).scalar_one()
    connection = await create_source_connection(
        db_session,
        workspace=workspace,
        created_by_user=test_user,
        data_source=otter_source,
        secret_ref=secret_ref,
        config_json={"backfill_days": 90},
    )
    return workspace, connection, otter_source


@pytest.fixture
def mock_enqueue(monkeypatch):
    """Stub the arq enqueue so materialization does not need Redis."""
    stub = AsyncMock()
    monkeypatch.setattr(
        "app.services.interview_materialization._enqueue_processing", stub
    )
    return stub


# ── Transcript building ────────────────────────────────────

def test_build_transcript_text_labels_speakers():
    text = build_transcript_text(
        [
            {"text": "Hello there.", "speaker": "Alice"},
            {"text": "", "speaker": "Bob"},
            {"text": "How can I help?", "speaker": ""},
        ]
    )
    assert text == "Alice: Hello there.\nSpeaker: How can I help?"


# ── OtterConnector.backfill ──────────────────────────────────

@pytest.mark.asyncio
async def test_backfill_materializes_interviews(
    db_session, test_user, mock_enqueue
):
    """backfill fetches from REST, writes SourceItems, and materializes Interviews."""
    workspace, connection, _ = await _make_connection(db_session, test_user)

    connector = OtterConnector(db=db_session, connection=connection)
    sync_run = MagicMock()

    raw_batch = [_speech_record(sid="otter-1", title="Acme Sync")]
    mock_response = _rest_page(raw_batch)

    with patch("httpx.AsyncClient.request", new_callable=AsyncMock, return_value=mock_response):
        result = await connector.backfill(sync_run)

    assert result.succeeded
    assert result.records_seen == 1
    assert result.records_created == 1

    # Check database changes
    stmt_item = select(SourceItem).where(
        SourceItem.source_connection_id == connection.id
    )
    items = (await db_session.execute(stmt_item)).scalars().all()
    assert len(items) == 1
    assert items[0].external_id == "otter-1"
    assert items[0].native_entity_type == "interview"

    stmt_int = select(Interview).where(
        Interview.id == items[0].native_entity_id
    )
    interview = (await db_session.execute(stmt_int)).scalar_one()
    assert interview.filename == "Acme Sync"
    assert "Onboarding took us three weeks." in interview.transcript
    assert interview.duration_seconds == 1950
    assert interview.metadata_json["source_provider"] == "otter"


@pytest.mark.asyncio
async def test_backfill_is_idempotent(db_session, test_user, mock_enqueue):
    """Running backfill twice with same records updates counts but doesn't duplicate."""
    workspace, connection, _ = await _make_connection(db_session, test_user)
    connector = OtterConnector(db=db_session, connection=connection)
    sync_run = MagicMock()

    raw_batch = [_speech_record(sid="otter-1")]

    # Run 1
    with patch(
        "httpx.AsyncClient.request",
        new_callable=AsyncMock,
        return_value=_rest_page(raw_batch),
    ):
        res1 = await connector.backfill(sync_run)
    await db_session.commit()
    assert res1.records_created == 1

    # Run 2 (same data)
    with patch(
        "httpx.AsyncClient.request",
        new_callable=AsyncMock,
        return_value=_rest_page(raw_batch),
    ):
        res2 = await connector.backfill(sync_run)
    await db_session.commit()

    assert res2.records_created == 0
    assert res2.records_unchanged == 1

    # Verify 1 SourceItem exists for this connection
    items = (await db_session.execute(
        select(SourceItem).where(SourceItem.source_connection_id == connection.id)
    )).scalars().all()
    assert len(items) == 1


# ── Delete Imported Connection Data ──────────────────────────

@pytest.mark.asyncio
async def test_delete_imported_data_removes_interviews(
    db_session, test_user, mock_enqueue
):
    """delete_imported_connection_data removes Interviews and SourceItems."""
    workspace, connection, _ = await _make_connection(db_session, test_user)
    connector = OtterConnector(db=db_session, connection=connection)
    sync_run = MagicMock()

    with patch(
        "httpx.AsyncClient.request",
        new_callable=AsyncMock,
        return_value=_rest_page([_speech_record(sid="otter-1")]),
    ):
        await connector.backfill(sync_run)
    await db_session.commit()

    # Verify they exist
    items = (await db_session.execute(
        select(SourceItem).where(SourceItem.source_connection_id == connection.id)
    )).scalars().all()
    assert len(items) == 1

    # Delete
    deleted_ints, deleted_sigs = await delete_imported_connection_data(
        db_session, connection=connection
    )
    await db_session.commit()

    assert deleted_ints == 1
    assert deleted_sigs == 0 # Interview materializer doesn't write direct signal rows

    # Verify deleted
    items = (await db_session.execute(
        select(SourceItem).where(SourceItem.source_connection_id == connection.id)
    )).scalars().all()
    assert len(items) == 0
