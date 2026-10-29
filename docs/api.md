# TraceGuard — FastAPI Backend API Reference

> **API Base URL**: `http://localhost:8000/api/v1`  
> **Interactive OpenAPI Docs**: `http://localhost:8000/docs`  
> **Redoc Specification**: `http://localhost:8000/redoc`

All endpoints are built using **FastAPI, Pydantic v2, and SQLAlchemy 2.0 (asyncio)**.

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /auth/register`
Registers a new auditor account and issues an access token.
- **Request Body**:
  ```json
  {
    "email": "analyst@example.com",
    "password": "SecurePassword123!",
    "full_name": "Security Analyst"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "usr_94f8a32b...",
      "email": "analyst@example.com",
      "full_name": "Security Analyst",
      "created_at": "2026-10-29T10:00:00Z"
    }
  }
  ```

### `POST /auth/login`
Authenticates with credentials and sets an HTTP-only session cookie.
- **Request Body**:
  ```json
  {
    "email": "demo@traceguard.local",
    "password": "TraceGuardDemo!2026"
  }
  ```

### `POST /auth/logout`
Clears the session cookie (`200 OK`).

### `GET /auth/me`
Returns currently authenticated user profile (`200 OK`).

---

## 2. Scan Endpoints (`/api/v1/scans`)

### `POST /scans/`
Persists a website scan payload. Incoming payloads are strictly validated; raw cookie values or unmasked credentials cause immediate validation rejection (`422 Unprocessable Entity`).
- **Request Body**:
  ```json
  {
    "hostname": "news.example",
    "url_redacted": "https://news.example/world",
    "started_at": "2026-10-29T08:00:00Z",
    "completed_at": "2026-10-29T08:00:05Z",
    "overall_score": 58,
    "risk_level": "MODERATE",
    "third_party_count": 14,
    "tracker_count": 8,
    "cookie_count": 22,
    "permission_count": 1,
    "insecure_resource_count": 0,
    "rule_version": "1.0.0",
    "findings": [],
    "cookies": [],
    "permissions": [],
    "score_components": [],
    "domains": []
  }
  ```
- **Response** (`201 Created`): Returns full `ScanDetailOut` object.

### `GET /scans/`
List scans owned by the authenticated user with optional query filters:
- `hostname`: Substring search on domain name
- `min_score`: Integer minimum score (0–100)
- `max_score`: Integer maximum score (0–100)
- `risk_level`: Filter by band (`MINIMAL`, `LOW`, `MODERATE`, `ELEVATED`, `HIGH`)
- `date_from` / `date_to`: ISO-8601 timestamp range

### `GET /scans/{scan_id}`
Returns complete audit details including findings, cookies metadata, domains, and score components.

### `DELETE /scans/{scan_id}`
Deletes the scan and cascades deletion to all associated records.

### `GET /scans/{scan_id}/findings`
Returns all finding cards for the given scan.

### `GET /scans/{scan_id}/score`
Returns the score summary and category penalty breakdowns.

---

## 3. Sites & Comparison Endpoints (`/api/v1/sites`)

### `GET /sites/overview`
Computes real-time KPI aggregates for the authenticated user from database records:
- `total_scans`
- `unique_hostnames`
- `average_score`
- `total_trackers`
- `total_third_parties`
- `risk_distribution` (counts per band)
- `recent_scans` (up to 5 recent records)

### `GET /sites/compare?scan_a={id}&scan_b={id}`
Computes side-by-side metric deltas between two owned scans:
- `score_delta`: `scan_b.overall_score - scan_a.overall_score`
- `tracker_delta`: `scan_b.tracker_count - scan_a.tracker_count`
- `third_party_delta`: `scan_b.third_party_count - scan_a.third_party_count`

---

## 4. Reports & Exports (`/api/v1/reports`)

### `GET /reports/{scan_id}/json`
Returns full structured JSON audit report accompanied by mandatory disclaimers and limitation notes.

### `GET /reports/{scan_id}/csv`
Returns streaming CSV download (`Content-Type: text/csv`) with findings, cookie metadata, and disclaimer text.

---

## 5. Settings Endpoints (`/api/v1/settings`)

### `GET /settings/`
Retrieves auditor preferences (`opt_in_cloud_sync`, `default_redaction_strict`, `theme`).

### `PUT /settings/`
Updates auditor preferences.
