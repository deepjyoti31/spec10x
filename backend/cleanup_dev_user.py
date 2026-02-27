"""One-time script to clean all users so they get re-created properly on next login."""
import asyncio
from app.core.database import async_session_factory
from sqlalchemy import text

async def fix():
    async with async_session_factory() as db:
        result = await db.execute(text("DELETE FROM users"))
        await db.commit()
        print(f"Cleaned up {result.rowcount} user(s). They will be re-created on next login.")

asyncio.run(fix())
