"""
Source foundation API routes.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import DataSource, SourceConnection, SourceConnectionStatus, SyncRun, SyncRunStatus, User
from app.schemas import (
    DataSourceResponse,
    SourceConnectionCreate,
    SourceConnectionDetailResponse,
    SourceConnectionResponse,
    SyncRunResponse,
)
from app.services.sources import (
    create_source_connection,
    get_or_create_default_workspace,
    seed_default_data_sources,
    transition_source_connection,
)

router = APIRouter(prefix="/api", tags=["Sources"])


async def _get_user_workspace(
    current_user: User,
    db: AsyncSession,
):
    return await get_or_create_default_workspace(db, current_user)


@router.get("/data-sources", response_model=list[DataSourceResponse])
async def list_data_sources(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_user_workspace(current_user, db)
    await seed_default_data_sources(db)

    stmt = (
        select(DataSource)
        .where(DataSource.is_active.is_(True))
        .order_by(DataSource.source_type.asc(), DataSource.display_name.asc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post(
    "/source-connections",
    response_model=SourceConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_connection(
    request: SourceConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await _get_user_workspace(current_user, db)
    await seed_default_data_sources(db)

    data_source = await db.get(DataSource, request.data_source_id)
    if data_source is None or not data_source.is_active:
        raise HTTPException(status_code=404, detail="Data source not found")

    connection = await create_source_connection(
        db,
        workspace=workspace,
        created_by_user=current_user,
        data_source=data_source,
        secret_ref=request.secret_ref,
        config_json=request.config_json,
    )

    stmt = (
        select(SourceConnection)
        .where(SourceConnection.id == connection.id)
        .options(selectinload(SourceConnection.data_source))
    )
    result = await db.execute(stmt)
    return result.scalar_one()


@router.get("/source-connections", response_model=list[SourceConnectionResponse])
async def list_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await _get_user_workspace(current_user, db)

    stmt = (
        select(SourceConnection)
        .where(SourceConnection.workspace_id == workspace.id)
        .options(selectinload(SourceConnection.data_source))
        .order_by(SourceConnection.created_at.desc())
    )
    result = await db.execute(stmt)
    connections = list(result.scalars().all())

    if connections:
        connection_ids = [c.id for c in connections]
        totals_stmt = (
            select(
                SyncRun.source_connection_id,
                func.coalesce(
                    func.sum(SyncRun.records_created + SyncRun.records_updated), 0
                ).label("total"),
            )
            .where(
                SyncRun.source_connection_id.in_(connection_ids),
                SyncRun.status == SyncRunStatus.succeeded,
            )
            .group_by(SyncRun.source_connection_id)
        )
        totals_result = await db.execute(totals_stmt)
        totals_map = {row.source_connection_id: int(row.total) for row in totals_result}
    else:
        totals_map = {}

    return [
        SourceConnectionResponse.model_validate(conn).model_copy(
            update={"total_records_synced": totals_map.get(conn.id, 0)}
        )
        for conn in connections
    ]


@router.get(
    "/source-connections/{connection_id}",
    response_model=SourceConnectionDetailResponse,
)
async def get_connection(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await _get_user_workspace(current_user, db)

    stmt = (
        select(SourceConnection)
        .where(
            SourceConnection.id == connection_id,
            SourceConnection.workspace_id == workspace.id,
        )
        .options(
            selectinload(SourceConnection.data_source),
            selectinload(SourceConnection.sync_runs),
        )
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(status_code=404, detail="Source connection not found")

    return connection


@router.delete(
    "/source-connections/{connection_id}",
    response_model=SourceConnectionResponse,
)
async def disconnect_connection(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await _get_user_workspace(current_user, db)

    stmt = (
        select(SourceConnection)
        .where(
            SourceConnection.id == connection_id,
            SourceConnection.workspace_id == workspace.id,
        )
        .options(selectinload(SourceConnection.data_source))
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(status_code=404, detail="Source connection not found")

    transition_source_connection(connection, SourceConnectionStatus.disconnected)
    connection.secret_ref = None
    await db.commit()
    await db.refresh(connection)
    return connection


@router.post(
    "/source-connections/{connection_id}/validate",
    response_model=SourceConnectionResponse,
)
async def validate_connection(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await _get_user_workspace(current_user, db)

    stmt = (
        select(SourceConnection)
        .where(
            SourceConnection.id == connection_id,
            SourceConnection.workspace_id == workspace.id,
        )
        .options(selectinload(SourceConnection.data_source))
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(status_code=404, detail="Source connection not found")

    # Look up the connector from the registry
    from app.connectors import get_connector
    connector_cls = get_connector(
        connection.data_source.source_type.value,
        connection.data_source.provider,
    )
    if connector_cls is None:
        raise HTTPException(
            status_code=400,
            detail=f"No connector available for {connection.data_source.provider}",
        )

    connector = connector_cls(db=db, connection=connection)
    await connector.validate()
    await db.commit()
    await db.refresh(connection)
    if connection.status == SourceConnectionStatus.error:
        raise HTTPException(
            status_code=400,
            detail=connection.last_error_summary or "Validation failed",
        )
    return connection


@router.get(
    "/source-connections/{connection_id}/sync-runs",
    response_model=list[SyncRunResponse],
)
async def list_sync_runs(
    connection_id: uuid.UUID,
    status_filter: SyncRunStatus | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await _get_user_workspace(current_user, db)

    connection_stmt = select(SourceConnection.id).where(
        SourceConnection.id == connection_id,
        SourceConnection.workspace_id == workspace.id,
    )
    connection_result = await db.execute(connection_stmt)
    if connection_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Source connection not found")

    stmt = (
        select(SyncRun)
        .join(SourceConnection, SyncRun.source_connection_id == SourceConnection.id)
        .where(
            SyncRun.source_connection_id == connection_id,
            SourceConnection.workspace_id == workspace.id,
        )
        .order_by(SyncRun.started_at.desc())
    )
    if status_filter is not None:
        stmt = stmt.where(SyncRun.status == status_filter)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get(
    "/source-connections/{connection_id}/sync-runs/{sync_run_id}",
    response_model=SyncRunResponse,
)
async def get_sync_run(
    connection_id: uuid.UUID,
    sync_run_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await _get_user_workspace(current_user, db)

    stmt = (
        select(SyncRun)
        .join(SourceConnection, SyncRun.source_connection_id == SourceConnection.id)
        .where(
            SyncRun.id == sync_run_id,
            SyncRun.source_connection_id == connection_id,
            SourceConnection.workspace_id == workspace.id,
        )
    )
    result = await db.execute(stmt)
    sync_run = result.scalar_one_or_none()
    if sync_run is None:
        raise HTTPException(status_code=404, detail="Sync run not found")
    return sync_run


@router.post(
    "/source-connections/{connection_id}/backfill",
    response_model=SyncRunResponse,
)
async def trigger_backfill(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a historical backfill for the given connection."""
    workspace = await _get_user_workspace(current_user, db)

    stmt = (
        select(SourceConnection)
        .where(
            SourceConnection.id == connection_id,
            SourceConnection.workspace_id == workspace.id,
        )
        .options(selectinload(SourceConnection.data_source))
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(status_code=404, detail="Source connection not found")

    if connection.status not in {
        SourceConnectionStatus.connected,
        SourceConnectionStatus.error,
    }:
        raise HTTPException(
            status_code=400,
            detail=f"Connection must be in 'connected' or 'error' state to backfill (current: {connection.status.value})",
        )

    from app.services.sync_orchestrator import run_backfill

    sync_run = await run_backfill(
        db, connection=connection, data_source=connection.data_source
    )
    await db.commit()
    await db.refresh(sync_run)
    return sync_run


@router.post(
    "/source-connections/{connection_id}/sync",
    response_model=SyncRunResponse,
)
async def trigger_sync(
    connection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger an incremental sync for the given connection."""
    workspace = await _get_user_workspace(current_user, db)

    stmt = (
        select(SourceConnection)
        .where(
            SourceConnection.id == connection_id,
            SourceConnection.workspace_id == workspace.id,
        )
        .options(selectinload(SourceConnection.data_source))
    )
    result = await db.execute(stmt)
    connection = result.scalar_one_or_none()

    if connection is None:
        raise HTTPException(status_code=404, detail="Source connection not found")

    if connection.status not in {
        SourceConnectionStatus.connected,
        SourceConnectionStatus.error,
    }:
        raise HTTPException(
            status_code=400,
            detail=f"Connection must be in 'connected' or 'error' state to sync (current: {connection.status.value})",
        )

    from app.services.sync_orchestrator import run_incremental_sync

    sync_run = await run_incremental_sync(
        db, connection=connection, data_source=connection.data_source
    )
    await db.commit()
    await db.refresh(sync_run)
    return sync_run

