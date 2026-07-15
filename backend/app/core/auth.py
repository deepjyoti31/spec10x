"""
Spec10x Backend — Firebase Authentication

Provides JWT verification for Firebase Auth tokens and a FastAPI dependency
for protecting routes.
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models import (
    User,
    Workspace,
    WorkspaceMember,
    WorkspaceMemberStatus,
)

logger = logging.getLogger(__name__)

settings = get_settings()
security = HTTPBearer()

# Firebase Admin SDK — initialized lazily
_firebase_app = None


def _init_firebase():
    """Initialize Firebase Admin SDK (called once on first auth request)."""
    global _firebase_app
    if _firebase_app is not None:
        return

    # Skip initialization if Firebase is not configured
    if not settings.firebase_project_id:
        logger.info("Firebase not configured — running in dev mode (mock auth)")
        return

    try:
        import firebase_admin
        from firebase_admin import credentials
        import os

        # Try loading service account from file
        if settings.firebase_service_account_path and os.path.exists(settings.firebase_service_account_path):
            cred = credentials.Certificate(settings.firebase_service_account_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized with service account file")
            return

        # Fall back to default credentials (for GCP environments)
        _firebase_app = firebase_admin.initialize_app(
            options={"projectId": settings.firebase_project_id}
        )
        logger.info("Firebase Admin initialized with default credentials")

    except Exception as e:
        logger.warning(f"Firebase Admin initialization failed: {e}")
        logger.warning("Auth will run in development mode (no token verification)")


def verify_firebase_token(token: str) -> Optional[dict]:
    """
    Verify a Firebase ID token and return the decoded claims.
    In development mode without Firebase configured, returns a mock user.
    """
    _init_firebase()

    # Development mode fallback — accept any token if Firebase isn't configured
    if _firebase_app is None and settings.app_env == "development":
        logger.warning("DEV MODE: Skipping Firebase token verification")
        return {
            "uid": "dev-user-001",
            "email": "dev@spec10x.local",
            "name": "Dev User",
        }

    import time
    server_time = time.time()
    
    try:
        from firebase_admin import auth as firebase_auth

        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except Exception as e:
        logger.error(f"Token verification failed: {e}. Server time: {server_time}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency — extracts and verifies the Firebase JWT from the
    Authorization header, then returns the corresponding User from the database.
    Creates the user on first login. Handles concurrent request race conditions
    gracefully via IntegrityError catch-and-retry.
    """
    token = credentials.credentials
    claims = verify_firebase_token(token)

    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    firebase_uid = claims.get("uid", "")
    email = claims.get("email", "")
    name = claims.get("name", "")

    # Find existing user or create a new one
    stmt = select(User).where(User.firebase_uid == firebase_uid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        try:
            user = User(
                firebase_uid=firebase_uid,
                email=email,
                name=name or email.split("@")[0],
                avatar_url=claims.get("picture"),
            )
            db.add(user)
            await db.flush()
            logger.info(f"Created new user: {email} ({firebase_uid})")
        except IntegrityError:
            # Another request already created this user — roll back and re-query
            await db.rollback()

            # Try by firebase_uid first
            stmt = select(User).where(User.firebase_uid == firebase_uid)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()

            # If not found by firebase_uid, try by email (user may have
            # re-registered with Firebase, getting a new UID)
            if user is None and email:
                stmt = select(User).where(User.email == email)
                result = await db.execute(stmt)
                user = result.scalar_one_or_none()
                if user:
                    # Update firebase_uid to match the new Firebase account
                    user.firebase_uid = firebase_uid
                    user.name = name or user.name
                    user.avatar_url = claims.get("picture") or user.avatar_url
                    await db.flush()
                    logger.info(f"Updated firebase_uid for existing user: {email}")

            if user is None:
                logger.error(f"User creation failed for {email}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user account. Please try again.",
                )
            else:
                logger.info(f"Race condition resolved — found existing user: {email}")

    return user


async def resolve_data_owner(db: AsyncSession, current_user: User) -> User:
    """
    v1.1 multi-user (D-11-01): resolve whose data pool the requester works in.

    If the user has switched into a shared workspace (active_workspace_id set)
    and still has access to it (owner, or an active membership), the pool is
    the workspace owner's data. In every other case — no active workspace, a
    revoked membership, a deleted workspace — fall back to the user's own data.
    This function never mutates state; stale active_workspace_id values are
    cleaned up by the workspace API, not here.
    """
    if current_user.active_workspace_id is None:
        return current_user

    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.active_workspace_id)
    )
    workspace = result.scalar_one_or_none()
    if workspace is None:
        return current_user

    if workspace.owner_user_id == current_user.id:
        return current_user

    membership_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.status == WorkspaceMemberStatus.active,
        )
    )
    if membership_result.scalar_one_or_none() is None:
        return current_user

    owner_result = await db.execute(
        select(User).where(User.id == workspace.owner_user_id)
    )
    owner = owner_result.scalar_one_or_none()
    return owner if owner is not None else current_user


async def get_scoped_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency for workspace-scoped data routes (v1.1, D-11-01).

    Returns the User whose data pool the request operates on: the owner of
    the requester's active workspace, or the requester themselves when they
    work in their own workspace. Identity routes (profile, notifications,
    billing, account deletion) must keep using get_current_user.
    """
    return await resolve_data_owner(db, current_user)

