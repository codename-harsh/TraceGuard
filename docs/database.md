# TraceGuard — Database Architecture & Schema Specification

TraceGuard utilizes an **async-first relational database architecture** supported by **PostgreSQL 16** (production) and **SQLite** (local testing / rapid evaluation). Object-relational mapping is managed by **SQLAlchemy 2.0 (asyncio)** with schema migrations handled by **Alembic**.

---

## 1. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o| UserPreferences : has
    User ||--o{ WebsiteScan : owns
    WebsiteScan ||--o{ Finding : contains
    WebsiteScan ||--o{ CookieMetadataRecord : records
    WebsiteScan ||--o{ PermissionFindingRecord : observes
    WebsiteScan ||--o{ ScoreComponent : details
    WebsiteScan ||--o{ ScanDomain : associates
    Domain ||--o{ ScanDomain : participates

    User {
        string id PK
        string email UK
        string password_hash
        string full_name
        datetime created_at
    }

    UserPreferences {
        string id PK
        string user_id FK
        boolean opt_in_cloud_sync
        boolean default_redaction_strict
        string theme
        datetime updated_at
    }

    WebsiteScan {
        string id PK
        string user_id FK
        string hostname
        string url_redacted
        datetime started_at
        datetime completed_at
        int overall_score
        string risk_level
        int third_party_count
        int tracker_count
        int cookie_count
        int permission_count
        int insecure_resource_count
        string rule_version
        datetime created_at
    }

    Finding {
        string id PK
        string scan_id FK
        string category
        string finding_type
        string severity
        string title
        string description
        string what_was_observed
        string why_it_matters
        string limitation_note
        string evidence_summary
        int score_penalty
        datetime created_at
    }

    CookieMetadataRecord {
        string id PK
        string scan_id FK
        string name
        string domain
        string path
        boolean is_secure
        boolean is_http_only
        string same_site
        boolean is_session
        boolean is_third_party
        int expiration_days
    }

    PermissionFindingRecord {
        string id PK
        string scan_id FK
        string permission_name
        string status
        string note
    }

    ScoreComponent {
        string id PK
        string scan_id FK
        string category
        int max_penalty
        int applied_penalty
        json details_json
    }

    Domain {
        string id PK
        string hostname UK
        string registrable_domain
        string category
        boolean is_tracker
    }

    ScanDomain {
        string id PK
        string scan_id FK
        string domain_id FK
        boolean is_third_party
        int request_count
        int insecure_request_count
    }
```

---

## 2. Table Specifications & Redaction Invariants

### `users` & `user_preferences`
- Manages authenticated auditors with Argon2 password hashes.
- `opt_in_cloud_sync`: When false, the client extension defaults to local-only mode.
- `default_redaction_strict`: Enforces masking on all secret query parameter variants.

### `website_scans`
- Central table storing high-level audit results.
- `overall_score`: Constrained between 0 and 100.
- `risk_level`: Standardized band (`MINIMAL`, `LOW`, `MODERATE`, `ELEVATED`, `HIGH`).
- `url_redacted`: Sanitized page URL with sensitive parameters stripped to `[REDACTED]`.

### `cookie_metadata`
- **Privacy Rule**: The `.value` column is **strictly omitted from the schema definition**. No raw cookie values can be stored in this table under any circumstances.
- Tracks `is_secure`, `is_http_only`, and `same_site` flags for hygiene scoring.

### `findings`
- Stores human-readable finding cards emitted by the scoring engine.
- Every row contains mandatory `what_was_observed`, `why_it_matters`, and `limitation_note` fields.

---

## 3. Alembic Migration & Seeding Workflows

```bash
# Apply migrations to head:
pnpm migrate

# Seed demo data for evaluator testing:
pnpm demo

# Reset database (drops SQLite dev file, re-migrates, and re-seeds):
pnpm reset
```
