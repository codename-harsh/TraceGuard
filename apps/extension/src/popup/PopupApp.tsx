/**
 * PopupApp.tsx — TraceGuard Extension Popup UI
 *
 * Compact 380px professional browser security interface.
 * Strict GEMINI.md rules:
 *   - Never "SAFE" / "UNSAFE" / "malicious"
 *   - Neutral analytical phrasing throughout
 *   - All metrics from real scan data
 */

import type { WebsiteScanPayload } from '@traceguard/shared-types';
import { useState } from 'react';
import { LoadingSpinner, ScanningState } from '../components/LoadingSpinner';
import { RiskChip } from '../components/RiskBadge';
import { ScoreRingCompact } from '../components/ScoreRing';
import { useTabScan } from '../hooks/useExtension';

// ---------------------------------------------------------------------------
// Icons (inline SVG — no external image requests in popup)
// ---------------------------------------------------------------------------

function IconGlobe({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconShield({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconCookie({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" />
    </svg>
  );
}

function IconLock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconAlertTriangle({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconActivity({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconRefresh({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconExternalLink({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconSave({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Metric cards
// ---------------------------------------------------------------------------

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

function MetricCard({ icon, label, value, sub, accent = 'text-zinc-100' }: MetricCardProps) {
  return (
    <div className="metric-card cursor-default">
      <div className="flex items-center gap-1.5 text-zinc-500">
        {icon}
        <span className="text-2xs font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-mono font-bold text-lg leading-none ${accent}`}>{value}</div>
      {sub && <div className="text-2xs text-zinc-500 truncate">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Restricted-page fallback
// ---------------------------------------------------------------------------

function RestrictedPageState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-surface-border flex items-center justify-center text-zinc-400">
        <IconShield size={20} />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">Analysis not available</p>
        <p className="text-xs text-zinc-500 mt-1">
          TraceGuard cannot analyse browser internal pages (chrome://, extensions://, etc.).
          Navigate to an http or https website.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main scan result view
// ---------------------------------------------------------------------------

interface ScanResultProps {
  payload: WebsiteScanPayload;
  tabId: number;
  onRescan: () => void;
  onSave: () => Promise<string>;
}

function ScanResult({ payload, tabId, onRescan, onSave }: ScanResultProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [isRescanning, setIsRescanning] = useState(false);

  const { scoreSummary, pageDomain, requests, cookies, permissionFindings, securityIndicators } = payload;
  const { score, riskLevel } = scoreSummary;

  // Compute metrics
  const thirdPartyDomains = new Set(
    requests.filter((r) => r.isThirdParty).map((r) => r.requestDomain),
  ).size;

  const trackerCount = new Set(
    requests.filter((r) => r.isTracker).map((r) => r.requestDomain),
  ).size;

  const cookieCount = cookies.length;

  const grantedPerms = permissionFindings.filter((p) => p.state === 'granted').length;

  const insecureCount = requests.filter((r) => !r.isSecure).length +
    securityIndicators.filter((s) => s.type === 'mixed-content').length;

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const msg = await onSave();
      setSaveStatus('saved');
      setSaveMsg(msg);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    onRescan();
    setTimeout(() => setIsRescanning(false), 2000);
  };

  const openFullView = () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL(`fullview.html?tabId=${tabId}`),
    });
  };

  return (
    <div className="flex flex-col animate-fade-in">
      {/* Score section */}
      <div className="flex items-center gap-4 p-4 border-b border-surface-border">
        <ScoreRingCompact score={score} riskLevel={riskLevel} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <IconGlobe size={11} />
            <span className="font-mono text-xs text-zinc-400 truncate">{pageDomain}</span>
          </div>
          <div className="mb-2">
            <RiskChip riskLevel={riskLevel} />
          </div>
          <p className="text-2xs text-zinc-500 leading-relaxed">
            {scoreSummary.findings.length > 0
              ? `${scoreSummary.findings.length} observation${scoreSummary.findings.length > 1 ? 's' : ''} recorded`
              : 'No significant indicators observed'}
          </p>
        </div>
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 gap-1.5 p-3 border-b border-surface-border">
        <MetricCard
          icon={<IconGlobe />}
          label="Third-Party Domains"
          value={thirdPartyDomains}
          sub={thirdPartyDomains > 0 ? 'Third-party domain detected' : 'First-party only'}
          accent={thirdPartyDomains > 5 ? 'text-risk-elevated' : 'text-zinc-100'}
        />
        <MetricCard
          icon={<IconActivity />}
          label="Tracking Indicators"
          value={trackerCount}
          sub={trackerCount > 0 ? 'Potential tracking service' : 'None observed'}
          accent={trackerCount > 0 ? 'text-risk-moderate' : 'text-zinc-100'}
        />
        <MetricCard
          icon={<IconCookie />}
          label="Cookies"
          value={cookieCount}
          sub={`${cookies.filter((c) => c.isThirdParty).length} third-party`}
          accent="text-zinc-100"
        />
        <MetricCard
          icon={<IconLock />}
          label="Permissions"
          value={grantedPerms}
          sub={grantedPerms > 0 ? 'Allowed' : 'None granted'}
          accent={grantedPerms > 0 ? 'text-risk-elevated' : 'text-zinc-100'}
        />
        <div className="col-span-2">
          <MetricCard
            icon={<IconAlertTriangle />}
            label="Insecure Resources"
            value={insecureCount}
            sub={insecureCount > 0 ? 'Review recommended' : 'All resources secure'}
            accent={insecureCount > 0 ? 'text-risk-high' : 'text-zinc-100'}
          />
        </div>
      </div>

      {/* Save status message */}
      {saveStatus !== 'idle' && (
        <div className={`px-3 py-2 text-xs border-b border-surface-border ${
          saveStatus === 'saved' ? 'text-risk-minimal bg-risk-minimal/10' :
          saveStatus === 'error' ? 'text-risk-high bg-risk-high/10' :
          'text-zinc-400'
        }`}>
          {saveStatus === 'saving' && 'Saving scan…'}
          {saveStatus === 'saved' && `✓ ${saveMsg}`}
          {saveStatus === 'error' && `✗ ${saveMsg}`}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 p-3">
        <button
          id="btn-full-view"
          className="btn-primary flex-1 text-xs"
          onClick={openFullView}
        >
          <IconExternalLink size={13} />
          Full Analysis
        </button>
        <button
          id="btn-save-scan"
          className="btn-secondary text-xs px-2.5"
          onClick={() => void handleSave()}
          disabled={saveStatus === 'saving'}
          title="Save scan to backend (requires account)"
        >
          {saveStatus === 'saving' ? <LoadingSpinner size={13} /> : <IconSave size={13} />}
        </button>
        <button
          id="btn-rescan"
          className="btn-secondary text-xs px-2.5"
          onClick={() => void handleRescan()}
          disabled={isRescanning}
          title="Scan again"
        >
          <IconRefresh size={13} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 text-center">
      <div className="w-10 h-10 rounded-full bg-risk-high/20 flex items-center justify-center text-risk-high">
        <IconAlertTriangle size={20} />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-300">Analysis error</p>
        <p className="text-xs text-zinc-500 mt-1 break-words">{error}</p>
      </div>
      <button id="btn-retry-scan" className="btn-secondary text-xs" onClick={onRetry}>
        <IconRefresh size={13} />
        Try again
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Idle state
// ---------------------------------------------------------------------------

function IdleState({ onScan }: { onScan: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center text-brand">
        <IconShield size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-200">Ready to analyse</p>
        <p className="text-xs text-zinc-500 mt-1">
          Scan this page to see what it does behind the scenes.
        </p>
      </div>
      <button id="btn-start-scan" className="btn-primary text-sm" onClick={onScan}>
        <IconActivity size={14} />
        Scan This Page
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root PopupApp
// ---------------------------------------------------------------------------

export function PopupApp() {
  const { tabId, state, loading, error, rescan, saveScan } = useTabScan();

  // Determine if Chrome extension context is available
  const isExtensionContext = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

  return (
    <div
      className="bg-surface flex flex-col"
      style={{ width: 380, minHeight: 200, maxHeight: 600 }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-card">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-brand/20 flex items-center justify-center">
            <IconShield size={12} />
          </div>
          <span className="font-mono text-xs font-bold tracking-widest text-zinc-200 uppercase">
            TraceGuard
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {state?.payload && (
            <span className="text-2xs font-mono text-zinc-600">
              {state.payload.pageDomain}
            </span>
          )}
          {/* Scanning pulse */}
          {(state?.status === 'scanning' || loading) && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-dot" />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!isExtensionContext ? (
          // Standalone preview mode (opened directly in browser, not as extension popup)
          <ScanResult
            tabId={0}
            payload={PREVIEW_PAYLOAD}
            onRescan={() => {/* preview no-op */}}
            onSave={async () => 'Preview mode — no backend call made.'}
          />
        ) : loading && !state ? (
          <ScanningState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void rescan()} />
        ) : state?.status === 'scanning' ? (
          <ScanningState />
        ) : state?.status === 'error' ? (
          <ErrorState error={state.error ?? 'Unknown error'} onRetry={() => void rescan()} />
        ) : state?.status === 'complete' && state.payload ? (
          <ScanResult
            tabId={tabId ?? 0}
            payload={state.payload}
            onRescan={() => void rescan()}
            onSave={saveScan}
          />
        ) : state?.status === 'idle' || !state ? (
          state?.error === 'Analysis not available for this page type (e.g. browser internal pages).' ? (
            <RestrictedPageState />
          ) : (
            <IdleState onScan={() => void rescan()} />
          )
        ) : (
          <IdleState onScan={() => void rescan()} />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-surface-border bg-surface-card flex items-center justify-between">
        <span className="text-2xs text-zinc-600 font-mono">
          Analysis is local — no data leaves your browser by default
        </span>
        <a
          href={chrome?.runtime?.getURL?.('options.html') ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="text-2xs text-zinc-500 hover:text-zinc-300 transition-colors"
          onClick={(e) => {
            if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
              e.preventDefault();
              chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
            }
          }}
        >
          Settings
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview payload for standalone inspection
// ---------------------------------------------------------------------------

const PREVIEW_PAYLOAD: WebsiteScanPayload = {
  pageUrl: 'https://example.com/',
  pageDomain: 'example.com',
  scoreSummary: {
    score: 72,
    riskLevel: 'MODERATE',
    components: [
      { category: 'Trackers', penalty: 10, maxPenalty: 25, rationale: '2 distinct potential tracking domains observed.' },
      { category: 'Insecure Transport', penalty: 0, maxPenalty: 25, rationale: 'All observed subresources used HTTPS.' },
      { category: 'Third-Party Cookies', penalty: 8, maxPenalty: 15, rationale: '3 third-party persistent cookies observed.' },
      { category: 'Third-Party Concentration', penalty: 4, maxPenalty: 10, rationale: '42% of observed requests are third-party.' },
      { category: 'Cookie Configuration', penalty: 4, maxPenalty: 10, rationale: '2 cookies observed without recommended security flags.' },
      { category: 'Privacy Permissions', penalty: 0, maxPenalty: 10, rationale: 'No privacy-sensitive permissions observed as granted.' },
      { category: 'Storage & Other', penalty: 2, maxPenalty: 5, rationale: '2 browser storage access indicators observed.' },
    ],
    findings: [
      {
        id: 'f1',
        title: 'Potential tracking services detected',
        severity: 'MEDIUM',
        whatWasObserved: '2 domains in TraceGuard\'s tracker catalogue received requests: analytics.example.com, doubleclick.net.',
        whyItMatters: 'Domains in the tracker catalogue are commonly associated with cross-site data collection or ad targeting.',
        whatTraceGuardCannotConclude: 'TraceGuard cannot determine what data, if any, these domains collected.',
        affectedDomains: ['analytics.example.com', 'doubleclick.net'],
      },
    ],
  },
  requests: [
    { id: 'r1', pageUrl: 'https://example.com/', requestUrl: 'https://example.com/api/data', requestDomain: 'example.com', method: 'GET', resourceType: 'xmlhttprequest', statusCode: 200, isThirdParty: false, isSecure: true, observedAt: Date.now() - 2000 },
    { id: 'r2', pageUrl: 'https://example.com/', requestUrl: 'https://doubleclick.net/pixel', requestDomain: 'doubleclick.net', method: 'GET', resourceType: 'image', statusCode: 200, isThirdParty: true, isSecure: true, isTracker: true, trackerCategory: 'Advertising', observedAt: Date.now() - 1500 },
    { id: 'r3', pageUrl: 'https://example.com/', requestUrl: 'https://google-analytics.com/collect', requestDomain: 'google-analytics.com', method: 'POST', resourceType: 'xmlhttprequest', statusCode: 204, isThirdParty: true, isSecure: true, isTracker: true, trackerCategory: 'Analytics', observedAt: Date.now() - 1000 },
  ],
  cookies: [
    { name: '_ga', domain: '.google-analytics.com', path: '/', httpOnly: false, secure: true, sameSite: 'Lax', isPersistent: true, expiresAt: Date.now() + 86400000 * 365, isThirdParty: true, sourceDomain: 'google-analytics.com' },
    { name: 'session_id', domain: 'example.com', path: '/', httpOnly: true, secure: true, sameSite: 'Strict', isPersistent: false, isThirdParty: false, sourceDomain: 'example.com' },
  ],
  storageIndicators: [
    { type: 'localStorage', domain: 'example.com', observedAt: Date.now() - 500 },
  ],
  permissionFindings: [],
  securityIndicators: [],
  timeline: [],
  scannedAt: new Date().toISOString(),
  durationMs: 1423,
};
