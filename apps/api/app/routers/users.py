"""User profile router for TraceGuard API."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import UserOut, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserOut:
    """Get the authenticated user's profile."""
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut)
async def update_current_user_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    """Update profile information for the authenticated user."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return UserOut.model_validate(current_user)
