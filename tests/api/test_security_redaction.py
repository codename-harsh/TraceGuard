"""Security, privacy boundaries, and redaction test suite."""
from datetime import UTC, datetime

import httpx
import pytest
from sqlalchemy import select

from app.core.sanitizer import assert_no_forbidden_fields, sanitize_url
from app.models.models import CookieMetadataRecord


def test_sanitize_url_redacts_sensitive_parameters():
    """Verify sensitive query parameters are cleanly redacted with [REDACTED]."""
    raw = (
        "https://example.com/checkout"
        "?item=laptop"
        "&token=secret123token"
        "&code=oauth_code_999"
        "&password=mysecretpassword"
        "&session=sess_xyz"
        "&jwt=eyJhbGciOiJIUzI1NiJ9"
        "&api_key=ak_live_abcdef"
        "&category=electronics"
    )
    sanitized = sanitize_url(raw)

    assert "secret123token" not in sanitized
    assert "oauth_code_999" not in sanitized
    assert "mysecretpassword" not in sanitized
    assert "sess_xyz" not in sanitized
    assert "eyJhbGciOiJIUzI1NiJ9" not in sanitized
    assert "ak_live_abcdef" not in sanitized

    # Non-sensitive parameters preserved
    assert "item=laptop" in sanitized
    assert "category=electronics" in sanitized
    assert "token=%5BREDACTED%5D" in sanitized or "token=[REDACTED]" in sanitized


def test_assert_no_forbidden_fields():
    """Verify detector raises ValueError on forbidden credential/cookie value keys."""
    # Forbidden cookie_value
    with pytest.raises(ValueError, match="Forbidden field"):
        assert_no_forbidden_fields({"cookies": [{"name": "id", "cookie_value": "secret"}]})

    # Forbidden value
    with pytest.raises(ValueError, match="Forbidden field"):
        assert_no_forbidden_fields({"cookies": [{"name": "id", "value": "secret"}]})

    # Forbidden authorization
    with pytest.raises(ValueError, match="Forbidden field"):
        assert_no_forbidden_fields({"headers": {"authorization": "Bearer xyz"}})

    # Forbidden raw_value
    with pytest.raises(ValueError, match="Forbidden field"):
        assert_no_forbidden_fields({"raw_value": "payload"})

    # Clean payload passes without exception
    assert_no_forbidden_fields({
        "hostname": "example.com",
        "cookies": [{"name": "sess", "domain": "example.com", "is_secure": True}],
    })


@pytest.mark.asyncio
async def test_api_rejects_payload_with_cookie_value(
    client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]
):
    """POST /api/v1/scans must return HTTP 422 when raw cookie values are included."""
    now = datetime.now(UTC)
    payload = {
        "hostname": "leak-attempt.example",
        "url_redacted": "https://leak-attempt.example",
        "started_at": now.isoformat(),
        "overall_score": 50,
        "risk_level": "MODERATE",
        "cookies": [
            {
                "name": "session_id",
                "domain": "leak-attempt.example",
                "value": "super_secret_cookie_leak_value",
            }
        ],
    }

    res = await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=payload)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_api_rejects_payload_with_authorization_key(
    client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]
):
    """POST /api/v1/scans must return HTTP 422 when raw authorization tokens are sent."""
    now = datetime.now(UTC)
    payload = {
        "hostname": "leak-attempt.example",
        "url_redacted": "https://leak-attempt.example",
        "started_at": now.isoformat(),
        "overall_score": 50,
        "risk_level": "MODERATE",
        "authorization": "Bearer leaked_token_here",
    }

    res = await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=payload)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_api_auto_redacts_url_before_saving(
    client: httpx.AsyncClient, auth_headers_user_a: dict[str, str]
):
    """POST /api/v1/scans automatically sanitizes sensitive URL query parameters."""
    now = datetime.now(UTC)
    payload = {
        "hostname": "query-leak.example",
        "url_redacted": "https://query-leak.example/search?token=supersecret123&q=cybersecurity&key=privkey456",
        "started_at": now.isoformat(),
        "overall_score": 90,
        "risk_level": "MINIMAL",
    }

    res = await client.post("/api/v1/scans/", headers=auth_headers_user_a, json=payload)
    assert res.status_code == 201
    saved = res.json()

    assert "supersecret123" not in saved["url_redacted"]
    assert "privkey456" not in saved["url_redacted"]
    assert "q=cybersecurity" in saved["url_redacted"]


def test_cookie_model_has_no_value_attribute():
    """Verify that CookieMetadataRecord ORM model has no value attribute by design."""
    assert not hasattr(CookieMetadataRecord, "value")
    assert not hasattr(CookieMetadataRecord, "cookie_value")
    assert not hasattr(CookieMetadataRecord, "raw_value")
