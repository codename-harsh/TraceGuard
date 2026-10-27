# TraceGuard Chromium Extension — Manifest V3 Permissions & Privacy Architecture

## 1. Product Scope & Privacy Commitment

**TraceGuard** is a defensive web privacy and security intelligence tool designed to provide transparent, neutral awareness of background web activity:
> *"See what a website does behind the page."*

TraceGuard operates strictly under defensive security guidelines:
- **Neutral Analytical Phrasing:** Findings are reported objectively (e.g., *"Observed privacy indicator"*, *"Potential tracking service"*, *"Third-party domain detected"*, *"Review recommended"*). Labels such as *"SAFE"*, *"UNSAFE"*, or *"This website is malicious"* are prohibited.
- **100% Local Execution by Default:** All network metadata aggregation, domain classification (eTLD+1), cookie flag auditing, and scoring computations occur locally in the user's Chromium browser environment.
- **Zero Raw Cookie Values:** Cookie values (`.value`) are discarded immediately at collection time. They are never logged, displayed, stored in cache, or transmitted.
- **Zero Request Bodies / Auth Headers:** The extension never inspects HTTP request payloads, `Authorization` headers, or sensitive credentials.
- **Mandatory Redaction Layer:** Query parameters commonly carrying sensitive secrets (`token`, `auth`, `key`, `secret`, `password`, `session`, `code`, `jwt`) are redacted to `[REDACTED]` prior to storage or optional backend synchronization.

---

## 2. Manifest V3 Permissions Directory

TraceGuard requests only the minimum set of permissions necessary to deliver accurate web privacy and security audits. Below is the technical breakdown for each permission defined in `apps/extension/public/manifest.json`.

| Permission | Category | Purpose | Potential Exposure | TraceGuard Defensive Limitation |
| :--- | :--- | :--- | :--- | :--- |
| `activeTab` | Interactive Tab Access | Grants temporary privileged access to the current active tab upon user interaction with the extension action. | Tab URL, title, and tab ID for the currently focused tab. | Invoked only when the user opens the popup or clicks the action. Restricted strictly to the active tab. |
| `tabs` | Navigation Lifecycle | Monitors navigation completion (`chrome.tabs.onUpdated`) and tab switching (`chrome.tabs.onActivated`) to trigger audits; opens `fullview.html` and `options.html`. | Navigation status, tab URLs, and window state. | Internal browser schemes (`chrome://`, `chrome-extension://`, `devtools://`) are skipped immediately. Used purely for lifecycle signals and UI tab creation. |
| `cookies` | Cookie Hygiene Auditing | Queries cookies associated with the visited origin via `chrome.cookies.getAll`. | Cookie names, domains, paths, security flags (`Secure`, `HttpOnly`, `SameSite`), expiration dates, and raw cookie values. | **Hard privacy boundary:** TraceGuard immediately strips the `.value` field at the extraction boundary. Only metadata attributes (`Secure`, `HttpOnly`, `SameSite`, session vs. persistent) are retained. |
| `storage` | Local Cache Persistence | Stores per-tab audit results and user configuration inside `chrome.storage.local`. | Extension settings (API URL, token) and per-tab scan payloads on the user's local disk. | Data remains strictly inside local browser storage on the local device. No data is transmitted externally without explicit user action (*"Save Scan"*). Users can clear the cache anytime via Options. |
| `webRequest` | Passive Network Auditing | Intercepts metadata for subresource network requests (`chrome.webRequest.onCompleted`, `chrome.webRequest.onErrorOccurred`). | Subresource URLs, HTTP methods, status codes, resource types, and initiators. | Strictly passive observation. **NEVER** captures request bodies or `Authorization` headers. All URLs pass through `sanitizeUrl()` to redact sensitive query parameters. |
| `<all_urls>` | Host Permission | Enables the `webRequest` listener and `cookies.getAll` across arbitrary web destinations audited by the user. | Traffic metadata and cookie flags across visited web origins. | Read-only observation. Does not modify headers, alter responses, redirect traffic, or inject arbitrary remote scripts. |

---

## 3. Web Accessible Resources & Content Security Policy (CSP)

TraceGuard adheres to strict Manifest V3 security boundaries:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'none'; base-uri 'none';"
}
```

- **Zero Remote Code Execution:** All JavaScript is compiled into the unpacked extension bundle (`background.js`, `content.js`, `assets/*.js`). No external scripts or CDNs are fetched at runtime.
- **Zero Inline Scripts:** HTML pages (`popup.html`, `fullview.html`, `options.html`) reference only local bundled script tags.
- **Isolated Content Script:** The content script runs at `document_idle` and interacts solely through message passing (`chrome.runtime.sendMessage`). It queries:
  1. `localStorage.length` and approximate key name byte length (never values).
  2. `sessionStorage.length` and approximate key name byte length (never values).
  3. Protocol status (`https:` vs `http:`).
  4. DOM subresource mixed-content check (`img[src]`, `script[src]`, etc.).
  5. Permission status queries via standard `navigator.permissions.query` (`geolocation`, `notifications`, `camera`, `microphone`, `clipboard-read`).

---

## 4. Local Analysis Pipeline

When a page is scanned, TraceGuard processes data through three dedicated local TypeScript packages:

```
[ Active Tab Navigation ]
          │
          ├──► webRequest Metadata (URLs sanitized, bodies ignored)
          ├──► cookies.getAll (Cookie flags only, .value stripped)
          └──► content.js (DOM indicators & permission states)
                    │
                    ▼
          ┌─────────────────────────────────────────────────────────┐
          │  TraceGuard Background Service Worker Pipeline         │
          │                                                         │
          │  1. @traceguard/analyzer                                │
          │     - eTLD+1 domain extraction via public suffix list    │
          │     - First-party vs. third-party origin classification │
          │     - Deep query-parameter redaction                     │
          │                                                         │
          │  2. @traceguard/tracker-classifier                      │
          │     - Rule-based tracker classification                 │
          │     - Categories: Advertising, Analytics, Social, etc.  │
          │                                                         │
          │  3. @traceguard/scoring-engine                          │
          │     - Transparent base-100 evaluation                   │
          │     - Category penalties with capped subtractions        │
          │     - Neutral risk tier assignment (MINIMAL to HIGH)    │
          └─────────────────────────────────────────────────────────┘
                    │
                    ▼
          [ chrome.storage.local (scan:tabId) ]
                    │
                    ├──► Compact Popup UI (380px)
                    └──► Fullview Analysis Dashboard (10 Sections)
```

---

## 5. Opt-in Backend Synchronization (`POST /api/v1/scans`)

If and only if the user explicitly connects an account and clicks **"Save Scan"**, the extension sends a privacy-redacted summary to the configured backend:
1. **Client-Side Redaction Check:** The payload is transformed and verified to contain only sanitized URLs, cookie flags, domain aggregations, and technical findings.
2. **Backend Pydantic v2 Guardrails:** The FastAPI backend strictly enforces `extra = "forbid"` and executes `assert_no_forbidden_fields()`:
   - Any presence of raw cookie values, password tokens, or unredacted parameters causes the backend to immediately reject the request with `HTTP 422 Unprocessable Entity`.
3. **User Control:** Backend synchronization is entirely opt-in. The extension remains 100% functional without an account or backend connection.
