"""
Spec10x Backend — Database Engine & Session
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

_engine = None
_session_factory = None
# None = default (echo SQL in development). The stdio MCP server sets False:
# SQLAlchemy echo logs to stdout, which is that server's JSON-RPC channel.
_sql_echo_override: bool | None = None


def disable_sql_echo() -> None:
    """Never echo SQL, whatever APP_ENV says. Call before the first query."""
    global _sql_echo_override
    _sql_echo_override = False

def get_engine():
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            echo=(
                _sql_echo_override
                if _sql_echo_override is not None
                else settings.app_env == "development"
            ),
            pool_size=5,
            max_overflow=10,
        )
    return _engine

def get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


# Base class for all ORM models
class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a database session per request."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
