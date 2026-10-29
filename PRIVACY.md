# TraceGuard — Privacy & Telemetry Specification

> **Guiding Principle**: Defensive intelligence must never compromise user privacy.

TraceGuard is engineered with a strict **local-first, zero-knowledge** architecture. This document defines the technical boundaries, redaction mechanisms, and privacy guarantees enforced throughout the codebase.

---

## 1. Local-First Analysis Guarantee

By default, TraceGuard performs **100% of its observation, classification, and scoring locally** inside the user's browser sandbox (Chrome Manifest V3 Service Worker).

- **No Remote Calls During Browsing**: While you browse the web, the extension never sends URLs, hostnames, or telemetry to any external server or third-party service.
- **Offline Rule Evaluation**: Tracker matching uses an embedded catalog of 2,850+ domain rules bundled directly inside the extension (`packages/tracker-classifier`).
- **No User Account Required**: Real-time privacy badges, score rings, and finding cards function completely anonymously without an account.

---

## 2. Strict Redaction Matrix

Before any observation object is constructed or transmitted, it passes through the Sanitizer Layer ([`packages/analyzer/src/sanitizer.ts`](packages/analyzer/src/sanitizer.ts)):

| Telemetry Signal | Permitted Fields | Strictly Forbidden & Redacted Fields | Enforcement Mechanism |
|---|---|---|---|
| **Cookies** | `name`, `domain`, `path`, `secure`, `httpOnly`, `sameSite`, `isPersistent`, `expiresAt`, `isThirdParty` | **`.value`** (raw cookie string) | Stripped in memory at `chrome.cookies.onChanged` / `chrome.webRequest.onCompleted`. Schema rejects `.value`. |
| **HTTP Headers** | `content-type`, `cache-control`, `content-security-policy`, `strict-transport-security` | **`Authorization`**, **`Cookie`**, **`Set-Cookie`**, **`Proxy-Authorization`** | Scrubbed prior to payload aggregation. |
| **URL Query Parameters** | Benign routing parameters (e.g., `?page=1&sort=desc`) | **`token`**, **`auth`**, **`key`**, **`secret`**, **`password`**, **`session`**, **`code`**, **`jwt`**, **`apikey`** | Transformed to `[REDACTED]` via regex and URLSearchParams sanitization. |
| **HTTP Request Bodies** | None (Resource type, HTTP method, and status code only) | **All request bodies and payloads** | WebRequest API listener does not request or inspect `requestBody`. |
| **Web Storage** | `keyName`, `domain`, storage type (`localStorage`, `sessionStorage`, `indexedDB`) | **Storage values and object data** | DOM observation captures API access events; values are never read. |

---

## 3. Opt-in Cloud Synchronization

Saving website audits to the cloud is **strictly user-initiated**:
- Scans are uploaded to the FastAPI backend only when an authenticated user explicitly clicks **"Save Scan"** in the popup or dashboard.
- Users can disable cloud synchronization at any time in **Settings** (`opt_in_cloud_sync = false`).
- All incoming payloads to `POST /api/v1/scans` are validated by Pydantic v2 schemas configured with `extra="forbid"` and active redaction assertion checks. Any payload containing a raw cookie value is rejected with `HTTP 422 Unprocessable Entity`.

---

## 4. Scan Deletion & Data Portability

- **Right to Erasure**: Users can delete any individual scan or clear their entire scan history via `DELETE /api/v1/scans/{id}` or the Dashboard UI. Deletions cascade to all associated findings, cookies metadata, permission records, and score components.
- **Data Export**: Users can export full audit reports in machine-readable **JSON** (`GET /api/v1/reports/{id}/json`) or standard tabular **CSV** (`GET /api/v1/reports/{id}/csv`) formats.

---

## 5. Analytical Phrasing & Neutrality Standard

TraceGuard adheres to strict engineering rules regarding presentation:
- **Never judgmental**: TraceGuard never classifies a website as "SAFE", "UNSAFE", "GOOD", "BAD", or "MALICIOUS".
- **Factual analytical terminology**: Findings are phrased objectively:
  - *"Third-party tracking service observed"*
  - *"Unencrypted HTTP transport detected"*
  - *"Cross-site persistent identifier observed"*
  - *"Review recommended"*
- Every finding includes an explicit **Limitation Note** stating what TraceGuard cannot conclude from client-side signals alone.

---

## 6. Product Limitations Disclaimer

- **Client-Side Boundary**: TraceGuard observes client-side DOM events and network traffic during the active tab audit window.
- **Server-Side Operations**: TraceGuard cannot inspect server-side logging, backend database storage, or server-to-server data forwarding.
- **No Legal Compliance Claim**: TraceGuard is a defensive awareness tool. It does not provide legal certification under GDPR, ePrivacy, CCPA, or HIPAA.
