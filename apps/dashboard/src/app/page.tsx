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
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { loginAsDemo, isAuthenticated } = useAuth();
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleDemoClick = async () => {
    setIsDemoLoading(true);
    try {
      await loginAsDemo();
      router.push('/dashboard');
    } catch (err) {
      console.error('Demo login error:', err);
      router.push('/login');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-28 border-b border-zinc-800/80 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/60 light:from-white light:via-zinc-50 light:to-zinc-100">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(#6366f1 1px, transparent 1px), radial-gradient(#27272a 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            backgroundPosition: '0 0, 16px 16px',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-mono text-xs tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>TRACEGUARD INTELLIGENCE ENGINE v1.0</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-100 light:text-zinc-900 font-sans">
            See what websites do <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-indigo-500">
              behind the page.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-zinc-400 light:text-zinc-600 leading-relaxed">
            TraceGuard turns browser privacy and security signals into clear, transparent website
            intelligence. Observe third-party connections, classified trackers, and cookie hygiene
            with strictly zero value interception.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              size="lg"
              onClick={() => setInstallModalOpen(true)}
              className="gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Install Extension</span>
            </Button>

            <Button
              size="lg"
              variant="secondary"
              isLoading={isDemoLoading}
              onClick={handleDemoClick}
              className="gap-2 border-zinc-700/80 bg-zinc-800/90 hover:bg-zinc-750"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>View Demo Dashboard</span>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 pt-6 text-2xs font-mono text-zinc-500 light:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              100% Local-First Analysis
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Zero Cookie Value Transmission
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Neutral Phrasing Model
            </span>
          </div>
        </div>
      </section>

      {/* Live Sample Telemetry Preview Bar */}
      <section className="py-12 border-b border-zinc-800/80 bg-zinc-900/40 light:bg-zinc-100/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4 light:bg-white light:border-zinc-200">
              <ScoreRing score={88} size={70} strokeWidth={6} showDetails={false} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono font-semibold text-zinc-200 light:text-zinc-800">
                    shop.example
                  </span>
                  <RiskBadge score={88} size="sm" />
                </div>
                <p className="text-2xs text-zinc-400 light:text-zinc-500">
                  Minimal third-party footprint · 0 high-risk telemetry endpoints observed.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4 light:bg-white light:border-zinc-200">
              <ScoreRing score={58} size={70} strokeWidth={6} showDetails={false} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono font-semibold text-zinc-200 light:text-zinc-800">
                    news.example
                  </span>
                  <RiskBadge score={58} size="sm" />
                </div>
                <p className="text-2xs text-zinc-400 light:text-zinc-500">
                  Multiple ad trackers detected · 12 cross-domain persistent identifiers.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4 light:bg-white light:border-zinc-200">
              <ScoreRing score={28} size={70} strokeWidth={6} showDetails={false} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono font-semibold text-zinc-200 light:text-zinc-800">
                    portal.example
                  </span>
                  <RiskBadge score={28} size="sm" />
                </div>
                <p className="text-2xs text-zinc-400 light:text-zinc-500">
                  Session replay scripts · Mixed HTTP content · High tracker concentration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: How It Works */}
      <section className="py-20 border-b border-zinc-800/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-400">
              Architecture & Lifecycle
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 light:text-zinc-900">
              How TraceGuard Works
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 light:text-zinc-600 max-w-xl mx-auto">
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
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold border border-emerald-500/30">
                  02
                </div>
                <CardTitle className="text-sm">Sanitization & Masking</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 leading-relaxed">
                Drops cookie `.value` strings instantly. Masks query keys (<code className="text-zinc-300">?token=</code>, <code className="text-zinc-300">?key=</code>) to <code className="text-zinc-300">[REDACTED]</code>. Authorization headers never persist.
              </CardContent>
            </Card>

            <Card className="border-zinc-800/80 bg-zinc-900/60">
              <CardHeader className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono text-xs font-bold border border-amber-500/30">
                  03
                </div>
                <CardTitle className="text-sm">Classifier Match</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 leading-relaxed">
                Resolves registrable domains via public suffix eTLD+1 logic. Matches against 2,850+
                tracker rules categorized into Advertising, Analytics, Session Replay, and CDN.
              </CardContent>
            </Card>

            <Card className="border-zinc-800/80 bg-zinc-900/60">
              <CardHeader className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-mono text-xs font-bold border border-purple-500/30">
                  04
                </div>
                <CardTitle className="text-sm">Score & Findings</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 leading-relaxed">
                Computes a weighted deduction across 7 categories (0–100 scale). Generates factual
                finding cards with observation rationale and explicit audit limitation notes.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 2: What TraceGuard Observes */}
      <section className="py-20 border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-400">
              Telemetry Scope
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 light:text-zinc-900">
              What TraceGuard Observes
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 light:text-zinc-600 max-w-xl mx-auto">
              Transparent visibility into active client-side signals without compromising user data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/70 space-y-3">
              <div className="p-2 w-fit rounded-lg bg-indigo-500/10 text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-100 light:text-zinc-900">
                Network & Third Parties
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Every external request is counted and matched across registrable domain boundaries.
                Identify high third-party request concentration and unencrypted HTTP assets.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/70 space-y-3">
              <div className="p-2 w-fit rounded-lg bg-amber-500/10 text-amber-400">
                <Fingerprint className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-100 light:text-zinc-900">
                Tracking Classifications
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Categorizes background services into Advertising, Analytics, Social Media, and
                invasive Session Replay scripts using transparent, open-source radar definitions.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/70 space-y-3">
              <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400">
                <Cookie className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-100 light:text-zinc-900">
                Cookie Hygiene Metadata
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Inspects flags (<code className="text-zinc-300">Secure</code>,{' '}
                <code className="text-zinc-300">HttpOnly</code>,{' '}
                <code className="text-zinc-300">SameSite</code>) and expiration longevity. We never
                read or store the cookie value.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Transparent Scoring */}
      <section className="py-20 border-b border-zinc-800/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-400">
              Scoring Model
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 light:text-zinc-900">
              Transparent, Weighted Scoring Formula
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 light:text-zinc-600 max-w-xl mx-auto">
              TraceGuard starts at 100 points. Penalties are deducted based on strict category caps
              with reproducible, deterministic rules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Penalty Categories */}
            <div className="space-y-3">
              {[
                { name: 'Trackers detected', max: 25, desc: 'Advertising, Session Replay, Analytics services' },
                { name: 'Insecure transport / mixed content', max: 25, desc: 'Non-HTTPS assets, unencrypted form endpoints' },
                { name: 'Third-party persistent cookies', max: 15, desc: 'Cookies set by 3rd parties lasting beyond the session' },
                { name: 'Third-party request concentration', max: 10, desc: 'Over 40% of page requests crossing boundary' },
                { name: 'Cookie configuration issues', max: 10, desc: 'Missing HttpOnly, Secure, or SameSite=None' },
                { name: 'Privacy-sensitive permissions', max: 10, desc: 'Geolocation, camera, microphone, notifications' },
                { name: 'Storage & other indicators', max: 5, desc: 'Excessive cross-context storage access keys' },
              ].map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/60 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-zinc-200 light:text-zinc-800">{cat.name}</div>
                    <div className="text-2xs text-zinc-500 light:text-zinc-400">{cat.desc}</div>
                  </div>
                  <span className="font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-2xs">
                    max -{cat.max} pts
                  </span>
                </div>
              ))}
            </div>

            {/* Neutral Bands Definition */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
              <h4 className="text-sm font-semibold font-mono uppercase tracking-wider text-zinc-200">
                Standardized Risk Bands
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                In strict accordance with our engineering charter, TraceGuard never brands a website
                as &ldquo;SAFE&rdquo; or &ldquo;UNSAFE&rdquo;. Findings reflect neutral, observed
                indicators only.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-850/60 border border-zinc-800">
                  <RiskBadge score={95} size="sm" showDescription />
                  <span className="font-mono text-2xs text-zinc-400">90 – 100</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-850/60 border border-zinc-800">
                  <RiskBadge score={80} size="sm" showDescription />
                  <span className="font-mono text-2xs text-zinc-400">75 – 89</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-850/60 border border-zinc-800">
                  <RiskBadge score={65} size="sm" showDescription />
                  <span className="font-mono text-2xs text-zinc-400">55 – 74</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-850/60 border border-zinc-800">
                  <RiskBadge score={45} size="sm" showDescription />
                  <span className="font-mono text-2xs text-zinc-400">35 – 54</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-850/60 border border-zinc-800">
                  <RiskBadge score={20} size="sm" showDescription />
                  <span className="font-mono text-2xs text-zinc-400">0 – 34</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 & 5: Privacy First & Open Architecture */}
      <section className="py-20 border-b border-zinc-800/80 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/80 space-y-4">
              <div className="p-2.5 w-fit rounded-lg bg-indigo-500/10 text-indigo-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 light:text-zinc-900">
                Privacy By Architectural Design
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                TraceGuard is engineered around hard privacy guarantees:
              </p>
              <ul className="space-y-2 text-xs text-zinc-300 light:text-zinc-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero cookie values:</strong> Only cookie name, flags, and expiration are
                    recorded. The value is discarded before telemetry is created.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Strict parameter redaction:</strong> Query params containing token, key,
                    secret, or auth are replaced with <code className="text-zinc-300">[REDACTED]</code>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Local execution by default:</strong> Cloud synchronization is strictly opt-in
                    requiring deliberate user authentication.
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-900/80 space-y-4">
              <div className="p-2.5 w-fit rounded-lg bg-purple-500/10 text-purple-400">
                <FileCode className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-100 light:text-zinc-900">
                Open, Auditable Architecture
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Built as a transparent monorepo with verified, deterministic test suites:
              </p>
              <ul className="space-y-2 text-xs text-zinc-300 light:text-zinc-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Verifiable Engine:</strong> 133 Vitest unit tests covering domain normalization,
                    tracker rules, and score penalty caps.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Public Rule Sources:</strong> Tracker radar compiled from DuckDuckGo Radar
                    and Disconnect lists under CC BY-NC-SA licenses.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Exportable Audits:</strong> Instant JSON & CSV reports complete with
                    methodology notes and disclaimers.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 text-center bg-zinc-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 light:text-zinc-900">
            Audit any website in seconds.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Experience real-time telemetry, transparent scores, and privacy intelligence today.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button size="lg" onClick={handleDemoClick} isLoading={isDemoLoading}>
              <Sparkles className="w-4 h-4 mr-2 text-amber-300" />
              Open Demo Dashboard
            </Button>
            <Link href="/privacy">
              <Button size="lg" variant="outline">
                Read Privacy Spec
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Extension Install Modal */}
      <Modal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        title="TraceGuard Chrome Extension Setup"
        description="Local-first browser auditing and telemetry."
      >
        <div className="space-y-4 text-xs text-zinc-300 light:text-zinc-600">
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-zinc-200 light:text-zinc-800">
            <span className="font-semibold text-indigo-400 block mb-1">
              Zero Raw Cookie / Header Transmission Guarantee
            </span>
            TraceGuard executes 100% locally inside the Chrome Service Worker. Cookie values,
            passwords, Authorization tokens, and request bodies are strictly excluded before analysis.
          </div>

          <ol className="list-decimal list-inside space-y-2 font-mono text-zinc-300 light:text-zinc-700">
            <li>
              Open Google Chrome or Chromium browser and navigate to{' '}
              <code className="text-indigo-400 bg-zinc-800/80 px-1 py-0.5 rounded">
                chrome://extensions
              </code>
            </li>
            <li>
              Enable <span className="text-zinc-100 font-semibold">Developer mode</span> in the top right corner.
            </li>
            <li>
              Click <span className="text-zinc-100 font-semibold">Load unpacked</span> and select the folder:{' '}
              <code className="text-zinc-400 bg-zinc-800 px-1 py-0.5 rounded block mt-1 break-all">
                c:\Users\PC\Documents\ProJectos\TraceGuard\apps\extension\dist
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
