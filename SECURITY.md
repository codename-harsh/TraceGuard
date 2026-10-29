# TraceGuard — Security Architecture & Policy

TraceGuard is a defensive security awareness and website auditing tool. We take the security of our platform and our users' data with paramount seriousness.

---

## 1. Defensive Security Architecture

TraceGuard enforces **Defense-in-Depth** across client extension, API boundaries, and database storage:

```text
Browser Tab (Untrusted)
    │
    ▼ [WebRequest / Cookie Observation]
Extension SW Sandbox (Isolated Local Memory)
    │
    ▼ [Sanitizer Layer: Discard Cookie Values, Redact Secret Query Keys]
Pydantic v2 Ingestion Gateway (apps/api)
    │
    ▼ [Strict Schema Validation: extra="forbid", Reject Forbidden Keys]
PostgreSQL 16 / SQLAlchemy 2.0 (Isolated per User ID)
```

---

## 2. Authentication & Authorization

- **Password Hashing**: Uses modern **Argon2id** password hashing (`app.core.security.hash_password`), resisting GPU and ASIC brute-force attacks. Passwords must be at least 8 characters in length.
- **JWT Access Tokens**: Cryptographically signed using HMAC-SHA256 (`HS256`) with a configurable secret key. Tokens carry an expiration timestamp (default: 60 minutes).
- **HTTP-Only Session Cookies**: Tokens are issued via HTTP-only, `SameSite=Lax` cookies, preventing cross-site scripting (XSS) extraction.
- **Per-User Tenant Isolation**: Every scan record, finding, domain observation, and preference entry is strictly partitioned by `user_id`. Backend endpoints reject unauthorized access with `HTTP 404 Not Found` to prevent account enumeration.

---

## 3. Input Validation & Strict Schema Enforcement

- **Frontend**: All form inputs are validated using **Zod** schemas in combination with React Hook Form.
- **Backend**: All incoming payloads to `POST /api/v1/scans` are validated using **Pydantic v2** models configured with:
  ```python
  model_config = ConfigDict(extra="forbid")
  ```
  Any unexpected keys, including attempts to inject raw cookie strings or credentials, cause immediate validation failure.
- **URL Sanitization**: Redaction filters continuously check incoming URLs for sensitive query parameters (`token`, `auth`, `key`, `secret`, `password`, `session`, `code`, `jwt`) and replace them with `[REDACTED]`.

---

## 4. CORS & Origin Isolation

FastAPI enforces strict CORS middleware:
- Permitted origins are restricted to configured web dashboard hosts (`http://localhost:3000`).
- Extension communication is validated using origin regular expressions matching the `chrome-extension://` scheme.
- Wildcard CORS with credentials is explicitly forbidden.

---

## 5. Security Vulnerability Reporting

If you identify a security vulnerability in TraceGuard:
1. **Do not disclose publicly** via GitHub Issues or public channels.
2. Email full technical details, reproduction steps, and proof-of-concept to **security@traceguard.local**.
3. You will receive an acknowledgment within 48 hours and regular updates as a fix is validated and released.
