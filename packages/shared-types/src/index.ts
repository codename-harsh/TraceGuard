import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Risk level labels. Neutral analytical phrasing — never "safe" or "unsafe".
 * Score bands:
 *   MINIMAL  90–100
 *   LOW      75–89
 *   MODERATE 55–74
 *   ELEVATED 35–54
 *   HIGH     0–34
 */
export const RiskLevelSchema = z.enum([
  'MINIMAL',
  'LOW',
  'MODERATE',
  'ELEVATED',
  'HIGH',
]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const SeveritySchema = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type Severity = z.infer<typeof SeveritySchema>;

export const TrackerCategorySchema = z.enum([
  'Advertising',
  'Analytics',
  'Social Media',
  'Session Replay',
  'Customer Support',
  'CDN/Infrastructure',
  'Content',
  'Unknown',
]);
export type TrackerCategory = z.infer<typeof TrackerCategorySchema>;

// ---------------------------------------------------------------------------
// ObservedRequest
// ---------------------------------------------------------------------------

/**
 * A single observed HTTP request captured by the extension's webRequest API.
 * Sensitive query parameters are already [REDACTED] before this object is created.
 * The raw request body is NEVER stored here.
 */
export const ObservedRequestSchema = z.object({
  /** Unique ID for this observation (e.g., UUID or incrementing integer) */
  id: z.string(),
  /** The page (tab) URL from which this request originated */
  pageUrl: z.string().url(),
  /** The full sanitized request URL (sensitive params masked) */
  requestUrl: z.string(),
  /** Registrable domain of the request (eTLD+1, e.g. "example.com") */
  requestDomain: z.string(),
  /** HTTP method */
  method: z.string(),
  /** Resource type as reported by the browser */
  resourceType: z.string(),
  /** HTTP response status code */
  statusCode: z.number().int().min(0).max(999),
  /** Whether this request crosses the first-party boundary */
  isThirdParty: z.boolean(),
  /** Whether the request used HTTPS */
  isSecure: z.boolean(),
  /** Tracker classification result (if resolved) */
  trackerCategory: TrackerCategorySchema.optional(),
  /** Whether this domain was found in the tracker rules */
  isTracker: z.boolean().optional(),
  /** Timestamp (Unix ms) when the request completed */
  observedAt: z.number().int().positive(),
});
export type ObservedRequest = z.infer<typeof ObservedRequestSchema>;

// ---------------------------------------------------------------------------
// CookieMetadata — value field is intentionally absent
// ---------------------------------------------------------------------------

/**
 * Cookie metadata only. The cookie `.value` is NEVER stored, transmitted,
 * or included in this type — by design, as per TraceGuard privacy rules.
 */
export const CookieMetadataSchema = z.object({
  /** Cookie name */
  name: z.string(),
  /** Cookie domain attribute */
  domain: z.string(),
  /** Cookie path attribute */
  path: z.string(),
  /** Whether the cookie has the HttpOnly flag */
  httpOnly: z.boolean(),
  /** Whether the cookie has the Secure flag */
  secure: z.boolean(),
  /** SameSite attribute */
  sameSite: z.enum(['Strict', 'Lax', 'None', 'Unspecified']),
  /** Whether the cookie has an explicit expiry (persistent) vs session cookie */
  isPersistent: z.boolean(),
  /** Expiry timestamp (Unix ms), if persistent */
  expiresAt: z.number().int().positive().optional(),
  /** Whether this cookie is set by a third-party domain */
  isThirdParty: z.boolean(),
  /** Registrable domain that set this cookie */
  sourceDomain: z.string(),
});
export type CookieMetadata = z.infer<typeof CookieMetadataSchema>;

// ---------------------------------------------------------------------------
// StorageIndicator
// ---------------------------------------------------------------------------

/**
 * An indicator that a site accessed browser storage APIs.
 * Only the key name is recorded — never the stored value.
 */
export const StorageIndicatorSchema = z.object({
  type: z.enum(['localStorage', 'sessionStorage', 'indexedDB', 'cacheAPI', 'serviceWorker']),
  /** Key name (if available) — never the value */
  keyName: z.string().optional(),
  /** The domain that accessed storage */
  domain: z.string(),
  observedAt: z.number().int().positive(),
});
export type StorageIndicator = z.infer<typeof StorageIndicatorSchema>;

// ---------------------------------------------------------------------------
// PermissionFinding
// ---------------------------------------------------------------------------

/**
 * A browser permission that was requested or is active for this site.
 */
export const PermissionFindingSchema = z.object({
  permission: z.enum([
    'geolocation',
    'camera',
    'microphone',
    'notifications',
    'clipboard-read',
    'clipboard-write',
    'payment-handler',
    'persistent-storage',
    'background-sync',
    'midi',
    'other',
  ]),
  state: z.enum(['granted', 'prompt', 'denied', 'unknown']),
  domain: z.string(),
});
export type PermissionFinding = z.infer<typeof PermissionFindingSchema>;

// ---------------------------------------------------------------------------
// SecurityIndicator
// ---------------------------------------------------------------------------

/**
 * A technical security observation (e.g. mixed content, missing headers).
 * Neutral analytical phrasing — no "safe/unsafe" judgement.
 */
export const SecurityIndicatorSchema = z.object({
  type: z.enum([
    'mixed-content',
    'insecure-form',
    'missing-csp',
    'missing-hsts',
    'missing-x-frame-options',
    'weak-referrer-policy',
    'deprecated-tls',
    'other',
  ]),
  description: z.string(),
  affectedUrl: z.string().optional(),
  observedAt: z.number().int().positive(),
});
export type SecurityIndicator = z.infer<typeof SecurityIndicatorSchema>;

// ---------------------------------------------------------------------------
// Finding — human-readable card emitted by the scoring engine
// ---------------------------------------------------------------------------

/**
 * A human-readable finding card shown to the user.
 * Designed for neutral, informative language — no alarmist labels.
 */
export const FindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: SeveritySchema,
  /** Factual statement of what was observed */
  whatWasObserved: z.string(),
  /** Why this pattern matters from a privacy/security perspective */
  whyItMatters: z.string(),
  /** Explicit statement of what TraceGuard cannot conclude from this signal */
  whatTraceGuardCannotConclude: z.string(),
  /** Optional list of affected domains or URLs */
  affectedDomains: z.array(z.string()).optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

// ---------------------------------------------------------------------------
// ScoreComponent
// ---------------------------------------------------------------------------

/**
 * A single penalty category in the score breakdown.
 */
export const ScoreComponentSchema = z.object({
  /** Category name matching the scoring-rules.json key */
  category: z.string(),
  /** Points deducted (0 = no penalty) */
  penalty: z.number().int().min(0),
  /** Maximum possible penalty for this category */
  maxPenalty: z.number().int().min(0),
  /** Short human-readable rationale for the penalty applied */
  rationale: z.string(),
});
export type ScoreComponent = z.infer<typeof ScoreComponentSchema>;

// ---------------------------------------------------------------------------
// TimelineEvent
// ---------------------------------------------------------------------------

/**
 * A timestamped event in the observation timeline (for dashboard display).
 */
export const TimelineEventSchema = z.object({
  id: z.string(),
  type: z.enum([
    'request',
    'cookie',
    'storage',
    'permission',
    'security',
  ]),
  domain: z.string(),
  label: z.string(),
  isThirdParty: z.boolean(),
  isTracker: z.boolean().optional(),
  observedAt: z.number().int().positive(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

// ---------------------------------------------------------------------------
// ScoreSummary
// ---------------------------------------------------------------------------

export const ScoreSummarySchema = z.object({
  /** Final privacy/security score: 0–100 (100 = fewest observed concerns) */
  score: z.number().int().min(0).max(100),
  riskLevel: RiskLevelSchema,
  /** Detailed per-category breakdown */
  components: z.array(ScoreComponentSchema),
  /** Human-readable finding cards */
  findings: z.array(FindingSchema),
});
export type ScoreSummary = z.infer<typeof ScoreSummarySchema>;

// ---------------------------------------------------------------------------
// WebsiteScanPayload — the complete scan sent to the backend
// ---------------------------------------------------------------------------

/**
 * The full payload produced by a scan, safe to transmit to the backend.
 * All sensitive fields have been sanitized before this object is created.
 */
export const WebsiteScanPayloadSchema = z.object({
  /** URL of the scanned page (no sensitive query params) */
  pageUrl: z.string(),
  /** Registrable domain of the scanned page */
  pageDomain: z.string(),
  /** Scan result summary */
  scoreSummary: ScoreSummarySchema,
  /** All observed network requests during the scan */
  requests: z.array(ObservedRequestSchema),
  /** Cookie metadata (no values) observed during the scan */
  cookies: z.array(CookieMetadataSchema),
  /** Storage access indicators */
  storageIndicators: z.array(StorageIndicatorSchema),
  /** Permissions observed */
  permissionFindings: z.array(PermissionFindingSchema),
  /** Security indicators */
  securityIndicators: z.array(SecurityIndicatorSchema),
  /** Timeline for the dashboard */
  timeline: z.array(TimelineEventSchema),
  /** ISO-8601 timestamp when the scan was initiated */
  scannedAt: z.string().datetime(),
  /** Duration of the observation window in milliseconds */
  durationMs: z.number().int().nonnegative(),
});
export type WebsiteScanPayload = z.infer<typeof WebsiteScanPayloadSchema>;
