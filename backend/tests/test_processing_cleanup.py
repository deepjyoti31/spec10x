"""
Tests — interview processing temp-file hygiene
"""

import os
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

import app.core.database as database_module
from app.models import FileType, Interview, InterviewStatus
from app.services.processing import process_interview


@pytest.fixture
async def app_engine():
    """process_interview uses the app's global engine; build it on this loop."""
    database_module._engine = None
    database_module._session_factory = None
    yield
    if database_module._engine is not None:
        await database_module._engine.dispose()
    database_module._engine = None
    database_module._session_factory = None


async def _make_interview(db_session, test_user) -> Interview:
    interview = Interview(
        user_id=test_user.id,
        filename="cleanup.txt",
        file_type=FileType.txt,
        file_size_bytes=10,
        storage_path=f"tests/{uuid.uuid4()}/cleanup.txt",
        status=InterviewStatus.queued,
    )
    db_session.add(interview)
    await db_session.commit()
    return interview


@pytest.mark.asyncio
async def test_failed_processing_removes_downloaded_file(db_session, test_user, app_engine):
    interview = await _make_interview(db_session, test_user)
    downloaded: list[str] = []

    def fake_download(*, object_name, local_path):
        with open(local_path, "w") as handle:
            handle.write("customer transcript")
        downloaded.append(local_path)

    with patch("app.services.processing.download_file", side_effect=fake_download), patch(
        "app.services.processing.publish_status", new=AsyncMock()
    ), patch(
        "app.services.extraction.extract_text", side_effect=RuntimeError("extract failed")
    ):
        result = await process_interview(str(interview.id))

    assert "error" in result
    assert downloaded and not os.path.exists(downloaded[0])

    await db_session.refresh(interview)
    assert interview.status == InterviewStatus.error


@pytest.mark.asyncio
async def test_failed_download_removes_temp_file(db_session, test_user, app_engine):
    interview = await _make_interview(db_session, test_user)
    created: list[str] = []

    def failing_download(*, object_name, local_path):
        created.append(local_path)
        raise RuntimeError("storage unavailable")

    with patch("app.services.processing.download_file", side_effect=failing_download), patch(
        "app.services.processing.publish_status", new=AsyncMock()
    ):
        result = await process_interview(str(interview.id))

    assert "error" in result
    assert created and not os.path.exists(created[0])
