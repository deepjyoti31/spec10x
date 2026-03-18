"""
Survey and NPS CSV import API routes.
"""

import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.connectors.csv_import import TEMPLATE_CSV, validate_csv_bytes
from app.models import User

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
