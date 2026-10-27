/**
 * sanitizer.ts — Redaction & Sanitizer layer
 *
 * Implements TraceGuard Hard Privacy Rules:
 *   1. Cookie `.value` is NEVER stored or forwarded.
 *   2. `Authorization` header value is stripped.
 *   3. Sensitive query parameters are replaced with [REDACTED].
 *   4. Raw request bodies are NEVER passed through this module.
 *
 * All functions are pure (no side effects) and deterministic.
 */

import type { CookieMetadata, ObservedRequest } from '@traceguard/shared-types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Query parameter names that must always be redacted.
 * Matched case-insensitively.
 */
const SENSITIVE_PARAMS = new Set([
  'token',
  'auth',
  'key',
  'secret',
  'password',
  'session',
  'code',
  'jwt',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'client_secret',
  'bearer',
]);

/**
 * Request header names whose values must be stripped.
 * Matched case-insensitively.
 */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
  'x-auth-token',
]);

const REDACTED = '[REDACTED]';

// ---------------------------------------------------------------------------
// URL sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitizes a URL string by replacing the values of sensitive query
 * parameters with [REDACTED].
 *
 * If the input is not a parseable URL, it is returned unchanged (to avoid
 * crashing on malformed extension-internal URLs).
 *
 * @example
 *   sanitizeUrl("https://api.example.com/data?token=abc123&page=2")
 *   // → "https://api.example.com/data?token=[REDACTED]&page=2"
 */
export function sanitizeUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    // Not a valid absolute URL — return as-is (already opaque to us)
    return rawUrl;
  }

  // Collect entries first to avoid mutating while iterating
  const entries = [...parsed.searchParams.entries()];
  let modified = false;

  for (const [key, value] of entries) {
    if (value !== '' && SENSITIVE_PARAMS.has(key.toLowerCase())) {
      modified = true;
    }
  }

  if (!modified) return rawUrl;

  // Rebuild the query string manually so literal `[REDACTED]` appears
  // instead of the percent-encoded `%5BREDACTED%5D` that URLSearchParams.set()
  // would produce.
  const parts: string[] = [];
  for (const [key, value] of entries) {
    if (value !== '' && SENSITIVE_PARAMS.has(key.toLowerCase())) {
      parts.push(`${encodeURIComponent(key)}=${REDACTED}`);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }

  const base = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  const qs = parts.length > 0 ? `?${parts.join('&')}` : '';
  const hash = parsed.hash;
  return `${base}${qs}${hash}`;
}

// ---------------------------------------------------------------------------
// Header sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitizes a headers record by replacing values of sensitive header names
 * with [REDACTED]. Returns a new object; does not mutate the input.
 */
export function sanitizeHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key] = SENSITIVE_HEADERS.has(key.toLowerCase())
      ? REDACTED
      : value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// ObservedRequest sanitization
// ---------------------------------------------------------------------------

/**
 * Returns a sanitized copy of an ObservedRequest with the URL's sensitive
 * query params redacted.
 *
 * Note: ObservedRequest does not carry header values by design; headers are
 * sanitized at capture time in the extension service worker before this
 * object is ever constructed.
 */
export function sanitizeRequestMetadata(
  request: ObservedRequest,
): ObservedRequest {
  return {
    ...request,
    requestUrl: sanitizeUrl(request.requestUrl),
  };
}

// ---------------------------------------------------------------------------
// CookieMetadata sanitization
// ---------------------------------------------------------------------------

/**
 * Accepts any object that might resemble a raw cookie (including one with a
 * `value` property that should never have been passed) and returns a clean
 * CookieMetadata object with the `value` field stripped.
 *
 * This is a defensive measure — `value` should never appear in the type, but
 * if someone passes a raw browser cookie object at runtime, this function
 * ensures the value never propagates.
 */
export function sanitizeCookieMetadata(
  raw: CookieMetadata & { value?: unknown },
): CookieMetadata {
  // Destructure to explicitly drop the `value` field
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { value: _dropped, ...safe } = raw as CookieMetadata & {
    value?: unknown;
  };
  return safe;
}
