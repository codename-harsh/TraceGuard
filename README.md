<div align="center">

# 🛡️ TraceGuard

### Web Privacy & Security Intelligence
**See what a website does behind the page.**

*TraceGuard turns complex browser privacy, network tracking, and storage signals into clear, actionable, neutral website intelligence.*

<br/>

[![Live Demo](https://img.shields.io/badge/Live_Demo-tracegu4rd.vercel.app-7928CA?style=for-the-badge&logo=vercel&logoColor=white)](https://tracegu4rd.vercel.app)
[![CI Pipeline](https://img.shields.io/badge/CI-Passing-2ea44f?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/Tests-162_Passing-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](tests/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](tsconfig.base.json)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](apps/api/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](apps/api/)
[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-000000?style=for-the-badge&logo=next.js&logoColor=white)](apps/dashboard/)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](apps/extension/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

<br/>

[**Explore Live Web App**](https://tracegu4rd.vercel.app) • [**Documentation**](docs/) • [**Scoring Model**](docs/scoring-model.md) • [**Privacy Architecture**](PRIVACY.md) • [**Security Policy**](SECURITY.md)

</div>

---

## ⚡ Executive Summary

TraceGuard is a defensive web privacy auditing tool designed to inspect third-party tracking, cookie hygiene, insecure transport, and device permission requests in real-time.

- **100% Local-First Interception**: All observation, eTLD+1 public suffix extraction, classification, and score calculations execute inside the browser sandbox.
- **Strict Privacy Guarantees**: Raw cookie `.value` strings, `Authorization` headers, and POST bodies are mathematically dropped in memory. Sensitive query parameters (`token`, `auth`, `key`, `secret`, `jwt`) are automatically masked to `[REDACTED]`.
- **Neutral Analytical Phrasing**: Follows strict objective reporting guidelines. TraceGuard **never** issues alarmist labels like `"MALICIOUS"`, `"SAFE"`, or `"UNSAFE"`. Observations are categorized under standardized risk bands (`MINIMAL`, `LOW`, `MODERATE`, `ELEVATED`, `HIGH`).
- **Dual-Layer Architecture**: A lightweight **Chrome Manifest V3 Extension** for immediate page audits, paired with a modern **Next.js 14 Dashboard & FastAPI Backend** for cross-site comparisons, historical analytics, and verifiable JSON/CSV reports.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph ClientBrowser["Client Browser Environment (Chromium Sandbox)"]
        direction TB
        TAB["Active Web Page\n(Inspected Website)"]
        
        subgraph MV3Extension["TraceGuard MV3 Extension (apps/extension)"]
            direction TB
            OBS["Observation Layer\n• chrome.webRequest API\n• chrome.cookies API\n• Permissions & Storage APIs"]
            
            subgraph Sanitizer["Sanitization & Redaction Layer (packages/analyzer)"]
                SAN1["Drop raw cookie .value strings in memory"]
                SAN2["Mask ?token=, ?key=, ?jwt= → [REDACTED]"]
                SAN3["Scrub Authorization & Cookie headers"]
            end
            
            subgraph Classifier["Tracker Classifier (packages/tracker-classifier)"]
                ETLD["Public Suffix (eTLD+1) Parser"]
                RULES["2,850+ Tracker Domain Catalog\n(DuckDuckGo Radar & Disconnect)"]
            end
            
            subgraph Scoring["Scoring Engine (packages/scoring-engine)"]
                BASE["Base-100 Deduction Pipeline"]
                CAPS["7 Category Penalty Caps"]
            end
            
            POPUP["Extension Popup UI\n(0-100 Score Ring · Findings Cards)"]
            FULLVIEW["10-Tab Audit Fullview\n(Deep Technical Inspector)"]
        end
    end

    subgraph CloudStack["Opt-In Cloud Backend (Optional / User-Authenticated)"]
        direction TB
        API["FastAPI Backend Service\n(/api/v1 · Python 3.12 · Pydantic v2)"]
        AUTH["Argon2id Password Hashing\n& HTTP-Only JWT Auth"]
        DB[("PostgreSQL 16 / SQLite\n• Multi-Tenant User Isolation\n• Scans, Cookies, Domains, Findings")]
    end

    subgraph IntelligenceUI["Web Intelligence Dashboard (apps/dashboard)"]
        DASH["Next.js 14 App Router\n(Tailwind CSS · shadcn/ui · Recharts)"]
        FALLBACK["Client-Side Fallback Engine\n(Embedded Deterministic Demo Mode)"]
    end

    %% Flow Connections
    TAB -->|"Raw network beacons,\ncookies, DOM signals"| OBS
    OBS --> SAN1
    SAN1 --> SAN2
    SAN2 --> SAN3
    SAN3 -->|"Clean sanitized metadata"| ETLD
    ETLD --> RULES
    RULES -->|"Domain classifications"| BASE
    BASE --> CAPS
    CAPS -->|"ScoreSummary & Finding records"| POPUP
    POPUP -.->|"Expand Full Audit"| FULLVIEW
    
    POPUP ==>|"Explicit User Click: 'Save Scan'"| API
    API --> AUTH
    AUTH --> DB
    
    DASH -->|"Fetch scans, overview, compare"| API
    DB -.->|"Aggregated audit records"| API
    DASH -.->|"If backend unreachable (Vercel)"| FALLBACK
```

---

## 🔒 Privacy Redaction & Opt-In Save Lifecycle

TraceGuard guarantees that raw credentials or session values never touch storage or travel across the network.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Analyst
    participant Page as Inspected Website
    participant Ext as Extension Service Worker
    participant Engine as Local Classifier & Scoring
    participant API as FastAPI Cloud Backend (/api/v1)
    participant DB as PostgreSQL Database

    User->>Page: Navigate to web page
    Page->>Ext: Dispatch HTTP requests, cookies & permissions
    
    Note over Ext: 100% Local In-Memory Scrubbing
    Ext->>Ext: 1. Discard cookie.value immediately
    Ext->>Ext: 2. Scrub Authorization, Cookie, Set-Cookie headers
    Ext->>Ext: 3. Redact secret URL parameters (?token=, ?key= → [REDACTED])
    
    Ext->>Engine: Send sanitized metadata
    Engine->>Engine: Match 2,850+ tracker rules & calculate base-100 score
    Engine-->>Ext: Return deterministic score & neutral finding indicators
    Ext->>User: Render real-time Score Ring & Popup findings

    alt User elects to keep audit local
        Note over User,Ext: Data remains strictly inside local session memory. Zero network transit.
    else User clicks "Save to Cloud"
        User->>Ext: Click "Save to Cloud" button
        Ext->>API: POST /api/v1/scans (Sanitized payload ONLY)
        Note over API: Backend Validation & Multi-Tenant Scoping
        API->>API: Assert forbidden fields absent (value, Authorization, raw secrets)
        API->>DB: INSERT into website_scans (Scoped to authenticated user_id)
        DB-->>API: Confirm record persistence
        API-->>Ext: 201 Created (Scan ID)
        Ext->>User: Display synced cloud indicator
    end
```

---

## 📊 Deterministic Base-100 Scoring Model

Every inspected website starts with **100 baseline points**. Penalties are deducted across seven bounded categories, capped at a maximum of 100 total penalty points:

$$S = \max\left(0, 100 - \sum_{c=1}^{7} \min(D_c, C_c)\right)$$

Where $D_c$ represents total raw deductions calculated for category $c$, and $C_c$ represents the hard category cap.

```mermaid
flowchart LR
    subgraph BasePoints["Initial Budget"]
        BASE["100 Baseline Points"]
    end

    subgraph Categories["Bounded Penalty Categories (Max Caps)"]
        C1["Tracker Domains\n(Cap: 25 pts)"]
        C2["Insecure Transport\n(Cap: 25 pts)"]
        C3["Persistent 3rd-Party Cookies\n(Cap: 15 pts)"]
        C4["3rd-Party Request Ratio\n(Cap: 10 pts)"]
        C5["Cookie Flags Hygiene\n(Cap: 10 pts)"]
        C6["Sensitive Permissions\n(Cap: 10 pts)"]
        C7["Storage / DOM Indicators\n(Cap: 5 pts)"]
    end

    subgraph DeductiveEngine["Aggregation & Clamping"]
        SUM["Sum of Capped Deductions\nmin(Dc, Cc)"]
        CLAMP["Score = max(0, 100 - Total Deductions)"]
    end

    subgraph StandardBands["Neutral Risk Bands"]
        R1["90–100: MINIMAL\n(Minimal observed risk)"]
        R2["75–89: LOW\n(Low observed risk)"]
        R3["55–74: MODERATE\n(Moderate observed risk)"]
        R4["35–54: ELEVATED\n(Elevated observed risk)"]
        R5["0–34: HIGH\n(High observed risk)"]
    end

    BASE --> CLAMP
    C1 & C2 & C3 & C4 & C5 & C6 & C7 --> SUM
    SUM --> CLAMP
    CLAMP --> R1 & R2 & R3 & R4 & R5
```

### Penalty Category Caps & Deductions

| Category | Cap | Deductions Evaluated |
|---|:---:|---|
| **Classified Trackers** | **25 pts** | -18 Session Replay · -15 Fingerprinting · -10 Advertising · -5 Analytics |
| **Insecure Transport** | **25 pts** | -25 Plaintext HTTP origin · -10 Insecure mixed content resource |
| **Third-Party Persistent Cookies** | **15 pts** | -10 Cookie lifespan > 180 days · -5 Unpartitioned third-party cookie |
| **Third-Party Request Concentration**| **10 pts** | -10 Third-party request ratio > 60% · -5 Third-party request ratio > 35% |
| **Cookie Configuration Issues** | **10 pts** | -5 Missing `Secure` on HTTPS · -3 Missing `HttpOnly` on session cookies |
| **Privacy-Sensitive Permissions** | **10 pts** | -10 Geolocation / Camera / Microphone · -5 Push notifications prompt |
| **Storage & DOM Indicators** | **5 pts** | -5 More than 10 tracking identifier keys identified in localStorage |

---

## 🗂️ Monorepo Directory Layout

```text
TraceGuard/
├── apps/
│   ├── api/                        # FastAPI Python 3.12 Backend (/api/v1)
│   │   ├── app/
│   │   │   ├── core/               # Security, Argon2id, JWT auth, redaction rules
│   │   │   ├── db/                 # SQLAlchemy 2.0 async engine & session manager
│   │   │   ├── models/             # Relational ORM models (Users, Scans, Cookies, Domains)
│   │   │   ├── routers/            # Auth, Scans, Sites, Reports, and Settings endpoints
│   │   │   └── schemas/            # Pydantic v2 validation and output schemas
│   │   ├── Dockerfile              # Multi-stage non-root Python production container
│   │   └── requirements.txt        # Backend dependencies (FastAPI, SQLAlchemy, asyncpg)
│   ├── dashboard/                  # Next.js 14 Web Intelligence Dashboard (App Router)
│   │   ├── src/
│   │   │   ├── app/                # Landing, Login, Scans, Details, Compare, Analytics
│   │   │   ├── components/         # ScoreRing, CategoryChart, TrackerTable, UI primitives
│   │   │   └── lib/                # API client & Vercel deterministic fallback store
│   │   ├── Dockerfile              # Multi-stage Next.js standalone container
│   │   └── package.json            # Tailwind CSS, shadcn/ui, Recharts, Lucide
│   └── extension/                  # Chrome Manifest V3 Browser Extension
│       ├── src/
│       │   ├── background/         # Service worker, chrome.webRequest interception
│       │   ├── content/            # Isolated storage & DOM API probe
│       │   ├── popup/              # React 18 toolbar popup (ScoreRing, findings)
│       │   └── fullview/           # 10-tab technical deep-dive audit view
│       ├── manifest.json           # Manifest V3 configuration with strict permissions
│       └── vite.config.ts          # Vite multi-page Chrome extension build bundle
├── packages/
│   ├── analyzer/                   # eTLD+1 domain extraction & query redaction engine
│   ├── scoring-engine/             # Deterministic base-100 scoring algorithm & caps
│   ├── shared-types/               # Zod validation schemas & TypeScript contracts
│   ├── tracker-classifier/         # 2,850+ rule catalog (DuckDuckGo & Disconnect)
│   └── ui/                         # Design tokens, calm cybersecurity color system
├── database/
│   ├── migrations/                 # Alembic database migration revisions
│   └── seeds/                      # Deterministic demo seeder (demo@traceguard.local + 4 scans)
├── tests/
│   ├── api/                        # Pytest suite (Auth, Scans, Reports, Security Redaction)
│   ├── dashboard/                  # Vitest dashboard component & risk band calculation tests
│   ├── e2e/                        # Playwright E2E test suite (Full user journeys & export)
│   ├── extension/                  # Vitest extension tests (Sanitizer, classifier, domains)
│   └── scoring/                    # Vitest scoring engine boundary & penalty deduction tests
├── scripts/                        # Cross-platform runner scripts (Windows & POSIX)
├── .github/workflows/ci.yml        # GitHub Actions CI matrix (Lint, Tests, Builds, Docker)
├── docker-compose.yml              # Complete stack (Postgres 16 + FastAPI + Next.js)
├── Makefile                        # GNU Make developer entry points
├── README.md                       # Master product documentation
├── PRIVACY.md                      # Technical privacy model & redaction guarantees
└── SECURITY.md                     # Vulnerability disclosure & defensive boundaries
```

---

## 🚀 Quickstart & Installation

### Option 1: Live Web App (Zero Setup)

Experience TraceGuard immediately in your browser on Vercel:

👉 **[https://tracegu4rd.vercel.app](https://tracegu4rd.vercel.app)**

1. Navigate to **[https://tracegu4rd.vercel.app/login](https://tracegu4rd.vercel.app/login)**.
2. Click **"1-Click Evaluator Demo"** (or use `demo@traceguard.local` / `TraceGuardDemo!2026`).
3. Instantly explore seeded scans:
   - `news.example` (Score: 48 · Elevated Risk · 5 Trackers)
   - `shop.example` (Score: 68 · Moderate Risk · Session Replay)
   - `blog.example` (Score: 94 · Minimal Risk · Strictly Isolated)
   - `portal.example` (Score: 81 · Low Risk · Authenticated Session)
4. Test the **Side-by-Side Comparison tool**, **Analytics radar charts**, and **Export JSON / CSV reports**.

---

### Option 2: Install Chrome Extension (Local Unpacked)

1. Clone the repository and build the extension:
   ```bash
   git clone https://github.com/codename-harsh/TraceGuard.git
   cd TraceGuard
   pnpm install
   pnpm --filter @traceguard/extension build
   ```
2. Open Google Chrome or Brave and go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder:
   ```text
   TraceGuard/apps/extension/dist
   ```
5. Pin **TraceGuard** to your toolbar. Browse to any website to see real-time privacy signals.

*(Alternatively, download [`traceguard-extension-v1.0.0.zip`](traceguard-extension-v1.0.0.zip) from the repository root, unzip it, and load it into Chrome.)*

---

### Option 3: Full-Stack Local Development

Run the complete stack locally with live API synchronization:

#### Prerequisites
- Node.js `20.x`+ and `pnpm`
- Python `3.12`+ with virtual environment in `apps/api/.venv`

#### 1. Setup Backend Virtual Environment
```powershell
# Windows PowerShell:
python -m venv apps/api/.venv
apps/api/.venv/Scripts/python.exe -m pip install -r apps/api/requirements.txt

# Linux / macOS:
python3 -m venv apps/api/.venv
source apps/api/.venv/bin/activate
pip install -r apps/api/requirements.txt
```

#### 2. Run Database Migrations & Seed Demo Records
```bash
# Apply Alembic schema migrations
pnpm migrate

# Populate demo account with 4 sample audits
pnpm demo
```

#### 3. Start Development Servers
```bash
# Starts FastAPI (:8000) and Next.js (:3000) concurrently:
pnpm dev
```
- **Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Backend Healthcheck**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### Option 4: Production Docker Stack

Deploy PostgreSQL 16, the FastAPI backend, and Next.js Web Dashboard via Docker Compose:

```bash
# Build and run containers in background
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop containers
docker compose down
```

---

## 🧪 Testing & Quality Assurance

TraceGuard maintains rigorous automated verification across 162 total tests:

```bash
# 1. Run TypeScript Vitest suite (144 tests passing):
pnpm test

# 2. Run Python FastAPI Pytest suite (18 security & API tests passing):
pnpm test:api

# 3. Run complete unified test suite:
pnpm test:all

# 4. Monorepo TypeScript strict typecheck (0 errors across 8 packages):
pnpm typecheck

# 5. Production bundles build (Extension dist + Dashboard Next.js):
pnpm build

# 6. Playwright End-to-End Suite:
pnpm test:e2e
```

---

## 🛡️ Honest Technical Disclaimers

1. **Defensive Awareness**: TraceGuard is designed to observe and audit web telemetry. It is not an ad blocker or anti-virus tool; it does not tamper with or break page functionality.
2. **Client-Side Observability**: Analysis captures network and storage activity while the audited tab is active. Lazy-loaded scripts triggered later by complex user interaction may require continuous monitoring.
3. **No Ingestion of Server-Side Forwarding**: Direct server-to-server forwarding (such as Meta Conversions API or server-side Google Tag Manager) occurs entirely outside the browser environment and cannot be inspected client-side.
4. **No Legal Certification**: TraceGuard provides technical privacy auditing. It does not constitute formal legal certification for GDPR, CCPA/CPRA, or ePrivacy Directive compliance.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
