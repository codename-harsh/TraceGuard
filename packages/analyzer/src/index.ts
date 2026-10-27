/**
 * @traceguard/analyzer
 *
 * Public API surface for the analyzer package.
 * All exports are pure functions — no side effects, no global state.
 */

// eTLD+1 domain analysis
export { getRegistrableDomain, isThirdPartyDomain } from './domain.js';

// Sanitizer / redaction layer
export {
  sanitizeUrl,
  sanitizeHeaders,
  sanitizeRequestMetadata,
  sanitizeCookieMetadata,
} from './sanitizer.js';
