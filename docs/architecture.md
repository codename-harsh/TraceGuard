# TraceGuard — System Architecture

> **See what a website does behind the page.**

This document describes the complete technical architecture for TraceGuard: a privacy and security intelligence tool that observes, classifies, scores, and reports on web activity — entirely locally by default, with optional cloud persistence.

---

## High-Level Component Map

```mermaid
graph TD
    subgraph Browser["Browser (Chrome / Edge)"]
        TAB["🌐 Active Browser Tab\n(Any Website)"]
        EXT["TraceGuard MV3 Extension\n(React + TypeScript + Vite)"]

        subgraph LocalEngine["Local Analysis Engine (runs inside Extension SW)"]
            OBS["Observation Layer\nWebRequest API · Cookie API\nStorage API · Permissions API"]
            SAN["Sanitizer / Redaction Layer\n• Strip cookie values\n• Mask sensitive query params\n• Remove Authorization headers"]
            CLS["Tracker Classifier\n(packages/tracker-classifier)\nDomain → Category + Risk Flag"]
            SCR["Scoring Engine\n(packages/scoring-engine)\nWeighted penalty model → 0–100 score"]
        end

        POPUP["Extension Popup UI\nReal-time scan summary\nRisk level badge · Finding cards"]
    end

    subgraph Backend["Cloud Backend (optional, user-authenticated)"]
        API["FastAPI /api/v1\n(Python · Pydantic v2 · SQLAlchemy 2.0)"]
        DB[("PostgreSQL 16\nScan history · User accounts\nAggregate analytics")]
    end

    subgraph Dashboard["Next.js Dashboard (App Router)"]
        DASH["Dashboard UI\n(shadcn/ui · Recharts · TanStack Query)"]
    end

    TAB -->|"Network requests, cookies,\nstorage events, permissions"| OBS
    OBS -->|"Raw ObservedRequest &\nCookieMetadata objects"| SAN
    SAN -->|"Sanitized, value-free\nmetadata"| CLS
    CLS -->|"Classified domains\nwith tracker flags"| SCR
    SCR -->|"ScoreSummary +\nFinding cards"| POPUP
    POPUP -->|"User clicks 'Save scan'"| API
    SCR -->|"WebsiteScanPayload\n(sanitized, no cookie values)"| API
    API -->|"Persist & aggregate"| DB
    DASH -->|"HTTP requests via\nTanStack Query"| API
    DB -->|"Historical scans &\nanalytics"| API
```

---

## Data Flow: Request Lifecycle

```mermaid
sequenceDiagram
    participant Tab as Browser Tab
    participant SW as Extension Service Worker
    participant San as Sanitizer Layer
    participant Cls as Tracker Classifier
    participant Scr as Scoring Engine
    participant UI as Popup UI
    participant API as FastAPI Backend

    Tab->>SW: chrome.webRequest.onCompleted (URL, headers, type)
    SW->>San: sanitizeRequestMetadata(raw)
    Note over San: Strip Authorization header<br/>Mask ?token=, ?key=, ?jwt= → [REDACTED]
    San->>Cls: classifyDomain(registrableDomain)
    Cls-->>San: { category, isTracker, ruleId, ruleVersion }
    San->>Scr: accumulate ObservedRequest
    Note over Scr: isThirdPartyDomain() via eTLD+1 comparison
    Scr-->>UI: ScoreSummary { score, riskLevel, findings[] }
    UI-->>Tab: Render badge + Finding cards
    UI->>API: POST /api/v1/scans (WebsiteScanPayload, JWT auth)
    API-->>UI: { scanId, savedAt }
```

---

## Package Dependency Graph

```mermaid
graph LR
    ST["packages/shared-types\n(Zod schemas + TS interfaces)"]
    AN["packages/analyzer\n(eTLD+1 · sanitizer)"]
    TC["packages/tracker-classifier\n(domain → category)"]
    SE["packages/scoring-engine\n(weighted penalty model)"]
    UI_PKG["packages/ui\n(shared React components)"]

    EXT_APP["apps/extension\n(Chrome MV3)"]
    DASH_APP["apps/dashboard\n(Next.js)"]
    API_APP["apps/api\n(FastAPI — Python, no TS dep)"]

    ST --> AN
    ST --> TC
    ST --> SE
    AN --> EXT_APP
    TC --> EXT_APP
    SE --> EXT_APP
    ST --> DASH_APP
    UI_PKG --> DASH_APP
    UI_PKG --> EXT_APP
```

---

## Security & Privacy Boundaries

| Layer | Guarantee |
|---|---|
| Sanitizer | Cookie `.value` is **never stored or forwarded** — metadata (name, domain, flags) only |
| Sanitizer | `Authorization`, `Cookie`, `Set-Cookie` raw header values stripped before any persistence |
| Sanitizer | Sensitive query params (`token`, `auth`, `key`, `secret`, `password`, `session`, `code`, `jwt`) → `[REDACTED]` |
| Scoring Engine | Labels use neutral analytical phrasing — never "SAFE", "UNSAFE", or "malicious" |
| Backend | All scan payloads validated by Pydantic v2 before DB write |
| Auth | Argon2id password hashing; JWT access + refresh token rotation |

---

## Risk Score Bands

| Score | Risk Level | Description |
|---|---|---|
| 90–100 | `MINIMAL` | Minimal observed risk |
| 75–89 | `LOW` | Low observed risk |
| 55–74 | `MODERATE` | Moderate observed risk |
| 35–54 | `ELEVATED` | Elevated observed risk |
| 0–34 | `HIGH` | High observed risk |

---

## Scoring Penalty Model

| Category | Max Penalty |
|---|---|
| Trackers detected | 25 |
| Insecure transport / mixed content | 25 |
| Third-party persistent cookies | 15 |
| Third-party request concentration | 10 |
| Cookie configuration issues | 10 |
| Privacy-sensitive permissions | 10 |
| Storage & other indicators | 5 |
| **Total possible deduction** | **100** |
