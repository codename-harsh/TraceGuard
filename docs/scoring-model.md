# TraceGuard — Deterministic Scoring Engine Specification

> **Positioning**: A reproducible, weighted deduction model that turns observed client-side privacy and security signals into an analytical 0–100 score.

---

## 1. Design Philosophy & Mathematical Model

TraceGuard uses a **deterministic base-100 deduction model**. Rather than utilizing arbitrary machine-learning black boxes or opaque reputational databases, the score is calculated using explicit, auditable mathematical rules:

$$\text{Final Score} = \max\left(0, 100 - \sum_{i=1}^{7} \min\left(P_i, C_i\right)\right)$$

Where:
- Baseline starting score is **100**.
- $P_i$ is the raw computed penalty for category $i$.
- $C_i$ is the strict maximum penalty cap for category $i$.
- The total sum of all caps equals exactly **100 points** ($\sum C_i = 100$).
- The final score is bounded in the integer interval $[0, 100]$.

---

## 2. Penalty Categories & Maximum Deductions

| Category $i$ | Category Name | Max Penalty Cap ($C_i$) | Primary Triggers & Weighting |
|:---:|---|:---:|---|
| **1** | **Classified Trackers** | **25 pts** | - Session Replay tracker: 15 pts each<br/>- Advertising / Behavioral tracker: 8 pts each<br/>- Analytics / Measurement tracker: 5 pts each<br/>- Social Media widget / tracker: 6 pts each |
| **2** | **Insecure Transport** | **25 pts** | - Mixed HTTP content / unencrypted requests: 10 pts per unique unencrypted domain (up to 25 pts) |
| **3** | **Third-Party Persistent Cookies** | **15 pts** | - Third-party cookies with persistent expiry (>7 days): 4 pts each |
| **4** | **Third-Party Request Concentration** | **10 pts** | - Ratio of third-party to total requests:<br/>  • $>60\%$ third-party: 10 pts<br/>  • $>35\%$ third-party: 5 pts |
| **5** | **Cookie Configuration Issues** | **10 pts** | - Cookie missing `Secure` flag over HTTPS: 3 pts each<br/>- Cookie missing `HttpOnly` flag: 2 pts each |
| **6** | **Privacy-Sensitive Permissions** | **10 pts** | - Geolocation active: 5 pts<br/>- Camera or Microphone active: 5 pts<br/>- Notifications active: 3 pts |
| **7** | **Storage & DOM Indicators** | **5 pts** | - Access to known tracking keys in `localStorage` or `sessionStorage`: 2 pts each |
| **Total** | **All Categories** | **100 pts** | Maximum possible deduction |

---

## 3. Standardized Risk Bands

As defined in [`GEMINI.md`](../GEMINI.md), TraceGuard strictly maps scores into five standardized, neutral analytical risk bands:

```text
Score 100 ──────── 90 ──────── 75 ──────── 55 ──────── 35 ──────── 0
  │    MINIMAL     │    LOW     │  MODERATE   │  ELEVATED   │   HIGH   │
```

- **90 – 100 (`MINIMAL`)**: Minimal observed privacy and security concerns during the scan window.
- **75 – 89 (`LOW`)**: Low observed concerns; typical of modern sites with basic analytics and encrypted transport.
- **55 – 74 (`MODERATE`)**: Moderate observed concerns; presence of multiple tracking networks or cross-site tracking cookies.
- **35 – 54 (`ELEVATED`)**: Elevated concerns; heavy third-party dependency, ad networks, or weak cookie configurations.
- **0 – 34 (`HIGH`)**: High observed concerns; presence of session replay scripts, mixed unencrypted content, or excessive persistent cross-domain identifiers.

---

## 4. Worked Numerical Examples

### Example A: Privacy-Conscious Documentation Site (`docs.example`)

- **Observed Telemetry**:
  - Total requests: 18 (1 3rd-party CDN domain for fonts, 0 trackers)
  - Cookies: 1 session cookie (`theme_preference`), `Secure=true`, `HttpOnly=true`, `SameSite=Strict`
  - Permissions: None
  - Transport: 100% HTTPS

- **Deduction Breakdown**:
  1. Classified Trackers: 0 pts (Cap 25)
  2. Insecure Transport: 0 pts (Cap 25)
  3. Third-Party Persistent Cookies: 0 pts (Cap 15)
  4. Third-Party Request Ratio: 1/18 = 5.5% (below 35% threshold) = 0 pts (Cap 10)
  5. Cookie Configuration: 0 pts (Cap 10)
  6. Permissions: 0 pts (Cap 10)
  7. Storage Indicators: 0 pts (Cap 5)

$$\text{Final Score} = 100 - 0 = 100 \implies \mathbf{100\ (\text{MINIMAL})}$$

---

### Example B: Commercial News & Advertising Portal (`portal.example`)

- **Observed Telemetry**:
  - Total requests: 84 (58 third-party requests, 69% concentration)
  - Classified trackers: 1 Session Replay script (`hotjar.com`), 2 Advertising networks (`doubleclick.net`, `criteo.com`), 1 Analytics endpoint (`google-analytics.com`)
  - Cookies: 22 cookies (8 third-party persistent, 4 missing Secure flag, 6 missing HttpOnly)
  - Permissions: Notifications requested (`prompt`)
  - Transport: 2 image requests loaded via unencrypted `http://`

- **Deduction Breakdown**:
  1. Classified Trackers: $15 + 8 + 8 + 5 = 36 \implies \min(36, 25) = \mathbf{25\ \text{pts}}$
  2. Insecure Transport: 2 unencrypted endpoints $= 20 \implies \min(20, 25) = \mathbf{20\ \text{pts}}$
  3. Third-Party Persistent Cookies: 8 cookies $\times 4 = 32 \implies \min(32, 15) = \mathbf{15\ \text{pts}}$
  4. Third-Party Request Ratio: 69% ($>60\%$) $= \mathbf{10\ \text{pts}}$
  5. Cookie Configuration: $(4 \times 3) + (6 \times 2) = 24 \implies \min(24, 10) = \mathbf{10\ \text{pts}}$
  6. Permissions: Notifications $= \mathbf{3\ \text{pts}}$
  7. Storage Indicators: Tracking keys observed $= \min(4, 5) = \mathbf{4\ \text{pts}}$

$$\text{Total Deductions} = 25 + 20 + 15 + 10 + 10 + 3 + 4 = 87\ \text{pts}$$
$$\text{Final Score} = \max(0, 100 - 87) = \mathbf{13} \implies \mathbf{13\ (\text{HIGH})}$$

---

## 5. Rule Versioning & Reproducibility

TraceGuard tags every scan with an immutable `rule_version` string (current: `1.0.0`). The rule catalog specifies:
- Exact list of domain rules and categorization hashes.
- Penalty weights and cap definitions.
- Timestamp of the rule release.

Any scan re-analyzed under the same rule version produces the identical numerical score and category breakdown.

---

## 6. What the Score Does and Does Not Mean

- **What it IS**: A transparent, client-side metric of observed tracking footprint, transport encryption, and cookie hygiene during the audit window.
- **What it is NOT**:
  - It is **not** a certificate of legal compliance (GDPR/CCPA/ePrivacy).
  - It is **not** a malware or phishing detection score.
  - It does **not** guarantee the absence of server-side data harvesting.
