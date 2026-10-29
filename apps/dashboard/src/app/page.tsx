'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Modal } from '@/components/ui/Modal';
import {
  Shield,
  Eye,
  Lock,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  Download,
  Fingerprint,
  Cookie,
  AlertTriangle,
  FileCode,
  Sparkles,
  Terminal,
  Activity,
  Globe,
  Sliders,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';
import { classifyDomain } from '@traceguard/tracker-classifier';

interface HeroAuditPreset {
  id: string;
  hostname: string;
  score: number;
  riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  rawUrl: string;
  sanitizedUrl: string;
  trackersCount: number;
  thirdPartiesCount: number;
  cookiesCount: number;
  categories: Array<{ name: string; penalty: number; max: number }>;
  highlightFinding: string;
}

const HERO_PRESETS: HeroAuditPreset[] = [
  {
    id: 'news',
    hostname: 'news.example',
    score: 48,
    riskLevel: 'ELEVATED',
    rawUrl: 'https://news.example/article/cyber-trends?token=sec_98124&session_id=sess_4901&auth_jwt=eyJhbGciOi...',
    sanitizedUrl: 'https://news.example/article/cyber-trends?token=[REDACTED]&session_id=[REDACTED]&auth_jwt=[REDACTED]',
    trackersCount: 5,
    thirdPartiesCount: 8,
    cookiesCount: 12,
    categories: [
      { name: 'Tracker Domains', penalty: 25, max: 35 },
      { name: 'Cookies & Storage', penalty: 12, max: 25 },
      { name: 'Network Security', penalty: 10, max: 25 },
      { name: 'Browser Permissions', penalty: 5, max: 15 },
    ],
    highlightFinding: '5 known advertising & retargeting networks observed communicating in background.',
  },
  {
    id: 'shop',
    hostname: 'shop.example',
    score: 68,
    riskLevel: 'MODERATE',
    rawUrl: 'https://shop.example/catalog/gadgets?ref=newsletter_spring&partner_key=sec_8192a0',
    sanitizedUrl: 'https://shop.example/catalog/gadgets?ref=newsletter_spring&partner_key=[REDACTED]',
    trackersCount: 2,
    thirdPartiesCount: 4,
    cookiesCount: 5,
    categories: [
      { name: 'Tracker Domains', penalty: 18, max: 35 },
      { name: 'Cookies & Storage', penalty: 4, max: 25 },
      { name: 'Network Security', penalty: 0, max: 25 },
      { name: 'Browser Permissions', penalty: 10, max: 15 },
    ],
    highlightFinding: 'Session replay analytics script recording mouse events and DOM mutations.',
  },
  {
    id: 'blog',
    hostname: 'blog.example',
    score: 94,
    riskLevel: 'MINIMAL',
    rawUrl: 'https://blog.example/posts/privacy-in-2026?theme=dark',
    sanitizedUrl: 'https://blog.example/posts/privacy-in-2026?theme=dark',
    trackersCount: 0,
    thirdPartiesCount: 0,
    cookiesCount: 1,
    categories: [
      { name: 'Tracker Domains', penalty: 0, max: 35 },
      { name: 'Cookies & Storage', penalty: 6, max: 25 },
      { name: 'Network Security', penalty: 0, max: 25 },
      { name: 'Browser Permissions', penalty: 0, max: 15 },
    ],
    highlightFinding: 'Zero third-party trackers. Strict first-party UI preference cookie only.',
  },
  {
    id: 'portal',
    hostname: 'portal.example',
    score: 81,
    riskLevel: 'LOW',
    rawUrl: 'https://portal.example/dashboard?auth_code=cde_40912&session=live_user_1',
    sanitizedUrl: 'https://portal.example/dashboard?auth_code=[REDACTED]&session=[REDACTED]',
    trackersCount: 1,
    thirdPartiesCount: 2,
    cookiesCount: 2,
    categories: [
      { name: 'Tracker Domains', penalty: 12, max: 35 },
      { name: 'Cookies & Storage', penalty: 7, max: 25 },
      { name: 'Network Security', penalty: 0, max: 25 },
      { name: 'Browser Permissions', penalty: 0, max: 15 },
    ],
    highlightFinding: 'Periodic telemetry heartbeat with privacy-preserving headers.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { loginAsDemo } = useAuth();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [activeHeroPreset, setActiveHeroPreset] = useState<HeroAuditPreset>(HERO_PRESETS[0]);
  const [interactiveTestDomain, setInteractiveTestDomain] = useState('doubleclick.net');

  const handleDemoClick = async () => {
    setIsDemoLoading(true);
    try {
      await loginAsDemo();
      router.push('/dashboard');
    } catch {
      router.push('/login');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const domainClassification = classifyDomain(interactiveTestDomain || 'doubleclick.net');

  return (
    <div className="flex flex-col w-full selection:bg-indigo-500/20 selection:text-indigo-300">
      {/* =================================================================== */}
      {/* HERO SECTION: LINEAR-STYLE GLOW & MINIMALIST TYPOGRAPHY */}
      {/* =================================================================== */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 border-b border-zinc-800/80 bg-zinc-950">
        {/* Subtle radial grid and glow background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#6366f1 1px, transparent 1px), radial-gradient(#27272a 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6">
          {/* Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono text-xs tracking-wider shadow-sm shadow-indigo-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>v1.0 • Local-First MV3 Intelligence Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-100 font-sans leading-tight">
            See what websites do <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-indigo-500">
              behind the page.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-zinc-400 leading-relaxed font-sans">
            TraceGuard turns complex browser privacy, network tracking, and storage signals into clear, actionable, neutral website intelligence. Inspect third-party telemetry, cookie hygiene, and insecure transport with strictly zero value interception.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => setInstallModalOpen(true)}
              className="gap-2 shadow-lg shadow-indigo-500/25 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6"
            >
              <Download className="w-4 h-4" />
              <span>Install Extension</span>
            </Button>

            <Link href="/sandbox">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-zinc-700 hover:border-indigo-500/50 bg-zinc-900/80 text-zinc-200"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Live Sandbox Playground</span>
              </Button>
            </Link>

            <Button
              size="lg"
              variant="secondary"
              isLoading={isDemoLoading}
              onClick={handleDemoClick}
              className="gap-2 border-zinc-700/80 bg-zinc-800 hover:bg-zinc-750 text-zinc-200"
            >
              <Activity className="w-4 h-4 text-amber-400" />
              <span>1-Click Demo Mode</span>
            </Button>
          </div>

          {/* Security & Architecture Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-2xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              100% In-Browser Local Analysis
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Zero Cookie Value Collection
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Strict Neutral Phrasing Model
            </span>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* INTERACTIVE LIVE TELEMETRY HERO SHOWCASE (CLICKABLE PRESETS) */}
      {/* =================================================================== */}
      <section className="py-12 border-b border-zinc-800 bg-zinc-950 relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-2xs font-mono uppercase tracking-widest text-indigo-400 font-semibold mb-1">
                Interactive Live Telemetry Preview
              </div>
              <h2 className="text-lg font-bold text-zinc-100 font-sans">
                Experience Real-Time Deterministic Auditing
              </h2>
            </div>

            {/* Preset Selector Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
              {HERO_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveHeroPreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    activeHeroPreset.id === p.id
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  {p.hostname}
                </button>
              ))}
            </div>
          </div>

          {/* Showcase Main Display Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-2xl relative overflow-hidden">
            {/* Score & Key Aggregates (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 border-b lg:border-b-0 lg:border-r border-zinc-800/80 text-center space-y-3">
              <ScoreRing
                score={activeHeroPreset.score}
                size={110}
                strokeWidth={8}
                showDetails={true}
              />
              <div className="space-y-1">
                <div className="font-mono text-sm font-bold text-zinc-100">
                  {activeHeroPreset.hostname}
                </div>
                <RiskBadge score={activeHeroPreset.score} size="sm" showDescription />
              </div>

              <div className="grid grid-cols-3 gap-2 w-full pt-2 text-center text-xs font-mono">
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-850">
                  <span className="text-3xs text-zinc-500 block">TRACKERS</span>
                  <span className="font-bold text-amber-400">{activeHeroPreset.trackersCount}</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-850">
                  <span className="text-3xs text-zinc-500 block">3RD PARTIES</span>
                  <span className="font-bold text-zinc-300">{activeHeroPreset.thirdPartiesCount}</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-850">
                  <span className="text-3xs text-zinc-500 block">COOKIES</span>
                  <span className="font-bold text-zinc-300">{activeHeroPreset.cookiesCount}</span>
                </div>
              </div>
            </div>

            {/* Redaction Terminal & Penalty Bars (8 Cols) */}
            <div className="lg:col-span-8 space-y-4 font-mono text-xs">
              {/* Category Penalty Deductions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-2xs text-zinc-400 uppercase tracking-wider">
                  <span>Category Deductions vs Hard Caps</span>
                  <span className="text-rose-400 font-semibold">
                    -{100 - activeHeroPreset.score} pts total deduction
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeHeroPreset.categories.map((cat) => {
                    const pct = Math.round((cat.penalty / cat.max) * 100);
                    return (
                      <div key={cat.name} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 space-y-1">
                        <div className="flex justify-between text-2xs">
                          <span className="text-zinc-300 truncate">{cat.name}</span>
                          <span className={cat.penalty > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                            -{cat.penalty} / {cat.max} pts
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              cat.penalty > 15
                                ? 'bg-rose-500'
                                : cat.penalty > 0
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live URL Redaction Preview */}
              <div className="space-y-1.5 pt-2">
                <div className="text-2xs text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>In-Memory Parameter Redaction:</span>
                  <span className="text-emerald-400 text-3xs font-semibold">Secret Masking Active</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 break-all text-2xs leading-relaxed">
                  {activeHeroPreset.sanitizedUrl.split(/(\[REDACTED\])/).map((chunk, i) =>
                    chunk === '[REDACTED]' ? (
                      <mark
                        key={i}
                        className="bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30 text-3xs font-bold"
                      >
                        [REDACTED]
                      </mark>
                    ) : (
                      <span key={i}>{chunk}</span>
                    )
                  )}
                </div>
              </div>

              {/* Observed Finding Highlight */}
              <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-850 flex items-start gap-2.5 text-2xs">
                <InfoIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-zinc-400">
                  <strong className="text-zinc-200">Observed Indicator: </strong>
                  {activeHeroPreset.highlightFinding}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* BENTO GRID: SPOTLIGHT CARDS & INTERACTIVE PREVIEWS */}
      {/* =================================================================== */}
      <section className="py-20 border-b border-zinc-800 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-semibold">
              Deep Technical Inspection
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 font-sans">
              Engineered for Real-Time Defensive Auditing
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Every audit lifecycle proceeds with strict client-side boundaries, zero credentials access, and verifiable mathematics.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Interactive Classifier Preview */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-100 font-sans">
                  2,850+ Tracker Rules
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  eTLD+1 public suffix resolution matches DuckDuckGo Tracker Radar & Disconnect lists directly in the service worker.
                </p>
              </div>

              {/* Interactive Domain Lookup Demo */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2 font-mono text-2xs">
                <label className="text-3xs text-zinc-500 uppercase block">Test Domain Classification:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={interactiveTestDomain}
                    onChange={(e) => setInteractiveTestDomain(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 text-3xs focus:outline-none focus:border-indigo-500"
                    placeholder="Enter domain..."
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-400">Classified:</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-3xs ${
                      domainClassification.isTracker
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {domainClassification.isTracker
                      ? `${domainClassification.category} (Tracker)`
                      : 'Clean / Unclassified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Hard Privacy & Redaction */}
            <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-100 font-sans">
                  Zero Cookie Value Leakage
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  TraceGuard mathematically drops raw cookie <code className="text-rose-400 text-2xs">.value</code> strings in memory. Only flags (<code className="text-indigo-300 text-2xs">HttpOnly</code>, <code className="text-indigo-300 text-2xs">SameSite</code>, <code className="text-indigo-300 text-2xs">Secure</code>) are analyzed.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1.5 font-mono text-2xs">
                <div className="flex items-center justify-between text-emerald-400 text-3xs">
                  <span>✓ Cookie.name: &quot;auth_sess&quot;</span>
                  <span>Captured</span>
                </div>
                <div className="flex items-center justify-between text-rose-400 text-3xs">
                  <span>✗ Cookie.value: &quot;eyJhbG...&quot;</span>
                  <span>DROPPED</span>
                </div>
                <div className="flex items-center justify-between text-indigo-400 text-3xs">
                  <span>✓ SameSite: &quot;Strict&quot;</span>
                  <span>Evaluated</span>
                </div>
              </div>
            </div>

            {/* Bento Card 3: Interactive Sandbox CTA */}
            <div className="p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-zinc-900/70 hover:border-indigo-500/60 transition-all space-y-4 group flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-zinc-100 font-sans">
                    Live Runtime Sandbox
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Experiment with simulated URL parameters, custom tracking domains, and cookie flags. Watch the real-time scoring engine calculate deductions live.
                  </p>
                </div>
              </div>

              <Link href="/sandbox">
                <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  <span>Open Interactive Sandbox</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* FOUR-STAGE DEFENSIVE LIFECYCLE SECTION */}
      {/* =================================================================== */}
      <section className="py-20 border-b border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-semibold">
              Architecture & Lifecycle
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 font-sans">
              How TraceGuard Works
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Every audit lifecycle proceeds through four non-invasive, strictly client-side stages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-zinc-800/80 bg-zinc-900/60">
              <CardHeader className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold border border-indigo-500/30">
                  01
                </div>
                <CardTitle className="text-sm">Observation Layer</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 leading-relaxed">
                Captures webRequest completions, cookie storage events, permissions requests, and
                resource protocols in real time directly inside the browser extension.
              </CardContent>
            </Card>

            <Card className="border-zinc-800/80 bg-zinc-900/60">
              <CardHeader className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold border border-indigo-500/30">
                  02
                </div>
                <CardTitle className="text-sm">Sanitization & Redaction</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 leading-relaxed">
                Immediately drops cookie values and scrubs sensitive URL query parameters (token, auth,
                key, jwt) before any classification or persistence.
              </CardContent>
            </Card>

            <Card className="border-zinc-800/80 bg-zinc-900/60">
              <CardHeader className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold border border-indigo-500/30">
                  03
                </div>
                <CardTitle className="text-sm">Tracker Classification</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 leading-relaxed">
                Extracts the eTLD+1 boundary and maps domains against open catalogs into categories
                (Advertising, Analytics, Session Replay, Social, CDN).
              </CardContent>
            </Card>

            <Card className="border-zinc-800/80 bg-zinc-900/60">
              <CardHeader className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold border border-indigo-500/30">
                  04
                </div>
                <CardTitle className="text-sm">Deterministic Scoring</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 leading-relaxed">
                Applies weighted deductions from a base-100 score across 7 categories with strict caps.
                Outputs a standardized, non-alarmist risk band.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Extension Install Instructions Modal */}
      <Modal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        title="Install TraceGuard Chrome Extension"
        description="Load the pre-built Chromium Manifest V3 extension into Chrome, Brave, or Edge."
        className="max-w-md"
      >
        <div className="space-y-4 text-xs font-mono text-zinc-300">
          <p className="leading-relaxed">
            TraceGuard executes 100% locally in your browser. Follow these steps to load the unpacked extension:
          </p>

          <ol className="list-decimal list-inside space-y-2 text-zinc-400 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
            <li>
              Open Google Chrome and navigate to{' '}
              <code className="text-indigo-400 bg-zinc-850 px-1 py-0.5 rounded">
                chrome://extensions
              </code>
            </li>
            <li>
              Enable <span className="text-zinc-100 font-semibold">Developer mode</span> in the top right corner.
            </li>
            <li>
              Click <span className="text-zinc-100 font-semibold">Load unpacked</span> and select the folder:{' '}
              <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded block mt-1 break-all">
                apps/extension/dist
              </code>
            </li>
            <li>
              Pin the TraceGuard shield icon in your browser toolbar to observe real-time site telemetry.
            </li>
          </ol>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setInstallModalOpen(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}
