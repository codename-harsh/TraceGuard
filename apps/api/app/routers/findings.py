"""Findings router for TraceGuard API."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import Finding, User, WebsiteScan
from app.schemas.schemas import FindingOut

router = APIRouter()


@router.get("/", response_model=list[FindingOut])
async def list_findings(
    severity: str | None = Query(None),
    category: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FindingOut]:
    """List observed privacy and security findings for all scans owned by the user."""
    query = (
        select(Finding)
        .join(WebsiteScan, Finding.scan_id == WebsiteScan.id)
        .where(WebsiteScan.user_id == current_user.id)
    )

    if severity:
        query = query.where(Finding.severity == severity.strip().upper())
    if category:
        query = query.where(Finding.category.ilike(f"%{category.strip()}%"))

    query = query.order_by(Finding.created_at.desc())
    result = await db.execute(query)
    findings = result.scalars().all()
    return [FindingOut.model_validate(f) for f in findings]
