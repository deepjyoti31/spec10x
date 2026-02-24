"""
Spec10x Backend — Auth API Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import verify_firebase_token, get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas import AuthVerifyRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/verify", response_model=UserResponse)
async def verify_token(
    request: AuthVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a Firebase ID token and return the user.
    Creates a new user account on first login.
    """
    claims = verify_firebase_token(request.token)

    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    firebase_uid = claims.get("uid", "")
    email = claims.get("email", "")
    name = claims.get("name", "")

    # Find or create user
    stmt = select(User).where(User.firebase_uid == firebase_uid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            name=name or email.split("@")[0],
            avatar_url=claims.get("picture"),
        )
        db.add(user)
        await db.flush()

    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user."""
    return current_user
