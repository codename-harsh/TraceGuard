/**
 * FullViewApp.tsx — TraceGuard Full Site Analysis Dashboard
 *
 * 10 sections per spec:
 *  1. Overview          — score, top findings, limitation notice
 *  2. Network           — request table (redacted URLs)
 *  3. Third Parties     — first/third party breakdown
 *  4. Trackers          — by category with rule version
 *  5. Cookies           — metadata table (values never collected)
 *  6. Storage           — localStorage & sessionStorage key counts
 *  7. Permissions       — neutral status indicators
 *  8. Security          — HTTPS, mixed content, cookie flags, redirects
 *  9. Score Breakdown   — transparent penalties + "Why this score?"
 * 10. Timeline          — chronological events with filters
 */

import type {
  CookieMetadata,
  Finding,
  ObservedRequest,
  PermissionFinding,
  ScoreComponent,
  SecurityIndicator,
  StorageIndicator,
  TimelineEvent,
  WebsiteScanPayload,
} from '@traceguard/shared-types';
import { useEffect, useRef, useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RiskBadge, RiskChip } from '../components/RiskBadge';
import { ScoreRing } from '../components/ScoreRing';
import { useTabScan } from '../hooks/useExtension';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const rem = ms % 1000;
  return `${String(s).padStart(2, '0')}:${String(Math.floor(rem / 100)).padStart(2, '0')}.${String(rem % 100).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function truncate(str: string, n: number): string {
  return str.length > n ? `${str.slice(0, n)}…` : str;
}

// ---------------------------------------------------------------------------
// Navigation tabs
// ---------------------------------------------------------------------------

const SECTIONS = [
  'Overview', 'Network', 'Third Parties', 'Trackers',
  'Cookies', 'Storage', 'Permissions', 'Security',
  'Score Breakdown', 'Timeline',
] as const;

type Section = typeof SECTIONS[number];

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-zinc-500 text-sm">{message}</div>
  );
}

// 1. Overview
function OverviewSection({ payload }: { payload: WebsiteScanPayload }) {
  const { scoreSummary, pageDomain, scannedAt, durationMs } = payload;
  const { score, riskLevel, findings } = scoreSummary;

  return (
    <div>
      <SectionHeader
        title="Overview"
        sub="Summary of observed privacy and security signals for this session."
      />

      {/* Score + domain card */}
      <div className="card p-5 flex items-center gap-6 mb-4">
        <ScoreRing score={score} riskLevel={riskLevel} size={100} strokeWidth={8} />
        <div className="flex-1">
          <div className="text-lg font-semibold text-zinc-100 mb-1 font-mono">{pageDomain}</div>
          <RiskBadge riskLevel={riskLevel} className="mb-2" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-500 mt-2">
            <span>Requests: <span className="text-zinc-300">{payload.requests.length}</span></span>
            <span>Cookies: <span className="text-zinc-300">{payload.cookies.length}</span></span>
            <span>Scanned: <span className="text-zinc-300">{new Date(scannedAt).toLocaleTimeString()}</span></span>
            <span>Duration: <span className="text-zinc-300">{durationMs}ms</span></span>
          </div>
        </div>
      </div>

      {/* Limitation notice */}
      <div className="card p-3 mb-4 border-brand/30 bg-brand/5">
        <p className="text-xs text-zinc-400 leading-relaxed">
          <span className="text-brand font-medium">Analysis scope: </span>
          TraceGuard observes metadata only — request URLs (sensitive params redacted), cookie names &amp; flags (never values), DOM indicators, and browser permission states. It cannot determine intent, read encrypted payloads, or access server-side logic.
        </p>
      </div>

      {/* Findings */}
      {findings.length === 0 ? (
        <EmptyState message="No significant privacy or security indicators observed in this session." />
      ) : (
        <div className="space-y-2">
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const severityColors: Record<string, string> = {
    CRITICAL: 'border-risk-high bg-risk-high/5',
    HIGH: 'border-risk-high/60 bg-risk-high/5',
    MEDIUM: 'border-risk-moderate/60 bg-risk-moderate/5',
    LOW: 'border-risk-low/40 bg-risk-low/5',
    INFO: 'border-surface-muted bg-surface-card',
  };
  const severityBadgeColors: Record<string, string> = {
    CRITICAL: 'bg-risk-high/20 text-risk-high',
    HIGH: 'bg-risk-high/15 text-risk-high',
    MEDIUM: 'bg-risk-moderate/15 text-risk-moderate',
    LOW: 'bg-risk-low/15 text-risk-low',
    INFO: 'bg-surface-muted text-zinc-400',
  };

  return (
    <div className={`card border p-3 ${severityColors[finding.severity] ?? 'border-surface-border'}`}>
      <div className="flex items-start gap-2 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <span className={`badge-mono text-2xs mt-0.5 ${severityBadgeColors[finding.severity] ?? ''}`}>
          {finding.severity}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-200">{finding.title}</p>
          {!expanded && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{finding.whatWasObserved}</p>
          )}
        </div>
        <span className="text-zinc-600 text-xs">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-surface-border pt-3">
          <div>
            <p className="text-2xs text-zinc-500 font-mono uppercase tracking-wider mb-1">What was observed</p>
            <p className="text-xs text-zinc-300">{finding.whatWasObserved}</p>
          </div>
          <div>
            <p className="text-2xs text-zinc-500 font-mono uppercase tracking-wider mb-1">Why it matters</p>
            <p className="text-xs text-zinc-300">{finding.whyItMatters}</p>
          </div>
          <div>
            <p className="text-2xs text-zinc-500 font-mono uppercase tracking-wider mb-1">What TraceGuard cannot conclude</p>
            <p className="text-xs text-zinc-400 italic">{finding.whatTraceGuardCannotConclude}</p>
          </div>
          {finding.affectedDomains && finding.affectedDomains.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {finding.affectedDomains.map((d) => (
                <span key={d} className="badge-mono bg-surface-muted text-zinc-400">{d}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 2. Network
function NetworkSection({ requests }: { requests: ObservedRequest[] }) {
  return (
    <div>
      <SectionHeader
        title="Network"
        sub={`${requests.length} observed request${requests.length !== 1 ? 's' : ''}. Sensitive URL parameters are redacted. Request bodies are never captured.`}
      />
      {requests.length === 0 ? (
        <EmptyState message="No network requests observed in this session." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left" aria-label="Observed network requests">
              <thead>
                <tr>
                  <th className="table-header">URL</th>
                  <th className="table-header w-20">Type</th>
                  <th className="table-header w-16">Method</th>
                  <th className="table-header w-16">Status</th>
                  <th className="table-header w-16">HTTPS</th>
                  <th className="table-header w-20">3rd Party</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-border/30 transition-colors">
                    <td className="table-cell font-mono text-2xs max-w-xs">
                      <div className="truncate" title={r.requestUrl}>{truncate(r.requestUrl, 60)}</div>
                      <div className="text-zinc-600">{r.requestDomain}</div>
                    </td>
                    <td className="table-cell">
                      <span className="badge-mono bg-surface-muted text-zinc-400">{r.resourceType}</span>
                    </td>
                    <td className="table-cell font-mono text-2xs text-zinc-400">{r.method}</td>
                    <td className="table-cell font-mono text-2xs">
                      <span className={r.statusCode >= 400 ? 'text-risk-high' : r.statusCode >= 300 ? 'text-risk-moderate' : 'text-risk-minimal'}>
                        {r.statusCode || '—'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={r.isSecure ? 'text-risk-minimal text-xs' : 'text-risk-high text-xs'}>
                        {r.isSecure ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {r.isThirdParty ? (
                        <span className="text-risk-elevated text-xs">3rd</span>
                      ) : (
                        <span className="text-zinc-600 text-xs">1st</span>
                      )}
                      {r.isTracker && (
                        <span className="ml-1 badge-mono bg-risk-high/15 text-risk-high">T</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Third Parties
function ThirdPartiesSection({ requests }: { requests: ObservedRequest[] }) {
  const firstParty = new Set(requests.filter((r) => !r.isThirdParty).map((r) => r.requestDomain));
  const thirdParty = new Map<string, ObservedRequest[]>();
  for (const r of requests.filter((r) => r.isThirdParty)) {
    const list = thirdParty.get(r.requestDomain) ?? [];
    list.push(r);
    thirdParty.set(r.requestDomain, list);
  }

  return (
    <div>
      <SectionHeader
        title="Third-Party Domains"
        sub="Registrable domains (eTLD+1) that received requests from this page. Classified as first or third party relative to the page origin."
      />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <p className="text-2xs font-mono uppercase tracking-wider text-zinc-500 mb-2">First-Party</p>
          <p className="text-2xl font-mono font-bold text-risk-minimal">{firstParty.size}</p>
          <div className="mt-2 space-y-1">
            {[...firstParty].slice(0, 5).map((d) => (
              <div key={d} className="text-xs text-zinc-400 font-mono truncate">{d}</div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <p className="text-2xs font-mono uppercase tracking-wider text-zinc-500 mb-2">Third-Party</p>
          <p className="text-2xl font-mono font-bold text-risk-elevated">{thirdParty.size}</p>
          <div className="mt-2 space-y-1">
            {[...thirdParty.keys()].slice(0, 5).map((d) => (
              <div key={d} className="text-xs text-zinc-400 font-mono truncate">{d}</div>
            ))}
          </div>
        </div>
      </div>
      {thirdParty.size === 0 ? (
        <EmptyState message="No third-party domains observed." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left" aria-label="Third-party domains">
            <thead>
              <tr>
                <th className="table-header">Domain</th>
                <th className="table-header w-20">Requests</th>
                <th className="table-header w-28">Tracker?</th>
              </tr>
            </thead>
            <tbody>
              {[...thirdParty.entries()].map(([domain, reqs]) => {
                const isTracker = reqs.some((r) => r.isTracker);
                const category = reqs.find((r) => r.trackerCategory)?.trackerCategory;
                return (
                  <tr key={domain} className="hover:bg-surface-border/30">
                    <td className="table-cell font-mono text-xs text-zinc-300">{domain}</td>
                    <td className="table-cell text-zinc-400">{reqs.length}</td>
                    <td className="table-cell">
                      {isTracker ? (
                        <span className="badge-mono bg-risk-high/15 text-risk-high">{category ?? 'Tracker'}</span>
                      ) : (
                        <span className="text-zinc-600 text-xs">Not in catalogue</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 4. Trackers
function TrackersSection({ requests }: { requests: ObservedRequest[] }) {
  const trackerMap = new Map<string, { requests: ObservedRequest[]; category: string }>();
  for (const r of requests.filter((r) => r.isTracker)) {
    const existing = trackerMap.get(r.requestDomain);
    if (existing) {
      existing.requests.push(r);
    } else {
      trackerMap.set(r.requestDomain, { requests: [r], category: r.trackerCategory ?? 'Unknown' });
    }
  }

  const byCategory = new Map<string, string[]>();
  for (const [domain, data] of trackerMap.entries()) {
    const list = byCategory.get(data.category) ?? [];
    list.push(domain);
    byCategory.set(data.category, list);
  }

  const ruleVersion = requests.find((r) => r.isTracker)
    ? '1.0.0' // Sourced from tracker-classifier at scan time
    : null;

  return (
    <div>
      <SectionHeader
        title="Tracking Indicators"
        sub="Domains classified against TraceGuard's tracker catalogue. Classification is based on publicly documented tracking infrastructure — it does not confirm active data collection."
      />
      {ruleVersion && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xs font-mono text-zinc-500">Rule set version:</span>
          <span className="badge-mono bg-surface-muted text-zinc-400">{ruleVersion}</span>
        </div>
      )}
      {trackerMap.size === 0 ? (
        <EmptyState message="No domains matching the tracker catalogue observed in this session." />
      ) : (
        <div className="space-y-4">
          {[...byCategory.entries()].map(([category, domains]) => (
            <div key={category} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-mono bg-risk-high/15 text-risk-high">{category}</span>
                <span className="text-xs text-zinc-500">{domains.length} domain{domains.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-1">
                {domains.map((d) => {
                  const reqs = trackerMap.get(d)?.requests ?? [];
                  return (
                    <div key={d} className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-300">{d}</span>
                      <span className="text-2xs text-zinc-500">{reqs.length} req{reqs.length > 1 ? 's' : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 5. Cookies
function CookiesSection({ cookies }: { cookies: CookieMetadata[] }) {
  return (
    <div>
      <SectionHeader
        title="Cookies"
        sub="Cookie metadata observed via the browser cookie API. Cookie values are never collected, stored, or displayed — by design."
      />
      <div className="card p-3 mb-4 border-brand/20 bg-brand/5">
        <p className="text-xs text-zinc-400">
          <span className="font-medium text-brand">Privacy note: </span>
          Cookie values (.value) are permanently discarded at collection time. This table shows metadata attributes only.
        </p>
      </div>
      {cookies.length === 0 ? (
        <EmptyState message="No cookies observed for this site." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left" aria-label="Cookie metadata">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Domain</th>
                  <th className="table-header w-16">Secure</th>
                  <th className="table-header w-20">HttpOnly</th>
                  <th className="table-header w-24">SameSite</th>
                  <th className="table-header w-20">Session?</th>
                  <th className="table-header w-20">3rd Party</th>
                </tr>
              </thead>
              <tbody>
                {cookies.map((c, i) => (
                  <tr key={`${c.name}-${i}`} className="hover:bg-surface-border/30">
                    <td className="table-cell font-mono text-xs">{c.name}</td>
                    <td className="table-cell font-mono text-2xs text-zinc-400">{c.domain}</td>
                    <td className="table-cell">
                      <span className={c.secure ? 'text-risk-minimal text-xs' : 'text-risk-high text-xs'}>{c.secure ? '✓' : '✗'}</span>
                    </td>
                    <td className="table-cell">
                      <span className={c.httpOnly ? 'text-risk-minimal text-xs' : 'text-risk-moderate text-xs'}>{c.httpOnly ? '✓' : '✗'}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge-mono text-2xs ${c.sameSite === 'None' ? 'bg-risk-high/15 text-risk-high' : 'bg-surface-muted text-zinc-400'}`}>
                        {c.sameSite}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-zinc-400">{c.isPersistent ? 'Persistent' : 'Session'}</td>
                    <td className="table-cell">
                      {c.isThirdParty ? (
                        <span className="text-risk-elevated text-xs">3rd party</span>
                      ) : (
                        <span className="text-zinc-600 text-xs">1st party</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// 6. Storage
function StorageSection({ storageIndicators, payload }: { storageIndicators: StorageIndicator[]; payload: WebsiteScanPayload }) {
  // Extract storage info from payload
  const lsIndicator = storageIndicators.find((s) => s.type === 'localStorage');
  const ssIndicator = storageIndicators.find((s) => s.type === 'sessionStorage');

  return (
    <div>
      <SectionHeader
        title="Browser Storage"
        sub="localStorage and sessionStorage access indicators. Key names are observed only for byte-count estimation — values are never read or stored."
      />
      <div className="card p-3 mb-4 border-brand/20 bg-brand/5">
        <p className="text-xs text-zinc-400">
          <span className="font-medium text-brand">Privacy note: </span>
          TraceGuard never reads stored values. Only key counts and approximate key name byte footprints are observed.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-2xs font-mono uppercase tracking-wider text-zinc-500 mb-3">localStorage</p>
          {lsIndicator ? (
            <>
              <p className="text-2xl font-mono font-bold text-zinc-100">Active</p>
              <p className="text-xs text-zinc-500 mt-1">Storage access detected</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-mono font-bold text-zinc-600">—</p>
              <p className="text-xs text-zinc-600 mt-1">No access observed</p>
            </>
          )}
        </div>
        <div className="card p-4">
          <p className="text-2xs font-mono uppercase tracking-wider text-zinc-500 mb-3">sessionStorage</p>
          {ssIndicator ? (
            <>
              <p className="text-2xl font-mono font-bold text-zinc-100">Active</p>
              <p className="text-xs text-zinc-500 mt-1">Storage access detected</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-mono font-bold text-zinc-600">—</p>
              <p className="text-xs text-zinc-600 mt-1">No access observed</p>
            </>
          )}
        </div>
      </div>
      {storageIndicators.length === 0 && (
        <div className="mt-4">
          <EmptyState message="No browser storage access indicators observed in this session." />
        </div>
      )}
    </div>
  );
}

// 7. Permissions
function PermissionsSection({ permissions }: { permissions: PermissionFinding[] }) {
  const stateLabel: Record<string, string> = {
    granted: 'Allowed',
    prompt: 'Ask',
    denied: 'Blocked',
    unknown: 'Not detected',
  };
  const stateColor: Record<string, string> = {
    granted: 'text-risk-elevated',
    prompt: 'text-risk-moderate',
    denied: 'text-risk-minimal',
    unknown: 'text-zinc-500',
  };

  const allPermissions: PermissionFinding[] = permissions.length > 0 ? permissions : [
    { permission: 'geolocation', state: 'unknown', domain: '' },
    { permission: 'notifications', state: 'unknown', domain: '' },
    { permission: 'camera', state: 'unknown', domain: '' },
    { permission: 'microphone', state: 'unknown', domain: '' },
    { permission: 'clipboard-read', state: 'unknown', domain: '' },
  ];

  return (
    <div>
      <SectionHeader
        title="Browser Permissions"
        sub="Observable browser permission states for this origin. Queried via the Permissions API — TraceGuard cannot observe permissions the browser does not expose."
      />
      <div className="card p-4">
        <div className="space-y-3">
          {allPermissions.map((p) => (
            <div key={p.permission} className="flex items-center justify-between">
              <span className="font-mono text-sm text-zinc-300 capitalize">{p.permission}</span>
              <span className={`badge-mono ${stateColor[p.state]} bg-surface-border`}>
                {stateLabel[p.state] ?? 'Not detected'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 8. Security Indicators
function SecuritySection({ payload }: { payload: WebsiteScanPayload }) {
  const { requests, cookies, securityIndicators } = payload;
  const isHttps = requests.length > 0 ? requests.some((r) => r.pageUrl.startsWith('https://')) : false;
  const mixedContent = securityIndicators.some((s) => s.type === 'mixed-content');
  const insecureCount = requests.filter((r) => !r.isSecure).length;

  const misconfigCookies = cookies.filter((c) => !c.httpOnly || !c.secure || c.sameSite === 'None');
  const redirectCount = requests.filter((r) => r.statusCode >= 300 && r.statusCode < 400).length;

  const checks = [
    {
      id: 'https-status',
      label: 'HTTPS Protocol',
      status: isHttps ? 'good' : 'concern',
      detail: isHttps ? 'Page loaded over HTTPS' : 'Page loaded over unencrypted HTTP',
    },
    {
      id: 'mixed-content',
      label: 'Mixed Content',
      status: mixedContent ? 'concern' : 'good',
      detail: mixedContent
        ? 'HTTP subresources detected in page DOM'
        : 'No mixed-content indicators observed',
    },
    {
      id: 'insecure-requests',
      label: 'Insecure Requests',
      status: insecureCount > 0 ? 'concern' : 'good',
      detail: insecureCount > 0
        ? `${insecureCount} request${insecureCount > 1 ? 's' : ''} over HTTP observed`
        : 'All observed requests used HTTPS',
    },
    {
      id: 'cookie-flags',
      label: 'Cookie Flag Hygiene',
      status: misconfigCookies.length > 0 ? 'info' : 'good',
      detail: misconfigCookies.length > 0
        ? `${misconfigCookies.length} cookie${misconfigCookies.length > 1 ? 's' : ''} missing HttpOnly, Secure, or restrictive SameSite`
        : 'All observed cookies have recommended security flags',
    },
    {
      id: 'redirects',
      label: 'Redirects',
      status: redirectCount > 3 ? 'info' : 'good',
      detail: redirectCount > 0
        ? `${redirectCount} redirect response${redirectCount > 1 ? 's' : ''} observed`
        : 'No redirect chains observed',
    },
  ] as const;

  return (
    <div>
      <SectionHeader
        title="Security Indicators"
        sub="Observable security signal checks based on network metadata and DOM analysis."
      />
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.id} className="card p-3 flex items-start gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${
              check.status === 'good' ? 'bg-risk-minimal/20 text-risk-minimal' :
              check.status === 'concern' ? 'bg-risk-high/20 text-risk-high' :
              'bg-risk-moderate/20 text-risk-moderate'
            }`}>
              {check.status === 'good' ? '✓' : check.status === 'concern' ? '!' : 'i'}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">{check.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
      {securityIndicators.length > 0 && (
        <div className="mt-4 space-y-2">
          {securityIndicators.map((si, i) => (
            <div key={i} className="card p-3 border-risk-moderate/30">
              <span className="badge-mono bg-risk-moderate/15 text-risk-moderate mr-2">
                {si.type}
              </span>
              <span className="text-xs text-zinc-400">{si.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 9. Score Breakdown
function ScoreBreakdownSection({ components }: { components: ScoreComponent[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <SectionHeader
        title="Score Breakdown"
        sub="Score starts at 100. Penalties are subtracted per category based on observed indicators. Each category is capped at its maximum penalty."
      />
      <div className="card p-3 mb-4 border-brand/20 bg-brand/5">
        <p className="text-xs text-zinc-400">
          <span className="font-medium text-brand">Why this score? </span>
          The score reflects observed technical indicators — not intent or actual privacy harm. A lower score means more signals were observed that warrant review, not that the site is intentionally harmful.
        </p>
      </div>
      <div className="space-y-2">
        {components.map((c) => {
          const pct = c.maxPenalty > 0 ? (c.penalty / c.maxPenalty) * 100 : 0;
          const barColor = c.penalty === 0 ? 'bg-risk-minimal' :
            pct >= 75 ? 'bg-risk-high' :
            pct >= 40 ? 'bg-risk-elevated' : 'bg-risk-moderate';
          const isExpanded = expandedId === c.category;

          return (
            <div key={c.category} className="card p-3">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : c.category)}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-200">{c.category}</span>
                    <span className="font-mono text-sm text-zinc-300">
                      <span className={c.penalty > 0 ? 'text-risk-high' : 'text-risk-minimal'}>
                        -{c.penalty}
                      </span>
                      <span className="text-zinc-600"> / -{c.maxPenalty}</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${Math.max(1, pct)}%` }}
                    />
                  </div>
                </div>
                <span className="text-zinc-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </div>
              {isExpanded && (
                <p className="text-xs text-zinc-400 mt-2 pt-2 border-t border-surface-border">{c.rationale}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 10. Timeline
type TimelineFilter = 'All' | 'First Party' | 'Third Party' | 'Trackers' | 'Cookies' | 'Security';
const TIMELINE_FILTERS: TimelineFilter[] = ['All', 'First Party', 'Third Party', 'Trackers', 'Cookies', 'Security'];

function TimelineSection({ events }: { events: TimelineEvent[] }) {
  const [filter, setFilter] = useState<TimelineFilter>('All');

  const startTime = events.length > 0 ? (events[0]?.observedAt ?? Date.now()) : Date.now();

  const filtered = events.filter((e) => {
    if (filter === 'All') return true;
    if (filter === 'First Party') return !e.isThirdParty;
    if (filter === 'Third Party') return e.isThirdParty;
    if (filter === 'Trackers') return e.isTracker;
    if (filter === 'Cookies') return e.type === 'cookie';
    if (filter === 'Security') return e.type === 'security';
    return true;
  });

  const typeColors: Record<string, string> = {
    request: 'bg-brand/20 text-brand',
    cookie: 'bg-risk-moderate/20 text-risk-moderate',
    storage: 'bg-risk-low/20 text-risk-low',
    permission: 'bg-risk-elevated/20 text-risk-elevated',
    security: 'bg-risk-high/20 text-risk-high',
  };

  return (
    <div>
      <SectionHeader
        title="Activity Timeline"
        sub="Chronological sequence of observed page activity. Timestamps are relative to the first observed event."
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TIMELINE_FILTERS.map((f) => (
          <button
            key={f}
            id={`timeline-filter-${f.toLowerCase().replace(' ', '-')}`}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-brand text-white'
                : 'bg-surface-border text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={`No events matching "${filter}" filter.`} />
      ) : (
        <div className="space-y-1">
          {filtered.map((e) => (
            <div key={e.id} className="flex items-start gap-3 card p-2 hover:border-surface-muted transition-colors">
              <span className="font-mono text-2xs text-zinc-600 w-16 flex-shrink-0 pt-0.5">
                {formatMs(e.observedAt - startTime)}
              </span>
              <span className={`badge-mono text-2xs w-16 flex-shrink-0 ${typeColors[e.type] ?? 'bg-surface-muted text-zinc-400'}`}>
                {e.type}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-mono text-xs text-zinc-300 truncate block">{e.domain || '—'}</span>
                <span className="text-2xs text-zinc-500 truncate block">{e.label}</span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {e.isThirdParty && (
                  <span className="badge-mono bg-surface-border text-zinc-500">3P</span>
                )}
                {e.isTracker && (
                  <span className="badge-mono bg-risk-high/15 text-risk-high">T</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FullViewApp
// ---------------------------------------------------------------------------

function FullViewContent({ payload }: { payload: WebsiteScanPayload }) {
  const [activeSection, setActiveSection] = useState<Section>('Overview');
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSectionChange = (s: Section) => {
    setActiveSection(s);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar nav */}
      <nav className="w-44 flex-shrink-0 bg-surface-card border-r border-surface-border flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-surface-border">
          <div className="font-mono text-xs font-bold tracking-widest text-zinc-200 uppercase">TraceGuard</div>
          <div className="font-mono text-2xs text-zinc-600 mt-0.5 truncate">{payload.pageDomain}</div>
        </div>

        {/* Score summary */}
        <div className="px-4 py-3 border-b border-surface-border flex flex-col items-center gap-1">
          <ScoreRing score={payload.scoreSummary.score} riskLevel={payload.scoreSummary.riskLevel} size={64} strokeWidth={5} />
          <RiskChip riskLevel={payload.scoreSummary.riskLevel} className="mt-1" />
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map((s) => (
            <button
              key={s}
              id={`nav-${s.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleSectionChange(s)}
              className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                activeSection === s
                  ? 'text-zinc-100 bg-brand/20 border-r-2 border-brand font-medium'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-border'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-surface-border">
          <p className="text-2xs text-zinc-600 leading-relaxed">
            Analysis runs locally. No data transmitted by default.
          </p>
        </div>
      </nav>

      {/* Content */}
      <main ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 animate-fade-in">
          {activeSection === 'Overview' && <OverviewSection payload={payload} />}
          {activeSection === 'Network' && <NetworkSection requests={payload.requests} />}
          {activeSection === 'Third Parties' && <ThirdPartiesSection requests={payload.requests} />}
          {activeSection === 'Trackers' && <TrackersSection requests={payload.requests} />}
          {activeSection === 'Cookies' && <CookiesSection cookies={payload.cookies} />}
          {activeSection === 'Storage' && <StorageSection storageIndicators={payload.storageIndicators} payload={payload} />}
          {activeSection === 'Permissions' && <PermissionsSection permissions={payload.permissionFindings} />}
          {activeSection === 'Security' && <SecuritySection payload={payload} />}
          {activeSection === 'Score Breakdown' && <ScoreBreakdownSection components={payload.scoreSummary.components} />}
          {activeSection === 'Timeline' && <TimelineSection events={payload.timeline} />}
        </div>
      </main>
    </div>
  );
}

export function FullViewApp() {
  const { state, loading } = useTabScan();
  const isExtensionContext = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

  if (!isExtensionContext) {
    // Standalone preview
    return <FullViewContent payload={FULLVIEW_PREVIEW_PAYLOAD} />;
  }

  if (loading || state?.status === 'scanning') {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size={36} className="text-brand" />
          <p className="text-sm text-zinc-400">Loading analysis…</p>
        </div>
      </div>
    );
  }

  if (!state?.payload || state.status !== 'complete') {
    return (
      <div className="flex items-center justify-center h-screen bg-surface text-center px-8">
        <div>
          <p className="text-zinc-300 font-medium mb-2">No scan data available</p>
          <p className="text-zinc-500 text-sm">Open a website and scan it from the TraceGuard popup first.</p>
        </div>
      </div>
    );
  }

  return <FullViewContent payload={state.payload} />;
}

// ---------------------------------------------------------------------------
// Preview payload for standalone inspection
// ---------------------------------------------------------------------------

const FULLVIEW_PREVIEW_PAYLOAD: WebsiteScanPayload = {
  pageUrl: 'https://example.com/',
  pageDomain: 'example.com',
  scoreSummary: {
    score: 65,
    riskLevel: 'MODERATE',
    components: [
      { category: 'Trackers', penalty: 10, maxPenalty: 25, rationale: '2 distinct potential tracking domains observed across 4 requests.' },
      { category: 'Insecure Transport', penalty: 0, maxPenalty: 25, rationale: 'All observed subresources used HTTPS.' },
      { category: 'Third-Party Cookies', penalty: 8, maxPenalty: 15, rationale: '3 third-party persistent cookies observed.' },
      { category: 'Third-Party Concentration', penalty: 7, maxPenalty: 10, rationale: '62% of observed requests (8 of 13) are third-party.' },
      { category: 'Cookie Configuration', penalty: 6, maxPenalty: 10, rationale: '3 cookies observed without recommended security flags.' },
      { category: 'Privacy Permissions', penalty: 0, maxPenalty: 10, rationale: 'No privacy-sensitive permissions observed as granted.' },
      { category: 'Storage & Other', penalty: 4, maxPenalty: 5, rationale: '5 browser storage access indicators observed.' },
    ],
    findings: [
      { id: 'f1', title: 'Potential tracking services detected', severity: 'MEDIUM', whatWasObserved: '2 domains in the tracker catalogue: doubleclick.net, google-analytics.com.', whyItMatters: 'These domains are commonly used for cross-site behavioral profiling.', whatTraceGuardCannotConclude: 'TraceGuard cannot determine what data was collected.', affectedDomains: ['doubleclick.net', 'google-analytics.com'] },
      { id: 'f2', title: 'Third-party persistent cookies observed', severity: 'MEDIUM', whatWasObserved: '3 persistent cookies set by third-party domains.', whyItMatters: 'Persistent third-party cookies may enable cross-site identification.', whatTraceGuardCannotConclude: 'TraceGuard cannot determine whether cookies are used for tracking or functional purposes.' },
      { id: 'f3', title: 'High third-party request concentration', severity: 'MEDIUM', whatWasObserved: '62% of observed network requests originated from third-party domains.', whyItMatters: 'Increases the number of services that receive visit metadata.', whatTraceGuardCannotConclude: 'TraceGuard cannot determine whether third-party requests are essential for functionality.' },
    ],
  },
  requests: [
    { id: 'r1', pageUrl: 'https://example.com/', requestUrl: 'https://example.com/', requestDomain: 'example.com', method: 'GET', resourceType: 'main_frame', statusCode: 200, isThirdParty: false, isSecure: true, observedAt: Date.now() - 5000 },
    { id: 'r2', pageUrl: 'https://example.com/', requestUrl: 'https://example.com/static/main.js', requestDomain: 'example.com', method: 'GET', resourceType: 'script', statusCode: 200, isThirdParty: false, isSecure: true, observedAt: Date.now() - 4800 },
    { id: 'r3', pageUrl: 'https://example.com/', requestUrl: 'https://example.com/static/styles.css', requestDomain: 'example.com', method: 'GET', resourceType: 'stylesheet', statusCode: 200, isThirdParty: false, isSecure: true, observedAt: Date.now() - 4600 },
    { id: 'r4', pageUrl: 'https://example.com/', requestUrl: 'https://doubleclick.net/pixel?id=12345', requestDomain: 'doubleclick.net', method: 'GET', resourceType: 'image', statusCode: 200, isThirdParty: true, isSecure: true, isTracker: true, trackerCategory: 'Advertising', observedAt: Date.now() - 4000 },
    { id: 'r5', pageUrl: 'https://example.com/', requestUrl: 'https://google-analytics.com/collect', requestDomain: 'google-analytics.com', method: 'POST', resourceType: 'xmlhttprequest', statusCode: 204, isThirdParty: true, isSecure: true, isTracker: true, trackerCategory: 'Analytics', observedAt: Date.now() - 3500 },
    { id: 'r6', pageUrl: 'https://example.com/', requestUrl: 'https://fonts.googleapis.com/css2', requestDomain: 'googleapis.com', method: 'GET', resourceType: 'stylesheet', statusCode: 200, isThirdParty: true, isSecure: true, observedAt: Date.now() - 3000 },
    { id: 'r7', pageUrl: 'https://example.com/', requestUrl: 'https://cdn.example-cdn.com/library.min.js', requestDomain: 'example-cdn.com', method: 'GET', resourceType: 'script', statusCode: 200, isThirdParty: true, isSecure: true, observedAt: Date.now() - 2500 },
  ],
  cookies: [
    { name: '_ga', domain: '.google-analytics.com', path: '/', httpOnly: false, secure: true, sameSite: 'Lax', isPersistent: true, expiresAt: Date.now() + 86400000 * 730, isThirdParty: true, sourceDomain: 'google-analytics.com' },
    { name: '_gid', domain: '.google-analytics.com', path: '/', httpOnly: false, secure: true, sameSite: 'Lax', isPersistent: true, expiresAt: Date.now() + 86400000, isThirdParty: true, sourceDomain: 'google-analytics.com' },
    { name: 'IDE', domain: '.doubleclick.net', path: '/', httpOnly: false, secure: true, sameSite: 'None', isPersistent: true, expiresAt: Date.now() + 86400000 * 365, isThirdParty: true, sourceDomain: 'doubleclick.net' },
    { name: 'session_id', domain: 'example.com', path: '/', httpOnly: true, secure: true, sameSite: 'Strict', isPersistent: false, isThirdParty: false, sourceDomain: 'example.com' },
    { name: 'csrf_token', domain: 'example.com', path: '/', httpOnly: false, secure: true, sameSite: 'Strict', isPersistent: false, isThirdParty: false, sourceDomain: 'example.com' },
  ],
  storageIndicators: [
    { type: 'localStorage', domain: 'example.com', observedAt: Date.now() - 4500 },
    { type: 'sessionStorage', domain: 'example.com', observedAt: Date.now() - 4400 },
  ],
  permissionFindings: [
    { permission: 'geolocation', state: 'unknown', domain: 'example.com' },
    { permission: 'notifications', state: 'denied', domain: 'example.com' },
    { permission: 'camera', state: 'unknown', domain: 'example.com' },
    { permission: 'microphone', state: 'unknown', domain: 'example.com' },
    { permission: 'clipboard-read', state: 'unknown', domain: 'example.com' },
  ],
  securityIndicators: [],
  timeline: [
    { id: 'e1', type: 'request', domain: 'example.com', label: 'GET main_frame', isThirdParty: false, observedAt: Date.now() - 5000 },
    { id: 'e2', type: 'storage', domain: 'example.com', label: 'localStorage', isThirdParty: false, observedAt: Date.now() - 4500 },
    { id: 'e3', type: 'request', domain: 'doubleclick.net', label: 'GET image', isThirdParty: true, isTracker: true, observedAt: Date.now() - 4000 },
    { id: 'e4', type: 'request', domain: 'google-analytics.com', label: 'POST xmlhttprequest', isThirdParty: true, isTracker: true, observedAt: Date.now() - 3500 },
    { id: 'e5', type: 'cookie', domain: 'google-analytics.com', label: 'Cookie: _ga', isThirdParty: true, observedAt: Date.now() - 3000 },
    { id: 'e6', type: 'cookie', domain: 'doubleclick.net', label: 'Cookie: IDE', isThirdParty: true, observedAt: Date.now() - 2500 },
    { id: 'e7', type: 'permission', domain: 'example.com', label: 'notifications: denied', isThirdParty: false, observedAt: Date.now() - 2000 },
  ],
  scannedAt: new Date().toISOString(),
  durationMs: 3241,
};
