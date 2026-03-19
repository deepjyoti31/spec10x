"""
Spec10x Backend — Insights API Routes
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import User, Insight, Theme
from app.schemas import InsightResponse, InsightCreate, InsightUpdate
from app.services.signals import sync_interview_signals_for_interview

router = APIRouter(prefix="/api/insights", tags=["Insights"])


@router.post("", response_model=InsightResponse, status_code=status.HTTP_201_CREATED)
async def create_insight(
    request: InsightCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually add an insight (user-created)."""
    theme_name = None
    if request.theme_id is not None:
        theme = await db.get(Theme, request.theme_id)
        if theme is not None and theme.user_id == current_user.id:
            theme_name = theme.name

    insight = Insight(
        user_id=current_user.id,
        interview_id=request.interview_id,
        category=request.category,
        title=request.title,
        quote=request.quote,
        quote_start_index=request.quote_start_index,
        quote_end_index=request.quote_end_index,
        theme_id=request.theme_id,
        is_manual=True,
        confidence=1.0,
        theme_suggestion=theme_name,
    )
    db.add(insight)
    await db.flush()
    await sync_interview_signals_for_interview(
        db,
        interview_id=insight.interview_id,
    )
    return insight


@router.patch("/{insight_id}", response_model=InsightResponse)
async def update_insight(
    insight_id: uuid.UUID,
    update: InsightUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit insight category, title, or theme assignment."""
    stmt = select(Insight).where(
        Insight.id == insight_id,
        Insight.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    insight = result.scalar_one_or_none()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    if update.category is not None:
        insight.category = update.category
    if update.title is not None:
        insight.title = update.title
    if "theme_id" in update.model_fields_set:
        insight.theme_id = update.theme_id
        if update.theme_id is None:
            insight.theme_suggestion = None
        else:
            theme = await db.get(Theme, update.theme_id)
            if theme is not None and theme.user_id == current_user.id:
                insight.theme_suggestion = theme.name

    await db.flush()
    await sync_interview_signals_for_interview(
        db,
        interview_id=insight.interview_id,
    )
    return insight


@router.delete("/{insight_id}", status_code=status.HTTP_204_NO_CONTENT)
async def dismiss_insight(
    insight_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dismiss (soft-delete) an insight."""
    stmt = select(Insight).where(
        Insight.id == insight_id,
        Insight.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    insight = result.scalar_one_or_none()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_dismissed = True
    await db.flush()
    await sync_interview_signals_for_interview(
        db,
        interview_id=insight.interview_id,
    )


@router.post("/{insight_id}/flag", response_model=InsightResponse)
async def flag_insight(
    insight_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Flag an insight as uncertain."""
    stmt = select(Insight).where(
        Insight.id == insight_id,
        Insight.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    insight = result.scalar_one_or_none()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_flagged = not insight.is_flagged  # Toggle flag
    await db.flush()
    return insight
