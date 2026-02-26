"""
Spec10x — Test Fixtures & Configuration

Strategy:
  - Data fixtures are minimal — most tests create data via API calls
  - HTTP client overrides get_db with fresh sessions
  - Each test using the client gets a fresh engine to avoid event loop issues
"""

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.main import app

settings = get_settings()


@pytest_asyncio.fixture
async def client():
    """Async HTTP client. Each API call gets its own DB session via fresh engine."""
    # Create a fresh engine per test to avoid event loop issues
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Reset the global arq pool to avoid stale event loop connections
    import app.api.interviews as interviews_module
    interviews_module._arq_pool = None

    async def _override_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    interviews_module._arq_pool = None
    await engine.dispose()


# ─── Helper: create data via API ─────────────────────────

AUTH_HEADER = {"Authorization": "Bearer dev-token"}


async def create_test_interview(client: AsyncClient, filename="test.txt", file_hash=None) -> dict:
    """Create an interview via API and return the response data."""
    body = {
        "filename": filename,
        "file_type": "txt",
        "file_size_bytes": 1024,
        "storage_path": f"test/{uuid.uuid4()}/{filename}",
    }
    if file_hash:
        body["file_hash"] = file_hash
    response = await client.post("/api/interviews", json=body, headers=AUTH_HEADER)
    assert response.status_code == 201, f"Interview creation failed: {response.text}"
    return response.json()
