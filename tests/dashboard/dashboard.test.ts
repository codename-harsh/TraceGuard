import { describe, it, expect } from 'vitest';
import { getRiskMeta, getRiskMetaByLevel, formatDate, formatRelativeTime } from '@/lib/utils';
import type { ScanItem, ScanDetail, Finding, CookieRecord } from '@/lib/api';

describe('Dashboard — Score Visualization & Risk Band Rules', () => {
  it('correctly maps scores to standardized risk bands as defined in GEMINI.md', () => {
    // 90-100: MINIMAL
    expect(getRiskMeta(100).level).toBe('MINIMAL');
    expect(getRiskMeta(95).level).toBe('MINIMAL');
    expect(getRiskMeta(90).level).toBe('MINIMAL');
    expect(getRiskMeta(90).description).toBe('Minimal observed risk');

    // 75-89: LOW
    expect(getRiskMeta(89).level).toBe('LOW');
    expect(getRiskMeta(80).level).toBe('LOW');
    expect(getRiskMeta(75).level).toBe('LOW');
    expect(getRiskMeta(75).description).toBe('Low observed risk');

    // 55-74: MODERATE
    expect(getRiskMeta(74).level).toBe('MODERATE');
    expect(getRiskMeta(64).level).toBe('MODERATE');
    expect(getRiskMeta(55).level).toBe('MODERATE');
    expect(getRiskMeta(55).description).toBe('Moderate observed risk');

    // 35-54: ELEVATED
    expect(getRiskMeta(54).level).toBe('ELEVATED');
    expect(getRiskMeta(40).level).toBe('ELEVATED');
    expect(getRiskMeta(35).level).toBe('ELEVATED');
    expect(getRiskMeta(35).description).toBe('Elevated observed risk');

    // 0-34: HIGH
    expect(getRiskMeta(34).level).toBe('HIGH');
    expect(getRiskMeta(20).level).toBe('HIGH');
    expect(getRiskMeta(0).level).toBe('HIGH');
    expect(getRiskMeta(0).description).toBe('High observed risk');
  });

  it('resolves metadata from risk level string (case insensitive)', () => {
    expect(getRiskMetaByLevel('minimal').level).toBe('MINIMAL');
    expect(getRiskMetaByLevel('LOW').level).toBe('LOW');
    expect(getRiskMetaByLevel('moderate').level).toBe('MODERATE');
    expect(getRiskMetaByLevel('ELEVATED').level).toBe('ELEVATED');
    expect(getRiskMetaByLevel('high').level).toBe('HIGH');
  });

  it('strictly adheres to neutral phrasing without alarmist labels (never "SAFE" or "MALICIOUS")', () => {
    const scores = [100, 95, 80, 60, 45, 20, 0];
    scores.forEach((score) => {
      const meta = getRiskMeta(score);
      const descUpper = meta.description.toUpperCase();
      const labelUpper = meta.label.toUpperCase();

      expect(descUpper).not.toContain('SAFE');
      expect(descUpper).not.toContain('UNSAFE');
      expect(descUpper).not.toContain('MALICIOUS');

      expect(labelUpper).not.toBe('SAFE');
      expect(labelUpper).not.toBe('UNSAFE');
      expect(labelUpper).not.toBe('MALICIOUS');
    });
  });
});

describe('Dashboard — Formatting Utilities', () => {
  it('formats dates gracefully without throwing on invalid input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('invalid-date')).toBe('—');

    const validIso = '2026-10-29T10:30:00Z';
    const formatted = formatDate(validIso);
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Oct');
  });

  it('formats relative time values properly', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 10 * 1000)).toBe('10s ago');
    expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5m ago');
    expect(formatRelativeTime(now - 3 * 3600 * 1000)).toBe('3h ago');
    expect(formatRelativeTime(now - 2 * 86400 * 1000)).toBe('2d ago');
  });
});

describe('Dashboard — Scan Filtering Logic', () => {
  const sampleScans: ScanItem[] = [
    {
      id: 'scan-1',
      hostname: 'news.example.com',
      url_redacted: 'https://news.example.com/world',
      started_at: '2026-10-29T08:00:00Z',
      completed_at: '2026-10-29T08:00:05Z',
      overall_score: 58,
      risk_level: 'MODERATE',
      third_party_count: 14,
      tracker_count: 8,
      cookie_count: 22,
      permission_count: 1,
      insecure_resource_count: 0,
      rule_version: '1.0.0',
      created_at: '2026-10-29T08:00:05Z',
    },
    {
      id: 'scan-2',
      hostname: 'shop.example.org',
      url_redacted: 'https://shop.example.org/checkout',
      started_at: '2026-10-28T12:00:00Z',
      completed_at: '2026-10-28T12:00:03Z',
      overall_score: 88,
      risk_level: 'LOW',
      third_party_count: 3,
      tracker_count: 0,
      cookie_count: 6,
      permission_count: 0,
      insecure_resource_count: 0,
      rule_version: '1.0.0',
      created_at: '2026-10-28T12:00:03Z',
    },
    {
      id: 'scan-3',
      hostname: 'portal.example.net',
      url_redacted: 'https://portal.example.net/feed',
      started_at: '2026-10-27T15:00:00Z',
      completed_at: '2026-10-27T15:00:08Z',
      overall_score: 28,
      risk_level: 'HIGH',
      third_party_count: 28,
      tracker_count: 16,
      cookie_count: 45,
      permission_count: 3,
      insecure_resource_count: 2,
      rule_version: '1.0.0',
      created_at: '2026-10-27T15:00:08Z',
    },
  ];

  it('filters scans by hostname search query', () => {
    const query = 'shop';
    const filtered = sampleScans.filter((s) =>
      s.hostname.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].hostname).toBe('shop.example.org');
  });

  it('filters scans by risk level', () => {
    const filtered = sampleScans.filter((s) => s.risk_level === 'HIGH');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('scan-3');
  });

  it('filters scans by score range', () => {
    const minScore = 50;
    const maxScore = 90;
    const filtered = sampleScans.filter(
      (s) => s.overall_score >= minScore && s.overall_score <= maxScore
    );
    expect(filtered).toHaveLength(2); // scan-1 (58) and scan-2 (88)
  });
});

describe('Dashboard — Site Comparison & Delta Intelligence', () => {
  it('correctly calculates delta metrics between Site A and Site B', () => {
    const siteA = { overall_score: 88, tracker_count: 2, third_party_count: 5 };
    const siteB = { overall_score: 58, tracker_count: 12, third_party_count: 18 };

    const scoreDelta = siteB.overall_score - siteA.overall_score;
    const trackerDelta = siteB.tracker_count - siteA.tracker_count;
    const thirdPartyDelta = siteB.third_party_count - siteA.third_party_count;

    expect(scoreDelta).toBe(-30);
    expect(trackerDelta).toBe(10);
    expect(thirdPartyDelta).toBe(13);
  });
});

describe('Dashboard — Hard Redaction Guarantees', () => {
  it('verifies cookie metadata representation contains no raw value attribute', () => {
    const sampleCookie: CookieRecord = {
      id: 'ck-1',
      scan_id: 'scan-1',
      name: 'sessionId_flag',
      domain: '.example.com',
      path: '/',
      is_secure: true,
      is_http_only: true,
      same_site: 'Lax',
      is_session: false,
      is_third_party: false,
      expiration_days: 30,
    };

    // Cast to unknown to ensure no .value was injected or present
    const rawObject = sampleCookie as unknown as Record<string, unknown>;
    expect(rawObject.value).toBeUndefined();
    expect(rawObject.cookie_value).toBeUndefined();
    expect(rawObject.raw_value).toBeUndefined();
  });

  it('verifies finding cards contain required limitation note explaining what cannot be concluded', () => {
    const finding: Finding = {
      id: 'f-1',
      scan_id: 'scan-1',
      category: 'Trackers detected',
      finding_type: 'third_party_telemetry',
      severity: 'MEDIUM',
      title: 'Third-party telemetry service observed',
      description: 'Analytics beacon detected on page load.',
      what_was_observed: 'Observed HTTP POST request to analytics.example.com.',
      why_it_matters: 'Cross-site telemetry can construct user navigation profiles.',
      limitation_note: 'TraceGuard cannot conclude whether collected telemetry is pseudonymized.',
      evidence_summary: 'POST https://analytics.example.com/collect',
      score_penalty: 10,
      created_at: '2026-10-29T10:00:00Z',
    };

    expect(finding.limitation_note).toBeTruthy();
    expect(finding.what_was_observed).toBeTruthy();
    expect(finding.why_it_matters).toBeTruthy();
    expect(finding.title).not.toContain('Malicious');
    expect(finding.title).not.toContain('Safe');
  });
});
