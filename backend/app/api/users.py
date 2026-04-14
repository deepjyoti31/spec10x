"""
Spec10x Backend — Users API Routes
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from firebase_admin import auth as firebase_auth

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import (
    User, Interview, Theme, Insight, AskConversation, Usage,
    Workspace, SourceConnection, SourceConnectionStatus, SourceItem, SyncRun, Signal,
    WorkspaceKind,
)
from app.schemas import (
    UserResponse, UserUpdateRequest,
    ProductContextUpdate, ProductContextResponse,
)

router = APIRouter(prefix="/api/users", tags=["Users"])
logger = logging.getLogger(__name__)


@router.get("/me/product-context", response_model=ProductContextResponse)
async def get_product_context(
    current_user: User = Depends(get_current_user),
):
    """Get the current user's product context settings."""
    return ProductContextResponse(
        description=current_user.product_description,
        website_url=current_user.product_website_url,
        product_context_summary=current_user.product_context_summary,
        has_context=bool(current_user.product_context_summary),
    )


@router.put("/me/product-context", response_model=ProductContextResponse)
async def update_product_context(
    data: ProductContextUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update the current user's product context.

    Accepts a manual product description and/or a website URL.
    If a website URL is provided, uses Gemini UrlContext to extract
    a product fingerprint from the website.
    """
    from app.services.product_context import save_product_context

    try:
        user = await save_product_context(
            db=db,
            user=current_user,
            description=data.description,
            website_url=data.website_url,
        )
        await db.commit()
        await db.refresh(user)

        return ProductContextResponse(
            description=user.product_description,
            website_url=user.product_website_url,
            product_context_summary=user.product_context_summary,
            has_context=bool(user.product_context_summary),
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating product context for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update product context",
        )



@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the current user's profile (name, avatar_url)."""
    if data.name is not None:
        current_user.name = data.name.strip()
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url or None
    try:
        await db.commit()
        await db.refresh(current_user)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")
    return current_user


@router.delete("/me/data", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete all ingested data for the current user but keep integration connections intact.

    Deleted: interviews, themes, insights, ask conversations, signals, source items,
             and sync run history (so the next sync performs a clean backfill).
    Kept:    SourceConnection records — the user can re-sync or disconnect from the
             Integrations page without needing to re-enter credentials.
    """
    try:
        # ── Resolve the user's personal workspace ──────────────────────────────
        workspace_result = await db.execute(
            select(Workspace).where(
                Workspace.owner_user_id == current_user.id,
                Workspace.kind == WorkspaceKind.personal,
            )
        )
        workspace = workspace_result.scalar_one_or_none()

        # ── Wipe integration-sourced data ──────────────────────────────────────
        if workspace is not None:
            # Delete signals for the workspace (covers both interview-derived and
            # connector-derived signals).
            await db.execute(
                delete(Signal).where(Signal.workspace_id == workspace.id)
            )
            # Delete raw source items (connector-synced records).
            await db.execute(
                delete(SourceItem).where(SourceItem.workspace_id == workspace.id)
            )
            # Delete sync run history so next sync starts as a clean backfill.
            conn_ids_result = await db.execute(
                select(SourceConnection.id).where(
                    SourceConnection.workspace_id == workspace.id
                )
            )
            conn_ids = [row[0] for row in conn_ids_result.all()]
            if conn_ids:
                await db.execute(
                    delete(SyncRun).where(SyncRun.source_connection_id.in_(conn_ids))
                )
            # Reset connection state so the user can trigger a fresh sync immediately.
            await db.execute(
                update(SourceConnection)
                .where(
                    SourceConnection.workspace_id == workspace.id,
                    SourceConnection.status.in_([
                        SourceConnectionStatus.connected,
                        SourceConnectionStatus.error,
                        SourceConnectionStatus.syncing,
                    ]),
                )
                .values(
                    status=SourceConnectionStatus.connected,
                    last_synced_at=None,
                    last_error_summary=None,
                )
            )

        # ── Wipe interview-side data ───────────────────────────────────────────
        await db.execute(delete(Interview).where(Interview.user_id == current_user.id))
        await db.execute(delete(Theme).where(Theme.user_id == current_user.id))
        await db.execute(delete(Insight).where(Insight.user_id == current_user.id))
        await db.execute(delete(AskConversation).where(AskConversation.user_id == current_user.id))
        # Usage records are left intact for billing history.

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
