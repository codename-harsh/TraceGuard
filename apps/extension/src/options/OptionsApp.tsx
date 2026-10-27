/**
 * OptionsApp.tsx — TraceGuard Extension Settings & Privacy Transparency Center
 *
 * Provides:
 *  1. Clear explanation of all requested permissions and privacy guarantees.
 *  2. Backend API URL configuration & account sign-in / connection for opt-in scan saving.
 *  3. Local scanning preferences toggles.
 *  4. Local scan cache management.
 */

import { useState } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { clearScanCache, useSettings } from '../hooks/useExtension';

// ---------------------------------------------------------------------------
// Inline SVG Icons
// ---------------------------------------------------------------------------

function IconShield({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconLock({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconServer({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Permissions Data
// ---------------------------------------------------------------------------

interface PermissionDoc {
  permission: string;
  category: string;
  whyNeeded: string;
  dataExposed: string;
  howGuarded: string;
}

const PERMISSIONS_DOC: PermissionDoc[] = [
  {
    permission: 'activeTab',
    category: 'Tab Access',
    whyNeeded: 'Allows TraceGuard to access tab metadata (URL and tab ID) when the user opens the extension.',
    dataExposed: 'Page URL and tab ID for the currently focused tab.',
    howGuarded: 'Scoped exclusively to the active tab upon user interaction. Does not access background or inactive tabs.',
  },
  {
    permission: 'tabs',
    category: 'Navigation State',
    whyNeeded: 'Detects navigation status (page loaded / refreshed) to run automated audits and open fullview.html in a tab.',
    dataExposed: 'Tab URL, load status, and tab identifiers.',
    howGuarded: 'Internal pages (chrome://, extension://) are strictly ignored. Used only to trigger local analysis.',
  },
  {
    permission: 'cookies',
    category: 'Cookie Hygiene',
    whyNeeded: 'Reads cookie metadata for the active site: domain, path, Secure, HttpOnly, SameSite, session/persistent, expiry.',
    dataExposed: 'Cookie names, attributes, and raw values from the browser cookie store.',
    howGuarded: 'Cookie values (.value) are immediately discarded at the collection boundary. NEVER read, logged, stored, or transmitted.',
  },
  {
    permission: 'storage',
    category: 'Local Persistence',
    whyNeeded: 'Stores per-tab analysis results and user settings inside chrome.storage.local on the user\'s local machine.',
    dataExposed: 'Local extension state, scan summaries, and user configuration.',
    howGuarded: 'Data stays 100% inside local storage on your device. Never leaves the browser without explicit opt-in upload.',
  },
  {
    permission: 'webRequest',
    category: 'Network Auditing',
    whyNeeded: 'Observes subresource requests (domain, method, type, status, HTTPS vs HTTP) to identify trackers and 3rd parties.',
    dataExposed: 'Observed network request URLs and headers for web pages.',
    howGuarded: 'Request bodies and Authorization headers are NEVER accessed. Sensitive query parameters are redacted to [REDACTED].',
  },
  {
    permission: '<all_urls> (Host)',
    category: 'Host Coverage',
    whyNeeded: 'Required for webRequest and cookie metadata observation across websites the user chooses to browse.',
    dataExposed: 'Subresource network metadata and cookie flags across visited web origins.',
    howGuarded: 'Strictly passive observation. Does not modify network traffic, inject arbitrary scripts, or run remote code.',
  },
];

// ---------------------------------------------------------------------------
// Main OptionsApp Component
// ---------------------------------------------------------------------------

export function OptionsApp() {
  const { settings, loading, update } = useSettings();

  // Backend form state
  const [apiUrl, setApiUrl] = useState(settings?.apiBaseUrl ?? 'http://localhost:8000/api/v1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rawToken, setRawToken] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Cache state
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  // Sync state when settings load
  if (settings && apiUrl !== settings.apiBaseUrl && apiUrl === 'http://localhost:8000/api/v1') {
    setApiUrl(settings.apiBaseUrl);
  }

  const handleSaveApiUrl = async () => {
    try {
      await update({ apiBaseUrl: apiUrl.trim() });
      setStatusMsg({ text: 'API URL updated successfully.', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Update failed', type: 'error' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setStatusMsg({ text: 'Please enter both email and password.', type: 'error' });
      return;
    }

    setLoginLoading(true);
    setStatusMsg(null);

    try {
      const baseUrl = apiUrl.trim().replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Login failed (${response.status}): ${text.slice(0, 100)}`);
      }

      const data = await response.json();
      const token = data.access_token;
      if (!token) throw new Error('No access_token returned by backend.');

      await update({ apiToken: token, apiBaseUrl: baseUrl });
      setEmail('');
      setPassword('');
      setStatusMsg({ text: 'Connected to TraceGuard account successfully.', type: 'success' });
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Authentication failed', type: 'error' });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSaveRawToken = async () => {
    if (!rawToken.trim()) return;
    try {
      await update({ apiToken: rawToken.trim() });
      setRawToken('');
      setStatusMsg({ text: 'API Token configured successfully.', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ text: 'Failed to save token.', type: 'error' });
    }
  };

  const handleDisconnect = async () => {
    try {
      await update({ apiToken: '' });
      setStatusMsg({ text: 'Disconnected from TraceGuard account.', type: 'info' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ text: 'Failed to disconnect.', type: 'error' });
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const msg = await clearScanCache();
      setCacheMsg(msg);
      setTimeout(() => setCacheMsg(null), 4000);
    } catch (err) {
      setCacheMsg(err instanceof Error ? err.message : 'Failed to clear cache');
      setTimeout(() => setCacheMsg(null), 4000);
    } finally {
      setClearingCache(false);
    }
  };

  const isConnected = !!settings?.apiToken;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Top Header */}
      <header className="mb-8 border-b border-surface-border pb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded bg-brand/20 flex items-center justify-center text-brand">
              <IconShield size={16} />
            </div>
            <h1 className="font-mono text-lg font-bold tracking-widest text-zinc-100 uppercase">
              TRACEGUARD
            </h1>
            <span className="badge-mono bg-surface-muted text-zinc-400 text-2xs ml-2">
              MV3 EXTENSION v0.1.0
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Web Privacy &amp; Security Intelligence — Permissions Transparency, Local Preferences &amp; Account Sync
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="badge-mono bg-risk-minimal/15 text-risk-minimal border border-risk-minimal/30 flex items-center gap-1.5 py-1 px-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-risk-minimal" />
              Account Connected
            </span>
          ) : (
            <span className="badge-mono bg-surface-muted text-zinc-500 border border-surface-border py-1 px-2.5">
              Local-Only Mode
            </span>
          )}
        </div>
      </header>

      {/* Main Content Sections */}
      <div className="space-y-8">
        {/* Section 1: Privacy Guarantee Banner */}
        <section className="card p-5 border-brand/30 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center text-brand flex-shrink-0 mt-0.5">
              <IconLock size={18} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-zinc-100 mb-1">
                Hard Privacy &amp; Data Redaction Guarantee
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                TraceGuard is engineered strictly as a defensive awareness and auditing tool. By design, all website observation and scoring logic execute <span className="text-zinc-200 font-medium">100% locally</span> inside your Chromium browser service worker.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="text-risk-minimal"><IconCheck /></span>
                  <span>Zero raw cookie <code className="text-2xs font-mono bg-surface-border px-1 py-0.5 rounded">.value</code> collection or logging</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="text-risk-minimal"><IconCheck /></span>
                  <span>Zero request bodies or Authorization headers captured</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="text-risk-minimal"><IconCheck /></span>
                  <span>Sensitive URL query params redacted to <code className="text-2xs font-mono bg-surface-border px-1 py-0.5 rounded">[REDACTED]</code></span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="text-risk-minimal"><IconCheck /></span>
                  <span>Zero remote code execution or inline scripts (MV3 strict CSP)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Permissions Transparency */}
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Permissions Transparency</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Full breakdown of every permission requested in <code className="text-2xs font-mono text-zinc-400">manifest.json</code>, why it is needed, and how usage is strictly constrained.
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left" aria-label="Permissions documentation">
                <thead>
                  <tr>
                    <th className="table-header w-32">Permission</th>
                    <th className="table-header w-28">Category</th>
                    <th className="table-header">Why TraceGuard Needs It</th>
                    <th className="table-header">Defensive Limitation</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS_DOC.map((p) => (
                    <tr key={p.permission} className="hover:bg-surface-border/20 transition-colors">
                      <td className="table-cell font-mono text-xs text-brand font-medium">
                        {p.permission}
                      </td>
                      <td className="table-cell">
                        <span className="badge-mono bg-surface-muted text-zinc-400 text-2xs">
                          {p.category}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-zinc-300 leading-relaxed">
                        {p.whyNeeded}
                      </td>
                      <td className="table-cell text-xs text-zinc-400 leading-relaxed">
                        {p.howGuarded}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 3: Scanning Preferences */}
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Local Scanning Preferences</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Control automated background analysis behavior.
            </p>
          </div>

          <div className="card p-4 divide-y divide-surface-border">
            {/* Auto-scan toggle */}
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className="text-xs font-medium text-zinc-200">Automatic Analysis on Page Load</p>
                <p className="text-2xs text-zinc-500 mt-0.5">
                  Analyze active tabs automatically when page navigation completes.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.autoScan ?? true}
                  onChange={(e) => void update({ autoScan: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
              </label>
            </div>

            {/* Extension enabled toggle */}
            <div className="flex items-center justify-between pt-3">
              <div>
                <p className="text-xs font-medium text-zinc-200">TraceGuard Active</p>
                <p className="text-2xs text-zinc-500 mt-0.5">
                  Master switch to enable or pause network &amp; cookie metadata inspection.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.enabled ?? true}
                  onChange={(e) => void update({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-surface-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
              </label>
            </div>
          </div>
        </section>

        {/* Section 4: Backend API & Account Synchronization */}
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Backend API &amp; Account Connection (Opt-in)</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure your TraceGuard FastAPI backend to optionally save redacted scans to your private cloud intelligence dashboard.
            </p>
          </div>

          <div className="card p-5 space-y-5">
            {/* API Base URL */}
            <div>
              <label htmlFor="api-base-url" className="block text-2xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                Backend API Base URL
              </label>
              <div className="flex gap-2">
                <input
                  id="api-base-url"
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:8000/api/v1"
                  className="flex-1 bg-surface-muted border border-surface-border rounded px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-brand focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveApiUrl}
                  className="btn-secondary text-xs px-3"
                >
                  Save URL
                </button>
              </div>
              <p className="text-2xs text-zinc-500 mt-1">
                Default: <code className="text-zinc-400 font-mono">http://localhost:8000/api/v1</code>
              </p>
            </div>

            {/* Connection Status & Account Box */}
            <div className="border-t border-surface-border pt-4">
              {isConnected ? (
                <div className="flex items-center justify-between p-3 rounded bg-surface-muted border border-surface-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-risk-minimal/20 flex items-center justify-center text-risk-minimal">
                      <IconCheck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Connected to TraceGuard Backend</p>
                      <p className="text-2xs font-mono text-zinc-500 mt-0.5">
                        Token configured — opt-in scan saving is active.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="btn-secondary text-xs text-risk-high hover:border-risk-high/40 px-3"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-semibold text-zinc-300 mb-2">Connect Your TraceGuard Account</h3>
                  <p className="text-2xs text-zinc-500 mb-4 leading-relaxed">
                    Connecting an account enables the &ldquo;Save Scan&rdquo; button in the popup to upload privacy-redacted session audits to your centralized security dashboard.
                  </p>

                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="login-email" className="block text-2xs font-mono text-zinc-400 mb-1">
                          Account Email
                        </label>
                        <input
                          id="login-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="analyst@traceguard.local"
                          className="w-full bg-surface-muted border border-surface-border rounded px-3 py-1.5 text-xs text-zinc-100 focus:border-brand focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="login-password" className="block text-2xs font-mono text-zinc-400 mb-1">
                          Password
                        </label>
                        <input
                          id="login-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-surface-muted border border-surface-border rounded px-3 py-1.5 text-xs text-zinc-100 focus:border-brand focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="btn-primary text-xs flex items-center gap-1.5"
                      >
                        {loginLoading ? <LoadingSpinner size={12} /> : <IconServer size={14} />}
                        Sign In &amp; Connect
                      </button>
                    </div>
                  </form>

                  {/* Manual token input option */}
                  <div className="mt-4 pt-3 border-t border-surface-border">
                    <label htmlFor="manual-token" className="block text-2xs font-mono text-zinc-500 mb-1">
                      Or paste an existing JWT access token directly:
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="manual-token"
                        type="password"
                        value={rawToken}
                        onChange={(e) => setRawToken(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                        className="flex-1 bg-surface-muted border border-surface-border rounded px-3 py-1.5 text-xs text-zinc-100 font-mono focus:border-brand focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSaveRawToken}
                        className="btn-secondary text-xs px-3"
                      >
                        Set Token
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Message */}
              {statusMsg && (
                <div className={`mt-3 p-2.5 rounded text-xs ${
                  statusMsg.type === 'success' ? 'bg-risk-minimal/10 text-risk-minimal border border-risk-minimal/30' :
                  statusMsg.type === 'error' ? 'bg-risk-high/10 text-risk-high border border-risk-high/30' :
                  'bg-surface-muted text-zinc-300'
                }`}>
                  {statusMsg.text}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 5: Local Storage & Cache Management */}
        <section>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Local Cache Management</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Manage locally stored scan audits cached in browser storage.
            </p>
          </div>

          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-200">Clear Local Scan Cache</p>
              <p className="text-2xs text-zinc-500 mt-0.5">
                Purge all per-tab scan payloads stored in <code className="text-zinc-400 font-mono">chrome.storage.local</code>. Does not modify your backend settings.
              </p>
              {cacheMsg && (
                <p className="text-2xs text-brand mt-1 font-mono">{cacheMsg}</p>
              )}
            </div>
            <button
              type="button"
              id="btn-clear-cache"
              onClick={() => void handleClearCache()}
              disabled={clearingCache}
              className="btn-secondary text-xs text-zinc-300 hover:text-risk-high hover:border-risk-high/30 flex items-center gap-1.5 px-3 py-1.5"
            >
              {clearingCache ? <LoadingSpinner size={12} /> : <IconTrash size={13} />}
              Clear Cache
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-surface-border text-center text-2xs text-zinc-600 font-mono">
        TraceGuard — Web Privacy &amp; Security Intelligence &bull; Strictly defensive awareness &bull; All analysis local by default
      </footer>
    </div>
  );
}
