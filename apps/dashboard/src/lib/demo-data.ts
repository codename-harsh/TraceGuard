import type {
  ScanDetail,
  SitesOverview,
  ScanCompare,
  UserSettings,
  User,
  Finding,
  FilterScansParams,
} from './api';

export const DEMO_USER: User = {
  id: 'usr_demo_2026',
  email: 'demo@traceguard.local',
  full_name: 'Security Analyst (Demo Mode)',
  created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
};

export const DEMO_SETTINGS: UserSettings = {
  opt_in_cloud_sync: true,
  default_redaction_strict: true,
  theme: 'dark',
};

function getIsoDate(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
}

export const INITIAL_DEMO_SCANS: ScanDetail[] = [
  // 1. news.example
  {
    id: 'scan-demo-news-1',
    hostname: 'news.example',
    url_redacted: 'https://news.example/article/cyber-security-trends?session=[REDACTED]&token=[REDACTED]',
    started_at: getIsoDate(3 * 3600000 + 15 * 60000),
    completed_at: getIsoDate(3 * 3600000 + 15 * 60000 - 14000),
    overall_score: 48,
    risk_level: 'ELEVATED',
    third_party_count: 8,
    tracker_count: 5,
    cookie_count: 12,
    permission_count: 2,
    insecure_resource_count: 1,
    rule_version: '1.0.0',
    created_at: getIsoDate(3 * 3600000 + 15 * 60000),
    findings: [
      {
        id: 'f-news-1',
        scan_id: 'scan-demo-news-1',
        category: 'Tracker Domains',
        finding_type: 'multiple_trackers_detected',
        severity: 'HIGH',
        title: 'Multiple tracking domains observed during session',
        description: '5 known advertising, retargeting, and fingerprinting domains were observed communicating in the background.',
        what_was_observed: 'Requests dispatched to adservice.example.net, retargeting-pixel.example.com, and fingerprint-cdn.example.io.',
        why_it_matters: 'Third-party tracking networks correlate user behavior across multiple independent properties without explicit consent.',
        limitation_note: 'Analysis captures network activity triggered during page load; lazy-loaded or conditional beacons may vary.',
        evidence_summary: '5 tracker domains identified with 16 total background requests.',
        score_penalty: 25,
        created_at: getIsoDate(3 * 3600000),
      },
      {
        id: 'f-news-2',
        scan_id: 'scan-demo-news-1',
        category: 'Cookies & Storage',
        finding_type: 'third_party_tracking_cookies',
        severity: 'MEDIUM',
        title: 'Third-party cookies without Strict isolation',
        description: 'Third-party tracking cookies detected with lax or unspecified SameSite attributes.',
        what_was_observed: "Cookie 'ad_id' set on adservice.example.net without SameSite restriction.",
        why_it_matters: 'Cookies accessible in cross-site contexts enable behavioral tracking across visited domains.',
        limitation_note: 'Client-side cookie inspection only; httpOnly cookies set via server responses are analyzed from response headers.',
        evidence_summary: '3 cross-site tracking cookies identified.',
        score_penalty: 12,
        created_at: getIsoDate(3 * 3600000),
      },
      {
        id: 'f-news-3',
        scan_id: 'scan-demo-news-1',
        category: 'Network Security',
        finding_type: 'mixed_content_resource',
        severity: 'MEDIUM',
        title: 'Insecure HTTP resource request observed',
        description: 'One background asset requested over unencrypted HTTP on an otherwise HTTPS origin.',
        what_was_observed: 'Resource loaded from http://news.example/assets/legacy-banner.jpg.',
        why_it_matters: 'Unencrypted network requests are subject to passive eavesdropping and adversary tampering.',
        limitation_note: 'Browser mixed content blockers may prevent the asset from rendering, but request dispatch was observed.',
        evidence_summary: '1 mixed content HTTP request detected.',
        score_penalty: 10,
        created_at: getIsoDate(3 * 3600000),
      },
      {
        id: 'f-news-4',
        scan_id: 'scan-demo-news-1',
        category: 'Browser Permissions',
        finding_type: 'prompt_permission_request',
        severity: 'LOW',
        title: 'Geolocation permission request initiated on load',
        description: 'Site invoked navigator.geolocation without prior user gesture.',
        what_was_observed: 'Geolocation API prompt displayed immediately after initial document parse.',
        why_it_matters: 'Unprompted location queries indicate aggressive device capability discovery.',
        limitation_note: 'Permission prompts do not expose location data unless explicitly granted by the user.',
        evidence_summary: "Permission prompt for 'geolocation' recorded.",
        score_penalty: 5,
        created_at: getIsoDate(3 * 3600000),
      },
    ],
    cookies: [
      {
        id: 'c-news-1',
        scan_id: 'scan-demo-news-1',
        name: '_ga',
        domain: '.news.example',
        path: '/',
        is_secure: true,
        is_http_only: false,
        same_site: 'Lax',
        is_session: false,
        is_third_party: false,
        expiration_days: 730,
      },
      {
        id: 'c-news-2',
        scan_id: 'scan-demo-news-1',
        name: 'ad_id',
        domain: 'adservice.example.net',
        path: '/',
        is_secure: false,
        is_http_only: false,
        same_site: 'Unspecified',
        is_session: false,
        is_third_party: true,
        expiration_days: 180,
      },
      {
        id: 'c-news-3',
        scan_id: 'scan-demo-news-1',
        name: '_fbp',
        domain: '.example.com',
        path: '/',
        is_secure: true,
        is_http_only: false,
        same_site: 'None',
        is_session: false,
        is_third_party: true,
        expiration_days: 90,
      },
      {
        id: 'c-news-4',
        scan_id: 'scan-demo-news-1',
        name: 'session_token',
        domain: 'news.example',
        path: '/',
        is_secure: true,
        is_http_only: true,
        same_site: 'Strict',
        is_session: true,
        is_third_party: false,
        expiration_days: null,
      },
    ],
    permissions: [
      {
        id: 'p-news-1',
        scan_id: 'scan-demo-news-1',
        permission_name: 'geolocation',
        status: 'prompt',
        note: 'Invoked immediately after DOMContentLoaded without user action',
      },
      {
        id: 'p-news-2',
        scan_id: 'scan-demo-news-1',
        permission_name: 'notifications',
        status: 'prompt',
        note: 'Push notifications prompt requested',
      },
    ],
    score_components: [
      {
        category: 'Tracker Domains',
        max_penalty: 35,
        applied_penalty: 25,
        details_json: { tracker_count: 5, severity: 'HIGH' },
      },
      {
        category: 'Cookies & Storage',
        max_penalty: 25,
        applied_penalty: 12,
        details_json: { unspecified_samesite_count: 1, third_party_cookies: 2 },
      },
      {
        category: 'Network Security',
        max_penalty: 25,
        applied_penalty: 10,
        details_json: { insecure_mixed_content_count: 1 },
      },
      {
        category: 'Browser Permissions',
        max_penalty: 15,
        applied_penalty: 5,
        details_json: { permission_prompts: 2 },
      },
    ],
    scan_domains: [
      {
        id: 'sd-news-1',
        scan_id: 'scan-demo-news-1',
        domain_id: 'd-1',
        is_third_party: true,
        request_count: 6,
        insecure_request_count: 0,
        domain: {
          id: 'd-1',
          hostname: 'adservice.example.net',
          registrable_domain: 'example.net',
          category: 'Advertising',
          is_tracker: true,
        },
      },
      {
        id: 'sd-news-2',
        scan_id: 'scan-demo-news-1',
        domain_id: 'd-2',
        is_third_party: true,
        request_count: 4,
        insecure_request_count: 0,
        domain: {
          id: 'd-2',
          hostname: 'analytics-tag.example.com',
          registrable_domain: 'example.com',
          category: 'Analytics',
          is_tracker: true,
        },
      },
      {
        id: 'sd-news-3',
        scan_id: 'scan-demo-news-1',
        domain_id: 'd-3',
        is_third_party: true,
        request_count: 3,
        insecure_request_count: 0,
        domain: {
          id: 'd-3',
          hostname: 'social-tracker.example.org',
          registrable_domain: 'example.org',
          category: 'Social Media',
          is_tracker: true,
        },
      },
      {
        id: 'sd-news-4',
        scan_id: 'scan-demo-news-1',
        domain_id: 'd-4',
        is_third_party: true,
        request_count: 2,
        insecure_request_count: 0,
        domain: {
          id: 'd-4',
          hostname: 'retargeting-pixel.example.com',
          registrable_domain: 'example.com',
          category: 'Advertising',
          is_tracker: true,
        },
      },
      {
        id: 'sd-news-5',
        scan_id: 'scan-demo-news-1',
        domain_id: 'd-5',
        is_third_party: true,
        request_count: 1,
        insecure_request_count: 0,
        domain: {
          id: 'd-5',
          hostname: 'fingerprint-cdn.example.io',
          registrable_domain: 'example.io',
          category: 'Fingerprinting',
          is_tracker: true,
        },
      },
      {
        id: 'sd-news-6',
        scan_id: 'scan-demo-news-1',
        domain_id: 'd-6',
        is_third_party: false,
        request_count: 18,
        insecure_request_count: 0,
        domain: {
          id: 'd-6',
          hostname: 'cdn.news.example',
          registrable_domain: 'news.example',
          category: 'Content',
          is_tracker: false,
        },
      },
      {
        id: 'sd-news-7',
        scan_id: 'scan-demo-news-1',
        domain_id: 'd-7',
        is_third_party: true,
        request_count: 2,
        insecure_request_count: 0,
        domain: {
          id: 'd-7',
          hostname: 'fonts.example.org',
          registrable_domain: 'example.org',
          category: 'Content',
          is_tracker: false,
        },
      },
    ],
  },

  // 2. shop.example
  {
    id: 'scan-demo-shop-2',
    hostname: 'shop.example',
    url_redacted: 'https://shop.example/catalog/gadgets?ref=newsletter',
    started_at: getIsoDate(28 * 3600000),
    completed_at: getIsoDate(28 * 3600000 - 9000),
    overall_score: 68,
    risk_level: 'MODERATE',
    third_party_count: 4,
    tracker_count: 2,
    cookie_count: 5,
    permission_count: 1,
    insecure_resource_count: 0,
    rule_version: '1.0.0',
    created_at: getIsoDate(28 * 3600000),
    findings: [
      {
        id: 'f-shop-1',
        scan_id: 'scan-demo-shop-2',
        category: 'Data Harvesting',
        finding_type: 'session_replay_detected',
        severity: 'MEDIUM',
        title: 'Session replay analytics service observed',
        description: 'Background script transmitting mouse events and DOM mutations to an external collector.',
        what_was_observed: 'Transmissions to replay-analytics.example.com capturing user interaction events.',
        why_it_matters: 'Session replay scripts can inadvertently record sensitive form inputs unless strictly redacted.',
        limitation_note: 'TraceGuard observes endpoint communication; specific DOM masking implementation cannot be verified externally.',
        evidence_summary: 'Active session recorder telemetry identified.',
        score_penalty: 18,
        created_at: getIsoDate(28 * 3600000),
      },
      {
        id: 'f-shop-2',
        scan_id: 'scan-demo-shop-2',
        category: 'Tracker Domains',
        finding_type: 'analytics_tracker_detected',
        severity: 'LOW',
        title: 'General web analytics provider identified',
        description: 'Telemetry requests observed directed to metrics.example.net.',
        what_was_observed: 'Standard pageview and click beacons sent to metrics.example.net.',
        why_it_matters: 'Aggregated web traffic analytics provide site owners operational metrics with low individual privacy impact.',
        limitation_note: 'Privacy indicators depend on whether the provider pseudonymizes client IP addresses.',
        evidence_summary: '1 general analytics tracker recorded.',
        score_penalty: 10,
        created_at: getIsoDate(28 * 3600000),
      },
      {
        id: 'f-shop-3',
        scan_id: 'scan-demo-shop-2',
        category: 'Cookies & Storage',
        finding_type: 'persistent_marketing_cookie',
        severity: 'LOW',
        title: 'Long-lived third-party identifier cookie',
        description: 'Cookie lifespan exceeds 30 days without clear user session dependency.',
        what_was_observed: "Cookie 'sr_session' set on replay-analytics.example.com with 30-day expiration.",
        why_it_matters: 'Persistent identifiers maintain continuity across distinct browser sessions.',
        limitation_note: 'Cookie expiration is read from header metadata and may be purged sooner by browser policies.',
        evidence_summary: '1 persistent cookie identified.',
        score_penalty: 4,
        created_at: getIsoDate(28 * 3600000),
      },
    ],
    cookies: [
      {
        id: 'c-shop-1',
        scan_id: 'scan-demo-shop-2',
        name: 'cart_token',
        domain: 'shop.example',
        path: '/',
        is_secure: true,
        is_http_only: true,
        same_site: 'Lax',
        is_session: true,
        is_third_party: false,
        expiration_days: null,
      },
      {
        id: 'c-shop-2',
        scan_id: 'scan-demo-shop-2',
        name: 'sr_session',
        domain: 'replay-analytics.example.com',
        path: '/',
        is_secure: true,
        is_http_only: false,
        same_site: 'None',
        is_session: false,
        is_third_party: true,
        expiration_days: 30,
      },
    ],
    permissions: [
      {
        id: 'p-shop-1',
        scan_id: 'scan-demo-shop-2',
        permission_name: 'camera',
        status: 'denied',
        note: 'Barcode / QR scanning feature queried camera API capability',
      },
    ],
    score_components: [
      {
        category: 'Tracker Domains',
        max_penalty: 35,
        applied_penalty: 18,
        details_json: { replay_analytics: 1, standard_analytics: 1 },
      },
      {
        category: 'Cookies & Storage',
        max_penalty: 25,
        applied_penalty: 4,
        details_json: { long_lived_cookie: 1 },
      },
      {
        category: 'Network Security',
        max_penalty: 25,
        applied_penalty: 0,
        details_json: { all_https: true },
      },
      {
        category: 'Browser Permissions',
        max_penalty: 15,
        applied_penalty: 10,
        details_json: { hardware_permission_query: 1 },
      },
    ],
    scan_domains: [
      {
        id: 'sd-shop-1',
        scan_id: 'scan-demo-shop-2',
        domain_id: 'd-shop-1',
        is_third_party: true,
        request_count: 5,
        insecure_request_count: 0,
        domain: {
          id: 'd-shop-1',
          hostname: 'replay-analytics.example.com',
          registrable_domain: 'example.com',
          category: 'Session Replay',
          is_tracker: true,
        },
      },
      {
        id: 'sd-shop-2',
        scan_id: 'scan-demo-shop-2',
        domain_id: 'd-shop-2',
        is_third_party: true,
        request_count: 3,
        insecure_request_count: 0,
        domain: {
          id: 'd-shop-2',
          hostname: 'metrics.example.net',
          registrable_domain: 'example.net',
          category: 'Analytics',
          is_tracker: true,
        },
      },
      {
        id: 'sd-shop-3',
        scan_id: 'scan-demo-shop-2',
        domain_id: 'd-shop-3',
        is_third_party: true,
        request_count: 2,
        insecure_request_count: 0,
        domain: {
          id: 'd-shop-3',
          hostname: 'pay-gateway.example.com',
          registrable_domain: 'example.com',
          category: 'Payment',
          is_tracker: false,
        },
      },
      {
        id: 'sd-shop-4',
        scan_id: 'scan-demo-shop-2',
        domain_id: 'd-shop-4',
        is_third_party: true,
        request_count: 14,
        insecure_request_count: 0,
        domain: {
          id: 'd-shop-4',
          hostname: 'img-cdn.example.org',
          registrable_domain: 'example.org',
          category: 'Content',
          is_tracker: false,
        },
      },
    ],
  },

  // 3. blog.example
  {
    id: 'scan-demo-blog-3',
    hostname: 'blog.example',
    url_redacted: 'https://blog.example/posts/privacy-in-2026',
    started_at: getIsoDate(56 * 3600000),
    completed_at: getIsoDate(56 * 3600000 - 4000),
    overall_score: 94,
    risk_level: 'MINIMAL',
    third_party_count: 0,
    tracker_count: 0,
    cookie_count: 1,
    permission_count: 0,
    insecure_resource_count: 0,
    rule_version: '1.0.0',
    created_at: getIsoDate(56 * 3600000),
    findings: [
      {
        id: 'f-blog-1',
        scan_id: 'scan-demo-blog-3',
        category: 'Cookies & Storage',
        finding_type: 'first_party_preference_cookie',
        severity: 'INFO',
        title: 'First-party UI preference cookie observed',
        description: 'A single client-side cookie used to persist theme and layout preferences.',
        what_was_observed: "Cookie 'theme_pref' set with SameSite=Strict and Secure flags.",
        why_it_matters: 'First-party UI cookies do not enable cross-site tracking and respect browser security boundaries.',
        limitation_note: 'Informational indicator only; minimal observed privacy impact.',
        evidence_summary: '1 strictly isolated first-party cookie.',
        score_penalty: 6,
        created_at: getIsoDate(56 * 3600000),
      },
    ],
    cookies: [
      {
        id: 'c-blog-1',
        scan_id: 'scan-demo-blog-3',
        name: 'theme_pref',
        domain: 'blog.example',
        path: '/',
        is_secure: true,
        is_http_only: false,
        same_site: 'Strict',
        is_session: false,
        is_third_party: false,
        expiration_days: 365,
      },
    ],
    permissions: [],
    score_components: [
      {
        category: 'Tracker Domains',
        max_penalty: 35,
        applied_penalty: 0,
        details_json: { tracker_count: 0 },
      },
      {
        category: 'Cookies & Storage',
        max_penalty: 25,
        applied_penalty: 6,
        details_json: { persistent_first_party_cookie: 1 },
      },
      {
        category: 'Network Security',
        max_penalty: 25,
        applied_penalty: 0,
        details_json: { full_transport_encryption: true },
      },
      {
        category: 'Browser Permissions',
        max_penalty: 15,
        applied_penalty: 0,
        details_json: { permissions_requested: 0 },
      },
    ],
    scan_domains: [
      {
        id: 'sd-blog-1',
        scan_id: 'scan-demo-blog-3',
        domain_id: 'd-blog-1',
        is_third_party: false,
        request_count: 8,
        insecure_request_count: 0,
        domain: {
          id: 'd-blog-1',
          hostname: 'blog.example',
          registrable_domain: 'blog.example',
          category: 'Content',
          is_tracker: false,
        },
      },
    ],
  },

  // 4. portal.example
  {
    id: 'scan-demo-portal-4',
    hostname: 'portal.example',
    url_redacted: 'https://portal.example/dashboard',
    started_at: getIsoDate(73 * 3600000),
    completed_at: getIsoDate(73 * 3600000 - 6000),
    overall_score: 81,
    risk_level: 'LOW',
    third_party_count: 2,
    tracker_count: 1,
    cookie_count: 2,
    permission_count: 0,
    insecure_resource_count: 0,
    rule_version: '1.0.0',
    created_at: getIsoDate(73 * 3600000),
    findings: [
      {
        id: 'f-portal-1',
        scan_id: 'scan-demo-portal-4',
        category: 'Tracker Domains',
        finding_type: 'privacy_preserving_telemetry',
        severity: 'LOW',
        title: 'Aggregated telemetry domain observed',
        description: 'Telemetry beacon sent to telemetry.example.org with privacy-preserving headers.',
        what_was_observed: 'Periodic heartbeat transmission to telemetry.example.org.',
        why_it_matters: 'Aggregated service metrics provide software reliability data without intrusive profiling.',
        limitation_note: 'Payload inspection confirms aggregate reporting counters.',
        evidence_summary: '1 low-impact telemetry service identified.',
        score_penalty: 12,
        created_at: getIsoDate(73 * 3600000),
      },
      {
        id: 'f-portal-2',
        scan_id: 'scan-demo-portal-4',
        category: 'Cookies & Storage',
        finding_type: 'authenticated_session_cookie',
        severity: 'INFO',
        title: 'Session cookie with robust security flags',
        description: 'Primary session identifier protected with HttpOnly and Strict attributes.',
        what_was_observed: "Cookie 'auth_session' set with HttpOnly, Secure, and SameSite=Strict.",
        why_it_matters: 'Proper security flags mitigate client-side script tampering and CSRF vectors.',
        limitation_note: 'Standard session cookie requirement for authenticated web portals.',
        evidence_summary: 'Strictly secured session cookie.',
        score_penalty: 7,
        created_at: getIsoDate(73 * 3600000),
      },
    ],
    cookies: [
      {
        id: 'c-portal-1',
        scan_id: 'scan-demo-portal-4',
        name: 'auth_session',
        domain: 'portal.example',
        path: '/',
        is_secure: true,
        is_http_only: true,
        same_site: 'Strict',
        is_session: true,
        is_third_party: false,
        expiration_days: null,
      },
      {
        id: 'c-portal-2',
        scan_id: 'scan-demo-portal-4',
        name: 'telemetry_uid',
        domain: 'telemetry.example.org',
        path: '/',
        is_secure: true,
        is_http_only: true,
        same_site: 'Lax',
        is_session: false,
        is_third_party: true,
        expiration_days: 14,
      },
    ],
    permissions: [],
    score_components: [
      {
        category: 'Tracker Domains',
        max_penalty: 35,
        applied_penalty: 12,
        details_json: { telemetry_domains: 1 },
      },
      {
        category: 'Cookies & Storage',
        max_penalty: 25,
        applied_penalty: 7,
        details_json: { cookie_count: 2 },
      },
      {
        category: 'Network Security',
        max_penalty: 25,
        applied_penalty: 0,
        details_json: { https_verified: true },
      },
      {
        category: 'Browser Permissions',
        max_penalty: 15,
        applied_penalty: 0,
        details_json: { no_permissions: true },
      },
    ],
    scan_domains: [
      {
        id: 'sd-portal-1',
        scan_id: 'scan-demo-portal-4',
        domain_id: 'd-portal-1',
        is_third_party: false,
        request_count: 12,
        insecure_request_count: 0,
        domain: {
          id: 'd-portal-1',
          hostname: 'portal.example',
          registrable_domain: 'portal.example',
          category: 'Productivity',
          is_tracker: false,
        },
      },
      {
        id: 'sd-portal-2',
        scan_id: 'scan-demo-portal-4',
        domain_id: 'd-portal-2',
        is_third_party: true,
        request_count: 2,
        insecure_request_count: 0,
        domain: {
          id: 'd-portal-2',
          hostname: 'telemetry.example.org',
          registrable_domain: 'example.org',
          category: 'Analytics',
          is_tracker: true,
        },
      },
      {
        id: 'sd-portal-3',
        scan_id: 'scan-demo-portal-4',
        domain_id: 'd-portal-3',
        is_third_party: true,
        request_count: 2,
        insecure_request_count: 0,
        domain: {
          id: 'd-portal-3',
          hostname: 'fonts.example.net',
          registrable_domain: 'example.net',
          category: 'Content',
          is_tracker: false,
        },
      },
    ],
  },
];

// Helper functions for mock fallback
export class DemoDataStore {
  private scans: ScanDetail[] = [...INITIAL_DEMO_SCANS];
  private user: User = { ...DEMO_USER };
  private settings: UserSettings = { ...DEMO_SETTINGS };

  getScans(params?: FilterScansParams): ScanDetail[] {
    let result = [...this.scans];
    if (params?.hostname) {
      const q = params.hostname.toLowerCase();
      result = result.filter((s) => s.hostname.toLowerCase().includes(q));
    }
    if (params?.risk_level) {
      result = result.filter((s) => s.risk_level === params.risk_level);
    }
    if (params?.min_score !== undefined) {
      result = result.filter((s) => s.overall_score >= (params.min_score || 0));
    }
    if (params?.max_score !== undefined) {
      result = result.filter((s) => s.overall_score <= (params.max_score || 100));
    }
    return result;
  }

  getScan(idOrHostname: string): ScanDetail | undefined {
    return this.scans.find(
      (s) => s.id === idOrHostname || s.hostname.toLowerCase() === idOrHostname.toLowerCase()
    );
  }

  deleteScan(id: string): boolean {
    const prevLen = this.scans.length;
    this.scans = this.scans.filter((s) => s.id !== id);
    return this.scans.length < prevLen;
  }

  getOverview(): SitesOverview {
    const scans = this.scans;
    const total_scans = scans.length;
    const unique_hostnames = new Set(scans.map((s) => s.hostname)).size;
    const average_score =
      total_scans > 0
        ? Math.round(scans.reduce((acc, s) => acc + s.overall_score, 0) / total_scans)
        : 100;
    const total_trackers = scans.reduce((acc, s) => acc + s.tracker_count, 0);
    const total_third_parties = scans.reduce((acc, s) => acc + s.third_party_count, 0);

    const risk_distribution = {
      MINIMAL: scans.filter((s) => s.risk_level === 'MINIMAL').length,
      LOW: scans.filter((s) => s.risk_level === 'LOW').length,
      MODERATE: scans.filter((s) => s.risk_level === 'MODERATE').length,
      ELEVATED: scans.filter((s) => s.risk_level === 'ELEVATED').length,
      HIGH: scans.filter((s) => s.risk_level === 'HIGH').length,
    };

    return {
      total_scans,
      unique_hostnames,
      average_score,
      total_trackers,
      total_third_parties,
      risk_distribution,
      recent_scans: scans,
    };
  }

  compare(idA: string, idB: string): ScanCompare {
    const scanA = this.getScan(idA) || this.scans[0];
    const scanB = this.getScan(idB) || this.scans[1] || this.scans[0];
    return {
      scan_a: scanA,
      scan_b: scanB,
      score_delta: scanA.overall_score - scanB.overall_score,
      tracker_delta: scanA.tracker_count - scanB.tracker_count,
      third_party_delta: scanA.third_party_count - scanB.third_party_count,
    };
  }

  getUser(): User {
    return { ...this.user };
  }

  updateUser(fullName: string): User {
    this.user.full_name = fullName;
    return { ...this.user };
  }

  getSettings(): UserSettings {
    return { ...this.settings };
  }

  updateSettings(data: Partial<UserSettings>): UserSettings {
    this.settings = { ...this.settings, ...data };
    return { ...this.settings };
  }

  getAllFindings(): Finding[] {
    return this.scans.flatMap((s) => s.findings);
  }

  generateCsvReport(scanId: string): string {
    const scan = this.getScan(scanId);
    if (!scan) return 'Category,Severity,Title,Penalty\n';
    const rows = [
      'Category,Severity,Title,Penalty,Observed',
      ...scan.findings.map(
        (f) =>
          `"${f.category}","${f.severity}","${f.title.replace(/"/g, '""')}",${f.score_penalty},"${f.what_was_observed.replace(/"/g, '""')}"`
      ),
    ];
    return rows.join('\n');
  }
}

export const demoStore = new DemoDataStore();
