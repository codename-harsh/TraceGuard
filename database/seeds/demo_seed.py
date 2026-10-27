"""
TraceGuard — Demo Mode Database Seeder
Seeds deterministic, realistic audit records for demo@traceguard.local.
All scores, finding texts, and domain categorizations adhere to GEMINI.md rules.
Idempotent: safe to run multiple times.
"""
import asyncio
from datetime import UTC, datetime, timedelta
from pathlib import Path
import sys

# Ensure apps/api is in sys.path
api_path = Path(__file__).resolve().parents[2] / "apps" / "api"
if str(api_path) not in sys.path:
    sys.path.insert(0, str(api_path))

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, Base, engine
from app.models.models import (
    CookieMetadataRecord,
    Domain,
    Finding,
    PermissionFindingRecord,
    ScanDomain,
    ScoreComponent,
    TrackerRulesVersion,
    User,
    UserPreferences,
    WebsiteScan,
)

DEMO_EMAIL = "demo@traceguard.local"
DEMO_PASSWORD = "TraceGuardDemo!2026"
RULE_VERSION = "1.0.0"


async def seed_demo_data(session: AsyncSession) -> dict[str, str]:
    """Seed demo user, tracker rules, and 4 deterministic website scans."""
    now = datetime.now(UTC)

    # 1. Tracker Rules Version
    rule_ver_stmt = select(TrackerRulesVersion).where(
        TrackerRulesVersion.version == RULE_VERSION
    )
    existing_rule_ver = (await session.execute(rule_ver_stmt)).scalar_one_or_none()
    if not existing_rule_ver:
        rules_ver = TrackerRulesVersion(
            version=RULE_VERSION,
            source_name="DuckDuckGo Tracker Radar & Disconnect List",
            license_type="CC BY-NC-SA 4.0",
            rule_count=2850,
            updated_at=now,
        )
        session.add(rules_ver)

    # 2. Demo User & Preferences
    user_stmt = select(User).where(User.email == DEMO_EMAIL)
    demo_user = (await session.execute(user_stmt)).scalar_one_or_none()

    if demo_user is None:
        demo_user = User(
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            full_name="Security Analyst (Demo)",
            created_at=now - timedelta(days=14),
        )
        session.add(demo_user)
        await session.flush()

        prefs = UserPreferences(
            user_id=demo_user.id,
            opt_in_cloud_sync=True,
            default_redaction_strict=True,
            theme="dark",
        )
        session.add(prefs)
    else:
        # Delete prior demo scans for clean, idempotent re-seeding
        await session.execute(
            delete(WebsiteScan).where(WebsiteScan.user_id == demo_user.id)
        )

    # 3. Domains catalog helper
    domains_cache: dict[str, Domain] = {}

    async def get_or_create_domain(
        hostname: str,
        registrable: str,
        category: str,
        is_tracker: bool,
    ) -> Domain:
        if hostname in domains_cache:
            return domains_cache[hostname]

        dom_stmt = select(Domain).where(Domain.hostname == hostname)
        dom = (await session.execute(dom_stmt)).scalar_one_or_none()
        if dom is None:
            dom = Domain(
                hostname=hostname,
                registrable_domain=registrable,
                category=category,
                is_tracker=is_tracker,
            )
            session.add(dom)
            await session.flush()
        domains_cache[hostname] = dom
        return dom

    # -----------------------------------------------------------------------
    # SCAN 1: news.example — Score: 48 (ELEVATED risk)
    # -----------------------------------------------------------------------
    scan1_started = now - timedelta(hours=3, minutes=15)
    scan1 = WebsiteScan(
        user_id=demo_user.id,
        hostname="news.example",
        url_redacted="https://news.example/article/cyber-security-trends?session=[REDACTED]&token=[REDACTED]",
        started_at=scan1_started,
        completed_at=scan1_started + timedelta(seconds=14),
        overall_score=48,
        risk_level="ELEVATED",
        third_party_count=8,
        tracker_count=5,
        cookie_count=12,
        permission_count=2,
        insecure_resource_count=1,
        rule_version=RULE_VERSION,
        created_at=scan1_started,
    )
    session.add(scan1)
    await session.flush()

    # Scan 1 Domains
    d_ad = await get_or_create_domain("adservice.example.net", "example.net", "Advertising", True)
    d_analytics = await get_or_create_domain("analytics-tag.example.com", "example.com", "Analytics", True)
    d_social = await get_or_create_domain("social-tracker.example.org", "example.org", "Social Media", True)
    d_retarget = await get_or_create_domain("retargeting-pixel.example.com", "example.com", "Advertising", True)
    d_fp = await get_or_create_domain("fingerprint-cdn.example.io", "example.io", "Fingerprinting", True)
    d_news_cdn = await get_or_create_domain("cdn.news.example", "news.example", "Content", False)
    d_fonts = await get_or_create_domain("fonts.example.org", "example.org", "Content", False)

    session.add_all([
        ScanDomain(scan_id=scan1.id, domain_id=d_ad.id, is_third_party=True, request_count=6),
        ScanDomain(scan_id=scan1.id, domain_id=d_analytics.id, is_third_party=True, request_count=4),
        ScanDomain(scan_id=scan1.id, domain_id=d_social.id, is_third_party=True, request_count=3),
        ScanDomain(scan_id=scan1.id, domain_id=d_retarget.id, is_third_party=True, request_count=2),
        ScanDomain(scan_id=scan1.id, domain_id=d_fp.id, is_third_party=True, request_count=1),
        ScanDomain(scan_id=scan1.id, domain_id=d_news_cdn.id, is_third_party=False, request_count=18),
        ScanDomain(scan_id=scan1.id, domain_id=d_fonts.id, is_third_party=True, request_count=2),
    ])

    # Scan 1 Findings
    session.add_all([
        Finding(
            scan_id=scan1.id,
            category="Tracker Domains",
            finding_type="multiple_trackers_detected",
            severity="HIGH",
            title="Multiple tracking domains observed during session",
            description="5 known advertising, retargeting, and fingerprinting domains were observed communicating in the background.",
            what_was_observed="Requests dispatched to adservice.example.net, retargeting-pixel.example.com, and fingerprint-cdn.example.io.",
            why_it_matters="Third-party tracking networks correlate user behavior across multiple independent properties without explicit consent.",
            limitation_note="Analysis captures network activity triggered during page load; lazy-loaded or conditional beacons may vary.",
            evidence_summary="5 tracker domains identified with 16 total background requests.",
            score_penalty=25,
            created_at=scan1_started,
        ),
        Finding(
            scan_id=scan1.id,
            category="Cookies & Storage",
            finding_type="third_party_tracking_cookies",
            severity="MEDIUM",
            title="Third-party cookies without Strict isolation",
            description="Third-party tracking cookies detected with lax or unspecified SameSite attributes.",
            what_was_observed="Cookie 'ad_id' set on adservice.example.net without SameSite restriction.",
            why_it_matters="Cookies accessible in cross-site contexts enable behavioral tracking across visited domains.",
            limitation_note="Client-side cookie inspection only; httpOnly cookies set via server responses are analyzed from response headers.",
            evidence_summary="3 cross-site tracking cookies identified.",
            score_penalty=12,
            created_at=scan1_started,
        ),
        Finding(
            scan_id=scan1.id,
            category="Network Security",
            finding_type="mixed_content_resource",
            severity="MEDIUM",
            title="Insecure HTTP resource request observed",
            description="One background asset requested over unencrypted HTTP on an otherwise HTTPS origin.",
            what_was_observed="Resource loaded from http://news.example/assets/legacy-banner.jpg.",
            why_it_matters="Unencrypted network requests are subject to passive eavesdropping and adversary tampering.",
            limitation_note="Browser mixed content blockers may prevent the asset from rendering, but request dispatch was observed.",
            evidence_summary="1 mixed content HTTP request detected.",
            score_penalty=10,
            created_at=scan1_started,
        ),
        Finding(
            scan_id=scan1.id,
            category="Browser Permissions",
            finding_type="prompt_permission_request",
            severity="LOW",
            title="Geolocation permission request initiated on load",
            description="Site invoked navigator.geolocation without prior user gesture.",
            what_was_observed="Geolocation API prompt displayed immediately after initial document parse.",
            why_it_matters="Unprompted location queries indicate aggressive device capability discovery.",
            limitation_note="Permission prompts do not expose location data unless explicitly granted by the user.",
            evidence_summary="Permission prompt for 'geolocation' recorded.",
            score_penalty=5,
            created_at=scan1_started,
        ),
    ])

    # Scan 1 Cookies (NEVER raw values)
    session.add_all([
        CookieMetadataRecord(
            scan_id=scan1.id,
            name="_ga",
            domain=".news.example",
            path="/",
            is_secure=True,
            is_http_only=False,
            same_site="Lax",
            is_session=False,
            is_third_party=False,
            expiration_days=730,
        ),
        CookieMetadataRecord(
            scan_id=scan1.id,
            name="ad_id",
            domain="adservice.example.net",
            path="/",
            is_secure=False,
            is_http_only=False,
            same_site="Unspecified",
            is_session=False,
            is_third_party=True,
            expiration_days=180,
        ),
        CookieMetadataRecord(
            scan_id=scan1.id,
            name="_fbp",
            domain=".example.com",
            path="/",
            is_secure=True,
            is_http_only=False,
            same_site="None",
            is_session=False,
            is_third_party=True,
            expiration_days=90,
        ),
        CookieMetadataRecord(
            scan_id=scan1.id,
            name="session_token",
            domain="news.example",
            path="/",
            is_secure=True,
            is_http_only=True,
            same_site="Strict",
            is_session=True,
            is_third_party=False,
        ),
    ])

    # Scan 1 Permissions
    session.add_all([
        PermissionFindingRecord(
            scan_id=scan1.id,
            permission_name="geolocation",
            status="prompt",
            note="Invoked immediately after DOMContentLoaded without user action",
        ),
        PermissionFindingRecord(
            scan_id=scan1.id,
            permission_name="notifications",
            status="prompt",
            note="Push notifications prompt requested",
        ),
    ])

    # Scan 1 Score Components
    session.add_all([
        ScoreComponent(
            scan_id=scan1.id,
            category="Tracker Domains",
            max_penalty=35,
            applied_penalty=25,
            details_json={"tracker_count": 5, "severity": "HIGH"},
        ),
        ScoreComponent(
            scan_id=scan1.id,
            category="Cookies & Storage",
            max_penalty=25,
            applied_penalty=12,
            details_json={"unspecified_samesite_count": 1, "third_party_cookies": 2},
        ),
        ScoreComponent(
            scan_id=scan1.id,
            category="Network Security",
            max_penalty=25,
            applied_penalty=10,
            details_json={"insecure_mixed_content_count": 1},
        ),
        ScoreComponent(
            scan_id=scan1.id,
            category="Browser Permissions",
            max_penalty=15,
            applied_penalty=5,
            details_json={"permission_prompts": 2},
        ),
    ])

    # -----------------------------------------------------------------------
    # SCAN 2: shop.example — Score: 68 (MODERATE risk)
    # -----------------------------------------------------------------------
    scan2_started = now - timedelta(days=1, hours=4)
    scan2 = WebsiteScan(
        user_id=demo_user.id,
        hostname="shop.example",
        url_redacted="https://shop.example/catalog/gadgets?ref=newsletter",
        started_at=scan2_started,
        completed_at=scan2_started + timedelta(seconds=9),
        overall_score=68,
        risk_level="MODERATE",
        third_party_count=4,
        tracker_count=2,
        cookie_count=5,
        permission_count=1,
        insecure_resource_count=0,
        rule_version=RULE_VERSION,
        created_at=scan2_started,
    )
    session.add(scan2)
    await session.flush()

    d_replay = await get_or_create_domain("replay-analytics.example.com", "example.com", "Session Replay", True)
    d_metrics = await get_or_create_domain("metrics.example.net", "example.net", "Analytics", True)
    d_pay = await get_or_create_domain("pay-gateway.example.com", "example.com", "Payment", False)
    d_img = await get_or_create_domain("img-cdn.example.org", "example.org", "Content", False)

    session.add_all([
        ScanDomain(scan_id=scan2.id, domain_id=d_replay.id, is_third_party=True, request_count=5),
        ScanDomain(scan_id=scan2.id, domain_id=d_metrics.id, is_third_party=True, request_count=3),
        ScanDomain(scan_id=scan2.id, domain_id=d_pay.id, is_third_party=True, request_count=2),
        ScanDomain(scan_id=scan2.id, domain_id=d_img.id, is_third_party=True, request_count=14),
    ])

    session.add_all([
        Finding(
            scan_id=scan2.id,
            category="Data Harvesting",
            finding_type="session_replay_detected",
            severity="MEDIUM",
            title="Session replay analytics service observed",
            description="Background script transmitting mouse events and DOM mutations to an external collector.",
            what_was_observed="Transmissions to replay-analytics.example.com capturing user interaction events.",
            why_it_matters="Session replay scripts can inadvertently record sensitive form inputs unless strictly redacted.",
            limitation_note="TraceGuard observes endpoint communication; specific DOM masking implementation cannot be verified externally.",
            evidence_summary="Active session recorder telemetry identified.",
            score_penalty=18,
            created_at=scan2_started,
        ),
        Finding(
            scan_id=scan2.id,
            category="Tracker Domains",
            finding_type="analytics_tracker_detected",
            severity="LOW",
            title="General web analytics provider identified",
            description="Telemetry requests observed directed to metrics.example.net.",
            what_was_observed="Standard pageview and click beacons sent to metrics.example.net.",
            why_it_matters="Aggregated web traffic analytics provide site owners operational metrics with low individual privacy impact.",
            limitation_note="Privacy indicators depend on whether the provider pseudonymizes client IP addresses.",
            evidence_summary="1 general analytics tracker recorded.",
            score_penalty=10,
            created_at=scan2_started,
        ),
        Finding(
            scan_id=scan2.id,
            category="Cookies & Storage",
            finding_type="persistent_marketing_cookie",
            severity="LOW",
            title="Long-lived third-party identifier cookie",
            description="Cookie lifespan exceeds 30 days without clear user session dependency.",
            what_was_observed="Cookie 'sr_session' set on replay-analytics.example.com with 30-day expiration.",
            why_it_matters="Persistent identifiers maintain continuity across distinct browser sessions.",
            limitation_note="Cookie expiration is read from header metadata and may be purged sooner by browser policies.",
            evidence_summary="1 persistent cookie identified.",
            score_penalty=4,
            created_at=scan2_started,
        ),
    ])

    session.add_all([
        CookieMetadataRecord(
            scan_id=scan2.id,
            name="cart_token",
            domain="shop.example",
            path="/",
            is_secure=True,
            is_http_only=True,
            same_site="Lax",
            is_session=True,
            is_third_party=False,
        ),
        CookieMetadataRecord(
            scan_id=scan2.id,
            name="sr_session",
            domain="replay-analytics.example.com",
            path="/",
            is_secure=True,
            is_http_only=False,
            same_site="None",
            is_session=False,
            is_third_party=True,
            expiration_days=30,
        ),
    ])

    session.add(
        PermissionFindingRecord(
            scan_id=scan2.id,
            permission_name="camera",
            status="denied",
            note="Barcode / QR scanning feature queried camera API capability",
        )
    )

    session.add_all([
        ScoreComponent(
            scan_id=scan2.id,
            category="Tracker Domains",
            max_penalty=35,
            applied_penalty=18,
            details_json={"replay_analytics": 1, "standard_analytics": 1},
        ),
        ScoreComponent(
            scan_id=scan2.id,
            category="Cookies & Storage",
            max_penalty=25,
            applied_penalty=4,
            details_json={"long_lived_cookie": 1},
        ),
        ScoreComponent(
            scan_id=scan2.id,
            category="Network Security",
            max_penalty=25,
            applied_penalty=0,
            details_json={"all_https": True},
        ),
        ScoreComponent(
            scan_id=scan2.id,
            category="Browser Permissions",
            max_penalty=15,
            applied_penalty=10,
            details_json={"hardware_permission_query": 1},
        ),
    ])

    # -----------------------------------------------------------------------
    # SCAN 3: blog.example — Score: 94 (MINIMAL risk)
    # -----------------------------------------------------------------------
    scan3_started = now - timedelta(days=2, hours=8)
    scan3 = WebsiteScan(
        user_id=demo_user.id,
        hostname="blog.example",
        url_redacted="https://blog.example/posts/privacy-in-2026",
        started_at=scan3_started,
        completed_at=scan3_started + timedelta(seconds=4),
        overall_score=94,
        risk_level="MINIMAL",
        third_party_count=0,
        tracker_count=0,
        cookie_count=1,
        permission_count=0,
        insecure_resource_count=0,
        rule_version=RULE_VERSION,
        created_at=scan3_started,
    )
    session.add(scan3)
    await session.flush()

    d_blog = await get_or_create_domain("blog.example", "blog.example", "Content", False)
    session.add(
        ScanDomain(scan_id=scan3.id, domain_id=d_blog.id, is_third_party=False, request_count=8)
    )

    session.add(
        Finding(
            scan_id=scan3.id,
            category="Cookies & Storage",
            finding_type="first_party_preference_cookie",
            severity="INFO",
            title="First-party UI preference cookie observed",
            description="A single client-side cookie used to persist theme and layout preferences.",
            what_was_observed="Cookie 'theme_pref' set with SameSite=Strict and Secure flags.",
            why_it_matters="First-party UI cookies do not enable cross-site tracking and respect browser security boundaries.",
            limitation_note="Informational indicator only; minimal observed privacy impact.",
            evidence_summary="1 strictly isolated first-party cookie.",
            score_penalty=6,
            created_at=scan3_started,
        )
    )

    session.add(
        CookieMetadataRecord(
            scan_id=scan3.id,
            name="theme_pref",
            domain="blog.example",
            path="/",
            is_secure=True,
            is_http_only=False,
            same_site="Strict",
            is_session=False,
            is_third_party=False,
            expiration_days=365,
        )
    )

    session.add_all([
        ScoreComponent(
            scan_id=scan3.id,
            category="Tracker Domains",
            max_penalty=35,
            applied_penalty=0,
            details_json={"tracker_count": 0},
        ),
        ScoreComponent(
            scan_id=scan3.id,
            category="Cookies & Storage",
            max_penalty=25,
            applied_penalty=6,
            details_json={"persistent_first_party_cookie": 1},
        ),
        ScoreComponent(
            scan_id=scan3.id,
            category="Network Security",
            max_penalty=25,
            applied_penalty=0,
            details_json={"full_transport_encryption": True},
        ),
        ScoreComponent(
            scan_id=scan3.id,
            category="Browser Permissions",
            max_penalty=15,
            applied_penalty=0,
            details_json={"permissions_requested": 0},
        ),
    ])

    # -----------------------------------------------------------------------
    # SCAN 4: portal.example — Score: 81 (LOW risk)
    # -----------------------------------------------------------------------
    scan4_started = now - timedelta(days=3, hours=1)
    scan4 = WebsiteScan(
        user_id=demo_user.id,
        hostname="portal.example",
        url_redacted="https://portal.example/dashboard",
        started_at=scan4_started,
        completed_at=scan4_started + timedelta(seconds=6),
        overall_score=81,
        risk_level="LOW",
        third_party_count=2,
        tracker_count=1,
        cookie_count=2,
        permission_count=0,
        insecure_resource_count=0,
        rule_version=RULE_VERSION,
        created_at=scan4_started,
    )
    session.add(scan4)
    await session.flush()

    d_portal = await get_or_create_domain("portal.example", "portal.example", "Productivity", False)
    d_telemetry = await get_or_create_domain("telemetry.example.org", "example.org", "Analytics", True)
    d_portal_fonts = await get_or_create_domain("fonts.example.net", "example.net", "Content", False)

    session.add_all([
        ScanDomain(scan_id=scan4.id, domain_id=d_portal.id, is_third_party=False, request_count=12),
        ScanDomain(scan_id=scan4.id, domain_id=d_telemetry.id, is_third_party=True, request_count=2),
        ScanDomain(scan_id=scan4.id, domain_id=d_portal_fonts.id, is_third_party=True, request_count=2),
    ])

    session.add_all([
        Finding(
            scan_id=scan4.id,
            category="Tracker Domains",
            finding_type="privacy_preserving_telemetry",
            severity="LOW",
            title="Aggregated telemetry domain observed",
            description="Telemetry beacon sent to telemetry.example.org with privacy-preserving headers.",
            what_was_observed="Periodic heartbeat transmission to telemetry.example.org.",
            why_it_matters="Aggregated service metrics provide software reliability data without intrusive profiling.",
            limitation_note="Payload payload inspection confirms aggregate reporting counters.",
            evidence_summary="1 low-impact telemetry service identified.",
            score_penalty=12,
            created_at=scan4_started,
        ),
        Finding(
            scan_id=scan4.id,
            category="Cookies & Storage",
            finding_type="authenticated_session_cookie",
            severity="INFO",
            title="Session cookie with robust security flags",
            description="Primary session identifier protected with HttpOnly and Strict attributes.",
            what_was_observed="Cookie 'auth_session' set with HttpOnly, Secure, and SameSite=Strict.",
            why_it_matters="Proper security flags mitigate client-side script tampering and CSRF vectors.",
            limitation_note="Standard session cookie requirement for authenticated web portals.",
            evidence_summary="Strictly secured session cookie.",
            score_penalty=7,
            created_at=scan4_started,
        ),
    ])

    session.add_all([
        CookieMetadataRecord(
            scan_id=scan4.id,
            name="auth_session",
            domain="portal.example",
            path="/",
            is_secure=True,
            is_http_only=True,
            same_site="Strict",
            is_session=True,
            is_third_party=False,
        ),
        CookieMetadataRecord(
            scan_id=scan4.id,
            name="telemetry_uid",
            domain="telemetry.example.org",
            path="/",
            is_secure=True,
            is_http_only=True,
            same_site="Lax",
            is_session=False,
            is_third_party=True,
            expiration_days=14,
        ),
    ])

    session.add_all([
        ScoreComponent(
            scan_id=scan4.id,
            category="Tracker Domains",
            max_penalty=35,
            applied_penalty=12,
            details_json={"telemetry_domains": 1},
        ),
        ScoreComponent(
            scan_id=scan4.id,
            category="Cookies & Storage",
            max_penalty=25,
            applied_penalty=7,
            details_json={"cookie_count": 2},
        ),
        ScoreComponent(
            scan_id=scan4.id,
            category="Network Security",
            max_penalty=25,
            applied_penalty=0,
            details_json={"https_verified": True},
        ),
        ScoreComponent(
            scan_id=scan4.id,
            category="Browser Permissions",
            max_penalty=15,
            applied_penalty=0,
            details_json={"no_permissions": True},
        ),
    ])

    await session.commit()
    return {
        "status": "seeded",
        "user": DEMO_EMAIL,
        "scans": ["news.example", "shop.example", "blog.example", "portal.example"],
    }


async def main() -> None:
    # Ensure database tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await seed_demo_data(session)
        print(f"Demo seed complete: {result}")


if __name__ == "__main__":
    asyncio.run(main())
