"""
Spec10x — Test Fixtures & Configuration

Strategy:
  - Data fixtures are minimal — most tests create data via API calls
  - HTTP client overrides get_db with fresh sessions
  - Auth is mocked — get_current_user returns a test user (no Firebase needed)
  - Each test using the client gets a fresh engine to avoid event loop issues
"""

import uuid

import pytest
import pytest_asyncio
from unittest.mock import patch, Mock
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User
from app.main import app

settings = get_settings()

# Fixed test user ID for consistent test data
TEST_USER_UID = "test-user-uid-001"
TEST_USER_EMAIL = "test@spec10x.local"


async def _get_or_create_test_user(session: AsyncSession) -> User:
    stmt = select(User).where(User.firebase_uid == TEST_USER_UID)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            firebase_uid=TEST_USER_UID,
            email=TEST_USER_EMAIL,
            name="Test User",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def client():
    """Async HTTP client. Auth is mocked so no real Firebase token is needed."""
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

    # Mock get_current_user — find or create a test user in the DB
    async def _override_current_user():
        # Get a fresh session since the dependency may be called outside db override
        async with session_factory() as session:
            return await _get_or_create_test_user(session)

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _override_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    interviews_module._arq_pool = None
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession):
    return await _get_or_create_test_user(db_session)


# ─── Helper: create data via API ─────────────────────────

AUTH_HEADER = {"Authorization": "Bearer test-token"}


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

@pytest.fixture(autouse=True)
def mock_genai_client_global():
    with patch("google.genai.Client") as mock_client:
        mock_instance = mock_client.return_value
        
        # Mock generate_content response
        mock_response = Mock()
        mock_response.text = '''{
            "insights": [
                {
                    "category": "pain_point",
                    "title": "Onboarding is frustrating",
                    "quote": "I'm really frustrated with the onboarding process.",
                    "quote_start": "00:00",
                    "quote_end": "00:10",
                    "speaker": "Speaker 1",
                    "theme_suggestion": "Onboarding",
                    "sentiment": "negative",
                    "confidence": 0.9
                }
            ],
            "summary": "The onboarding process is frustrating."
        }'''
        mock_instance.models.generate_content.return_value = mock_response
        
        # Mock embed_content response
        mock_emb = Mock()
        mock_emb.values = [0.1] * 768
        mock_emb_response = Mock()
        mock_emb_response.embeddings = [mock_emb]
        mock_instance.models.embed_content.return_value = mock_emb_response
        
        yield mock_instance

