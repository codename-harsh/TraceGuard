"""Cross-user tenant isolation tests."""
from datetime import UTC, datetime

import httpx
import pytest


@pytest.mark.asyncio
async def test_cross_user_data_isolation(
    client: httpx.AsyncClient,
    auth_headers_user_a: dict[str, str],
    auth_headers_user_b: dict[str, str],
):
    """Verify User B cannot access, modify, or leak any data belonging to User A."""
    now = datetime.now(UTC)
    user_a_payload = {
        "hostname": "user-a-confidential.example",
        "url_redacted": "https://user-a-confidential.example",
        "started_at": now.isoformat(),
        "overall_score": 77,
        "risk_level": "LOW",
        "findings": [
            {
                "category": "Tracker Domains",
                "finding_type": "observed_beacon",
                "severity": "LOW",
                "title": "Confidential Finding A",
                "what_was_observed": "Telemetric request",
                "why_it_matters": "Context correlation",
                "limitation_note": "Session scope",
                "evidence_summary": "1 request",
                "score_penalty": 10,
            }
        ],
    }

    # User A creates a scan
    create_res = await client.post(
        "/api/v1/scans/",
        headers=auth_headers_user_a,
        json=user_a_payload,
    )
    assert create_res.status_code == 201
    scan_id = create_res.json()["id"]

    # 1. User B tries GET /scans/{id}
    res = await client.get(f"/api/v1/scans/{scan_id}", headers=auth_headers_user_b)
    assert res.status_code == 404

    # 2. User B tries DELETE /scans/{id}
    res = await client.delete(f"/api/v1/scans/{scan_id}", headers=auth_headers_user_b)
    assert res.status_code == 404

    # 3. User B tries GET /scans/{id}/findings
    res = await client.get(f"/api/v1/scans/{scan_id}/findings", headers=auth_headers_user_b)
    assert res.status_code == 404

    # 4. User B tries GET /scans/{id}/score
    res = await client.get(f"/api/v1/scans/{scan_id}/score", headers=auth_headers_user_b)
    assert res.status_code == 404

    # 5. User B listing scans must NOT contain User A's scan
    res = await client.get("/api/v1/scans/", headers=auth_headers_user_b)
    assert res.status_code == 200
    user_b_scans = res.json()
    assert not any(s["id"] == scan_id for s in user_b_scans)

    # 6. User B tries to compare User A's scan
    user_b_payload = {
        "hostname": "user-b-site.example",
        "url_redacted": "https://user-b-site.example",
        "started_at": now.isoformat(),
        "overall_score": 90,
        "risk_level": "MINIMAL",
    }
    b_scan_res = await client.post("/api/v1/scans/", headers=auth_headers_user_b, json=user_b_payload)
    b_scan_id = b_scan_res.json()["id"]

    res = await client.get(
        f"/api/v1/sites/compare?scan_a={scan_id}&scan_b={b_scan_id}",
        headers=auth_headers_user_b,
    )
    assert res.status_code == 404

    # 7. User B tries GET /reports/{scan_id}/json
    res = await client.get(f"/api/v1/reports/{scan_id}/json", headers=auth_headers_user_b)
    assert res.status_code == 404

    # 8. User B tries GET /reports/{scan_id}/csv
    res = await client.get(f"/api/v1/reports/{scan_id}/csv", headers=auth_headers_user_b)
    assert res.status_code == 404
