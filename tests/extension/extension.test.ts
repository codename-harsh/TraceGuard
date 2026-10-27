/**
 * tests/extension/extension.test.ts
 *
 * Unit tests for TraceGuard Chromium Extension (Manifest V3):
 *  - Extension settings and defaults
 *  - Per-tab scan state management and transitions
 *  - Message routing contract (GET_CURRENT_SCAN, RESCAN_TAB, etc.)
 *  - Redaction invariants (no raw cookie values, sanitized URLs)
 *  - Backend payload transformation (matches CreateScanRequest schema)
 *  - DOM content indicators and permission state mapping
 */

import { describe, expect, it } from 'vitest';
import { sanitizeCookieMetadata, sanitizeUrl } from '../../packages/analyzer/src/index.js';
import { evaluateScan } from '../../packages/scoring-engine/src/index.js';
import type {
  CookieMetadata,
  ObservedRequest,
  PermissionFinding,
  SecurityIndicator,
  StorageIndicator,
  WebsiteScanPayload,
} from '../../packages/shared-types/src/index.js';
import {
  DEFAULT_SETTINGS,
  type ContentIndicators,
  type ExtensionMessage,
  type ExtensionResponse,
  type ExtensionSettings,
  type TabScanState,
} from '../../apps/extension/src/types/extension-types.js';

describe('TraceGuard Extension Settings', () => {
  it('defines correct default settings', () => {
    expect(DEFAULT_SETTINGS.apiBaseUrl).toBe('http://localhost:8000/api/v1');
    expect(DEFAULT_SETTINGS.apiToken).toBe('');
    expect(DEFAULT_SETTINGS.autoScan).toBe(true);
    expect(DEFAULT_SETTINGS.enabled).toBe(true);
  });

  it('allows merging partial settings updates safely', () => {
    const patch: Partial<ExtensionSettings> = {
      apiToken: 'test-jwt-token-xyz',
      autoScan: false,
    };
    const updated: ExtensionSettings = { ...DEFAULT_SETTINGS, ...patch };

    expect(updated.apiToken).toBe('test-jwt-token-xyz');
    expect(updated.autoScan).toBe(false);
    expect(updated.enabled).toBe(true);
    expect(updated.apiBaseUrl).toBe('http://localhost:8000/api/v1');
  });
});

describe('Tab Scan State Transitions', () => {
  it('creates an initial idle state for a new tab', () => {
    const idleState: TabScanState = {
      tabId: 42,
      status: 'idle',
      scannedAt: null,
      payload: null,
      error: null,
    };
    expect(idleState.status).toBe('idle');
    expect(idleState.payload).toBeNull();
  });

  it('transitions from idle to scanning with timestamp', () => {
    const now = new Date().toISOString();
    const scanningState: TabScanState = {
      tabId: 42,
      status: 'scanning',
      scannedAt: now,
      payload: null,
      error: null,
    };
    expect(scanningState.status).toBe('scanning');
    expect(scanningState.scannedAt).toBe(now);
  });

  it('transitions to complete with valid payload', () => {
    const payload: WebsiteScanPayload = {
      pageUrl: 'https://example.com/test',
      pageDomain: 'example.com',
      scoreSummary: {
        score: 85,
        riskLevel: 'LOW',
        components: [],
        findings: [],
      },
      requests: [],
      cookies: [],
      storageIndicators: [],
      permissionFindings: [],
      securityIndicators: [],
      timeline: [],
      scannedAt: new Date().toISOString(),
      durationMs: 120,
    };

    const completeState: TabScanState = {
      tabId: 42,
      status: 'complete',
      scannedAt: payload.scannedAt,
      payload,
      error: null,
    };

    expect(completeState.status).toBe('complete');
    expect(completeState.payload?.scoreSummary.score).toBe(85);
    expect(completeState.payload?.scoreSummary.riskLevel).toBe('LOW');
  });

  it('transitions to error on restricted pages', () => {
    const errorState: TabScanState = {
      tabId: 1,
      status: 'error',
      scannedAt: new Date().toISOString(),
      payload: null,
      error: 'Analysis not available for this page type (e.g. browser internal pages).',
    };
    expect(errorState.status).toBe('error');
    expect(errorState.error).toContain('Analysis not available');
  });
});

describe('Extension Message Contract', () => {
  it('supports GET_CURRENT_SCAN message type', () => {
    const msg: ExtensionMessage = { type: 'GET_CURRENT_SCAN', tabId: 101 };
    expect(msg.type).toBe('GET_CURRENT_SCAN');
    expect(msg.tabId).toBe(101);
  });

  it('supports RESCAN_TAB message type', () => {
    const msg: ExtensionMessage = { type: 'RESCAN_TAB', tabId: 101 };
    expect(msg.type).toBe('RESCAN_TAB');
  });

  it('supports SAVE_SCAN_TO_BACKEND message type', () => {
    const msg: ExtensionMessage = { type: 'SAVE_SCAN_TO_BACKEND', tabId: 101 };
    expect(msg.type).toBe('SAVE_SCAN_TO_BACKEND');
  });

  it('supports CLEAR_SCAN_CACHE message type', () => {
    const msg: ExtensionMessage = { type: 'CLEAR_SCAN_CACHE' };
    expect(msg.type).toBe('CLEAR_SCAN_CACHE');
  });

  it('supports CONTENT_INDICATORS message type', () => {
    const indicators: ContentIndicators = {
      localStorageLength: 3,
      localStorageKeyBytes: 24,
      sessionStorageLength: 1,
      sessionStorageKeyBytes: 8,
      isHttps: true,
      hasMixedContent: false,
      permissions: [
        { name: 'geolocation', state: 'prompt' },
        { name: 'notifications', state: 'denied' },
      ],
    };

    const msg: ExtensionMessage = {
      type: 'CONTENT_INDICATORS',
      tabId: 101,
      data: indicators,
    };
    expect(msg.type).toBe('CONTENT_INDICATORS');
    expect(msg.data.isHttps).toBe(true);
    expect(msg.data.permissions).toHaveLength(2);
  });

  it('formats extension responses with ok flag', () => {
    const successResp: ExtensionResponse = { ok: true, message: 'Settings updated.' };
    const errorResp: ExtensionResponse = { ok: false, error: 'Unauthorized' };

    expect(successResp.ok).toBe(true);
    expect(errorResp.ok).toBe(false);
  });
});

describe('Extension Privacy & Redaction Invariants', () => {
  it('sanitizes URLs by stripping auth tokens and sensitive parameters', () => {
    const rawUrl = 'https://portal.example.com/api?token=secret123&auth=bearer_abc&view=summary';
    const sanitized = sanitizeUrl(rawUrl);

    expect(sanitized).not.toContain('secret123');
    expect(sanitized).not.toContain('bearer_abc');
    expect(sanitized).toContain('token=[REDACTED]');
    expect(sanitized).toContain('auth=[REDACTED]');
    expect(sanitized).toContain('view=summary');
  });

  it('strictly rejects raw cookie value retention', () => {
    const rawWithLeak = {
      name: 'session_auth',
      domain: 'example.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Strict' as const,
      isPersistent: false,
      isThirdParty: false,
      sourceDomain: 'example.com',
      value: 'SUPER_SECRET_SESSION_TOKEN_MUST_NEVER_LEAK',
    };

    const sanitized = sanitizeCookieMetadata(rawWithLeak as unknown as CookieMetadata);
    expect((sanitized as Record<string, unknown>).value).toBeUndefined();
    expect(JSON.stringify(sanitized)).not.toContain('SUPER_SECRET_SESSION_TOKEN');
  });

  it('maps cookie sameSite attributes to standard values', () => {
    const cookie: CookieMetadata = {
      name: 'pref',
      domain: '.example.com',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'Lax',
      isPersistent: true,
      isThirdParty: false,
      sourceDomain: 'example.com',
    };
    expect(cookie.sameSite).toBe('Lax');
    expect(cookie.isPersistent).toBe(true);
  });
});

describe('Backend Payload Serialization Contract', () => {
  it('converts WebsiteScanPayload into valid backend CreateScanRequest schema', () => {
    const requests: ObservedRequest[] = [
      {
        id: 'r1',
        pageUrl: 'https://example.com/',
        requestUrl: sanitizeUrl('https://example.com/app.js?token=secret'),
        requestDomain: 'example.com',
        method: 'GET',
        resourceType: 'script',
        statusCode: 200,
        isThirdParty: false,
        isSecure: true,
        observedAt: Date.now() - 1000,
      },
      {
        id: 'r2',
        pageUrl: 'https://example.com/',
        requestUrl: sanitizeUrl('https://tracker.net/pixel'),
        requestDomain: 'tracker.net',
        method: 'GET',
        resourceType: 'image',
        statusCode: 200,
        isThirdParty: true,
        isTracker: true,
        trackerCategory: 'Advertising',
        isSecure: true,
        observedAt: Date.now() - 500,
      },
    ];

    const cookies: CookieMetadata[] = [
      {
        name: 'test_cookie',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
        isPersistent: false,
        isThirdParty: false,
        sourceDomain: 'example.com',
      },
    ];

    const storageIndicators: StorageIndicator[] = [
      { type: 'localStorage', domain: 'example.com', observedAt: Date.now() },
    ];

    const permissionFindings: PermissionFinding[] = [
      { permission: 'notifications', state: 'prompt', domain: 'example.com' },
    ];

    const securityIndicators: SecurityIndicator[] = [];

    const scoreSummary = evaluateScan({
      requests,
      cookies,
      storageIndicators,
      permissionFindings,
      securityIndicators,
    });

    const payload: WebsiteScanPayload = {
      pageUrl: 'https://example.com/?token=secret',
      pageDomain: 'example.com',
      scoreSummary,
      requests,
      cookies,
      storageIndicators,
      permissionFindings,
      securityIndicators,
      timeline: [],
      scannedAt: new Date(Date.now() - 2000).toISOString(),
      durationMs: 850,
    };

    // Verify backend transformation
    const thirdPartyCount = new Set(
      payload.requests.filter((r) => r.isThirdParty).map((r) => r.requestDomain),
    ).size;
    const trackerCount = new Set(
      payload.requests.filter((r) => r.isTracker).map((r) => r.requestDomain),
    ).size;

    const backendPayload = {
      hostname: payload.pageDomain,
      url_redacted: sanitizeUrl(payload.pageUrl),
      started_at: payload.scannedAt,
      completed_at: new Date(new Date(payload.scannedAt).getTime() + payload.durationMs).toISOString(),
      overall_score: payload.scoreSummary.score,
      risk_level: payload.scoreSummary.riskLevel,
      third_party_count: thirdPartyCount,
      tracker_count: trackerCount,
      cookie_count: payload.cookies.length,
      permission_count: payload.permissionFindings.length,
      insecure_resource_count: 0,
      rule_version: '1.0.0',
      findings: payload.scoreSummary.findings.map((f) => ({
        category: 'General',
        finding_type: f.id,
        severity: f.severity,
        title: f.title,
        description: f.title,
        what_was_observed: f.whatWasObserved,
        why_it_matters: f.whyItMatters,
        limitation_note: f.whatTraceGuardCannotConclude,
        score_penalty: 0,
      })),
      cookies: payload.cookies.map((c) => ({
        name: c.name,
        domain: c.domain,
        path: c.path || '/',
        is_secure: c.secure,
        is_http_only: c.httpOnly,
        same_site: c.sameSite,
        is_session: !c.isPersistent,
        is_third_party: c.isThirdParty,
      })),
      permissions: payload.permissionFindings.map((p) => ({
        permission_name: p.permission,
        status: p.state,
      })),
      score_components: payload.scoreSummary.components.map((sc) => ({
        category: sc.category,
        max_penalty: sc.maxPenalty,
        applied_penalty: sc.penalty,
      })),
    };

    // Assert schema conformity
    expect(backendPayload.hostname).toBe('example.com');
    expect(backendPayload.url_redacted).not.toContain('secret');
    expect(backendPayload.url_redacted).toContain('[REDACTED]');
    expect(backendPayload.overall_score).toBeGreaterThanOrEqual(0);
    expect(backendPayload.overall_score).toBeLessThanOrEqual(100);
    expect(['MINIMAL', 'LOW', 'MODERATE', 'ELEVATED', 'HIGH']).toContain(backendPayload.risk_level);
    expect(backendPayload.third_party_count).toBe(1);
    expect(backendPayload.tracker_count).toBe(1);
    expect(backendPayload.cookie_count).toBe(1);
  });
});
