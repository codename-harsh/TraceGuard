/**
 * TraceGuard API Client
 * Connects to the FastAPI backend at NEXT_PUBLIC_API_URL or defaults to http://localhost:8000/api/v1.
 */

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

// Base fetcher
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
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
}

// Auth API
export const api = {
  auth: {
    async login(email: string, password: string): Promise<AuthResponse> {
      const data = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.access_token) {
        setStoredToken(data.access_token);
      }
      return data;
    },

    async register(email: string, password: string, full_name?: string): Promise<AuthResponse> {
      const data = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: full_name || null }),
      });
      if (data.access_token) {
        setStoredToken(data.access_token);
      }
      return data;
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
      return apiFetch<ScanCompare>(`/sites/compare?scan_a=${encodeURIComponent(scanAId)}&scan_b=${encodeURIComponent(scanBId)}`);
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
      return apiFetch<ScanItem[]>(`/scans/${qs ? `?${qs}` : ''}`);
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
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/reports/${scanId}/csv`, {
        headers,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to generate CSV report');
      return res.text();
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
