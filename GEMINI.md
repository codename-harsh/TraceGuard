# TRACEGUARD — MASTER ENGINEERING RULES

## 1. Product & Security Boundaries
- Product: TraceGuard — Web Privacy & Security Intelligence (`See what a website does behind the page.`)
- Strictly defensive awareness & auditing tool.
- NEVER use labels like "SAFE", "UNSAFE", or "This website is malicious."
- ALWAYS use neutral analytical phrasing: "Observed privacy indicator", "Potential tracking service", "Third-party domain detected", "Review recommended".
- Score ranges:
  - 90–100: `MINIMAL` (Minimal observed risk)
  - 75–89: `LOW` (Low observed risk)
  - 55–74: `MODERATE` (Moderate observed risk)
  - 35–54: `ELEVATED` (Elevated observed risk)
  - 0–34: `HIGH` (High observed risk)

## 2. Hard Privacy & Redaction Rules
- Default analysis happens 100% locally in the browser extension.
- NEVER read, display, log, or transmit raw cookie `.value` strings, `Authorization` headers, request bodies, or localStorage/sessionStorage values.
- Always strip sensitive URL query parameters (`token`, `auth`, `key`, `secret`, `password`, `session`, `code`, `jwt`) to `[REDACTED]` before storing or sending to the backend.

## 3. Tech Stack & Design System
- Monorepo: pnpm workspaces (`apps/extension`, `apps/dashboard`, `apps/api`, `packages/shared-types`, `packages/analyzer`, `packages/tracker-classifier`, `packages/scoring-engine`, `packages/ui`).
- Extension: TypeScript, Chrome Manifest V3, React, Vite, Tailwind CSS.
- Dashboard: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts, TanStack Query, React Hook Form, Zod.
- Backend: Python, FastAPI (`/api/v1`), SQLAlchemy 2.0, Alembic, Pydantic v2, PostgreSQL 16, Argon2 password hashing.
- Visual Style: Calm, minimal, dark-first cybersecurity UI (`zinc-950` background, `zinc-900` cards, `zinc-800` borders, crisp monospace technical badges). No hacker clichés, skulls, or neon clutter.
- Zero fake data or dead buttons    : every metric must come from real logic or database records.