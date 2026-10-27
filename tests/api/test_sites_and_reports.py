"""Sites overview, comparison, reports, findings, and settings tests."""
from datetime import UTC, datetime

import httpx
import pytest


@pytest.mark.asyncio
async def test_sites_overview_and_compare(
    client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]
):
    """Test dashboard KPI aggregation and side-by-side site comparison."""
    now = datetime.now(UTC)

    # Create two scans with distinct metrics
    s1 = {
        "hostname": "site-one.example",
        "url_redacted": "https://site-one.example",
        "started_at": now.isoformat(),
        "overall_score": 50,
        "risk_level": "ELEVATED",
        "third_party_count": 6,
        "tracker_count": 4,
    }
    s2 = {
        "hostname": "site-two.example",
        "url_redacted": "https://site-two.example",
        "started_at": now.isoformat(),
        "overall_score": 80,
        "risk_level": "LOW",
        "third_party_count": 2,
        "tracker_count": 1,
    }

    res1 = await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=s1)
    res2 = await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=s2)
    id1 = res1.json()["id"]
    id2 = res2.json()["id"]

    # 1. Overview
    overview_res = await client.get("/api/v1/sites/overview", headers=auth_headers_user_a)
    assert overview_res.status_code == 200
    ov = overview_res.json()

    assert ov["total_scans"] >= 2
    assert ov["unique_hostnames"] >= 2
    assert ov["average_score"] > 0
    assert ov["total_trackers"] >= 5
    assert ov["total_third_parties"] >= 8
    assert "ELEVATED" in ov["risk_distribution"]
    assert len(ov["recent_scans"]) >= 2

    # 2. Compare
    comp_res = await client.get(
        f"/api/v1/sites/compare?scan_a={id1}&scan_b={id2}",
        headers=auth_headers_user_a,
    )
    assert comp_res.status_code == 200
    comp = comp_res.json()
    assert comp["score_delta"] == 80 - 50  # 30
    assert comp["tracker_delta"] == 1 - 4  # -3
    assert comp["third_party_delta"] == 2 - 6  # -4


@pytest.mark.asyncio
async def test_findings_filtering(
    client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]
):
    """Test global findings listing filterable by severity and category."""
    now = datetime.now(UTC)
    payload = {
        "hostname": "finding-test.example",
        "url_redacted": "https://finding-test.example",
        "started_at": now.isoformat(),
        "overall_score": 60,
        "risk_level": "MODERATE",
        "findings": [
            {
                "category": "Tracker Domains",
                "finding_type": "ad_network",
                "severity": "HIGH",
                "title": "Ad network observed",
                "what_was_observed": "Observed tracker request",
                "why_it_matters": "Correlates behavior",
                "limitation_note": "Session scope only",
                "score_penalty": 20,
            },
            {
                "category": "Cookies & Storage",
                "finding_type": "unsecured_cookie",
                "severity": "LOW",
                "title": "Cookie without secure flag",
                "what_was_observed": "Cookie missing secure flag",
                "why_it_matters": "Transport interception potential",
                "limitation_note": "Observed on HTTP responses",
                "score_penalty": 5,
            },
        ],
    }
    await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=payload)

    # Filter by severity
    res_high = await client.get("/api/v1/findings/?severity=HIGH", headers=auth_headers_user_a)
    assert res_high.status_code == 200
    assert all(f["severity"] == "HIGH" for f in res_high.json())

    # Filter by category
    res_cat = await client.get(
        "/api/v1/findings/?category=Tracker%20Domains", headers=auth_headers_user_a
    )
    assert res_cat.status_code == 200
    assert all("Tracker" in f["category"] for f in res_cat.json())


@pytest.mark.asyncio
async def test_reports_json_and_csv(
    client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]
):
    """Test JSON and CSV report generation with required disclaimers."""
    now = datetime.now(UTC)
    payload = {
        "hostname": "report-test.example",
        "url_redacted": "https://report-test.example",
        "started_at": now.isoformat(),
        "overall_score": 82,
        "risk_level": "LOW",
        "findings": [
            {
                "category": "Network Security",
                "finding_type": "clean_headers",
                "severity": "INFO",
                "title": "Standard transport security observed",
                "what_was_observed": "HSTS header present",
                "why_it_matters": "Enforces TLS",
                "limitation_note": "Inspection of response headers",
                "score_penalty": 0,
            }
        ],
        "cookies": [
            {
                "name": "audit_token",
                "domain": "report-test.example",
                "path": "/",
                "is_secure": True,
                "is_http_only": True,
                "same_site": "Strict",
            }
        ],
    }
    res = await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=payload)
    scan_id = res.json()["id"]

    # 1. JSON Report
    json_res = await client.get(f"/api/v1/reports/{scan_id}/json", headers=auth_headers_user_a)
    assert json_res.status_code == 200
    report_data = json_res.json()
    assert "disclaimer" in report_data
    assert "limitations" in report_data
    assert "defensive" in report_data["disclaimer"].lower()
    assert report_data["scan"]["id"] == scan_id

    # 2. CSV Report
    csv_res = await client.get(f"/api/v1/reports/{scan_id}/csv", headers=auth_headers_user_a)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "attachment" in csv_res.headers.get("content-disposition", "")
    csv_text = csv_res.text
    assert "TraceGuard Privacy & Security Audit Report" in csv_text
    assert "Disclaimer" in csv_text
    assert "report-test.example" in csv_text
    assert "audit_token" in csv_text


@pytest.mark.asyncio
async def test_user_settings_flow(
    client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]
):
    """Test retrieving and updating user preferences via GET/PUT /api/v1/settings."""
    get_res = await client.get("/api/v1/settings/", headers=auth_headers_user_a)
    assert get_res.status_code == 200
    settings = get_res.json()
    assert "theme" in settings
    assert "opt_in_cloud_sync" in settings
    assert "default_redaction_strict" in settings

    put_res = await client.put(
        "/api/v1/settings/",
        headers=auth_headers_user_a,
        json={"theme": "dark", "opt_in_cloud_sync": True, "default_redaction_strict": True},
    )
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["theme"] == "dark"
    assert updated["opt_in_cloud_sync"] is True
    assert updated["default_redaction_strict"] is True
