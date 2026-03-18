"""
Source foundation services for workspace resolution, connection lifecycle,
sync-run bookkeeping, and idempotent source-item upserts.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    ConnectionMethod,
    DataSource,
    SourceConnection,
    SourceConnectionStatus,
    SourceItem,
    SourceType,
    SyncRun,
    SyncRunStatus,
    SyncRunType,
    User,
    Workspace,
    WorkspaceKind,
)


DEFAULT_SOURCE_CATALOG = (
    {
        "source_type": SourceType.support,
        "provider": "zendesk",
        "display_name": "Zendesk",
        "connection_method": ConnectionMethod.api_token,
    },
    {
        "source_type": SourceType.survey,
        "provider": "csv_import",
        "display_name": "Survey CSV Import",
        "connection_method": ConnectionMethod.csv_upload,
    },
    {
        "source_type": SourceType.interview,
        "provider": "native_upload",
        "display_name": "Interview Uploads",
        "connection_method": ConnectionMethod.native_upload,
    },
)


ALLOWED_CONNECTION_TRANSITIONS: dict[
    SourceConnectionStatus, set[SourceConnectionStatus]
] = {
    SourceConnectionStatus.configured: {
        SourceConnectionStatus.validating,
        SourceConnectionStatus.disconnected,
    },
    SourceConnectionStatus.validating: {
        SourceConnectionStatus.connected,
        SourceConnectionStatus.error,
        SourceConnectionStatus.disconnected,
    },
    SourceConnectionStatus.connected: {
        SourceConnectionStatus.syncing,
        SourceConnectionStatus.error,
        SourceConnectionStatus.disconnected,
    },
    SourceConnectionStatus.syncing: {
        SourceConnectionStatus.connected,
        SourceConnectionStatus.error,
        SourceConnectionStatus.disconnected,
    },
    SourceConnectionStatus.error: {
        SourceConnectionStatus.validating,
        SourceConnectionStatus.syncing,
        SourceConnectionStatus.disconnected,
    },
    SourceConnectionStatus.disconnected: {
        SourceConnectionStatus.configured,
        SourceConnectionStatus.validating,
    },
}


class InvalidSourceConnectionTransition(ValueError):
    """Raised when a caller attempts an invalid connection status change."""


def _build_personal_workspace_name(user: User) -> str:
    if user.name:
        return f"{user.name}'s Workspace"
    local_part = user.email.split("@", maxsplit=1)[0]
    return f"{local_part}'s Workspace"


def _build_personal_workspace_slug(user_id: uuid.UUID) -> str:
    return f"personal-{user_id.hex[:12]}"


async def get_or_create_default_workspace(
    db: AsyncSession,
    user: User,
) -> Workspace:
    stmt = (
        select(Workspace)
        .where(
            Workspace.owner_user_id == user.id,
            Workspace.kind == WorkspaceKind.personal,
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    workspace = result.scalar_one_or_none()
    if workspace is not None:
        return workspace

    workspace = Workspace(
        owner_user_id=user.id,
        name=_build_personal_workspace_name(user),
        slug=_build_personal_workspace_slug(user.id),
        kind=WorkspaceKind.personal,
    )
    db.add(workspace)
    await db.flush()
    return workspace


async def seed_default_data_sources(db: AsyncSession) -> list[DataSource]:
    result = await db.execute(select(DataSource))
    existing_sources = result.scalars().all()
    existing_keys = {
        (source.source_type, source.provider) for source in existing_sources
    }

    for source_seed in DEFAULT_SOURCE_CATALOG:
        key = (source_seed["source_type"], source_seed["provider"])
        if key in existing_keys:
            continue
        db.add(DataSource(**source_seed))

    await db.flush()

    refreshed = await db.execute(
        select(DataSource).order_by(
            DataSource.source_type.asc(),
            DataSource.display_name.asc(),
        )
    )
    return list(refreshed.scalars().all())


async def create_source_connection(
    db: AsyncSession,
    *,
    workspace: Workspace,
    created_by_user: User,
    data_source: DataSource,
    secret_ref: str | None = None,
    config_json: dict | None = None,
) -> SourceConnection:
    connection = SourceConnection(
        workspace_id=workspace.id,
        created_by_user_id=created_by_user.id,
        data_source_id=data_source.id,
        status=SourceConnectionStatus.configured,
        secret_ref=secret_ref,
        config_json=config_json,
    )
    db.add(connection)
    await db.flush()
    return connection


def transition_source_connection(
    connection: SourceConnection,
    next_status: SourceConnectionStatus,
    *,
    last_error_summary: str | None = None,
) -> SourceConnection:
    if connection.status == next_status:
        if next_status == SourceConnectionStatus.error:
            connection.last_error_summary = last_error_summary
        return connection

    allowed_targets = ALLOWED_CONNECTION_TRANSITIONS.get(connection.status, set())
    if next_status not in allowed_targets:
        raise InvalidSourceConnectionTransition(
            f"Cannot transition source connection from {connection.status.value} "
            f"to {next_status.value}"
        )

    connection.status = next_status
    if next_status == SourceConnectionStatus.error:
        connection.last_error_summary = last_error_summary
    elif next_status == SourceConnectionStatus.connected:
        connection.last_error_summary = None

    return connection


async def start_sync_run(
    db: AsyncSession,
    *,
    connection: SourceConnection,
    run_type: SyncRunType,
    cursor_in: dict | None = None,
    retry_of_run: SyncRun | None = None,
) -> SyncRun:
    if connection.status not in {
        SourceConnectionStatus.connected,
        SourceConnectionStatus.error,
        SourceConnectionStatus.configured,
    }:
        raise InvalidSourceConnectionTransition(
            f"Cannot start a sync run while connection is {connection.status.value}"
        )

    transition_source_connection(connection, SourceConnectionStatus.syncing)
    sync_run = SyncRun(
        source_connection_id=connection.id,
        run_type=run_type,
        status=SyncRunStatus.running,
        cursor_in=cursor_in,
        retry_of_run_id=retry_of_run.id if retry_of_run else None,
    )
    db.add(sync_run)
    await db.flush()
    return sync_run


def complete_sync_run(
    sync_run: SyncRun,
    *,
    connection: SourceConnection,
    cursor_out: dict | None = None,
    records_seen: int = 0,
    records_created: int = 0,
    records_updated: int = 0,
) -> SyncRun:
    sync_run.status = SyncRunStatus.succeeded
    sync_run.finished_at = datetime.now(timezone.utc)
    sync_run.cursor_out = cursor_out
    sync_run.records_seen = records_seen
    sync_run.records_created = records_created
    sync_run.records_updated = records_updated
    sync_run.error_summary = None

    connection.last_synced_at = sync_run.finished_at
    transition_source_connection(connection, SourceConnectionStatus.connected)
    return sync_run


def fail_sync_run(
    sync_run: SyncRun,
    *,
    connection: SourceConnection,
    error_summary: str,
    cursor_out: dict | None = None,
    records_seen: int = 0,
    records_created: int = 0,
    records_updated: int = 0,
) -> SyncRun:
    sync_run.status = SyncRunStatus.failed
    sync_run.finished_at = datetime.now(timezone.utc)
    sync_run.cursor_out = cursor_out
    sync_run.records_seen = records_seen
    sync_run.records_created = records_created
    sync_run.records_updated = records_updated
    sync_run.error_summary = error_summary

    transition_source_connection(
        connection,
        SourceConnectionStatus.error,
        last_error_summary=error_summary,
    )
    return sync_run


async def upsert_source_item(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    source_connection_id: uuid.UUID,
    external_id: str,
    source_record_type: str,
    external_updated_at: datetime | None = None,
    native_entity_type: str | None = None,
    native_entity_id: uuid.UUID | None = None,
    checksum: str | None = None,
) -> tuple[SourceItem, bool]:
    stmt = select(SourceItem).where(
        SourceItem.source_connection_id == source_connection_id,
        SourceItem.external_id == external_id,
    )
    result = await db.execute(stmt)
    source_item = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if source_item is None:
        source_item = SourceItem(
            workspace_id=workspace_id,
            source_connection_id=source_connection_id,
            external_id=external_id,
            source_record_type=source_record_type,
            external_updated_at=external_updated_at,
            native_entity_type=native_entity_type,
            native_entity_id=native_entity_id,
            checksum=checksum,
            last_seen_at=now,
        )
        db.add(source_item)
        await db.flush()
        return source_item, True

    source_item.source_record_type = source_record_type
    source_item.external_updated_at = external_updated_at
    source_item.native_entity_type = native_entity_type
    source_item.native_entity_id = native_entity_id
    source_item.checksum = checksum
    source_item.last_seen_at = now
    await db.flush()
    return source_item, False
