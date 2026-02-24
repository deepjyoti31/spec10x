"""
Spec10x Backend — Billing & Usage API Routes

Tracks usage per user per month and enforces plan limits.
"""

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import User, Usage, PlanType
from app.schemas import UsageResponse

router = APIRouter(prefix="/api/billing", tags=["Billing"])

# Plan limits
PLAN_LIMITS = {
    PlanType.free: {
        "interviews_per_month": 5,
        "qa_queries_per_month": 20,
        "storage_bytes": 500 * 1024 * 1024,  # 500 MB
    },
    PlanType.pro: {
        "interviews_per_month": 50,
        "qa_queries_per_month": 200,
        "storage_bytes": 5 * 1024 * 1024 * 1024,  # 5 GB
    },
    PlanType.business: {
        "interviews_per_month": 500,
        "qa_queries_per_month": 2000,
        "storage_bytes": 50 * 1024 * 1024 * 1024,  # 50 GB
    },
}


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current month's usage for the authenticated user."""
    usage = await _get_or_create_usage(db, current_user.id)
    return usage


@router.get("/limits")
async def get_limits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get plan limits and current usage."""
    usage = await _get_or_create_usage(db, current_user.id)
    limits = PLAN_LIMITS.get(current_user.plan, PLAN_LIMITS[PlanType.free])

    return {
        "plan": current_user.plan.value,
        "usage": {
            "interviews_uploaded": usage.interviews_uploaded,
            "qa_queries_used": usage.qa_queries_used,
            "storage_bytes_used": usage.storage_bytes_used,
        },
        "limits": limits,
        "remaining": {
            "interviews": max(0, limits["interviews_per_month"] - usage.interviews_uploaded),
            "qa_queries": max(0, limits["qa_queries_per_month"] - usage.qa_queries_used),
            "storage_bytes": max(0, limits["storage_bytes"] - usage.storage_bytes_used),
        },
    }


# ─── Usage Helpers (usable from other services) ─────────

async def increment_usage(
    db: AsyncSession,
    user_id: uuid.UUID,
    field: str,
    amount: int = 1,
) -> None:
    """
    Increment a usage counter for the current month.

    Args:
        db: Database session
        user_id: User ID
        field: One of 'interviews_uploaded', 'qa_queries_used', 'storage_bytes_used'
        amount: Amount to increment by
    """
    usage = await _get_or_create_usage(db, user_id)
    current = getattr(usage, field, 0)
    setattr(usage, field, current + amount)
    await db.flush()


async def check_limit(
    db: AsyncSession,
    user_id: uuid.UUID,
    action: str,
) -> bool:
    """
    Check if a user has remaining capacity for an action.

    Args:
        db: Database session
        user_id: User ID
        action: One of 'interview', 'qa_query'

    Returns:
        True if the user is within limits, False if limit exceeded
    """
    # Get user's plan
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return False

    limits = PLAN_LIMITS.get(user.plan, PLAN_LIMITS[PlanType.free])
    usage = await _get_or_create_usage(db, user_id)

    if action == "interview":
        return usage.interviews_uploaded < limits["interviews_per_month"]
    elif action == "qa_query":
        return usage.qa_queries_used < limits["qa_queries_per_month"]
    else:
        return True


async def _get_or_create_usage(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> Usage:
    """Get or create a usage record for the current month."""
    current_month = date.today().replace(day=1)

    stmt = select(Usage).where(
        Usage.user_id == user_id,
        Usage.month == current_month,
    )
    result = await db.execute(stmt)
    usage = result.scalar_one_or_none()

    if usage is None:
        usage = Usage(
            user_id=user_id,
            month=current_month,
        )
        db.add(usage)
        await db.flush()

    return usage
