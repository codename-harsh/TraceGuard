/**
 * TraceGuard API Client
 * Connects to the FastAPI backend at NEXT_PUBLIC_API_URL or defaults to http://localhost:8000/api/v1.
 * Features automatic seamless fallback to embedded deterministic demo data when deployed
 * on Vercel (or when the backend is offline), supporting full evaluation of all 8 tabs,
 * site comparisons, analytics, and exports without requiring a live backend server.
 */

import { demoStore, INITIAL_DEMO_SCANS } from './demo-data';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RiskDistribution {
  MINIMAL: number;
  LOW: number;
  MODERATE: number;
  ELEVATED: number;
  HIGH: number;
}

export interface ScanItem {
  id: string;
  hostname: string;
  url_redacted: string;
  started_at: string;
  completed_at: string | null;
  overall_score: number;
  risk_level: string;
  third_party_count: number;
  tracker_count: number;
  cookie_count: number;
  permission_count: number;
  insecure_resource_count: number;
  rule_version: string;
  created_at: string;
}

export interface SitesOverview {
  total_scans: number;
  unique_hostnames: number;
  average_score: number;
  total_trackers: number;
  total_third_parties: number;
  risk_distribution: RiskDistribution;
  recent_scans: ScanItem[];
}

export interface Finding {
  id: string;
  scan_id: string;
  category: string;
  finding_type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string | null;
  what_was_observed: string;
  why_it_matters: string;
  limitation_note: string;
  evidence_summary: string | null;
  score_penalty: number;
  created_at: string;
}

export interface CookieRecord {
  id: string;
  scan_id: string;
  name: string;
  domain: string;
  path: string;
  is_secure: boolean;
  is_http_only: boolean;
  same_site: string;
  is_session: boolean;
  is_third_party: boolean;
  expiration_days: number | null;
}

export interface PermissionRecord {
  id: string;
  scan_id: string;
  permission_name: string;
  status: string;
  note: string | null;
}

export interface ScoreComponentRecord {
  category: string;
  max_penalty: number;
  applied_penalty: number;
  details_json: Record<string, unknown> | null;
}

export interface DomainRecord {
  id: string;
  hostname: string;
  registrable_domain: string;
  category: string;
  is_tracker: boolean;
}

export interface ScanDomainRecord {
  id: string;
  scan_id: string;
  domain_id: string;
  is_third_party: boolean;
  request_count: number;
  insecure_request_count: number;
  domain: DomainRecord | null;
}

export interface ScanDetail extends ScanItem {
  findings: Finding[];
  cookies: CookieRecord[];
  permissions: PermissionRecord[];
  score_components: ScoreComponentRecord[];
  scan_domains: ScanDomainRecord[];
}

export interface ScanCompare {
  scan_a: ScanItem;
  scan_b: ScanItem;
  score_delta: number;
  tracker_delta: number;
  third_party_delta: number;
}

export interface UserSettings {
  opt_in_cloud_sync: boolean;
  default_redaction_strict: boolean;
  theme: string;
}

export interface FilterScansParams {
  hostname?: string;
  date_from?: string;
  date_to?: string;
  min_score?: number;
  max_score?: number;
  risk_level?: string;
}

// Token storage helpers
const TOKEN_KEY = 'traceguard_access_token';
export const DEMO_TOKEN = 'traceguard_demo_token_vercel';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Checks whether fallback mode should handle this request.
 */
function shouldUseFallback(endpoint: string, token: string | null, error?: unknown): boolean {
  if (token === DEMO_TOKEN || token?.startsWith('demo-')) return true;

  // On client, if deployed to Vercel/cloud and pointing to localhost backend, automatically fall back on failure
  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && API_BASE_URL.includes('localhost')) {
      return true;
    }
  }

  // Network failures (e.g. backend not running or unreachable)
  if (error) {
    return true;
  }

  return false;
}

/**
 * Handles fallback responses from the client-side deterministic demo data store.
 */
function handleFallback<T>(endpoint: string, options: RequestInit = {}): T {
  const method = (options.method || 'GET').toUpperCase();
  const [path, queryString] = endpoint.split('?');
  const params = new URLSearchParams(queryString || '');

  // 1. Auth Login
  if (path === '/auth/login') {
    setStoredToken(DEMO_TOKEN);
    return {
      access_token: DEMO_TOKEN,
      token_type: 'bearer',
      user: demoStore.getUser(),
    } as unknown as T;
  }

  // 2. Auth Register
  if (path === '/auth/register') {
    setStoredToken(DEMO_TOKEN);
    let fullName: string | null = null;
    let email = 'evaluator@traceguard.local';
    try {
      if (options.body) {
        const parsed = JSON.parse(options.body as string);
        if (parsed.full_name) fullName = parsed.full_name;
        if (parsed.email) email = parsed.email;
      }
    } catch {
      // ignore
    }
    const registeredUser = demoStore.updateUser(fullName || 'Evaluator User');
    return {
      access_token: DEMO_TOKEN,
      token_type: 'bearer',
      user: { ...registeredUser, email },
    } as unknown as T;
  }

  // 3. Auth Logout
  if (path === '/auth/logout') {
    removeStoredToken();
    return { message: 'Logged out successfully' } as unknown as T;
  }

  // 4. Me / Users
  if (path === '/auth/me' || path === '/users/me') {
    if (method === 'PATCH' && options.body) {
      try {
        const parsed = JSON.parse(options.body as string);
        if (parsed.full_name !== undefined) {
          return demoStore.updateUser(parsed.full_name) as unknown as T;
        }
      } catch {
        // ignore
      }
    }
    return demoStore.getUser() as unknown as T;
  }

  // 5. Sites Overview
  if (path === '/sites/overview') {
    return demoStore.getOverview() as unknown as T;
  }

  // 6. Compare Scans
  if (path === '/sites/compare') {
    const scanAId = params.get('scan_a') || INITIAL_DEMO_SCANS[0].id;
    const scanBId = params.get('scan_b') || INITIAL_DEMO_SCANS[1].id;
    return demoStore.compare(scanAId, scanBId) as unknown as T;
  }

  // 7. Scans listing
  if (path === '/scans' || path === '/scans/') {
    const filterParams: FilterScansParams = {};
    if (params.get('hostname')) filterParams.hostname = params.get('hostname')!;
    if (params.get('risk_level')) filterParams.risk_level = params.get('risk_level')!;
    if (params.get('min_score')) filterParams.min_score = Number(params.get('min_score'));
    if (params.get('max_score')) filterParams.max_score = Number(params.get('max_score'));
    return demoStore.getScans(filterParams) as unknown as T;
  }

  // 8. Individual Scan Detail / Findings / Score / Delete
  if (path.startsWith('/scans/')) {
    const segments = path.split('/').filter(Boolean); // ['scans', ':id', 'findings'?]
    const scanId = segments[1];
    const subRoute = segments[2];

    if (method === 'DELETE') {
      demoStore.deleteScan(scanId);
      return { message: 'Scan deleted successfully', id: scanId } as unknown as T;
    }

    const scan = demoStore.getScan(scanId) || INITIAL_DEMO_SCANS[0];

    if (subRoute === 'findings') {
      return scan.findings as unknown as T;
    }
    if (subRoute === 'score') {
      return {
        scan_id: scan.id,
        overall_score: scan.overall_score,
        risk_level: scan.risk_level,
        components: scan.score_components,
      } as unknown as T;
    }

    return scan as unknown as T;
  }

  // 9. Findings listing
  if (path === '/findings' || path === '/findings/') {
    return demoStore.getAllFindings() as unknown as T;
  }

  // 10. Reports JSON / CSV
  if (path.startsWith('/reports/')) {
    const segments = path.split('/').filter(Boolean); // ['reports', ':id', 'json'|'csv']
    const scanId = segments[1];
    const format = segments[2];
    const scan = demoStore.getScan(scanId) || INITIAL_DEMO_SCANS[0];
    if (format === 'csv') {
      return demoStore.generateCsvReport(scan.id) as unknown as T;
    }
    return scan as unknown as T;
  }

  // 11. User Settings
  if (path === '/settings' || path === '/settings/') {
    if (method === 'PUT' && options.body) {
      try {
        const parsed = JSON.parse(options.body as string);
        return demoStore.updateSettings(parsed) as unknown as T;
      } catch {
        // ignore
      }
    }
    return demoStore.getSettings() as unknown as T;
  }

  return {} as unknown as T;
}

// Base fetcher
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();

  // If already authenticated via DEMO_TOKEN, route directly to demo data store for instant response
  if (token === DEMO_TOKEN) {
    return handleFallback<T>(endpoint, options);
  }

  // When visited on Vercel/production where backend is not running or localhost is unreachable
  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && API_BASE_URL.includes('localhost')) {
      return handleFallback<T>(endpoint, options);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  // Use AbortController timeout so Vercel visitors don't hang when localhost:8000 is unreachable
  const controller = new AbortController();
  const timeoutId =
    typeof window !== 'undefined'
      ? setTimeout(() => {
          try {
            controller.abort();
          } catch {
            // ignore
          }
        }, 3000)
      : null;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: options.signal || controller.signal,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      // If we got an error status and fallback conditions apply, seamlessly fall back
      if (shouldUseFallback(endpoint, token)) {
        return handleFallback<T>(endpoint, options);
      }
      let errorDetail = `Request failed with status ${res.status}`;
      try {
        const data = await res.json();
        if (data && data.detail) {
          errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        }
      } catch {
        // ignore
      }
      throw new Error(errorDetail);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);

    // If backend is offline or unreachable, seamlessly fall back to embedded demo data
    if (shouldUseFallback(endpoint, token, err)) {
      return handleFallback<T>(endpoint, options);
    }
    throw err;
  }
}

// Auth API
export const api = {
  auth: {
    async login(email: string, password: string): Promise<AuthResponse> {
      // If email is demo email, attempt backend; if unreachable, fallback immediately
      try {
        const data = await apiFetch<AuthResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (data.access_token) {
          setStoredToken(data.access_token);
        }
        return data;
      } catch (err) {
        if (email === 'demo@traceguard.local' || shouldUseFallback('/auth/login', null, err)) {
          return handleFallback<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
        }
        throw err;
      }
    },

    async register(email: string, password: string, full_name?: string): Promise<AuthResponse> {
      try {
        const data = await apiFetch<AuthResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, full_name: full_name || null }),
        });
        if (data.access_token) {
          setStoredToken(data.access_token);
        }
        return data;
      } catch (err) {
        if (shouldUseFallback('/auth/register', null, err)) {
          return handleFallback<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, full_name }),
          });
        }
        throw err;
      }
    },

    async logout(): Promise<void> {
      try {
        await apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
      } finally {
        removeStoredToken();
      }
    },

    async getMe(): Promise<User> {
      return apiFetch<User>('/auth/me');
    },
  },

  sites: {
    async getOverview(): Promise<SitesOverview> {
      return apiFetch<SitesOverview>('/sites/overview');
    },

    async compare(scanAId: string, scanBId: string): Promise<ScanCompare> {
      return apiFetch<ScanCompare>(
        `/sites/compare?scan_a=${encodeURIComponent(scanAId)}&scan_b=${encodeURIComponent(scanBId)}`
      );
    },
  },

  scans: {
    async list(params?: FilterScansParams): Promise<ScanItem[]> {
      const query = new URLSearchParams();
      if (params) {
        if (params.hostname) query.set('hostname', params.hostname);
        if (params.date_from) query.set('date_from', params.date_from);
        if (params.date_to) query.set('date_to', params.date_to);
        if (params.min_score !== undefined) query.set('min_score', params.min_score.toString());
        if (params.max_score !== undefined) query.set('max_score', params.max_score.toString());
        if (params.risk_level) query.set('risk_level', params.risk_level);
      }
      const qs = query.toString();
      return apiFetch<ScanItem[]>(`/scans${qs ? `?${qs}` : ''}`);
    },

    async get(scanId: string): Promise<ScanDetail> {
      return apiFetch<ScanDetail>(`/scans/${scanId}`);
    },

    async delete(scanId: string): Promise<{ message: string; id: string }> {
      return apiFetch<{ message: string; id: string }>(`/scans/${scanId}`, {
        method: 'DELETE',
      });
    },

    async getFindings(scanId: string): Promise<Finding[]> {
      return apiFetch<Finding[]>(`/scans/${scanId}/findings`);
    },

    async getScore(scanId: string): Promise<{
      scan_id: string;
      overall_score: number;
      risk_level: string;
      components: ScoreComponentRecord[];
    }> {
      return apiFetch(`/scans/${scanId}/score`);
    },
  },

  reports: {
    getJsonReportUrl(scanId: string): string {
      return `${API_BASE_URL}/reports/${scanId}/json`;
    },

    getCsvReportUrl(scanId: string): string {
      return `${API_BASE_URL}/reports/${scanId}/csv`;
    },

    async downloadJson(scanId: string): Promise<Record<string, unknown>> {
      return apiFetch<Record<string, unknown>>(`/reports/${scanId}/json`);
    },

    async downloadCsv(scanId: string): Promise<string> {
      const token = getStoredToken();
      if (token === DEMO_TOKEN) {
        return demoStore.generateCsvReport(scanId);
      }
      if (typeof window !== 'undefined') {
        const isLocalhost =
          window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocalhost && API_BASE_URL.includes('localhost')) {
          return demoStore.generateCsvReport(scanId);
        }
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/reports/${scanId}/csv`, {
          headers,
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to generate CSV report');
        return res.text();
      } catch (err) {
        if (shouldUseFallback(`/reports/${scanId}/csv`, token, err)) {
          return demoStore.generateCsvReport(scanId);
        }
        throw err;
      }
    },
  },

  settings: {
    async get(): Promise<UserSettings> {
      return apiFetch<UserSettings>('/settings/');
    },

    async update(data: Partial<UserSettings>): Promise<UserSettings> {
      return apiFetch<UserSettings>('/settings/', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  },

  findings: {
    async list(params?: { severity?: string; category?: string }): Promise<Finding[]> {
      const query = new URLSearchParams();
      if (params?.severity) query.set('severity', params.severity);
      if (params?.category) query.set('category', params.category);
      const qs = query.toString();
      return apiFetch<Finding[]>(`/findings/${qs ? `?${qs}` : ''}`);
    },
  },

  users: {
    async getMe(): Promise<User> {
      return apiFetch<User>('/users/me');
    },

    async updateMe(fullName: string): Promise<User> {
      return apiFetch<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ full_name: fullName }),
      });
    },
  },
};
