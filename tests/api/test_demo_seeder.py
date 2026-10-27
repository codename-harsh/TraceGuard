"""Demo seeder verification and idempotency test suite."""
import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    CookieMetadataRecord,
    TrackerRulesVersion,
    User,
    WebsiteScan,
)
from database.seeds.demo_seed import DEMO_EMAIL, DEMO_PASSWORD, seed_demo_data


@pytest.mark.asyncio
async def test_demo_seeder_idempotency_and_accuracy(
    db_session: AsyncSession, client: httpx.AsyncClient
):
    """Verify demo seeder runs cleanly, idempotently, and populates all 4 canonical scans."""
    # Run seeder twice to verify idempotency
    res1 = await seed_demo_data(db_session)
    assert res1["status"] == "seeded"
    assert len(res1["scans"]) == 4

    res2 = await seed_demo_data(db_session)
    assert res2["status"] == "seeded"

    # 1. Verify demo user exists
    user_res = await db_session.execute(select(User).where(User.email == DEMO_EMAIL))
    demo_user = user_res.scalar_one_or_none()
    assert demo_user is not None
    assert demo_user.email == DEMO_EMAIL

    # 2. Verify demo user can log in via API
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    auth_header = {"Authorization": f"Bearer {token}"}

    # 3. Verify all 4 canonical scans exist with accurate scores and risk classifications
    scans_res = await client.get("/api/v1/scans/", headers=auth_header)
    assert scans_res.status_code == 200
    scans = {s["hostname"]: s for s in scans_res.json()}

    assert set(scans.keys()) == {
        "news.example",
        "shop.example",
        "blog.example",
        "portal.example",
    }

    # news.example: Score 48, ELEVATED
    assert scans["news.example"]["overall_score"] == 48
    assert scans["news.example"]["risk_level"] == "ELEVATED"
    assert scans["news.example"]["tracker_count"] == 5

    # shop.example: Score 68, MODERATE
    assert scans["shop.example"]["overall_score"] == 68
    assert scans["shop.example"]["risk_level"] == "MODERATE"
    assert scans["shop.example"]["tracker_count"] == 2

    # blog.example: Score 94, MINIMAL
    assert scans["blog.example"]["overall_score"] == 94
    assert scans["blog.example"]["risk_level"] == "MINIMAL"
    assert scans["blog.example"]["tracker_count"] == 0

    # portal.example: Score 81, LOW
    assert scans["portal.example"]["overall_score"] == 81
    assert scans["portal.example"]["risk_level"] == "LOW"
    assert scans["portal.example"]["tracker_count"] == 1

    # 4. Verify tracker_rules_version record exists
    rules_res = await db_session.execute(
        select(TrackerRulesVersion).where(TrackerRulesVersion.version == "1.0.0")
    )
    rules_ver = rules_res.scalar_one_or_none()
    assert rules_ver is not None
    assert rules_ver.rule_count == 2850
    assert "DuckDuckGo" in rules_ver.source_name

    # 5. Verify no cookie records store raw cookie values
    cookies_res = await db_session.execute(select(CookieMetadataRecord))
    cookies = cookies_res.scalars().all()
    assert len(cookies) > 0
    for c in cookies:
        assert c.name
        assert c.domain
        assert not hasattr(c, "value")
