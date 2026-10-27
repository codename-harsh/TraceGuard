"""Sites and comparisons router for TraceGuard API."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import User, WebsiteScan
from app.schemas.schemas import RiskDistribution, ScanCompare, ScanOut, SitesOverview

router = APIRouter()


@router.get("/overview", response_model=SitesOverview)
async def get_sites_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SitesOverview:
    """Compute real dashboard KPI metrics from database records for authenticated user."""
    # Aggregated stats
    stats_query = select(
        func.count(WebsiteScan.id).label("total_scans"),
        func.count(distinct(WebsiteScan.hostname)).label("unique_hostnames"),
        func.avg(WebsiteScan.overall_score).label("avg_score"),
        func.sum(WebsiteScan.tracker_count).label("total_trackers"),
        func.sum(WebsiteScan.third_party_count).label("total_third_parties"),
    ).where(WebsiteScan.user_id == current_user.id)

    stats_res = await db.execute(stats_query)
    total_scans, unique_hostnames, avg_score, total_trackers, total_third_parties = (
        stats_res.one()
    )

    # Risk level distribution
    dist_query = (
        select(WebsiteScan.risk_level, func.count(WebsiteScan.id))
        .where(WebsiteScan.user_id == current_user.id)
        .group_by(WebsiteScan.risk_level)
    )
    dist_res = await db.execute(dist_query)
    dist_map = dict(dist_res.all())

    risk_dist = RiskDistribution(
        MINIMAL=dist_map.get("MINIMAL", 0),
        LOW=dist_map.get("LOW", 0),
        MODERATE=dist_map.get("MODERATE", 0),
        ELEVATED=dist_map.get("ELEVATED", 0),
        HIGH=dist_map.get("HIGH", 0),
    )

    # Recent scans (limit 5)
    recent_query = (
        select(WebsiteScan)
        .where(WebsiteScan.user_id == current_user.id)
        .order_by(WebsiteScan.started_at.desc())
        .limit(5)
    )
    recent_res = await db.execute(recent_query)
    recent_scans = recent_res.scalars().all()

    return SitesOverview(
        total_scans=total_scans or 0,
        unique_hostnames=unique_hostnames or 0,
        average_score=round(float(avg_score or 0.0), 1),
        total_trackers=int(total_trackers or 0),
        total_third_parties=int(total_third_parties or 0),
        risk_distribution=risk_dist,
        recent_scans=[ScanOut.model_validate(s) for s in recent_scans],
    )


@router.get("/compare", response_model=ScanCompare)
async def compare_scans(
    scan_a: str = Query(..., description="First scan ID"),
    scan_b: str = Query(..., description="Second scan ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScanCompare:
    """Perform side-by-side comparison of two scans owned by authenticated user."""
    res_a = await db.execute(
        select(WebsiteScan).where(
            WebsiteScan.id == scan_a, WebsiteScan.user_id == current_user.id
        )
    )
    a = res_a.scalar_one_or_none()

    res_b = await db.execute(
        select(WebsiteScan).where(
            WebsiteScan.id == scan_b, WebsiteScan.user_id == current_user.id
        )
    )
    b = res_b.scalar_one_or_none()

    if a is None or b is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both scans not found or unauthorized",
        )

    return ScanCompare(
        scan_a=ScanOut.model_validate(a),
        scan_b=ScanOut.model_validate(b),
        score_delta=b.overall_score - a.overall_score,
        tracker_delta=b.tracker_count - a.tracker_count,
        third_party_delta=b.third_party_count - a.third_party_count,
    )
