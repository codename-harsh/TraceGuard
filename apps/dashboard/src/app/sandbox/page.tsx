'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Sparkles,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  Sliders,
  Terminal,
  FileCode2,
  Globe,
  Cookie,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Badge } from '@/components/ui/Badge';
import { sanitizeUrl, getRegistrableDomain, isThirdPartyDomain } from '@traceguard/analyzer';
import { classifyDomain } from '@traceguard/tracker-classifier';
import { evaluateScan } from '@traceguard/scoring-engine';
import type {
  CookieMetadata,
  StorageIndicator,
  PermissionFinding,
  SecurityIndicator,
} from '@traceguard/shared-types';

interface Preset {
  id: string;
  name: string;
  description: string;
  url: string;
  domains: Array<{ hostname: string; isInsecure?: boolean }>;
  cookies: Array<{
    name: string;
    domain: string;
    is_secure: boolean;
    is_http_only: boolean;
    same_site: 'Strict' | 'Lax' | 'None' | 'Unspecified';
    expiration_days?: number;
  }>;
  permissions: string[];
  hasInsecureResource: boolean;
}

const PRESETS: Preset[] = [
  {
    id: 'heavy-news',
    name: 'Ad-Heavy Media Portal',
    description: 'Multiple advertising, retargeting, and analytics trackers with secret URL tokens and unencrypted assets.',
    url: 'https://news.example/article/privacy-watch?session_token=sess_live_9942a1&auth_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token&user_id=usr_402',
    domains: [
      { hostname: 'adservice.example.net' },
      { hostname: 'retargeting-pixel.example.com' },
      { hostname: 'analytics-tag.example.com' },
      { hostname: 'fingerprint-cdn.example.io' },
      { hostname: 'social-tracker.example.org' },
      { hostname: 'news.example' },
      { hostname: 'cdn.news.example' },
    ],
    cookies: [
      {
        name: 'ad_id',
        domain: 'adservice.example.net',
        is_secure: false,
        is_http_only: false,
        same_site: 'Unspecified',
        expiration_days: 365,
      },
      {
        name: '_fbp',
        domain: '.example.com',
        is_secure: true,
        is_http_only: false,
        same_site: 'None',
        expiration_days: 90,
      },
      {
        name: 'session_token',
        domain: 'news.example',
        is_secure: true,
        is_http_only: true,
        same_site: 'Strict',
      },
    ],
    permissions: ['geolocation', 'notifications'],
    hasInsecureResource: true,
  },
  {
    id: 'minimal-blog',
    name: 'Privacy-Conscious Developer Blog',
    description: 'Zero third-party trackers, strict first-party cookies, and 100% encrypted HTTPS transport.',
    url: 'https://blog.example/posts/zero-tracking-architecture',
    domains: [
      { hostname: 'blog.example' },
      { hostname: 'assets.blog.example' },
    ],
    cookies: [
      {
        name: 'theme_pref',
        domain: 'blog.example',
        is_secure: true,
        is_http_only: false,
        same_site: 'Strict',
        expiration_days: 180,
      },
    ],
    permissions: [],
    hasInsecureResource: false,
  },
  {
    id: 'ecommerce-replay',
    name: 'E-Commerce with Session Replay',
    description: 'Session replay recording script capturing user interactions with long-lived marketing cookies.',
    url: 'https://shop.example/catalog/smartphones?ref=newsletter_spring&partner_key=sec_981237a4b',
    domains: [
      { hostname: 'replay-analytics.example.com' },
      { hostname: 'metrics.example.net' },
      { hostname: 'pay-gateway.example.com' },
      { hostname: 'img-cdn.example.org' },
      { hostname: 'shop.example' },
    ],
    cookies: [
      {
        name: 'sr_session',
        domain: 'replay-analytics.example.com',
        is_secure: true,
        is_http_only: false,
        same_site: 'None',
        expiration_days: 30,
      },
      {
        name: 'cart_token',
        domain: 'shop.example',
        is_secure: true,
        is_http_only: true,
        same_site: 'Lax',
      },
    ],
    permissions: ['camera'],
    hasInsecureResource: false,
  },
];

export default function SandboxPage() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('heavy-news');
  const [rawUrl, setRawUrl] = useState<string>(PRESETS[0].url);
  const [domains, setDomains] = useState<Array<{ hostname: string; isInsecure?: boolean }>>(
    PRESETS[0].domains
  );
  const [newDomainInput, setNewDomainInput] = useState('');
  const [cookies, setCookies] = useState(PRESETS[0].cookies);
  const [permissions, setPermissions] = useState<string[]>(PRESETS[0].permissions);
  const [hasInsecureResource, setHasInsecureResource] = useState<boolean>(
    PRESETS[0].hasInsecureResource
  );

  const applyPreset = (preset: Preset) => {
    setSelectedPresetId(preset.id);
    setRawUrl(preset.url);
    setDomains(preset.domains);
    setCookies(preset.cookies);
    setPermissions(preset.permissions);
    setHasInsecureResource(preset.hasInsecureResource);
  };

  // 1. Live URL Sanitization via @traceguard/analyzer
  const sanitizedUrl = useMemo(() => {
    return sanitizeUrl(rawUrl);
  }, [rawUrl]);

  // Extract First-Party Hostname
  const firstPartyHostname = useMemo(() => {
    try {
      const u = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
      return u.hostname;
    } catch {
      return 'example.com';
    }
  }, [rawUrl]);

  // 2. Classify Domains via @traceguard/tracker-classifier & @traceguard/analyzer
  const classifiedDomains = useMemo(() => {
    return domains.map((d) => {
      const isThirdParty = isThirdPartyDomain(d.hostname, firstPartyHostname);
      const classification = classifyDomain(d.hostname);
      return {
        hostname: d.hostname,
        isThirdParty,
        isTracker: classification.isTracker,
        category: classification.category,
        isInsecure: d.isInsecure || false,
      };
    });
  }, [domains, firstPartyHostname]);

  // 3. Evaluate Base-100 Score via @traceguard/scoring-engine
  const scanEvaluation = useMemo(() => {
    // Generate simulated ObservedRequest array
    const simulatedRequests = classifiedDomains.map((d, index) => {
      const isDomainInsecure = d.isInsecure || hasInsecureResource || rawUrl.startsWith('http://');
      return {
        id: `sim-req-${index}`,
        pageUrl: rawUrl,
        requestUrl: `${isDomainInsecure ? 'http' : 'https'}://${d.hostname}/telemetry`,
        requestDomain: d.hostname,
        method: 'GET' as const,
        resourceType: 'script',
        statusCode: 200,
        isThirdParty: d.isThirdParty,
        isTracker: d.isTracker,
        trackerCategory: d.category,
        isSecure: !isDomainInsecure,
        observedAt: Date.now(),
      };
    });

    // Generate simulated CookieMetadata array
    const simulatedCookies: CookieMetadata[] = cookies.map((c) => ({
      name: c.name,
      domain: c.domain,
      path: '/',
      secure: c.is_secure,
      httpOnly: c.is_http_only,
      sameSite: c.same_site,
      isPersistent: !!c.expiration_days,
      isThirdParty: isThirdPartyDomain(c.domain, firstPartyHostname),
      sourceDomain: firstPartyHostname,
    }));

    // Storage indicators
    const simulatedStorage: StorageIndicator[] = [
      {
        type: 'localStorage',
        domain: firstPartyHostname,
        observedAt: Date.now(),
      },
      {
        type: 'localStorage',
        domain: firstPartyHostname,
        observedAt: Date.now(),
      },
    ];

    // Permission findings
    const simulatedPermissions: PermissionFinding[] = permissions.map((p) => ({
      domain: firstPartyHostname,
      permission: (['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write', 'payment-handler', 'persistent-storage', 'background-sync', 'midi'].includes(p)
        ? p
        : 'other') as PermissionFinding['permission'],
      state: 'prompt',
    }));

    // Security indicators
    const simulatedSecurity: SecurityIndicator[] = [];
    if (rawUrl.startsWith('http://')) {
      simulatedSecurity.push({
        type: 'mixed-content',
        description: 'Page served over plaintext HTTP',
        observedAt: Date.now(),
      });
    }

    return evaluateScan({
      requests: simulatedRequests,
      cookies: simulatedCookies,
      storageIndicators: simulatedStorage,
      permissionFindings: simulatedPermissions,
      securityIndicators: simulatedSecurity,
    });
  }, [classifiedDomains, cookies, permissions, hasInsecureResource, firstPartyHostname, rawUrl]);

  // Add Domain
  const handleAddDomain = () => {
    if (!newDomainInput.trim()) return;
    const clean = newDomainInput.trim().toLowerCase();
    if (!domains.some((d) => d.hostname === clean)) {
      setDomains([...domains, { hostname: clean }]);
    }
    setNewDomainInput('');
  };

  // Remove Domain
  const handleRemoveDomain = (hostname: string) => {
    setDomains(domains.filter((d) => d.hostname !== hostname));
  };

  // Toggle Permission
  const togglePermission = (perm: string) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter((p) => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-xs tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INTERACTIVE RUNTIME SANDBOX</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans text-zinc-100 light:text-zinc-900">
            Privacy & Redaction Simulator
          </h1>
          <p className="text-sm text-zinc-400 light:text-zinc-600 max-w-2xl mt-1">
            Test TraceGuard&apos;s real in-browser modules (<code className="text-xs text-indigo-400">@traceguard/analyzer</code>, <code className="text-xs text-indigo-400">@traceguard/tracker-classifier</code>, and <code className="text-xs text-indigo-400">@traceguard/scoring-engine</code>). Experiment with simulated signals and inspect the real-time Base-100 mathematical deduction.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800">
          <span className="text-2xs font-mono text-zinc-500 px-2 uppercase tracking-wider">Presets:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPresetId === p.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================================================================= */}
        {/* LEFT COLUMN: RAW BROWSER SIGNALS & INPUTS (5 Cols) */}
        {/* ================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* Signal 1: URL & Sensitive Query Parameters */}
          <Card className="border-zinc-800 bg-zinc-900/90 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>1. Inspected Target URL</span>
                </CardTitle>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  Raw Input
                </span>
              </div>
              <CardDescription className="text-xs">
                Include sensitive query parameters like <code className="text-zinc-300">?token=</code>, <code className="text-zinc-300">?auth=</code>, or <code className="text-zinc-300">?jwt=</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={rawUrl}
                onChange={(e) => setRawUrl(e.target.value)}
                rows={3}
                className="w-full text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500/60 leading-relaxed"
                placeholder="https://example.com/page?token=secret123"
              />
              <div className="flex items-center justify-between text-2xs font-mono text-zinc-500">
                <span>First-party host: <strong className="text-zinc-300">{firstPartyHostname}</strong></span>
                <span className={rawUrl.startsWith('http://') ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                  {rawUrl.startsWith('http://') ? '⚠️ Plaintext HTTP' : '✓ HTTPS Protocol'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Signal 2: Third-Party & Tracker Domains */}
          <Card className="border-zinc-800 bg-zinc-900/90 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>2. Observed Request Domains</span>
                </CardTitle>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  {domains.length} Domains
                </span>
              </div>
              <CardDescription className="text-xs">
                eTLD+1 public suffix parser resolves first-party vs third-party. The tracker classifier matches 2,850+ rules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add Domain Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                  placeholder="e.g. google-analytics.com, hotjar.com, cdn.example"
                  className="flex-1 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500/60"
                />
                <Button size="sm" onClick={handleAddDomain} className="h-8 gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </Button>
              </div>

              {/* Domains Tags List */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {classifiedDomains.map((d) => (
                  <div
                    key={d.hostname}
                    className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                      d.isTracker
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : d.isThirdParty
                        ? 'border-zinc-700 bg-zinc-800/80 text-zinc-300'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    <span className="text-2xs">{d.isTracker ? '🎯' : d.isThirdParty ? '🌐' : '🏠'}</span>
                    <span>{d.hostname}</span>
                    <span className="text-3xs px-1 rounded bg-zinc-900/80 text-zinc-400">
                      {d.category}
                    </span>
                    <button
                      onClick={() => handleRemoveDomain(d.hostname)}
                      className="text-zinc-500 hover:text-rose-400 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Signal 3: Cookie Hygiene & Browser Permissions */}
          <Card className="border-zinc-800 bg-zinc-900/90 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
                <Cookie className="w-4 h-4 text-emerald-400" />
                <span>3. Cookie Flags & Permissions</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect how cookie security flags and hardware permission queries alter score deductions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Permissions Toggles */}
              <div>
                <label className="text-2xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                  Sensitive Permission Requests
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['geolocation', 'camera', 'microphone', 'notifications'].map((perm) => {
                    const isChecked = permissions.includes(perm);
                    return (
                      <button
                        key={perm}
                        type="button"
                        onClick={() => togglePermission(perm)}
                        className={`px-3 py-2 rounded-lg text-xs font-mono border text-left transition-colors flex items-center justify-between ${
                          isChecked
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        <span className="capitalize">{perm}</span>
                        <span>{isChecked ? '●' : '○'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Insecure Asset Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                <div>
                  <div className="text-xs font-medium text-zinc-200">Insecure HTTP Subresources</div>
                  <div className="text-2xs text-zinc-500">Unencrypted mixed content image or script request</div>
                </div>
                <button
                  type="button"
                  onClick={() => setHasInsecureResource(!hasInsecureResource)}
                  className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
                    hasInsecureResource
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 font-semibold'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  {hasInsecureResource ? 'Present (-10 pts)' : 'None (0 pts)'}
                </button>
              </div>

              {/* Cookies Summary Table */}
              <div>
                <label className="text-2xs font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                  Simulated Cookies ({cookies.length})
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {cookies.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-850 text-xs font-mono"
                    >
                      <span className="font-semibold text-zinc-300">{c.name}</span>
                      <div className="flex items-center gap-1.5 text-2xs">
                        <span className={c.is_secure ? 'text-emerald-400' : 'text-rose-400'}>
                          {c.is_secure ? 'Secure' : 'NoSecure'}
                        </span>
                        <span>•</span>
                        <span className={c.is_http_only ? 'text-emerald-400' : 'text-zinc-500'}>
                          {c.is_http_only ? 'HttpOnly' : 'NoHttpOnly'}
                        </span>
                        <span>•</span>
                        <span className="text-indigo-300">{c.same_site}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: REAL-TIME REDACTION DIFF & SCORING RUNTIME (6 Cols) */}
        {/* ================================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* Live Base-100 Score Output Card */}
          <Card className="border-indigo-500/30 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-100">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Deterministic Score Runtime</span>
                </CardTitle>
                <span className="text-2xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Base-100 Algorithm
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                <div className="flex flex-col items-center">
                  <ScoreRing
                    score={scanEvaluation.score}
                    size={130}
                    strokeWidth={10}
                    showDetails={true}
                  />
                  <div className="mt-3">
                    <RiskBadge score={scanEvaluation.score} size="md" showDescription />
                  </div>
                </div>

                <div className="space-y-2 flex-1 w-full max-w-xs text-xs font-mono">
                  <div className="text-2xs text-zinc-400 uppercase tracking-wider mb-1">
                    Mathematical Deductions:
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                    <span className="text-zinc-400">Baseline Budget:</span>
                    <span className="text-emerald-400 font-semibold">100 pts</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                    <span className="text-zinc-400">Total Deductions:</span>
                    <span className="text-rose-400 font-semibold">
                      -{100 - scanEvaluation.score} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-800">
                    <span className="text-zinc-400">Observed Trackers:</span>
                    <span className="text-amber-400 font-semibold">
                      {classifiedDomains.filter((d) => d.isTracker).length} domains
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 text-zinc-200">
                    <span>Final Clamped Score:</span>
                    <span className="font-bold text-indigo-300 text-sm">
                      {scanEvaluation.score} / 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Penalty Breakdown Bars */}
              <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2.5">
                <div className="text-2xs font-mono text-zinc-400 uppercase tracking-wider">
                  Category Deductions vs Hard Caps
                </div>
                {scanEvaluation.components.map((comp) => {
                  const pct = Math.round((comp.penalty / comp.maxPenalty) * 100);
                  return (
                    <div key={comp.category} className="space-y-1">
                      <div className="flex justify-between text-2xs font-mono">
                        <span className="text-zinc-300">{comp.category}</span>
                        <span className={comp.penalty > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                          -{comp.penalty} / {comp.maxPenalty} pts max
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            comp.penalty > 15
                              ? 'bg-rose-500'
                              : comp.penalty > 5
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Privacy Redaction Terminal Preview */}
          <Card className="border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sanitization & Redaction Layer (100% In-Memory)</span>
              </div>
              <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Zero Value Leakage
              </span>
            </div>
            <CardContent className="p-4 space-y-4 font-mono text-xs">
              {/* Sanitized URL preview */}
              <div>
                <div className="text-2xs text-zinc-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Sanitized Audit URL (What TraceGuard Persists):</span>
                  <span className="text-emerald-400 text-3xs font-semibold">Strict Parameter Scrubbing</span>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-300 break-all leading-relaxed">
                  {sanitizedUrl.includes('[REDACTED]') ? (
                    <span>
                      {sanitizedUrl.split(/(\[REDACTED\])/).map((chunk, idx) =>
                        chunk === '[REDACTED]' ? (
                          <mark
                            key={idx}
                            className="bg-amber-500/20 text-amber-300 px-1 py-0.5 rounded border border-amber-500/40 text-2xs font-bold"
                          >
                            [REDACTED]
                          </mark>
                        ) : (
                          <span key={idx}>{chunk}</span>
                        )
                      )}
                    </span>
                  ) : (
                    <span>{sanitizedUrl}</span>
                  )}
                </div>
              </div>

              {/* Cookie Value Guarantee */}
              <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-850 flex items-start gap-3">
                <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-2xs space-y-1">
                  <div className="font-semibold text-zinc-200">Hard Privacy Enforcement Guarantee:</div>
                  <div className="text-zinc-400 leading-relaxed">
                    TraceGuard strictly extracts <code className="text-indigo-300">SameSite</code>, <code className="text-indigo-300">Secure</code>, <code className="text-indigo-300">HttpOnly</code>, and expiration metadata. The cookie <code className="text-rose-400">.value</code> string is physically dropped in memory and never leaves the client browser sandbox.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Triggered Analytical Findings */}
          <Card className="border-zinc-800 bg-zinc-900/90 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Triggered Analytical Findings ({scanEvaluation.findings.length})</span>
                </CardTitle>
                <span className="text-2xs font-mono text-zinc-400">Neutral Phrasing</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {scanEvaluation.findings.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-emerald-400 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  <span>No security or privacy deduction rules triggered for this configuration.</span>
                </div>
              ) : (
                scanEvaluation.findings.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">{f.title}</span>
                      <Badge
                        variant={
                          f.severity === 'HIGH'
                            ? 'danger'
                            : f.severity === 'MEDIUM'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {f.severity}
                      </Badge>
                    </div>
                    <p className="text-2xs text-zinc-400 leading-relaxed">{f.whatWasObserved}</p>
                    <div className="text-3xs font-mono text-zinc-500 pt-1 border-t border-zinc-850">
                      Why it matters: {f.whyItMatters}
                    </div>
                    {f.whatTraceGuardCannotConclude && (
                      <div className="text-3xs text-zinc-500 italic">
                        Limitation: {f.whatTraceGuardCannotConclude}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
