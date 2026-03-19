"""
Survey and NPS CSV import API routes.

Sprint 2: template download + CSV validation.
Sprint 3: preview confirm, import execution, and import history.
"""

import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.connectors.csv_import import (
    TEMPLATE_CSV,
    validate_csv_bytes,
    CSVImportConnector,
    _parse_datetime,
)
from app.models import (
    DataSource,
    Signal,
    SignalKind,
    SignalStatus,
    SourceConnection,
    SourceConnectionStatus,
    SourceType,
    SyncRun,
    SyncRunStatus,
    SyncRunType,
    User,
)
from app.services.sources import (
    create_source_connection,
    get_or_create_default_workspace,
    seed_default_data_sources,
    start_sync_run,
    complete_sync_run,
    fail_sync_run,
    upsert_source_item,
)

router = APIRouter(prefix="/api/survey-import", tags=["Survey Import"])


@router.get("/template")
async def download_template(
    current_user: User = Depends(get_current_user),
):
    """Download the survey/NPS CSV template."""
    return StreamingResponse(
        io.BytesIO(TEMPLATE_CSV.encode("utf-8")),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="spec10x_survey_template.csv"'
        },
    )


@router.post("/validate")
async def validate_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Validate an uploaded survey/NPS CSV file.

    Returns validation results including errors, warnings,
    preview rows, and column info.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="File must be a CSV (.csv) file",
        )

    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=400,
            detail="File is too large — maximum size is 10MB",
        )

    result = validate_csv_bytes(contents)
    return result


@router.post("/confirm")
async def confirm_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Confirm and execute a survey/NPS CSV import.

    Re-validates the file, then normalizes rows into signals.
    Creates source_connection, sync_run, and source_items.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="File must be a CSV (.csv) file",
        )

    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File is too large — maximum size is 10MB",
        )

    # Re-validate
    validation = validate_csv_bytes(contents)
    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "CSV validation failed",
                "errors": validation["errors"],
            },
        )

    # Get workspace and data source
    workspace = await get_or_create_default_workspace(db, current_user)
    await seed_default_data_sources(db)

    # Find the csv_import data source
    ds_stmt = select(DataSource).where(
        DataSource.source_type == SourceType.survey,
        DataSource.provider == "csv_import",
    )
    ds_result = await db.execute(ds_stmt)
    data_source = ds_result.scalar_one_or_none()
    if data_source is None:
        raise HTTPException(status_code=500, detail="CSV import data source not found")

    # Create a connection for this import
    connection = await create_source_connection(
        db,
        workspace=workspace,
        created_by_user=current_user,
        data_source=data_source,
        config_json={
            "import_name": file.filename,
            "file_size_bytes": len(contents),
        },
    )

    # Transition to connected (CSV imports don't need credential validation)
    connection.status = SourceConnectionStatus.connected

    # Create sync run
    sync_run = await start_sync_run(
        db,
        connection=connection,
        run_type=SyncRunType.backfill,
    )

    try:
        # Normalize CSV rows into signals
        connector = CSVImportConnector(db=db, connection=connection)
        # Pass all validated rows to normalize
        all_rows = validation.get("preview_rows", [])

        # If there are more rows than preview (preview is capped at 10),
        # re-parse the full CSV for all rows
        import csv as csv_module
        text = contents.decode("utf-8-sig")
        reader = csv_module.DictReader(io.StringIO(text))
        all_rows = list(reader)

        signals = await connector.normalize(all_rows)

        records_created = 0
        records_updated = 0

        for i, sig in enumerate(signals):
            external_id = sig.external_id or f"row-{i+1}"

            # Parse occurred_at
            if isinstance(sig.occurred_at, str):
                try:
                    occurred_at = _parse_datetime(sig.occurred_at)
                except ValueError:
                    from datetime import datetime, timezone
                    occurred_at = datetime.now(timezone.utc)
            else:
                occurred_at = sig.occurred_at

            source_item, is_new = await upsert_source_item(
                db,
                workspace_id=workspace.id,
                source_connection_id=connection.id,
                external_id=external_id,
                source_record_type="survey_response",
            )

            if is_new:
                records_created += 1
                signal_row = Signal(
                    workspace_id=workspace.id,
                    source_connection_id=connection.id,
                    source_item_id=source_item.id,
                    source_type=SourceType.survey,
                    provider="csv_import",
                    signal_kind=SignalKind.survey_response,
                    occurred_at=occurred_at,
                    title=sig.title,
                    content_text=sig.content_text or "",
                    author_or_speaker=sig.author_or_speaker,
                    sentiment=sig.sentiment,
                    metadata_json=sig.metadata_json,
                    status=SignalStatus.active,
                )
                db.add(signal_row)
            else:
                records_updated += 1

        complete_sync_run(
            sync_run,
            connection=connection,
            records_seen=len(all_rows),
            records_created=records_created,
            records_updated=records_updated,
        )

        await db.commit()

        return {
            "status": "success",
            "import_name": file.filename,
            "connection_id": str(connection.id),
            "sync_run_id": str(sync_run.id),
            "records_seen": len(all_rows),
            "records_created": records_created,
            "records_updated": records_updated,
        }

    except Exception as exc:
        fail_sync_run(
            sync_run,
            connection=connection,
            error_summary=str(exc),
        )
        await db.commit()
        raise HTTPException(
            status_code=500,
            detail=f"Import failed: {exc}",
        )


@router.get("/history")
async def import_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List past survey/NPS CSV imports with status and counts.

    Returns import history sorted by most recent first.
    """
    workspace = await get_or_create_default_workspace(db, current_user)

    # Find all csv_import connections for this workspace
    stmt = (
        select(SyncRun)
        .join(
            SourceConnection,
            SyncRun.source_connection_id == SourceConnection.id,
        )
        .join(
            DataSource,
            SourceConnection.data_source_id == DataSource.id,
        )
        .where(
            SourceConnection.workspace_id == workspace.id,
            DataSource.provider == "csv_import",
        )
        .options(selectinload(SyncRun.source_connection))
        .order_by(SyncRun.started_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    sync_runs = list(result.scalars().all())

    history = []
    for run in sync_runs:
        config = run.source_connection.config_json or {}
        history.append({
            "id": str(run.id),
            "connection_id": str(run.source_connection_id),
            "import_name": config.get("import_name", "Unknown"),
            "status": run.status.value,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "finished_at": run.finished_at.isoformat() if run.finished_at else None,
            "records_seen": run.records_seen,
            "records_created": run.records_created,
            "records_updated": run.records_updated,
            "error_summary": run.error_summary,
        })

    return {"imports": history}
