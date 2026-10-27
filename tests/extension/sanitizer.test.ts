/**
 * tests/extension/sanitizer.test.ts
 *
 * Tests for the sanitizer / redaction layer in @traceguard/analyzer.
 * Ensures no sensitive data leaks through sanitized outputs.
 */

import { describe, expect, it } from 'vitest';
import type { CookieMetadata, ObservedRequest } from '../../packages/shared-types/src/index.js';
import {
  sanitizeCookieMetadata,
  sanitizeHeaders,
  sanitizeRequestMetadata,
  sanitizeUrl,
} from '../../packages/analyzer/src/sanitizer.js';

// ---------------------------------------------------------------------------
// sanitizeUrl
// ---------------------------------------------------------------------------

describe('sanitizeUrl', () => {
  it('redacts token query parameter', () => {
    const result = sanitizeUrl('https://api.example.com/data?token=abc123');
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('abc123');
  });

  it('redacts auth query parameter', () => {
    const result = sanitizeUrl('https://api.example.com/?auth=secret&page=2');
    expect(result).toContain('[REDACTED]');
    expect(result).toContain('page=2');
    expect(result).not.toContain('secret');
  });

  it('redacts key query parameter', () => {
    const result = sanitizeUrl('https://maps.example.com/tile?key=MY_API_KEY');
    expect(result).not.toContain('MY_API_KEY');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts secret query parameter', () => {
    expect(sanitizeUrl('https://x.com/callback?secret=s3cr3t')).not.toContain('s3cr3t');
  });

  it('redacts password query parameter', () => {
    expect(sanitizeUrl('https://x.com/?password=hunter2')).not.toContain('hunter2');
  });

  it('redacts session query parameter', () => {
    expect(sanitizeUrl('https://x.com/?session=xyz')).not.toContain('xyz');
  });

  it('redacts jwt query parameter', () => {
    expect(sanitizeUrl('https://x.com/?jwt=eyJhbG')).not.toContain('eyJhbG');
  });

  it('redacts code query parameter (OAuth2 code)', () => {
    expect(sanitizeUrl('https://x.com/callback?code=OAUTH_CODE')).not.toContain('OAUTH_CODE');
  });

  it('preserves non-sensitive query parameters', () => {
    const result = sanitizeUrl(
      'https://api.example.com/search?q=privacy&page=3&sort=asc',
    );
    expect(result).toContain('q=privacy');
    expect(result).toContain('page=3');
    expect(result).toContain('sort=asc');
  });

  it('handles URLs with no query string unchanged', () => {
    const url = 'https://example.com/about';
    expect(sanitizeUrl(url)).toBe(url);
  });

  it('handles mixed sensitive and non-sensitive params', () => {
    const result = sanitizeUrl(
      'https://example.com/?token=abc&id=123&key=xyz&name=alice',
    );
    expect(result).not.toContain('abc');
    expect(result).not.toContain('xyz');
    expect(result).toContain('id=123');
    expect(result).toContain('name=alice');
  });

  it('returns malformed URL as-is without throwing', () => {
    const bad = 'not-a-url';
    expect(sanitizeUrl(bad)).toBe(bad);
  });

  it('handles empty query parameter values without redacting', () => {
    const url = 'https://example.com/?token=&name=alice';
    const result = sanitizeUrl(url);
    // Empty token value is not sensitive content to redact
    expect(result).toContain('name=alice');
  });

  it('is case-insensitive for parameter names', () => {
    // Our implementation lowercases the key for comparison
    const result = sanitizeUrl('https://example.com/?TOKEN=secret');
    expect(result).not.toContain('secret');
  });
});

// ---------------------------------------------------------------------------
// sanitizeHeaders
// ---------------------------------------------------------------------------

describe('sanitizeHeaders', () => {
  it('redacts Authorization header', () => {
    const result = sanitizeHeaders({
      Authorization: 'Bearer my-secret-token',
      'Content-Type': 'application/json',
    });
    expect(result['Authorization']).toBe('[REDACTED]');
    expect(result['Content-Type']).toBe('application/json');
  });

  it('redacts cookie header (case-insensitive)', () => {
    const result = sanitizeHeaders({ cookie: 'session=abc123' });
    expect(result['cookie']).toBe('[REDACTED]');
  });

  it('redacts set-cookie header', () => {
    const result = sanitizeHeaders({
      'set-cookie': 'id=123; HttpOnly',
      'x-request-id': '456',
    });
    expect(result['set-cookie']).toBe('[REDACTED]');
    expect(result['x-request-id']).toBe('456');
  });

  it('preserves all non-sensitive headers', () => {
    const headers = {
      'content-type': 'application/json',
      'accept-encoding': 'gzip, deflate, br',
      'x-custom-header': 'value',
    };
    expect(sanitizeHeaders(headers)).toEqual(headers);
  });

  it('does not mutate the input object', () => {
    const original = { Authorization: 'Bearer secret' };
    const copy = { ...original };
    sanitizeHeaders(original);
    expect(original).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// sanitizeRequestMetadata
// ---------------------------------------------------------------------------

describe('sanitizeRequestMetadata', () => {
  const baseRequest: ObservedRequest = {
    id: 'req-1',
    pageUrl: 'https://example.com/',
    requestUrl: 'https://analytics.example.com/collect?token=SECRET&v=1',
    requestDomain: 'example.com',
    method: 'GET',
    resourceType: 'script',
    statusCode: 200,
    isThirdParty: false,
    isSecure: true,
    observedAt: 1700000000000,
  };

  it('sanitizes sensitive params from requestUrl', () => {
    const result = sanitizeRequestMetadata(baseRequest);
    expect(result.requestUrl).not.toContain('SECRET');
    expect(result.requestUrl).toContain('[REDACTED]');
    expect(result.requestUrl).toContain('v=1');
  });

  it('preserves all other fields unchanged', () => {
    const result = sanitizeRequestMetadata(baseRequest);
    expect(result.id).toBe(baseRequest.id);
    expect(result.pageUrl).toBe(baseRequest.pageUrl);
    expect(result.statusCode).toBe(baseRequest.statusCode);
    expect(result.isSecure).toBe(baseRequest.isSecure);
  });

  it('does not mutate the original request', () => {
    const original = { ...baseRequest };
    sanitizeRequestMetadata(baseRequest);
    expect(baseRequest.requestUrl).toBe(original.requestUrl);
  });
});

// ---------------------------------------------------------------------------
// sanitizeCookieMetadata
// ---------------------------------------------------------------------------

describe('sanitizeCookieMetadata', () => {
  const baseMeta: CookieMetadata = {
    name: '_ga',
    domain: '.google-analytics.com',
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
    isPersistent: true,
    expiresAt: 1900000000000,
    isThirdParty: true,
    sourceDomain: 'google-analytics.com',
  };

  it('returns a valid CookieMetadata object', () => {
    const result = sanitizeCookieMetadata(baseMeta);
    expect(result.name).toBe('_ga');
    expect(result.domain).toBe('.google-analytics.com');
  });

  it('strips the value field if accidentally present', () => {
    const withValue = { ...baseMeta, value: 'GA1.2.123456789.1700000000' };
    const result = sanitizeCookieMetadata(withValue);
    expect('value' in result).toBe(false);
    expect((result as Record<string, unknown>)['value']).toBeUndefined();
  });

  it('preserves all metadata fields', () => {
    const result = sanitizeCookieMetadata(baseMeta);
    expect(result.httpOnly).toBe(false);
    expect(result.secure).toBe(true);
    expect(result.sameSite).toBe('Lax');
    expect(result.isPersistent).toBe(true);
    expect(result.isThirdParty).toBe(true);
    expect(result.sourceDomain).toBe('google-analytics.com');
  });

  it('does not add a value field to clean metadata', () => {
    const result = sanitizeCookieMetadata(baseMeta);
    expect(Object.keys(result)).not.toContain('value');
  });
});
