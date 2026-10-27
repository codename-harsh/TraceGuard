/**
 * tests/extension/domain.test.ts
 *
 * Tests for the eTLD+1 domain analysis utilities in @traceguard/analyzer.
 * Covers first-party vs third-party detection with accurate multi-part TLD handling.
 */

import { describe, expect, it } from 'vitest';
import {
  getRegistrableDomain,
  isThirdPartyDomain,
} from '../../packages/analyzer/src/domain.js';

// ---------------------------------------------------------------------------
// getRegistrableDomain
// ---------------------------------------------------------------------------

describe('getRegistrableDomain', () => {
  it('returns eTLD+1 for a simple domain', () => {
    expect(getRegistrableDomain('example.com')).toBe('example.com');
  });

  it('strips subdomain from a simple domain', () => {
    expect(getRegistrableDomain('www.example.com')).toBe('example.com');
  });

  it('strips deep subdomains', () => {
    expect(getRegistrableDomain('analytics.tracking.example.com')).toBe(
      'example.com',
    );
  });

  it('handles multi-part TLD: .co.uk', () => {
    expect(getRegistrableDomain('shop.example.co.uk')).toBe('example.co.uk');
  });

  it('handles multi-part TLD: .com.au', () => {
    expect(getRegistrableDomain('sub.domain.com.au')).toBe('domain.com.au');
  });

  it('handles multi-part TLD: .org.uk', () => {
    expect(getRegistrableDomain('www.charity.org.uk')).toBe('charity.org.uk');
  });

  it('handles bare registrable domain with .co.uk', () => {
    expect(getRegistrableDomain('example.co.uk')).toBe('example.co.uk');
  });

  it('returns null for localhost', () => {
    expect(getRegistrableDomain('localhost')).toBeNull();
  });

  it('returns null for bare TLD', () => {
    // A bare TLD like "com" has no registrable domain
    expect(getRegistrableDomain('com')).toBeNull();
  });

  it('strips leading dot (cookie domain convention)', () => {
    expect(getRegistrableDomain('.example.com')).toBe('example.com');
  });

  it('strips leading dot on .co.uk cookie domain', () => {
    expect(getRegistrableDomain('.example.co.uk')).toBe('example.co.uk');
  });

  it('handles known tracker domain', () => {
    expect(getRegistrableDomain('cdn.doubleclick.net')).toBe('doubleclick.net');
  });
});

// ---------------------------------------------------------------------------
// isThirdPartyDomain
// ---------------------------------------------------------------------------

describe('isThirdPartyDomain', () => {
  // ── First-party cases ──────────────────────────────────────────────────

  it('returns false for identical hostnames', () => {
    expect(isThirdPartyDomain('example.com', 'example.com')).toBe(false);
  });

  it('returns false for same registrable domain (subdomain vs root)', () => {
    expect(isThirdPartyDomain('www.example.com', 'api.example.com')).toBe(
      false,
    );
  });

  it('returns false for deeply nested subdomain of same domain', () => {
    expect(
      isThirdPartyDomain('example.com', 'cdn.assets.example.com'),
    ).toBe(false);
  });

  it('returns false for page with subdomain, request without', () => {
    expect(isThirdPartyDomain('blog.example.com', 'example.com')).toBe(false);
  });

  it('returns false for .co.uk — same registrable domain', () => {
    expect(
      isThirdPartyDomain('www.example.co.uk', 'static.example.co.uk'),
    ).toBe(false);
  });

  it('returns false for .com.au — same registrable domain', () => {
    expect(
      isThirdPartyDomain('example.com.au', 'api.example.com.au'),
    ).toBe(false);
  });

  // ── Third-party cases ──────────────────────────────────────────────────

  it('returns true for completely different domains', () => {
    expect(isThirdPartyDomain('example.com', 'google-analytics.com')).toBe(
      true,
    );
  });

  it('returns true for different registrable domains sharing TLD', () => {
    expect(isThirdPartyDomain('example.com', 'tracker.com')).toBe(true);
  });

  it('returns true for different .co.uk registrable domains', () => {
    expect(isThirdPartyDomain('shop.example.co.uk', 'ads.tracker.co.uk')).toBe(
      true,
    );
  });

  it('returns true for different .com.au registrable domains', () => {
    expect(
      isThirdPartyDomain('example.com.au', 'advertising.com.au'),
    ).toBe(true);
  });

  it('returns true when request is a known ad network', () => {
    expect(isThirdPartyDomain('news.example.com', 'cdn.doubleclick.net')).toBe(
      true,
    );
  });

  it('returns true when page is localhost and request is external', () => {
    // localhost has no registrable domain → conservative: third-party
    expect(isThirdPartyDomain('localhost', 'example.com')).toBe(true);
  });

  it('returns true for IP address page vs domain request', () => {
    expect(isThirdPartyDomain('192.168.1.1', 'example.com')).toBe(true);
  });

  // ── Full URL inputs ────────────────────────────────────────────────────

  it('accepts full URL strings for page host', () => {
    expect(
      isThirdPartyDomain(
        'https://www.example.com/page',
        'https://cdn.doubleclick.net/ad.js',
      ),
    ).toBe(true);
  });

  it('accepts full URLs for same-domain request', () => {
    expect(
      isThirdPartyDomain(
        'https://www.example.com/',
        'https://api.example.com/data',
      ),
    ).toBe(false);
  });
});
