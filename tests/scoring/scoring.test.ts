/**
 * tests/scoring/scoring.test.ts
 *
 * Tests for the deterministic scoring engine in @traceguard/scoring-engine.
 *
 * Fixture A — Clean HTTPS site:  score >= 90, riskLevel = MINIMAL
 * Fixture B — Compromised site:  deterministic lower score, ELEVATED or HIGH
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type {
  CookieMetadata,
  ObservedRequest,
  PermissionFinding,
  SecurityIndicator,
  StorageIndicator,
} from '../../packages/shared-types/src/index.js';
import {
  _resetFindingCounter,
  evaluateScan,
  scoreToRiskLevel,
} from '../../packages/scoring-engine/src/engine.js';
import type { ScanInput } from '../../packages/scoring-engine/src/engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  overrides: Partial<ObservedRequest> & { id: string },
): ObservedRequest {
  return {
    pageUrl: 'https://example.com/',
    requestUrl: `https://example.com/asset-${overrides.id}`,
    requestDomain: 'example.com',
    method: 'GET',
    resourceType: 'script',
    statusCode: 200,
    isThirdParty: false,
    isSecure: true,
    observedAt: 1700000000000,
    ...overrides,
  };
}

function makeCookie(
  overrides: Partial<CookieMetadata> & { name: string },
): CookieMetadata {
  return {
    domain: '.example.com',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    isPersistent: false,
    isThirdParty: false,
    sourceDomain: 'example.com',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fixture A — Clean HTTPS site (0 trackers, all first-party, HTTPS only)
// ---------------------------------------------------------------------------

const fixtureA: ScanInput = {
  requests: [
    makeRequest({ id: 'a1', requestDomain: 'example.com', isThirdParty: false }),
    makeRequest({ id: 'a2', requestDomain: 'example.com', isThirdParty: false }),
    makeRequest({ id: 'a3', requestDomain: 'example.com', isThirdParty: false }),
  ],
  cookies: [
    makeCookie({ name: 'session', httpOnly: true, secure: true, sameSite: 'Strict', isThirdParty: false }),
  ],
  storageIndicators: [],
  permissionFindings: [],
  securityIndicators: [],
};

// ---------------------------------------------------------------------------
// Fixture B — Heavy tracker site
// Multiple trackers, third-party persistent cookies, insecure HTTP subresources
// ---------------------------------------------------------------------------

const fixtureB: ScanInput = {
  requests: [
    // First-party requests
    makeRequest({ id: 'b1', requestDomain: 'news.example.com', isThirdParty: false }),
    // Third-party tracker requests
    makeRequest({ id: 'b2', requestDomain: 'google-analytics.com', isThirdParty: true, isTracker: true, trackerCategory: 'Analytics' }),
    makeRequest({ id: 'b3', requestDomain: 'doubleclick.net', isThirdParty: true, isTracker: true, trackerCategory: 'Advertising' }),
    makeRequest({ id: 'b4', requestDomain: 'facebook.net', isThirdParty: true, isTracker: true, trackerCategory: 'Social Media' }),
    makeRequest({ id: 'b5', requestDomain: 'hotjar.com', isThirdParty: true, isTracker: true, trackerCategory: 'Session Replay' }),
    makeRequest({ id: 'b6', requestDomain: 'segment.com', isThirdParty: true, isTracker: true, trackerCategory: 'Analytics' }),
    makeRequest({ id: 'b7', requestDomain: 'criteo.com', isThirdParty: true, isTracker: true, trackerCategory: 'Advertising' }),
    // Insecure HTTP subresources
    makeRequest({ id: 'b8', requestDomain: 'images.example.com', isThirdParty: false, isSecure: false, requestUrl: 'http://images.example.com/photo.jpg' }),
    makeRequest({ id: 'b9', requestDomain: 'cdn.old-library.com', isThirdParty: true, isSecure: false, requestUrl: 'http://cdn.old-library.com/lib.js' }),
    makeRequest({ id: 'b10', requestDomain: 'assets.example.com', isThirdParty: false, isSecure: false, requestUrl: 'http://assets.example.com/style.css' }),
  ],
  cookies: [
    // Third-party persistent cookies
    makeCookie({ name: '_ga', sourceDomain: 'google-analytics.com', domain: '.google-analytics.com', isThirdParty: true, isPersistent: true, expiresAt: 1900000000000, httpOnly: false, sameSite: 'None' }),
    makeCookie({ name: 'fr', sourceDomain: 'facebook.com', domain: '.facebook.com', isThirdParty: true, isPersistent: true, expiresAt: 1900000000000, secure: false, sameSite: 'None' }),
    makeCookie({ name: 'criteo_id', sourceDomain: 'criteo.com', domain: '.criteo.com', isThirdParty: true, isPersistent: true, expiresAt: 1900000000000 }),
    // First-party session cookie missing HttpOnly
    makeCookie({ name: 'cart', sourceDomain: 'example.com', httpOnly: false, sameSite: 'Lax' }),
  ],
  storageIndicators: [
    { type: 'localStorage', keyName: '_fp', domain: 'tracking.com', observedAt: 1700000000001 },
    { type: 'localStorage', keyName: '_cid', domain: 'analytics.io', observedAt: 1700000000002 },
    { type: 'indexedDB', domain: 'sessionreplay.com', observedAt: 1700000000003 },
  ],
  permissionFindings: [
    { permission: 'geolocation', state: 'granted', domain: 'example.com' },
  ],
  securityIndicators: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  _resetFindingCounter();
});

describe('scoreToRiskLevel', () => {
  it('returns MINIMAL for score 100', () => expect(scoreToRiskLevel(100)).toBe('MINIMAL'));
  it('returns MINIMAL for score 90', () => expect(scoreToRiskLevel(90)).toBe('MINIMAL'));
  it('returns LOW for score 89', () => expect(scoreToRiskLevel(89)).toBe('LOW'));
  it('returns LOW for score 75', () => expect(scoreToRiskLevel(75)).toBe('LOW'));
  it('returns MODERATE for score 74', () => expect(scoreToRiskLevel(74)).toBe('MODERATE'));
  it('returns MODERATE for score 55', () => expect(scoreToRiskLevel(55)).toBe('MODERATE'));
  it('returns ELEVATED for score 54', () => expect(scoreToRiskLevel(54)).toBe('ELEVATED'));
  it('returns ELEVATED for score 35', () => expect(scoreToRiskLevel(35)).toBe('ELEVATED'));
  it('returns HIGH for score 34', () => expect(scoreToRiskLevel(34)).toBe('HIGH'));
  it('returns HIGH for score 0', () => expect(scoreToRiskLevel(0)).toBe('HIGH'));
});

describe('Fixture A — Clean HTTPS site', () => {
  it('produces score >= 90', () => {
    const result = evaluateScan(fixtureA);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it('produces MINIMAL risk level', () => {
    const result = evaluateScan(fixtureA);
    expect(result.riskLevel).toBe('MINIMAL');
  });

  it('produces no tracker penalty', () => {
    const result = evaluateScan(fixtureA);
    const trackerComponent = result.components.find(
      (c) => c.category === 'Trackers',
    );
    expect(trackerComponent?.penalty).toBe(0);
  });

  it('produces no insecure transport penalty', () => {
    const result = evaluateScan(fixtureA);
    const insecureComponent = result.components.find(
      (c) => c.category === 'Insecure Transport',
    );
    expect(insecureComponent?.penalty).toBe(0);
  });

  it('produces no third-party cookie penalty', () => {
    const result = evaluateScan(fixtureA);
    const cookieComponent = result.components.find(
      (c) => c.category === 'Third-Party Cookies',
    );
    expect(cookieComponent?.penalty).toBe(0);
  });

  it('has empty findings list', () => {
    const result = evaluateScan(fixtureA);
    expect(result.findings).toHaveLength(0);
  });

  it('has 7 score components', () => {
    const result = evaluateScan(fixtureA);
    expect(result.components).toHaveLength(7);
  });

  it('all component maxPenalties sum to 100', () => {
    const result = evaluateScan(fixtureA);
    const total = result.components.reduce((s, c) => s + c.maxPenalty, 0);
    expect(total).toBe(100);
  });

  it('is deterministic — same result on multiple calls', () => {
    const r1 = evaluateScan(fixtureA);
    const r2 = evaluateScan(fixtureA);
    expect(r1.score).toBe(r2.score);
    expect(r1.riskLevel).toBe(r2.riskLevel);
    expect(r1.components.map((c) => c.penalty)).toEqual(
      r2.components.map((c) => c.penalty),
    );
  });
});

describe('Fixture B — Heavy tracker site', () => {
  it('produces a lower score than Fixture A', () => {
    const a = evaluateScan(fixtureA);
    const b = evaluateScan(fixtureB);
    expect(b.score).toBeLessThan(a.score);
  });

  it('produces a score below 55 (ELEVATED or HIGH)', () => {
    const result = evaluateScan(fixtureB);
    expect(result.score).toBeLessThan(55);
  });

  it('produces ELEVATED or HIGH risk level', () => {
    const result = evaluateScan(fixtureB);
    expect(['ELEVATED', 'HIGH']).toContain(result.riskLevel);
  });

  it('applies a tracker penalty > 0', () => {
    const result = evaluateScan(fixtureB);
    const trackerComponent = result.components.find(
      (c) => c.category === 'Trackers',
    );
    expect(trackerComponent?.penalty).toBeGreaterThan(0);
  });

  it('applies an insecure transport penalty > 0', () => {
    const result = evaluateScan(fixtureB);
    const insecureComponent = result.components.find(
      (c) => c.category === 'Insecure Transport',
    );
    expect(insecureComponent?.penalty).toBeGreaterThan(0);
  });

  it('applies a third-party cookie penalty > 0', () => {
    const result = evaluateScan(fixtureB);
    const cookieComponent = result.components.find(
      (c) => c.category === 'Third-Party Cookies',
    );
    expect(cookieComponent?.penalty).toBeGreaterThan(0);
  });

  it('applies a cookie configuration penalty > 0', () => {
    const result = evaluateScan(fixtureB);
    const configComponent = result.components.find(
      (c) => c.category === 'Cookie Configuration',
    );
    expect(configComponent?.penalty).toBeGreaterThan(0);
  });

  it('applies a permission penalty for granted geolocation', () => {
    const result = evaluateScan(fixtureB);
    const permComponent = result.components.find(
      (c) => c.category === 'Privacy Permissions',
    );
    expect(permComponent?.penalty).toBeGreaterThan(0);
  });

  it('generates at least one Finding card', () => {
    const result = evaluateScan(fixtureB);
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('all finding cards have required fields', () => {
    const result = evaluateScan(fixtureB);
    for (const f of result.findings) {
      expect(f.id).toBeTruthy();
      expect(f.title).toBeTruthy();
      expect(f.whatWasObserved).toBeTruthy();
      expect(f.whyItMatters).toBeTruthy();
      expect(f.whatTraceGuardCannotConclude).toBeTruthy();
    }
  });

  it('finding titles never contain "safe", "unsafe", or "malicious"', () => {
    const result = evaluateScan(fixtureB);
    const allText = result.findings
      .flatMap((f) => [f.title, f.whatWasObserved, f.whyItMatters])
      .join(' ')
      .toLowerCase();
    expect(allText).not.toContain('safe');
    expect(allText).not.toContain('unsafe');
    expect(allText).not.toContain('malicious');
  });

  it('is deterministic — score is the same on two consecutive calls', () => {
    const r1 = evaluateScan(fixtureB);
    const r2 = evaluateScan(fixtureB);
    expect(r1.score).toBe(r2.score);
    expect(r1.components.map((c) => c.penalty)).toEqual(
      r2.components.map((c) => c.penalty),
    );
  });

  it('score is bounded 0–100', () => {
    const result = evaluateScan(fixtureB);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('no penalty exceeds its category maxPenalty', () => {
    const result = evaluateScan(fixtureB);
    for (const c of result.components) {
      expect(c.penalty).toBeLessThanOrEqual(c.maxPenalty);
    }
  });
});

describe('Edge cases', () => {
  it('handles empty scan (all arrays empty) without throwing', () => {
    const emptyScan: ScanInput = {
      requests: [],
      cookies: [],
      storageIndicators: [],
      permissionFindings: [],
      securityIndicators: [],
    };
    const result = evaluateScan(emptyScan);
    expect(result.score).toBe(100);
    expect(result.riskLevel).toBe('MINIMAL');
    expect(result.findings).toHaveLength(0);
  });

  it('handles single insecure request', () => {
    const input: ScanInput = {
      requests: [makeRequest({ id: 'e1', isSecure: false, requestUrl: 'http://example.com/img.png' })],
      cookies: [],
      storageIndicators: [],
      permissionFindings: [],
      securityIndicators: [],
    };
    const result = evaluateScan(input);
    expect(result.score).toBeLessThan(100);
    const insecure = result.components.find((c) => c.category === 'Insecure Transport');
    expect(insecure?.penalty).toBeGreaterThan(0);
  });

  it('handles maximum tracker penalty cap', () => {
    // Create 20+ unique tracker domains — penalty should cap at 25
    const trackerRequests = Array.from({ length: 20 }, (_, i) =>
      makeRequest({
        id: `t${i}`,
        requestDomain: `tracker-${i}.com`,
        isThirdParty: true,
        isTracker: true,
      }),
    );
    const input: ScanInput = {
      requests: trackerRequests,
      cookies: [],
      storageIndicators: [],
      permissionFindings: [],
      securityIndicators: [],
    };
    const result = evaluateScan(input);
    const trackerComponent = result.components.find((c) => c.category === 'Trackers');
    expect(trackerComponent?.penalty).toBeLessThanOrEqual(25);
  });
});
