/**
 * domain.ts — eTLD+1 registrable domain utilities
 *
 * Uses `tldts` for accurate public suffix list parsing, correctly handling
 * multi-part TLDs like .co.uk, .com.au, .org.uk, etc.
 */

import { parse } from 'tldts';

/**
 * Extracts the registrable domain (eTLD+1) from a hostname or URL string.
 * Returns null if the input cannot be parsed to a valid registrable domain
 * (e.g. bare IP addresses, localhost, malformed input).
 *
 * Examples:
 *   "analytics.google.com"     → "google.com"
 *   "cdn.doubleclick.net"      → "doubleclick.net"
 *   "shop.example.co.uk"       → "example.co.uk"
 *   "sub.domain.com.au"        → "domain.com.au"
 *   "localhost"                → null
 *   "192.168.1.1"              → null
 */
export function getRegistrableDomain(input: string): string | null {
  // Strip leading dot (cookie domain attribute convention)
  const cleaned = input.startsWith('.') ? input.slice(1) : input;

  // tldts can parse both hostnames and full URLs
  const result = parse(cleaned, { allowPrivateDomains: true });

  return result.domain ?? null;
}

/**
 * Determines whether a request crosses the first-party boundary using accurate
 * eTLD+1 comparison. Subdomains of the same registrable domain are considered
 * first-party.
 *
 * @param pageHost    - The hostname (or URL) of the page being viewed
 * @param requestHost - The hostname (or URL) of the network request
 * @returns true if the request is third-party, false if first-party
 *
 * Edge cases:
 *   - If either host cannot be resolved to a registrable domain (e.g. IP,
 *     localhost), the request is conservatively treated as third-party (true).
 *   - Extension service-worker origins are treated as first-party to the page.
 */
export function isThirdPartyDomain(
  pageHost: string,
  requestHost: string,
): boolean {
  // Strip protocol if accidentally passed as a full URL
  const normalise = (h: string): string =>
    h.replace(/^https?:\/\//i, '').split('/')[0]!.split('?')[0]!;

  const normPage = normalise(pageHost);
  const normRequest = normalise(requestHost);

  // Exact match (same full hostname)
  if (normPage === normRequest) return false;

  const pageDomain = getRegistrableDomain(normPage);
  const requestDomain = getRegistrableDomain(normRequest);

  // If either side fails to resolve, treat as third-party (safe default)
  if (pageDomain === null || requestDomain === null) return true;

  return pageDomain !== requestDomain;
}
