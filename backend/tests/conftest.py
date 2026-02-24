"""
Spec10x — Test Fixtures & Configuration

Shared fixtures for all tests: database sessions, HTTP client, mock users, sample data.
"""

import uuid
import asyncio
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import get_settings
from app.core.database import Base, get_db
from app.main import app
from app.models import (
    User, Interview, Insight, Theme, TranscriptChunk,
    PlanType, FileType, InterviewStatus, InsightCategory, ThemeStatus,
)

settings = get_settings()


# ─── Database Fixtures ───────────────────────────────────

# Use the same database but with separate sessions per test
TEST_ENGINE = create_async_engine(
    settings.database_url,
    echo=False,
)
TestSessionLocal = async_sessionmaker(TEST_ENGINE, expire_on_commit=False)


@pytest_asyncio.fixture
async def db_session():
    """Provide a transactional database session that rolls back after each test."""
    async with TEST_ENGINE.connect() as conn:
        trans = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)

        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """Async HTTP client with database session override."""

    async def _override_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ─── Data Fixtures ───────────────────────────────────────

@pytest_asyncio.fixture
async def mock_user(db_session: AsyncSession) -> User:
    """Create a test user in the database."""
    user = User(
        firebase_uid="test-uid-001",
        email="test@spec10x.com",
        name="Test User",
        plan=PlanType.free,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def mock_user_2(db_session: AsyncSession) -> User:
    """Create a second test user for isolation tests."""
    user = User(
        firebase_uid="test-uid-002",
        email="other@spec10x.com",
        name="Other User",
        plan=PlanType.pro,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def sample_interview(db_session: AsyncSession, mock_user: User) -> Interview:
    """Create a sample interview record."""
    interview = Interview(
        user_id=mock_user.id,
        filename="test_interview.txt",
        file_type=FileType.txt,
        file_size_bytes=1024,
        storage_path=f"{mock_user.id}/test/test_interview.txt",
        status=InterviewStatus.done,
        transcript="Speaker 1: I'm really frustrated with the onboarding process. It takes too long. Speaker 2: I agree, we need a better search feature.",
    )
    db_session.add(interview)
    await db_session.flush()
    return interview


@pytest_asyncio.fixture
async def sample_insights(
    db_session: AsyncSession,
    mock_user: User,
    sample_interview: Interview,
) -> list[Insight]:
    """Create sample insights linked to the test interview."""
    insights = [
        Insight(
            interview_id=sample_interview.id,
            user_id=mock_user.id,
            category=InsightCategory.pain_point,
            title="Frustrating onboarding process",
            quote="I'm really frustrated with the onboarding process",
            confidence=0.9,
            sentiment="negative",
            theme_suggestion="Onboarding Experience",
        ),
        Insight(
            interview_id=sample_interview.id,
            user_id=mock_user.id,
            category=InsightCategory.feature_request,
            title="Better search feature needed",
            quote="we need a better search feature",
            confidence=0.85,
            sentiment="neutral",
            theme_suggestion="Search Functionality",
        ),
        Insight(
            interview_id=sample_interview.id,
            user_id=mock_user.id,
            category=InsightCategory.positive,
            title="Great dashboard design",
            quote="I love the dashboard, it's really easy to use",
            confidence=0.92,
            sentiment="positive",
            theme_suggestion="Dashboard & Analytics",
        ),
    ]
    for insight in insights:
        db_session.add(insight)
    await db_session.flush()
    return insights


@pytest_asyncio.fixture
async def sample_theme(
    db_session: AsyncSession,
    mock_user: User,
) -> Theme:
    """Create a sample theme."""
    theme = Theme(
        user_id=mock_user.id,
        name="Onboarding Experience",
        description="Issues related to the onboarding flow",
        mention_count=5,
        sentiment_positive=0.2,
        sentiment_neutral=0.3,
        sentiment_negative=0.5,
        status=ThemeStatus.active,
    )
    db_session.add(theme)
    await db_session.flush()
    return theme
