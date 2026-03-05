"""
Spec10x Backend — Users API Routes
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from firebase_admin import auth as firebase_auth

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import User, Interview, Theme, Insight, AskConversation, Usage

router = APIRouter(prefix="/api/users", tags=["Users"])
logger = logging.getLogger(__name__)


@router.delete("/me/data", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete all data associated with the current user (interviews, insights, themes, etc.),
    but keep the user account intact.
    """
    try:
        # Delete top-level entities, cascades will handle the rest
        await db.execute(delete(Interview).where(Interview.user_id == current_user.id))
        await db.execute(delete(Theme).where(Theme.user_id == current_user.id))
        await db.execute(delete(Insight).where(Insight.user_id == current_user.id))
        await db.execute(delete(AskConversation).where(AskConversation.user_id == current_user.id))
        # Keep Usage records to avoid historical billing drops, or delete them if preferred.
        # We'll leave usage intact for billing history
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting user data for {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user data")


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete the current user account and all associated data.
    Also removes the user from Firebase Auth.
    """
    try:
        # Remove from Firebase Auth
        try:
            firebase_auth.delete_user(current_user.firebase_uid)
        except Exception as e:
            logger.warning(f"Failed to delete Firebase user {current_user.firebase_uid}: {e}")

        # Delete from DB (cascades will handle related data)
        await db.delete(current_user)
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting user account for {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user account")
