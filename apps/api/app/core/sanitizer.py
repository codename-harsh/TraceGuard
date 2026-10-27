"""
TraceGuard API — Redaction & Sanitizer
Defense-in-depth URL sanitization mirroring the TypeScript analyzer package.
NEVER stores or transmits raw cookie values, Authorization headers, or sensitive params.
"""
import re
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

# Sensitive query parameter names — matched case-insensitively
SENSITIVE_PARAMS: frozenset[str] = frozenset(
    ["token", "auth", "key", "secret", "password", "session", "jwt", "code",
     "api_key", "apikey", "access_token", "refresh_token", "client_secret", "bearer"]
)

# Header names that must never be stored
SENSITIVE_HEADERS: frozenset[str] = frozenset(
    ["authorization", "cookie", "set-cookie", "proxy-authorization",
     "x-api-key", "x-auth-token"]
)

REDACTED = "[REDACTED]"

# Fields that must NEVER appear in a scan payload
FORBIDDEN_PAYLOAD_FIELDS: frozenset[str] = frozenset(
    ["cookie_value", "value", "raw_value", "authorization", "auth_header", "proxy-authorization"]
)


def sanitize_url(raw_url: str) -> str:
    """
    Replace values of sensitive query parameters with [REDACTED].
    Returns the URL unchanged if it cannot be parsed.
    """
    try:
        parsed = urlparse(raw_url)
    except Exception:
        return raw_url

    pairs = parse_qsl(parsed.query, keep_blank_values=True)
    modified = False
    sanitized: list[tuple[str, str]] = []

    for key, value in pairs:
        if value and key.lower() in SENSITIVE_PARAMS:
            sanitized.append((key, REDACTED))
            modified = True
        else:
            sanitized.append((key, value))

    if not modified:
        return raw_url

    new_query = urlencode(sanitized)
    return urlunparse(parsed._replace(query=new_query))


def sanitize_headers(headers: dict[str, str]) -> dict[str, str]:
    """Strip values of sensitive headers, replacing with [REDACTED]."""
    return {
        k: (REDACTED if k.lower() in SENSITIVE_HEADERS else v)
        for k, v in headers.items()
    }


def assert_no_forbidden_fields(payload: dict) -> None:
    """
    Raise ValueError if the payload contains any forbidden fields
    (e.g. raw cookie values or authorization data).
    Used in POST /api/v1/scans validation.
    """
    def _check(obj: object, path: str = "") -> None:
        if isinstance(obj, dict):
            for k, v in obj.items():
                full_path = f"{path}.{k}" if path else k
                if k.lower() in FORBIDDEN_PAYLOAD_FIELDS:
                    raise ValueError(
                        f"Forbidden field '{full_path}' detected in payload. "
                        "TraceGuard never stores raw cookie values or credentials."
                    )
                _check(v, full_path)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                _check(item, f"{path}[{i}]")

    _check(payload)
