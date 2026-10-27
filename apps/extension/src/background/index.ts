/**
 * background/index.ts — TraceGuard Service Worker (MV3)
 *
 * Responsibilities:
 *  1. Capture permitted network request metadata via chrome.webRequest
 *     (URL, hostname, resourceType, method, timestamp, initiator, status,
 *      HTTPS flag — NEVER request bodies or Authorization headers)
 *  2. Receive content script indicators via chrome.runtime.onMessage
 *  3. On RESCAN_TAB / activeTab activation: run full local analysis pipeline
 *     using @traceguard/analyzer, @traceguard/tracker-classifier,
 *     @traceguard/scoring-engine
 *  4. Persist results per-tab in chrome.storage.local
 *  5. Handle popup messages: GET_CURRENT_SCAN, RESCAN_TAB,
 *     SAVE_SCAN_TO_BACKEND, GET_SETTINGS, UPDATE_SETTINGS
 *
 * Privacy guarantees (enforced in this file):
 *  - cookie .value is NEVER read, stored, or transmitted
 *  - Authorization / Cookie / Set-Cookie headers are NEVER logged
 *  - Sensitive URL query params are redacted via sanitizeUrl()
 *  - Raw request bodies are NEVER accessible in MV3 webRequest
 */

import {
  getRegistrableDomain,
  isThirdPartyDomain,
  sanitizeCookieMetadata,
  sanitizeUrl,
} from '@traceguard/analyzer';
import { evaluateScan } from '@traceguard/scoring-engine';
import type {
  CookieMetadata,
  ObservedRequest,
  PermissionFinding,
  SecurityIndicator,
  StorageIndicator,
  TimelineEvent,
  WebsiteScanPayload,
} from '@traceguard/shared-types';
import { classifyDomain } from '@traceguard/tracker-classifier';

import type {
  ContentIndicators,
  ExtensionMessage,
  ExtensionResponse,
  ExtensionSettings,
  TabScanState,
} from '../types/extension-types';
import { DEFAULT_SETTINGS } from '../types/extension-types';

// ---------------------------------------------------------------------------
// In-memory request buffer (per tab, cleared on RESCAN)
// ---------------------------------------------------------------------------

interface RawRequestEntry {
  tabId: number;
  url: string;
  method: string;
  resourceType: string;
  initiator: string | null;
  statusCode: number;
  isSecure: boolean;
  timestamp: number;
}

const requestBuffer = new Map<number, RawRequestEntry[]>();
const contentIndicatorBuffer = new Map<number, ContentIndicators>();

const MAX_REQUESTS_PER_TAB = 500;

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(result['settings'] as Partial<ExtensionSettings> ?? {}) };
}

async function saveSettings(patch: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ settings: { ...current, ...patch } });
}

// ---------------------------------------------------------------------------
// Tab state helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = 'scan:';

function tabKey(tabId: number): string {
  return `${STORAGE_KEY_PREFIX}${tabId}`;
}

async function getTabState(tabId: number): Promise<TabScanState | null> {
  const result = await chrome.storage.local.get(tabKey(tabId));
  return (result[tabKey(tabId)] as TabScanState | undefined) ?? null;
}

async function setTabState(state: TabScanState): Promise<void> {
  await chrome.storage.local.set({ [tabKey(state.tabId)]: state });
}

// ---------------------------------------------------------------------------
// webRequest listener: capture metadata only
// ---------------------------------------------------------------------------

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.tabId < 0) return; // Background / extension requests

    const entry: RawRequestEntry = {
      tabId: details.tabId,
      url: details.url,
      method: details.method,
      resourceType: details.type,
      initiator: details.initiator ?? null,
      statusCode: details.statusCode,
      isSecure: details.url.startsWith('https://'),
      timestamp: details.timeStamp,
    };

    const buf = requestBuffer.get(details.tabId) ?? [];
    if (buf.length < MAX_REQUESTS_PER_TAB) {
      buf.push(entry);
    }
    requestBuffer.set(details.tabId, buf);
  },
  { urls: ['<all_urls>'] },
);

// Also capture errors (e.g. blocked requests, DNS failures)
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.tabId < 0) return;
    const entry: RawRequestEntry = {
      tabId: details.tabId,
      url: details.url,
      method: details.method,
      resourceType: details.type,
      initiator: details.initiator ?? null,
      statusCode: 0,
      isSecure: details.url.startsWith('https://'),
      timestamp: details.timeStamp,
    };
    const buf = requestBuffer.get(details.tabId) ?? [];
    if (buf.length < MAX_REQUESTS_PER_TAB) {
      buf.push(entry);
    }
    requestBuffer.set(details.tabId, buf);
  },
  { urls: ['<all_urls>'] },
);

// ---------------------------------------------------------------------------
// Cookie metadata collection — value is NEVER read
// ---------------------------------------------------------------------------

async function collectCookieMetadata(
  pageUrl: string,
  pageDomain: string,
): Promise<CookieMetadata[]> {
  let allCookies: chrome.cookies.Cookie[];
  try {
    allCookies = await chrome.cookies.getAll({ url: pageUrl });
  } catch {
    allCookies = [];
  }

  return allCookies.map((c) => {
    const sourceDomain = c.domain.startsWith('.')
      ? c.domain.slice(1)
      : c.domain;
    const cookieRegDomain = getRegistrableDomain(sourceDomain) ?? sourceDomain;
    const pageRegDomain = getRegistrableDomain(pageDomain) ?? pageDomain;
    const isThirdParty = cookieRegDomain !== pageRegDomain;

    // Explicitly drop value — sanitizeCookieMetadata enforces this defensively
    const raw: CookieMetadata & { value?: unknown } = {
      name: c.name,
      domain: c.domain,
      path: c.path,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: mapSameSite(c.sameSite),
      isPersistent: !c.session,
      expiresAt: c.expirationDate
        ? Math.round(c.expirationDate * 1000)
        : undefined,
      isThirdParty,
      sourceDomain: cookieRegDomain,
      value: undefined, // Explicitly set to ensure sanitizeCookieMetadata strips it
    };

    return sanitizeCookieMetadata(raw);
  });
}

function mapSameSite(
  sameSite: string,
): 'Strict' | 'Lax' | 'None' | 'Unspecified' {
  switch (sameSite) {
    case 'strict': return 'Strict';
    case 'lax': return 'Lax';
    case 'no_restriction': return 'None';
    default: return 'Unspecified';
  }
}

// ---------------------------------------------------------------------------
// Build ObservedRequest from raw entries
// ---------------------------------------------------------------------------

let _reqCounter = 0;

function buildObservedRequests(
  raw: RawRequestEntry[],
  pageUrl: string,
): ObservedRequest[] {
  const pageDomainForComparison = (() => {
    try { return new URL(pageUrl).hostname; } catch { return ''; }
  })();

  return raw.map((r) => {
    let hostname = '';
    try { hostname = new URL(r.url).hostname; } catch { /* keep empty */ }

    const requestDomain = getRegistrableDomain(hostname) ?? hostname;
    const thirdParty = isThirdPartyDomain(pageDomainForComparison, hostname);
    const classification = classifyDomain(requestDomain);

    return {
      id: `req-${++_reqCounter}`,
      pageUrl,
      requestUrl: sanitizeUrl(r.url),
      requestDomain,
      method: r.method,
      resourceType: r.resourceType,
      statusCode: r.statusCode,
      isThirdParty: thirdParty,
      isSecure: r.isSecure,
      trackerCategory: classification.category,
      isTracker: classification.isTracker,
      observedAt: Math.round(r.timestamp),
    };
  });
}

// ---------------------------------------------------------------------------
// Build storage indicators from content script data
// ---------------------------------------------------------------------------

function buildStorageIndicators(
  indicators: ContentIndicators,
  pageDomain: string,
): StorageIndicator[] {
  const result: StorageIndicator[] = [];
  const now = Date.now();

  if (indicators.localStorageLength > 0) {
    result.push({
      type: 'localStorage',
      domain: pageDomain,
      observedAt: now,
    });
  }

  if (indicators.sessionStorageLength > 0) {
    result.push({
      type: 'sessionStorage',
      domain: pageDomain,
      observedAt: now,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Build permission findings from content script data
// ---------------------------------------------------------------------------

function buildPermissionFindings(
  indicators: ContentIndicators,
  pageDomain: string,
): PermissionFinding[] {
  const permissionMap: Record<string, PermissionFinding['permission']> = {
    geolocation: 'geolocation',
    notifications: 'notifications',
    camera: 'camera',
    microphone: 'microphone',
    'clipboard-read': 'clipboard-read',
  };

  const stateMap: Record<string, PermissionFinding['state']> = {
    granted: 'granted',
    prompt: 'prompt',
    denied: 'denied',
    unknown: 'unknown',
  };

  return indicators.permissions
    .filter((p) => permissionMap[p.name] !== undefined)
    .map((p) => ({
      permission: permissionMap[p.name] as PermissionFinding['permission'],
      state: stateMap[p.state] ?? 'unknown',
      domain: pageDomain,
    }));
}

// ---------------------------------------------------------------------------
// Build security indicators
// ---------------------------------------------------------------------------

function buildSecurityIndicators(
  indicators: ContentIndicators,
  requests: ObservedRequest[],
): SecurityIndicator[] {
  const result: SecurityIndicator[] = [];
  const now = Date.now();

  if (indicators.hasMixedContent) {
    result.push({
      type: 'mixed-content',
      description: 'Mixed-content HTTP subresources detected in the page DOM.',
      observedAt: now,
    });
  }

  // Check for insecure cookie flag patterns
  const insecureRequests = requests.filter((r) => !r.isSecure);
  if (insecureRequests.length > 0) {
    result.push({
      type: 'other',
      description: `${insecureRequests.length} request(s) over unencrypted HTTP observed.`,
      observedAt: now,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Build timeline
// ---------------------------------------------------------------------------

let _evtCounter = 0;

function buildTimeline(
  requests: ObservedRequest[],
  cookies: CookieMetadata[],
  storage: StorageIndicator[],
  permissions: PermissionFinding[],
  security: SecurityIndicator[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const r of requests) {
    events.push({
      id: `evt-${++_evtCounter}`,
      type: 'request',
      domain: r.requestDomain,
      label: `${r.method} ${r.resourceType}`,
      isThirdParty: r.isThirdParty,
      isTracker: r.isTracker,
      observedAt: r.observedAt,
    });
  }

  const now = Date.now();
  for (const c of cookies) {
    events.push({
      id: `evt-${++_evtCounter}`,
      type: 'cookie',
      domain: c.sourceDomain,
      label: `Cookie: ${c.name}`,
      isThirdParty: c.isThirdParty,
      observedAt: now,
    });
  }

  for (const s of storage) {
    events.push({
      id: `evt-${++_evtCounter}`,
      type: 'storage',
      domain: s.domain,
      label: s.type,
      isThirdParty: false,
      observedAt: s.observedAt,
    });
  }

  for (const p of permissions) {
    events.push({
      id: `evt-${++_evtCounter}`,
      type: 'permission',
      domain: p.domain,
      label: `${p.permission}: ${p.state}`,
      isThirdParty: false,
      observedAt: now,
    });
  }

  for (const si of security) {
    events.push({
      id: `evt-${++_evtCounter}`,
      type: 'security',
      domain: '',
      label: si.description,
      isThirdParty: false,
      observedAt: si.observedAt,
    });
  }

  return events.sort((a, b) => a.observedAt - b.observedAt);
}

// ---------------------------------------------------------------------------
// Core scan runner
// ---------------------------------------------------------------------------

async function runScan(tabId: number): Promise<void> {
  let tab: chrome.tabs.Tab | null = null;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return; // Tab closed
  }

  const pageUrl = tab.url ?? '';

  // Only scan http/https pages
  if (!pageUrl.startsWith('http://') && !pageUrl.startsWith('https://')) {
    await setTabState({
      tabId,
      status: 'error',
      scannedAt: new Date().toISOString(),
      payload: null,
      error: 'Analysis not available for this page type (e.g. browser internal pages).',
    });
    return;
  }

  await setTabState({
    tabId,
    status: 'scanning',
    scannedAt: new Date().toISOString(),
    payload: null,
    error: null,
  });

  const scanStart = Date.now();

  try {
    let pageDomain = '';
    try { pageDomain = new URL(pageUrl).hostname; } catch { /* ok */ }

    const pageRegistrableDomain = getRegistrableDomain(pageDomain) ?? pageDomain;

    // Build requests from buffer
    const rawRequests = requestBuffer.get(tabId) ?? [];
    const requests = buildObservedRequests(rawRequests, pageUrl);

    // Collect cookies (no values)
    const cookies = await collectCookieMetadata(pageUrl, pageDomain);

    // Content script indicators (may not have arrived yet — use empty fallback)
    const indicators = contentIndicatorBuffer.get(tabId) ?? {
      localStorageLength: 0,
      localStorageKeyBytes: 0,
      sessionStorageLength: 0,
      sessionStorageKeyBytes: 0,
      isHttps: pageUrl.startsWith('https://'),
      hasMixedContent: false,
      permissions: [],
    };

    const storageIndicators = buildStorageIndicators(indicators, pageRegistrableDomain);
    const permissionFindings = buildPermissionFindings(indicators, pageRegistrableDomain);
    const securityIndicators = buildSecurityIndicators(indicators, requests);
    const timeline = buildTimeline(requests, cookies, storageIndicators, permissionFindings, securityIndicators);

    // Run scoring pipeline
    const scoreSummary = evaluateScan({
      requests,
      cookies,
      storageIndicators,
      permissionFindings,
      securityIndicators,
    });

    const durationMs = Date.now() - scanStart;

    const payload: WebsiteScanPayload = {
      pageUrl: sanitizeUrl(pageUrl),
      pageDomain: pageRegistrableDomain,
      scoreSummary,
      requests,
      cookies,
      storageIndicators,
      permissionFindings,
      securityIndicators,
      timeline,
      scannedAt: new Date(scanStart).toISOString(),
      durationMs,
    };

    await setTabState({
      tabId,
      status: 'complete',
      scannedAt: new Date().toISOString(),
      payload,
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setTabState({
      tabId,
      status: 'error',
      scannedAt: new Date().toISOString(),
      payload: null,
      error: `Analysis failed: ${message}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Save scan to backend
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Save scan to backend (mapped to backend CreateScanRequest schema)
// ---------------------------------------------------------------------------

function formatPayloadForBackend(payload: WebsiteScanPayload) {
  const domainMap = new Map<string, {
    hostname: string;
    registrable_domain: string;
    category: string;
    is_tracker: boolean;
    is_third_party: boolean;
    request_count: number;
    insecure_request_count: number;
  }>();

  for (const r of payload.requests) {
    let host = '';
    try { host = new URL(r.requestUrl).hostname; } catch { host = r.requestDomain; }
    const key = host || r.requestDomain;
    const existing = domainMap.get(key);
    if (existing) {
      existing.request_count += 1;
      if (!r.isSecure) existing.insecure_request_count += 1;
    } else {
      domainMap.set(key, {
        hostname: key,
        registrable_domain: r.requestDomain,
        category: r.trackerCategory ?? 'Unknown',
        is_tracker: r.isTracker ?? false,
        is_third_party: r.isThirdParty,
        request_count: 1,
        insecure_request_count: r.isSecure ? 0 : 1,
      });
    }
  }

  const thirdPartyCount = new Set(
    payload.requests.filter((r) => r.isThirdParty).map((r) => r.requestDomain),
  ).size;

  const trackerCount = new Set(
    payload.requests.filter((r) => r.isTracker).map((r) => r.requestDomain),
  ).size;

  const insecureCount =
    payload.requests.filter((r) => !r.isSecure).length +
    payload.securityIndicators.filter((s) => s.type === 'mixed-content').length;

  return {
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
    insecure_resource_count: insecureCount,
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
      evidence_summary: f.affectedDomains?.join(', ') ?? '',
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
      expiration_days: c.expiresAt ? Math.max(0, Math.round((c.expiresAt - Date.now()) / (86400 * 1000))) : undefined,
    })),
    permissions: payload.permissionFindings.map((p) => ({
      permission_name: p.permission,
      status: p.state,
      note: p.domain,
    })),
    score_components: payload.scoreSummary.components.map((sc) => ({
      category: sc.category,
      max_penalty: sc.maxPenalty,
      applied_penalty: sc.penalty,
      details_json: { rationale: sc.rationale },
    })),
    domains: Array.from(domainMap.values()),
  };
}

async function saveScanToBackend(tabId: number): Promise<string> {
  const state = await getTabState(tabId);
  if (!state?.payload) throw new Error('No scan available for this tab.');

  const settings = await getSettings();
  if (!settings.apiToken) {
    throw new Error('Not authenticated. Configure your account in extension options.');
  }

  const backendBody = formatPayloadForBackend(state.payload);
  const baseUrl = settings.apiBaseUrl.replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/scans/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiToken}`,
    },
    body: JSON.stringify(backendBody),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Backend error ${response.status}: ${text.slice(0, 200)}`);
  }

  return 'Scan saved successfully.';
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void,
  ) => {
    // Content script indicators — store for next scan
    if (message.type === 'CONTENT_INDICATORS') {
      const tabId = sender.tab?.id ?? message.tabId;
      if (tabId > 0) {
        contentIndicatorBuffer.set(tabId, message.data);
      }
      return false; // synchronous, no response needed
    }

    // All other messages are async
    (async () => {
      try {
        switch (message.type) {
          case 'GET_CURRENT_SCAN': {
            const state = await getTabState(message.tabId);
            if (!state) {
              sendResponse({ ok: true, data: {
                tabId: message.tabId,
                status: 'idle',
                scannedAt: null,
                payload: null,
                error: null,
              } as TabScanState });
            } else {
              sendResponse({ ok: true, data: state });
            }
            break;
          }

          case 'RESCAN_TAB': {
            // Clear buffer so fresh scan starts clean
            requestBuffer.set(message.tabId, []);
            contentIndicatorBuffer.delete(message.tabId);
            void runScan(message.tabId);
            sendResponse({ ok: true, message: 'Scan initiated.' });
            break;
          }

          case 'SAVE_SCAN_TO_BACKEND': {
            const msg = await saveScanToBackend(message.tabId);
            sendResponse({ ok: true, message: msg });
            break;
          }

          case 'GET_SETTINGS': {
            const settings = await getSettings();
            sendResponse({ ok: true, data: settings });
            break;
          }

          case 'UPDATE_SETTINGS': {
            await saveSettings(message.settings);
            sendResponse({ ok: true, message: 'Settings updated.' });
            break;
          }

          case 'CLEAR_SCAN_CACHE': {
            const all = await chrome.storage.local.get(null);
            const scanKeys = Object.keys(all).filter((k) => k.startsWith(STORAGE_KEY_PREFIX));
            if (scanKeys.length > 0) {
              await chrome.storage.local.remove(scanKeys);
            }
            requestBuffer.clear();
            contentIndicatorBuffer.clear();
            sendResponse({ ok: true, message: `Cleared ${scanKeys.length} cached scan(s).` });
            break;
          }

          default:
            sendResponse({ ok: false, error: 'Unknown message type.' });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        sendResponse({ ok: false, error: errorMsg });
      }
    })();

    return true; // Keep message channel open for async response
  },
);

// ---------------------------------------------------------------------------
// Auto-scan on tab activation / navigation completion
// ---------------------------------------------------------------------------

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const settings = await getSettings();
  if (!settings.enabled || !settings.autoScan) return;

  const state = await getTabState(tabId);
  // Auto-scan if no recent scan (last 60s)
  const shouldScan =
    !state ||
    state.status === 'idle' ||
    (state.scannedAt &&
      Date.now() - new Date(state.scannedAt).getTime() > 60_000);

  if (shouldScan) {
    void runScan(tabId);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  const settings = await getSettings();
  if (!settings.enabled || !settings.autoScan) return;
  if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) return;

  // Clear stale buffer on navigation
  requestBuffer.set(tabId, []);
  contentIndicatorBuffer.delete(tabId);

  // Give the page a moment to fire initial requests before scanning
  setTimeout(() => {
    void runScan(tabId);
  }, 1500);
});

// Cleanup on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  requestBuffer.delete(tabId);
  contentIndicatorBuffer.delete(tabId);
  void chrome.storage.local.remove(tabKey(tabId));
});

// Keep service worker alive hint
chrome.runtime.onInstalled.addListener(() => {
  console.info('[TraceGuard] Extension installed. Analysis runs locally — no data leaves your browser by default.');
});
