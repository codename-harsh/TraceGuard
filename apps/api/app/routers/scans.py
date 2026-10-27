"""Website scans router for TraceGuard API."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.core.sanitizer import sanitize_url
from app.db.session import get_db
from app.models.models import (
    CookieMetadataRecord,
    Domain,
    Finding,
    PermissionFindingRecord,
    ScanDomain,
    ScoreComponent,
    User,
    WebsiteScan,
)
from app.schemas.schemas import (
    CreateScanRequest,
    FindingOut,
    ScanDetailOut,
    ScanOut,
    ScoreBreakdown,
    ScoreComponentOut,
)

router = APIRouter()


@router.post("/", response_model=ScanDetailOut, status_code=status.HTTP_201_CREATED)
async def create_scan(
    payload: CreateScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScanDetailOut:
    """
    Persist a website scan result with strict privacy redaction.
    Raw cookie values and authorization tokens are strictly rejected.
    """
    clean_url = sanitize_url(payload.url_redacted)

    scan = WebsiteScan(
        user_id=current_user.id,
        hostname=payload.hostname,
        url_redacted=clean_url,
        started_at=payload.started_at,
        completed_at=payload.completed_at,
        overall_score=payload.overall_score,
        risk_level=payload.risk_level,
        third_party_count=payload.third_party_count,
        tracker_count=payload.tracker_count,
        cookie_count=payload.cookie_count,
        permission_count=payload.permission_count,
        insecure_resource_count=payload.insecure_resource_count,
        rule_version=payload.rule_version,
    )
    db.add(scan)
    await db.flush()

    # Findings
    for f in payload.findings:
        finding = Finding(
            scan_id=scan.id,
            category=f.category,
            finding_type=f.finding_type,
            severity=f.severity,
            title=f.title,
            description=f.description,
            what_was_observed=f.what_was_observed,
            why_it_matters=f.why_it_matters,
            limitation_note=f.limitation_note,
            evidence_summary=f.evidence_summary,
            score_penalty=f.score_penalty,
        )
        db.add(finding)

    # Cookies — NEVER store cookie value
    for c in payload.cookies:
        cookie_record = CookieMetadataRecord(
            scan_id=scan.id,
            name=c.name,
            domain=c.domain,
            path=c.path,
            is_secure=c.is_secure,
            is_http_only=c.is_http_only,
            same_site=c.same_site,
            is_session=c.is_session,
            is_third_party=c.is_third_party,
            expiration_days=c.expiration_days,
        )
        db.add(cookie_record)

    # Permissions
    for p in payload.permissions:
        perm_record = PermissionFindingRecord(
            scan_id=scan.id,
            permission_name=p.permission_name,
            status=p.status,
            note=p.note,
        )
        db.add(perm_record)

    # Score components
    for s in payload.score_components:
        score_comp = ScoreComponent(
            scan_id=scan.id,
            category=s.category,
            max_penalty=s.max_penalty,
            applied_penalty=s.applied_penalty,
            details_json=s.details_json,
        )
        db.add(score_comp)

    # Domains & ScanDomains
    for d in payload.domains:
        existing_domain = await db.execute(
            select(Domain).where(Domain.hostname == d.hostname)
        )
        domain = existing_domain.scalar_one_or_none()
        if domain is None:
            domain = Domain(
                hostname=d.hostname,
                registrable_domain=d.registrable_domain,
                category=d.category,
                is_tracker=d.is_tracker,
            )
            db.add(domain)
            await db.flush()

        scan_domain = ScanDomain(
            scan_id=scan.id,
            domain_id=domain.id,
            is_third_party=d.is_third_party,
            request_count=d.request_count,
            insecure_request_count=d.insecure_request_count,
        )
        db.add(scan_domain)

    await db.commit()

    # Re-fetch complete scan with relations
    result = await db.execute(
        select(WebsiteScan)
        .where(WebsiteScan.id == scan.id)
        .options(
            selectinload(WebsiteScan.findings),
            selectinload(WebsiteScan.cookies),
            selectinload(WebsiteScan.permissions),
            selectinload(WebsiteScan.score_components),
            selectinload(WebsiteScan.scan_domains).selectinload(ScanDomain.domain),
        )
    )
    full_scan = result.scalar_one()
    return ScanDetailOut.model_validate(full_scan)


@router.get("/", response_model=list[ScanOut])
async def list_scans(
    hostname: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    min_score: int | None = Query(None, ge=0, le=100),
    max_score: int | None = Query(None, ge=0, le=100),
    risk_level: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ScanOut]:
    """List scans belonging to the authenticated user with optional filtering."""
    query = select(WebsiteScan).where(WebsiteScan.user_id == current_user.id)

    if hostname:
        query = query.where(WebsiteScan.hostname.ilike(f"%{hostname.strip()}%"))
    if date_from:
        query = query.where(WebsiteScan.started_at >= date_from)
    if date_to:
        query = query.where(WebsiteScan.started_at <= date_to)
    if min_score is not None:
        query = query.where(WebsiteScan.overall_score >= min_score)
    if max_score is not None:
        query = query.where(WebsiteScan.overall_score <= max_score)
    if risk_level:
        query = query.where(WebsiteScan.risk_level == risk_level.strip().upper())

    query = query.order_by(WebsiteScan.started_at.desc())
    result = await db.execute(query)
    scans = result.scalars().all()
    return [ScanOut.model_validate(s) for s in scans]


@router.get("/{scan_id}", response_model=ScanDetailOut)
async def get_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScanDetailOut:
    """Get a detailed scan record owned by the authenticated user."""
    result = await db.execute(
        select(WebsiteScan)
        .where(WebsiteScan.id == scan_id, WebsiteScan.user_id == current_user.id)
        .options(
            selectinload(WebsiteScan.findings),
            selectinload(WebsiteScan.cookies),
            selectinload(WebsiteScan.permissions),
            selectinload(WebsiteScan.score_components),
            selectinload(WebsiteScan.scan_domains).selectinload(ScanDomain.domain),
        )
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    return ScanDetailOut.model_validate(scan)


@router.delete("/{scan_id}")
async def delete_scan(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete a scan owned by the authenticated user."""
    result = await db.execute(
        select(WebsiteScan).where(WebsiteScan.id == scan_id, WebsiteScan.user_id == current_user.id)
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    await db.delete(scan)
    await db.commit()
    return {"message": "Scan deleted successfully", "id": scan_id}


@router.get("/{scan_id}/findings", response_model=list[FindingOut])
async def get_scan_findings(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[FindingOut]:
    """Get all findings for a scan owned by the authenticated user."""
    scan_check = await db.execute(
        select(WebsiteScan.id).where(WebsiteScan.id == scan_id, WebsiteScan.user_id == current_user.id)
    )
    if scan_check.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    result = await db.execute(
        select(Finding).where(Finding.scan_id == scan_id).order_by(Finding.score_penalty.desc())
    )
    findings = result.scalars().all()
    return [FindingOut.model_validate(f) for f in findings]


@router.get("/{scan_id}/score", response_model=ScoreBreakdown)
async def get_scan_score(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ScoreBreakdown:
    """Get score breakdown and category penalties for a scan owned by the user."""
    result = await db.execute(
        select(WebsiteScan)
        .where(WebsiteScan.id == scan_id, WebsiteScan.user_id == current_user.id)
        .options(selectinload(WebsiteScan.score_components))
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    return ScoreBreakdown(
        scan_id=scan.id,
        overall_score=scan.overall_score,
        risk_level=scan.risk_level,
        components=[ScoreComponentOut.model_validate(c) for c in scan.score_components],
    )
