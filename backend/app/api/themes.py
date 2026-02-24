"""
Spec10x Backend — Themes API Routes
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import User, Theme, ThemeStatus
from app.schemas import ThemeResponse, ThemeDetailResponse, ThemeUpdate

router = APIRouter(prefix="/api/themes", tags=["Themes"])


@router.get("", response_model=list[ThemeResponse])
async def list_themes(
    sort: str = Query("urgency", regex="^(urgency|frequency|sentiment|recency)$"),
    status_filter: str = Query("active", alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all themes for the current user, sorted by the specified order."""
    stmt = select(Theme).where(Theme.user_id == current_user.id)

    if status_filter:
        stmt = stmt.where(Theme.status == status_filter)

    # Sort logic
    if sort == "urgency" or sort == "frequency":
        stmt = stmt.order_by(Theme.mention_count.desc())
    elif sort == "sentiment":
        stmt = stmt.order_by(Theme.sentiment_negative.desc())
    elif sort == "recency":
        stmt = stmt.order_by(Theme.updated_at.desc())

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{theme_id}", response_model=ThemeDetailResponse)
async def get_theme(
    theme_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get theme detail with sub-themes and insights."""
    stmt = (
        select(Theme)
        .where(
            Theme.id == theme_id,
            Theme.user_id == current_user.id,
        )
        .options(
            selectinload(Theme.sub_themes),
            selectinload(Theme.insights),
        )
    )
    result = await db.execute(stmt)
    theme = result.scalar_one_or_none()

    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    return theme


@router.patch("/{theme_id}", response_model=ThemeResponse)
async def update_theme(
    theme_id: uuid.UUID,
    update: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a theme."""
    stmt = select(Theme).where(
        Theme.id == theme_id,
        Theme.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    theme = result.scalar_one_or_none()

    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    if update.name is not None:
        theme.name = update.name

    await db.flush()
    return theme
