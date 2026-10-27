"""Reports export router (JSON & CSV) with mandatory disclaimers."""
import csv
import io
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import ScanDomain, User, WebsiteScan
from app.schemas.schemas import ScanDetailOut

router = APIRouter()

DISCLAIMER_TEXT = (
    "TraceGuard is a defensive privacy and security awareness auditing tool. "
    "It does not provide guarantees of complete website security or legal compliance. "
    "Observations reflect client-side network and DOM indicators captured during the audit session."
)

LIMITATIONS_TEXT = (
    "Observations are limited to client-side network requests and DOM indicators observed during the scan window. "
    "Server-side tracking, obfuscated analytics beacons, and conditional scripts cannot be definitively excluded."
)


@router.get("/{scan_id}/json")
async def get_json_report(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Generate comprehensive JSON privacy audit report with neutral analytical phrasing."""
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

    detail = ScanDetailOut.model_validate(scan).model_dump(mode="json")
    return {
        "disclaimer": DISCLAIMER_TEXT,
        "limitations": LIMITATIONS_TEXT,
        "report_generated_at": scan.created_at.isoformat(),
        "scan": detail,
    }


@router.get("/{scan_id}/csv")
async def get_csv_report(
    scan_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Generate CSV audit report including findings, cookie metadata, and disclaimer."""
    result = await db.execute(
        select(WebsiteScan)
        .where(WebsiteScan.id == scan_id, WebsiteScan.user_id == current_user.id)
        .options(
            selectinload(WebsiteScan.findings),
            selectinload(WebsiteScan.cookies),
        )
    )
    scan = result.scalar_one_or_none()
    if scan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    # 1. Header & Disclaimers
    writer.writerow(["TraceGuard Privacy & Security Audit Report"])
    writer.writerow(["Disclaimer", DISCLAIMER_TEXT])
    writer.writerow(["Limitations", LIMITATIONS_TEXT])
    writer.writerow([])

    # 2. Scan Summary
    writer.writerow(["Scan Metadata"])
    writer.writerow(["Scan ID", scan.id])
    writer.writerow(["Hostname", scan.hostname])
    writer.writerow(["URL (Redacted)", scan.url_redacted])
    writer.writerow(["Started At", scan.started_at.isoformat()])
    writer.writerow(["Overall Privacy Score", scan.overall_score])
    writer.writerow(["Observed Risk Level", scan.risk_level])
    writer.writerow(["Trackers Observed", scan.tracker_count])
    writer.writerow(["Third-Party Domains", scan.third_party_count])
    writer.writerow(["Cookies Observed", scan.cookie_count])
    writer.writerow([])

    # 3. Findings
    writer.writerow([
        "Finding Category",
        "Severity",
        "Title",
        "What Was Observed",
        "Why It Matters",
        "Limitation Note",
        "Score Penalty",
    ])
    for f in scan.findings:
        writer.writerow([
            f.category,
            f.severity,
            f.title,
            f.what_was_observed,
            f.why_it_matters,
            f.limitation_note,
            f.score_penalty,
        ])
    writer.writerow([])

    # 4. Cookies Metadata (Values omitted by design)
    writer.writerow([
        "Cookie Name",
        "Domain",
        "Path",
        "Secure",
        "HttpOnly",
        "SameSite",
        "Is Session",
        "Is Third Party",
        "Expiration Days",
    ])
    for c in scan.cookies:
        writer.writerow([
            c.name,
            c.domain,
            c.path,
            c.is_secure,
            c.is_http_only,
            c.same_site,
            c.is_session,
            c.is_third_party,
            c.expiration_days or "N/A",
        ])

    csv_data = output.getvalue()
    filename = f"traceguard-report-{scan.hostname}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
