"""
Tests — Fireflies backfill, incremental sync, and interview
materialization (US-051-02-01 … US-051-03-05).
"""

import uuid
from unittest.mock import patch, AsyncMock, MagicMock

import pytest
from httpx import Response, Request
from sqlalchemy import select

from app.connectors.fireflies import (
    FIREFLIES_GRAPHQL_URL,
    FirefliesConnector,
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

def _transcript_record(
    tid="ff-meeting-1",
    title="Discovery call with Acme",
    date_ms=1751500800000,  # 2025-07-03 UTC
    sentences=None,
):
    if sentences is None:
        sentences = [
            {"text": "Onboarding took us three weeks.", "speaker_name": "Alice"},
            {"text": "That is really painful to hear.", "speaker_name": "Deep"},
        ]
    return {
        "id": tid,
        "title": title,
        "date": date_ms,
        "duration": 32.5,
        "transcript_url": f"https://app.fireflies.ai/view/{tid}",
        "participants": ["alice@acme.com", "deep@spec10x.com"],
        "sentences": sentences,
    }


def _graphql_page(transcripts):
    return Response(
        200,
        json={"data": {"transcripts": transcripts}},
        request=Request("POST", FIREFLIES_GRAPHQL_URL),
    )


async def _make_connection(db_session, test_user, secret_ref="ff_key_123"):
    workspace = await get_or_create_default_workspace(db_session, test_user)
    await seed_default_data_sources(db_session)
    fireflies_source = (
        await db_session.execute(
            select(DataSource).where(DataSource.provider == "fireflies")
        )
    ).scalar_one()
    connection = await create_source_connection(
        db_session,
        workspace=workspace,
        created_by_user=test_user,
        data_source=fireflies_source,
        secret_ref=secret_ref,
        config_json={"backfill_days": 90},
    )
    return workspace, connection, fireflies_source


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
            {"text": "Hello there.", "speaker_name": "Alice"},
            {"text": "", "speaker_name": "Bob"},
            {"text": "Hi Alice.", "speaker_name": None},
        ]
    )
    assert text == "Alice: Hello there.\nSpeaker: Hi Alice."


def test_build_transcript_text_empty():
    assert build_transcript_text(None) == ""
    assert build_transcript_text([]) == ""


# ── Backfill materialization ───────────────────────────────

@pytest.mark.asyncio
async def test_backfill_materializes_interviews(db_session, test_user, mock_enqueue):
    workspace, connection, data_source = await _make_connection(db_session, test_user)
    connector = FirefliesConnector(db=db_session, connection=connection)

    page = _graphql_page([
        _transcript_record("ff-m1", "Discovery call with Acme"),
        _transcript_record("ff-m2", "Churn interview with Globex"),
    ])

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=page):
        result = await connector.backfill(MagicMock())

    assert result.records_seen == 2
    assert result.records_created == 2
    assert result.records_updated == 0
    assert result.cursor_out and result.cursor_out.get("last_synced_at")

    interviews = (
        await db_session.execute(
            select(Interview).where(
                Interview.user_id == test_user.id,
                Interview.file_hash.isnot(None),
                Interview.filename.in_(
                    ["Discovery call with Acme", "Churn interview with Globex"]
                ),
            )
        )
    ).scalars().all()
    assert len(interviews) == 2
    for interview in interviews:
        assert interview.transcript
        assert "Alice:" in interview.transcript
        assert interview.metadata_json["source_provider"] == "fireflies"
        assert interview.metadata_json["source_url"].startswith("https://app.fireflies.ai/")
        assert interview.storage_path == ""

    source_items = (
        await db_session.execute(
            select(SourceItem).where(
                SourceItem.source_connection_id == connection.id
            )
        )
    ).scalars().all()
    assert {item.external_id for item in source_items} == {"ff-m1", "ff-m2"}
    assert all(item.native_entity_type == "interview" for item in source_items)

    # Each new interview is enqueued for the standard pipeline
    assert mock_enqueue.await_count == 2


@pytest.mark.asyncio
async def test_backfill_is_idempotent(db_session, test_user, mock_enqueue):
    """Running the same backfill twice must not duplicate interviews."""
    workspace, connection, data_source = await _make_connection(db_session, test_user)
    connector = FirefliesConnector(db=db_session, connection=connection)

    def fresh_page():
        return _graphql_page([_transcript_record("ff-dup-1", "Repeat meeting")])

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=fresh_page()):
        first = await connector.backfill(MagicMock())
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=fresh_page()):
        second = await connector.backfill(MagicMock())

    assert first.records_created == 1
    assert second.records_created == 0
    assert second.records_unchanged == 1

    count = len(
        (
            await db_session.execute(
                select(SourceItem).where(
                    SourceItem.source_connection_id == connection.id,
                    SourceItem.external_id == "ff-dup-1",
                )
            )
        ).scalars().all()
    )
    assert count == 1
    assert mock_enqueue.await_count == 1


@pytest.mark.asyncio
async def test_changed_transcript_reprocesses(db_session, test_user, mock_enqueue):
    """A changed upstream transcript resets and re-enqueues the interview."""
    workspace, connection, data_source = await _make_connection(db_session, test_user)
    connector = FirefliesConnector(db=db_session, connection=connection)

    original = _graphql_page([_transcript_record("ff-edit-1", "Edited meeting")])
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=original):
        await connector.backfill(MagicMock())

    edited = _graphql_page([
        _transcript_record(
            "ff-edit-1",
            "Edited meeting",
            sentences=[{"text": "A corrected transcript.", "speaker_name": "Alice"}],
        )
    ])
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=edited):
        result = await connector.backfill(MagicMock())

    assert result.records_updated == 1
    assert result.records_created == 0

    item = (
        await db_session.execute(
            select(SourceItem).where(
                SourceItem.source_connection_id == connection.id,
                SourceItem.external_id == "ff-edit-1",
            )
        )
    ).scalar_one()
    interview = await db_session.get(Interview, item.native_entity_id)
    assert "A corrected transcript." in interview.transcript
    assert mock_enqueue.await_count == 2  # initial + reprocess


@pytest.mark.asyncio
async def test_user_deleted_interview_is_not_recreated(db_session, test_user, mock_enqueue):
    """Source-item tombstones stop syncs from resurrecting deleted interviews."""
    workspace, connection, data_source = await _make_connection(db_session, test_user)
    connector = FirefliesConnector(db=db_session, connection=connection)

    def fresh_page():
        return _graphql_page([_transcript_record("ff-del-1", "Deleted meeting")])

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=fresh_page()):
        await connector.backfill(MagicMock())

    item = (
        await db_session.execute(
            select(SourceItem).where(
                SourceItem.source_connection_id == connection.id,
                SourceItem.external_id == "ff-del-1",
            )
        )
    ).scalar_one()
    interview = await db_session.get(Interview, item.native_entity_id)
    await db_session.delete(interview)
    await db_session.flush()

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=fresh_page()):
        result = await connector.backfill(MagicMock())

    assert result.records_created == 0
    assert result.records_unchanged == 1
    remaining = (
        await db_session.execute(
            select(Interview).where(Interview.id == item.native_entity_id)
        )
    ).scalar_one_or_none()
    assert remaining is None
    assert mock_enqueue.await_count == 1


# ── Incremental sync ───────────────────────────────────────

@pytest.mark.asyncio
async def test_incremental_uses_cursor(db_session, test_user, mock_enqueue):
    workspace, connection, data_source = await _make_connection(db_session, test_user)
    connector = FirefliesConnector(db=db_session, connection=connection)

    page = _graphql_page([])
    with patch(
        "httpx.AsyncClient.post", new_callable=AsyncMock, return_value=page
    ) as mock_post:
        result = await connector.sync_incremental(
            MagicMock(),
            cursor_in={"last_synced_at": "2026-07-01T00:00:00+00:00"},
        )

    variables = mock_post.call_args.kwargs["json"]["variables"]
    assert variables["fromDate"].startswith("2026-07-01T00:00:00")
    # Empty window carries the cursor forward so no gap opens up
    assert result.cursor_out == {"last_synced_at": "2026-07-01T00:00:00+00:00"}


@pytest.mark.asyncio
async def test_empty_meetings_are_skipped(db_session, test_user, mock_enqueue):
    """Meetings without sentences count as seen but are not materialized."""
    workspace, connection, data_source = await _make_connection(db_session, test_user)
    connector = FirefliesConnector(db=db_session, connection=connection)

    page = _graphql_page([
        _transcript_record("ff-empty-1", "Silent meeting", sentences=[]),
    ])
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=page):
        result = await connector.sync_incremental(MagicMock())

    assert result.records_seen == 1
    assert result.records_created == 0
    mock_enqueue.assert_not_awaited()


# ── Orchestrator integration ───────────────────────────────

@pytest.mark.asyncio
async def test_run_backfill_records_materialized_counts(db_session, test_user, mock_enqueue):
    """The orchestrator sync run reports meetings materialized, not signals."""
    from app.services.sync_orchestrator import run_backfill
    from app.services.sources import transition_source_connection

    workspace, connection, data_source = await _make_connection(db_session, test_user)
    transition_source_connection(connection, SourceConnectionStatus.validating)
    transition_source_connection(connection, SourceConnectionStatus.connected)

    page = _graphql_page([_transcript_record("ff-orch-1", "Orchestrated meeting")])
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=page):
        sync_run = await run_backfill(
            db_session,
            connection=connection,
            data_source=data_source,
        )

    assert sync_run.status == SyncRunStatus.succeeded
    assert sync_run.records_seen == 1
    assert sync_run.records_created == 1
    assert sync_run.cursor_out and sync_run.cursor_out.get("last_synced_at")
    assert connection.status == SourceConnectionStatus.connected
    assert connection.last_synced_at is not None


# ── Disconnect and imported-data delete ────────────────────

@pytest.mark.asyncio
async def test_disconnect_clears_secret(db_session, test_user):
    workspace, connection, data_source = await _make_connection(db_session, test_user)
    connector = FirefliesConnector(db=db_session, connection=connection)

    await connector.disconnect()
    assert connection.status == SourceConnectionStatus.disconnected
    assert connection.secret_ref is None


@pytest.mark.asyncio
async def test_delete_imported_data_removes_interviews(db_session, test_user, mock_enqueue):
    workspace, connection, data_source = await _make_connection(db_session, test_user)
    connector = FirefliesConnector(db=db_session, connection=connection)

    page = _graphql_page([
        _transcript_record("ff-wipe-1", "Meeting to delete"),
        _transcript_record("ff-wipe-2", "Second meeting to delete"),
    ])
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=page):
        await connector.backfill(MagicMock())

    interviews_deleted, signals_deleted = await delete_imported_connection_data(
        db_session, connection=connection
    )

    assert interviews_deleted == 2
    remaining_items = (
        await db_session.execute(
            select(SourceItem).where(SourceItem.source_connection_id == connection.id)
        )
    ).scalars().all()
    assert remaining_items == []
