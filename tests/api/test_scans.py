"""Website Scans API test suite."""
from datetime import UTC, datetime, timedelta

import httpx
import pytest


def make_scan_payload(
    hostname: str = "secure-site.example",
    score: int = 85,
    risk: str = "LOW",
) -> dict:
    now = datetime.now(UTC)
    return {
        "hostname": hostname,
        "url_redacted": f"https://{hostname}/app",
        "started_at": now.isoformat(),
        "completed_at": (now + timedelta(seconds=5)).isoformat(),
        "overall_score": score,
        "risk_level": risk,
        "third_party_count": 2,
        "tracker_count": 1,
        "cookie_count": 2,
        "permission_count": 1,
        "insecure_resource_count": 0,
        "rule_version": "1.0.0",
        "findings": [
            {
                "category": "Tracker Domains",
                "finding_type": "telemetry_tracker",
                "severity": "LOW",
                "title": "Observed privacy indicator: analytics beacon",
                "what_was_observed": "Telemetric request to analytics.example.org",
                "why_it_matters": "Aggregated user analytics correlate interaction data",
                "limitation_note": "Observed on initial page load; does not account for opt-out cookies",
                "evidence_summary": "1 request dispatched",
                "score_penalty": 15,
            }
        ],
        "cookies": [
            {
                "name": "sess",
                "domain": hostname,
                "path": "/",
                "is_secure": True,
                "is_http_only": True,
                "same_site": "Strict",
                "is_session": True,
                "is_third_party": False,
            }
        ],
        "permissions": [
            {
                "permission_name": "notifications",
                "status": "prompt",
                "note": "Prompt requested",
            }
        ],
        "score_components": [
            {
                "category": "Tracker Domains",
                "max_penalty": 35,
                "applied_penalty": 15,
                "details_json": {"trackers": 1},
            }
        ],
        "domains": [
            {
                "hostname": "analytics.example.org",
                "registrable_domain": "example.org",
                "category": "Analytics",
                "is_tracker": True,
                "is_third_party": True,
                "request_count": 2,
                "insecure_request_count": 0,
            }
        ],
    }


@pytest.mark.asyncio
async def test_create_and_read_scan(client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]):
    """Test full creation, relational population, and retrieval of a scan."""
    payload = make_scan_payload(hostname="test-portal.example", score=88, risk="LOW")
    res = await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=payload)
    assert res.status_code == 201
    created = res.json()
    scan_id = created["id"]

    assert created["hostname"] == "test-portal.example"
    assert created["overall_score"] == 88
    assert created["risk_level"] == "LOW"
    assert len(created["findings"]) == 1
    assert len(created["cookies"]) == 1
    assert len(created["permissions"]) == 1
    assert len(created["score_components"]) == 1
    assert len(created["scan_domains"]) == 1
    assert created["scan_domains"][0]["domain"]["hostname"] == "analytics.example.org"

    # GET /scans/{id}
    get_res = await client.get(f"/api/v1/scans/{scan_id}", headers=auth_headers_user_a)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == scan_id

    # GET /scans/{id}/findings
    findings_res = await client.get(f"/api/v1/scans/{scan_id}/findings", headers=auth_headers_user_a)
    assert findings_res.status_code == 200
    findings = findings_res.json()
    assert len(findings) == 1
    assert findings[0]["finding_type"] == "telemetry_tracker"

    # GET /scans/{id}/score
    score_res = await client.get(f"/api/v1/scans/{scan_id}/score", headers=auth_headers_user_a)
    assert score_res.status_code == 200
    score_data = score_res.json()
    assert score_data["overall_score"] == 88
    assert score_data["risk_level"] == "LOW"
    assert len(score_data["components"]) == 1


@pytest.mark.asyncio
async def test_scan_filters_and_listing(client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]):
    """Test query filtering on hostname, score ranges, and risk levels."""
    # Seed 2 scans for User A
    p1 = make_scan_payload(hostname="alpha-news.example", score=45, risk="ELEVATED")
    p2 = make_scan_payload(hostname="beta-blog.example", score=95, risk="MINIMAL")
    await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=p1)
    await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=p2)

    # Filter by hostname
    h_res = await client.get("/api/v1/scans/?hostname=alpha", headers=auth_headers_user_a)
    assert h_res.status_code == 200
    assert len(h_res.json()) >= 1
    assert all("alpha" in s["hostname"] for s in h_res.json())

    # Filter by risk level
    r_res = await client.get("/api/v1/scans/?risk_level=MINIMAL", headers=auth_headers_user_a)
    assert r_res.status_code == 200
    assert all(s["risk_level"] == "MINIMAL" for s in r_res.json())

    # Filter by score range
    s_res = await client.get("/api/v1/scans/?min_score=90&max_score=100", headers=auth_headers_user_a)
    assert s_res.status_code == 200
    assert all(s["overall_score"] >= 90 for s in s_res.json())


@pytest.mark.asyncio
async def test_delete_scan(client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]):
    """Test deleting a scan cascades properly."""
    payload = make_scan_payload(hostname="to-delete.example", score=75, risk="LOW")
    create_res = await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=payload)
    scan_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/v1/scans/{scan_id}", headers=auth_headers_user_a)
    assert del_res.status_code == 200

    # Ensure it no longer exists
    get_res = await client.get(f"/api/v1/scans/{scan_id}", headers=auth_headers_user_a)
    assert get_res.status_code == 404
