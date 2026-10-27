"""User preferences and settings router for TraceGuard API."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import User, UserPreferences
from app.schemas.schemas import SettingsOut, SettingsUpdate

router = APIRouter()


@router.get("/", response_model=SettingsOut)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SettingsOut:
    """Retrieve settings and preferences for the authenticated user."""
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()

    if prefs is None:
        prefs = UserPreferences(
            user_id=current_user.id,
            opt_in_cloud_sync=False,
            default_redaction_strict=True,
            theme="dark",
        )
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)

    return SettingsOut.model_validate(prefs)


@router.put("/", response_model=SettingsOut)
async def update_settings(
    payload: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SettingsOut:
    """Update settings and preferences for the authenticated user."""
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()

    if prefs is None:
        prefs = UserPreferences(user_id=current_user.id)
        db.add(prefs)

    if payload.opt_in_cloud_sync is not None:
        prefs.opt_in_cloud_sync = payload.opt_in_cloud_sync
    if payload.default_redaction_strict is not None:
        prefs.default_redaction_strict = payload.default_redaction_strict
    if payload.theme is not None:
        prefs.theme = payload.theme

    await db.commit()
    await db.refresh(prefs)
    return SettingsOut.model_validate(prefs)
