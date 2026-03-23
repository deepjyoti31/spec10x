"""
Service tests for the Sprint 1 source foundation.
"""

import uuid

import pytest
from sqlalchemy import func, select

from app.models import (
    DataSource,
    SourceConnectionStatus,
    SourceItem,
    SyncRun,
    SyncRunStatus,
    SyncRunType,
)
from app.services.sources import (
    InvalidSourceConnectionTransition,
    complete_sync_run,
    create_source_connection,
    fail_sync_run,
    get_or_create_default_workspace,
    seed_default_data_sources,
    start_sync_run,
    transition_source_connection,
    upsert_source_item,
)


class TestSourceFoundationServices:
    @pytest.mark.asyncio
    async def test_sync_run_lifecycle_preserves_retry_history(
        self,
        db_session,
        test_user,
    ):
        workspace = await get_or_create_default_workspace(db_session, test_user)
        await seed_default_data_sources(db_session)
        zendesk_source = (
            await db_session.execute(
                select(DataSource).where(DataSource.provider == "zendesk")
            )
        ).scalar_one()

        connection = await create_source_connection(
            db_session,
            workspace=workspace,
            created_by_user=test_user,
            data_source=zendesk_source,
            secret_ref="projects/test/secrets/zendesk-token",
        )

        with pytest.raises(InvalidSourceConnectionTransition):
            transition_source_connection(connection, SourceConnectionStatus.connected)

        transition_source_connection(connection, SourceConnectionStatus.validating)
        transition_source_connection(connection, SourceConnectionStatus.connected)

        failed_run = await start_sync_run(
            db_session,
            connection=connection,
            run_type=SyncRunType.backfill,
            cursor_in={"cursor": None},
        )
        fail_sync_run(
            failed_run,
            connection=connection,
            error_summary="Cursor drift detected",
            records_seen=12,
        )

        retry_run = await start_sync_run(
            db_session,
            connection=connection,
            run_type=SyncRunType.backfill,
            cursor_in={"cursor": None},
            retry_of_run=failed_run,
        )
        complete_sync_run(
            retry_run,
            connection=connection,
            cursor_out={"cursor": "page-2"},
            records_seen=12,
            records_created=10,
            records_updated=2,
            records_unchanged=0,
        )
        await db_session.commit()

        failed_run_check = (
            await db_session.execute(
                select(SyncRun).where(
                    SyncRun.id == failed_run.id,
                    SyncRun.status == SyncRunStatus.failed,
                )
            )
        ).scalar_one()

        assert failed_run_check.error_summary == "Cursor drift detected"
        assert retry_run.retry_of_run_id == failed_run.id
        assert connection.status == SourceConnectionStatus.connected
        assert connection.last_synced_at is not None
        assert connection.last_error_summary is None

    @pytest.mark.asyncio
    async def test_source_item_upsert_is_idempotent(
        self,
        db_session,
        test_user,
    ):
        workspace = await get_or_create_default_workspace(db_session, test_user)
        await seed_default_data_sources(db_session)
        zendesk_source = (
            await db_session.execute(
                select(DataSource).where(DataSource.provider == "zendesk")
            )
        ).scalar_one()

        connection = await create_source_connection(
            db_session,
            workspace=workspace,
            created_by_user=test_user,
            data_source=zendesk_source,
        )

        external_id = f"ticket-{uuid.uuid4()}"
        item, created, unchanged = await upsert_source_item(
            db_session,
            workspace_id=workspace.id,
            source_connection_id=connection.id,
            external_id=external_id,
            source_record_type="ticket",
            checksum="checksum-v1",
        )
        updated_item, created_again, unchanged_again = await upsert_source_item(
            db_session,
            workspace_id=workspace.id,
            source_connection_id=connection.id,
            external_id=external_id,
            source_record_type="ticket",
            checksum="checksum-v2",
        )
        await db_session.commit()

        count = (
            await db_session.execute(
                select(func.count())
                .select_from(SourceItem)
                .where(
                    SourceItem.source_connection_id == connection.id,
                    SourceItem.external_id == external_id,
                )
            )
        ).scalar_one()

        assert created is True
        assert unchanged is False
        assert created_again is False
        assert unchanged_again is False
        assert item.id == updated_item.id
        assert updated_item.checksum == "checksum-v2"
        assert updated_item.last_seen_at >= updated_item.first_seen_at
        assert count == 1

    @pytest.mark.asyncio
    async def test_sync_run_tracks_unchanged_records(
        self,
        db_session,
        test_user,
    ):
        workspace = await get_or_create_default_workspace(db_session, test_user)
        await seed_default_data_sources(db_session)
        zendesk_source = (
            await db_session.execute(
                select(DataSource).where(DataSource.provider == "zendesk")
            )
        ).scalar_one()

        connection = await create_source_connection(
            db_session,
            workspace=workspace,
            created_by_user=test_user,
            data_source=zendesk_source,
            secret_ref="projects/test/secrets/zendesk-token",
        )
        transition_source_connection(connection, SourceConnectionStatus.validating)
        transition_source_connection(connection, SourceConnectionStatus.connected)

        sync_run = await start_sync_run(
            db_session,
            connection=connection,
            run_type=SyncRunType.incremental,
            cursor_in={"cursor": "page-1"},
        )
        complete_sync_run(
            sync_run,
            connection=connection,
            cursor_out={"cursor": "page-2"},
            records_seen=12,
            records_created=3,
            records_updated=4,
            records_unchanged=5,
        )
        await db_session.commit()

        persisted = (
            await db_session.execute(select(SyncRun).where(SyncRun.id == sync_run.id))
        ).scalar_one()
        assert persisted.records_unchanged == 5
