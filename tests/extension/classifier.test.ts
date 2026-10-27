/**
 * tests/extension/classifier.test.ts
 *
 * Tests for @traceguard/tracker-classifier.
 * Verifies correct classification across all categories, unknown domains,
 * and non-tracker CDN/content domains.
 */

import { describe, expect, it } from 'vitest';
import {
  classifyDomain,
  getRuleCount,
  getRuleVersion,
} from '../../packages/tracker-classifier/src/classifier.js';

describe('classifyDomain — rule set metadata', () => {
  it('returns version "1.0.0"', () => {
    expect(getRuleVersion()).toBe('1.0.0');
  });

  it('has at least 40 rules loaded', () => {
    expect(getRuleCount()).toBeGreaterThanOrEqual(40);
  });
});

describe('classifyDomain — Advertising', () => {
  it('classifies doubleclick.net as Advertising tracker', () => {
    const result = classifyDomain('doubleclick.net');
    expect(result.category).toBe('Advertising');
    expect(result.isTracker).toBe(true);
    expect(result.ruleId).toBe('AD-001');
  });

  it('classifies googlesyndication.com as Advertising tracker', () => {
    const result = classifyDomain('googlesyndication.com');
    expect(result.category).toBe('Advertising');
    expect(result.isTracker).toBe(true);
  });

  it('classifies criteo.com as Advertising tracker', () => {
    const result = classifyDomain('criteo.com');
    expect(result.isTracker).toBe(true);
    expect(result.category).toBe('Advertising');
  });
});

describe('classifyDomain — Analytics', () => {
  it('classifies google-analytics.com as Analytics tracker', () => {
    const result = classifyDomain('google-analytics.com');
    expect(result.category).toBe('Analytics');
    expect(result.isTracker).toBe(true);
    expect(result.ruleId).toBe('AN-001');
  });

  it('classifies segment.com as Analytics tracker', () => {
    const result = classifyDomain('segment.com');
    expect(result.isTracker).toBe(true);
    expect(result.category).toBe('Analytics');
  });

  it('classifies amplitude.com as Analytics tracker', () => {
    const result = classifyDomain('amplitude.com');
    expect(result.isTracker).toBe(true);
  });

  it('classifies newrelic.com as Analytics but NOT a tracker (APM tool)', () => {
    const result = classifyDomain('newrelic.com');
    expect(result.category).toBe('Analytics');
    expect(result.isTracker).toBe(false);
  });
});

describe('classifyDomain — Session Replay', () => {
  it('classifies hotjar.com as Session Replay tracker', () => {
    const result = classifyDomain('hotjar.com');
    expect(result.category).toBe('Session Replay');
    expect(result.isTracker).toBe(true);
  });

  it('classifies fullstory.com as Session Replay tracker', () => {
    const result = classifyDomain('fullstory.com');
    expect(result.isTracker).toBe(true);
    expect(result.category).toBe('Session Replay');
  });

  it('classifies clarity.ms as Session Replay tracker', () => {
    const result = classifyDomain('clarity.ms');
    expect(result.isTracker).toBe(true);
    expect(result.category).toBe('Session Replay');
  });
});

describe('classifyDomain — Social Media', () => {
  it('classifies facebook.net as Social Media tracker', () => {
    const result = classifyDomain('facebook.net');
    expect(result.category).toBe('Social Media');
    expect(result.isTracker).toBe(true);
  });

  it('classifies linkedin.com as Social Media tracker', () => {
    const result = classifyDomain('linkedin.com');
    expect(result.isTracker).toBe(true);
  });

  it('classifies tiktok.com as Social Media tracker', () => {
    const result = classifyDomain('tiktok.com');
    expect(result.isTracker).toBe(true);
    expect(result.category).toBe('Social Media');
  });
});

describe('classifyDomain — Customer Support', () => {
  it('classifies intercom.io as Customer Support tracker', () => {
    const result = classifyDomain('intercom.io');
    expect(result.category).toBe('Customer Support');
    expect(result.isTracker).toBe(true);
  });

  it('classifies zendesk.com as Customer Support but NOT tracker', () => {
    const result = classifyDomain('zendesk.com');
    expect(result.category).toBe('Customer Support');
    expect(result.isTracker).toBe(false);
  });
});

describe('classifyDomain — CDN/Infrastructure (non-tracker)', () => {
  it('classifies cloudflare.com as CDN, not a tracker', () => {
    const result = classifyDomain('cloudflare.com');
    expect(result.category).toBe('CDN/Infrastructure');
    expect(result.isTracker).toBe(false);
  });

  it('classifies fastly.net as CDN, not a tracker', () => {
    const result = classifyDomain('fastly.net');
    expect(result.isTracker).toBe(false);
    expect(result.category).toBe('CDN/Infrastructure');
  });

  it('classifies amazonaws.com as CDN, not a tracker', () => {
    const result = classifyDomain('amazonaws.com');
    expect(result.isTracker).toBe(false);
  });
});

describe('classifyDomain — Content CDN (non-tracker)', () => {
  it('classifies jsdelivr.net as Content CDN', () => {
    const result = classifyDomain('jsdelivr.net');
    expect(result.category).toBe('Content');
    expect(result.isTracker).toBe(false);
  });

  it('classifies unpkg.com as Content CDN', () => {
    const result = classifyDomain('unpkg.com');
    expect(result.isTracker).toBe(false);
  });
});

describe('classifyDomain — Unknown domains', () => {
  it('returns Unknown category for an unrecognised domain', () => {
    const result = classifyDomain('my-personal-blog.com');
    expect(result.category).toBe('Unknown');
    expect(result.isTracker).toBe(false);
    expect(result.ruleId).toBeNull();
  });

  it('returns Unknown for localhost', () => {
    const result = classifyDomain('localhost');
    expect(result.category).toBe('Unknown');
    expect(result.isTracker).toBe(false);
  });

  it('returns Unknown for empty-ish string', () => {
    const result = classifyDomain('not-a-tracker.example.io');
    expect(result.isTracker).toBe(false);
  });
});

describe('classifyDomain — normalisation', () => {
  it('handles leading dot (cookie domain convention)', () => {
    const result = classifyDomain('.doubleclick.net');
    expect(result.isTracker).toBe(true);
    expect(result.domain).toBe('doubleclick.net');
  });

  it('is case-insensitive', () => {
    const result = classifyDomain('GOOGLE-ANALYTICS.COM');
    expect(result.isTracker).toBe(true);
    expect(result.category).toBe('Analytics');
  });

  it('always returns the rule version', () => {
    const result = classifyDomain('anything.com');
    expect(result.ruleVersion).toBe('1.0.0');
  });
});
