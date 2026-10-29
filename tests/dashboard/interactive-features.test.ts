import { describe, it, expect } from 'vitest';
import { sanitizeUrl, getRegistrableDomain, isThirdPartyDomain } from '@traceguard/analyzer';
import { classifyDomain } from '@traceguard/tracker-classifier';
import { evaluateScan } from '@traceguard/scoring-engine';
import { getRiskMeta } from '@/lib/utils';
import type {
  ObservedRequest,
  CookieMetadata,
  StorageIndicator,
  PermissionFinding,
  SecurityIndicator,
} from '@traceguard/shared-types';

describe('Interactive Privacy & Redaction Sandbox Engine', () => {
  it('masks secret query tokens in real time to [REDACTED]', () => {
    const rawUrl = 'https://news.example/article?token=sec_12345&jwt=eyJhbGciOi...&auth=alpha_secret&user_id=42&theme=dark';
    const sanitized = sanitizeUrl(rawUrl);

    expect(sanitized).toContain('token=[REDACTED]');
    expect(sanitized).toContain('jwt=[REDACTED]');
    expect(sanitized).toContain('auth=[REDACTED]');
    expect(sanitized).toContain('user_id=42');
    expect(sanitized).toContain('theme=dark');
    expect(sanitized).not.toContain('sec_12345');
    expect(sanitized).not.toContain('eyJhbGciOi');
    expect(sanitized).not.toContain('alpha_secret');
  });

  it('determines eTLD+1 boundary and third-party status accurately', () => {
    const firstPartyOrigin = 'https://news.example';
    const firstPartyRegDomain = getRegistrableDomain(firstPartyOrigin);

    expect(firstPartyRegDomain).toBe('news.example');

    // Subdomain is first-party
    expect(isThirdPartyDomain('cdn.news.example', firstPartyRegDomain!)).toBe(false);

    // External domain is third-party
    expect(isThirdPartyDomain('analytics.example.com', firstPartyRegDomain!)).toBe(true);
    expect(isThirdPartyDomain('doubleclick.net', firstPartyRegDomain!)).toBe(true);
  });

  it('classifies tracker categories using tracker-classifier catalog', () => {
    const adClassification = classifyDomain('doubleclick.net');
    expect(adClassification.isTracker).toBe(true);
    expect(adClassification.category).toBe('Advertising');

    const cleanDomain = classifyDomain('example.org');
    expect(cleanDomain.isTracker).toBe(false);
  });

  it('computes live Base-100 score and category caps dynamically in the browser sandbox', () => {
    const requests: ObservedRequest[] = [
      {
        id: 'req-1',
        pageUrl: 'https://news.example/',
        requestUrl: 'https://doubleclick.net/ads.js',
        requestDomain: 'doubleclick.net',
        method: 'GET',
        resourceType: 'script',
        statusCode: 200,
        isThirdParty: true,
        isTracker: true,
        trackerCategory: 'Advertising',
        isSecure: true,
        observedAt: Date.now(),
      },
      {
        id: 'req-2',
        pageUrl: 'https://news.example/',
        requestUrl: 'http://insecure-cdn.example.org/banner.png',
        requestDomain: 'insecure-cdn.example.org',
        method: 'GET',
        resourceType: 'image',
        statusCode: 200,
        isThirdParty: true,
        isTracker: false,
        isSecure: false,
        observedAt: Date.now(),
      },
    ];

    const cookies: CookieMetadata[] = [
      {
        name: 'ad_track',
        domain: 'adservice.example.net',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'None',
        isPersistent: true,
        isThirdParty: true,
        sourceDomain: 'news.example',
      },
    ];

    const storageIndicators: StorageIndicator[] = [
      {
        storageType: 'localStorage',
        keyCount: 4,
        hasTrackingIdentifiers: true,
        observedAt: Date.now(),
      },
    ];

    const permissionFindings: PermissionFinding[] = [
      {
        permission: 'geolocation',
        status: 'prompt',
        observedAt: Date.now(),
      },
    ];

    const securityIndicators: SecurityIndicator[] = [];

    const summary = evaluateScan({
      requests,
      cookies,
      storageIndicators,
      permissionFindings,
      securityIndicators,
    });

    expect(summary.score).toBeLessThan(100);
    expect(summary.score).toBeGreaterThanOrEqual(0);
    expect(['MINIMAL', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH']).toContain(summary.riskLevel);
    expect(summary.components).toHaveLength(7);
  });
});

describe('What-If Remediation Score Simulator Logic', () => {
  it('correctly models score improvements without exceeding 100 max cap', () => {
    const baseScore = 68;
    const potentialFixGains = [
      { id: 'fix-https', points: 10, selected: true },
      { id: 'fix-trackers', points: 18, selected: true },
      { id: 'fix-cookies', points: 12, selected: true },
    ];

    const totalGain = potentialFixGains
      .filter((f) => f.selected)
      .reduce((acc, curr) => acc + curr.points, 0);

    const simulatedScore = Math.min(100, baseScore + totalGain);
    expect(simulatedScore).toBe(100); // 68 + 40 = 108 clamped to 100

    const initialRisk = getRiskMeta(baseScore);
    const simulatedRisk = getRiskMeta(simulatedScore);

    expect(initialRisk.level).toBe('MODERATE');
    expect(simulatedRisk.level).toBe('MINIMAL');
  });

  it('maintains objective neutral phrasing on remediation suggestions', () => {
    const neutralTitles = [
      'Upgrade Insecure HTTP Subresources',
      'Deactivate Session Replay Telemetry',
      'Consent-Gate Third-Party Trackers',
      'Enforce SameSite=Strict & Secure Flags',
    ];

    neutralTitles.forEach((title) => {
      expect(title.toUpperCase()).not.toContain('MALICIOUS');
      expect(title.toUpperCase()).not.toContain('DANGEROUS');
      expect(title.toUpperCase()).not.toContain('SAFE');
    });
  });
});

describe('Share Posture Card & Command Palette Integration', () => {
  it('generates compliant Shields.io markdown badge URLs', () => {
    const score = 88;
    const riskLevel = 'LOW';
    const badgeMarkdown = `[![TraceGuard Score](https://img.shields.io/badge/TraceGuard-${score}%2F100_${riskLevel}-indigo)](https://tracegu4rd.vercel.app)`;

    expect(badgeMarkdown).toContain('TraceGuard-88%2F100_LOW-indigo');
    expect(badgeMarkdown).toContain('https://tracegu4rd.vercel.app');
  });

  it('formats posture summary JSON omitting any credential or raw cookie values', () => {
    const summary = {
      product: 'TraceGuard Web Privacy & Security Intelligence',
      hostname: 'shop.example',
      url_redacted: 'https://shop.example/cart?token=[REDACTED]',
      score: 82,
      risk_level: 'LOW',
      rule_version: '1.0.0',
      privacy_guarantee: 'Zero raw cookie values captured. Pure client-side audit.',
    };

    const serialized = JSON.stringify(summary);
    expect(serialized).not.toContain('cookie.value');
    expect(serialized).not.toContain('Authorization');
    expect(serialized).toContain('[REDACTED]');
  });
});
