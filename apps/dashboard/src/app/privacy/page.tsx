'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  Shield,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileCode,
  ArrowRight,
  Sparkles,
  Server,
  Layers,
  Database,
} from 'lucide-react';

export default function PrivacySpecPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 space-y-12">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-mono text-xs tracking-wider">
          <Shield className="w-3.5 h-3.5" />
          <span>TECHNICAL AUDIT & PRIVACY SPECIFICATION</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-100 light:text-zinc-900">
          Privacy & Security Architecture
        </h1>
        <p className="mx-auto max-w-2xl text-xs sm:text-sm text-zinc-400 light:text-zinc-600 leading-relaxed">
          TraceGuard is designed from the ground up as a defensive awareness and auditing tool.
          This specification details our local-first guarantees, strict redaction boundaries, neutral
          scoring methodology, and intentional product limitations.
        </p>
      </div>

      {/* 1. Core Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 light:text-zinc-900">100% Local-First Engine</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            By default, request classification, cookie metadata inspection, and score deductions execute
            entirely inside your browser extension. No website URLs or telemetry leave your machine
            unless you explicitly authenticate and choose to persist an audit.
          </p>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 light:text-zinc-900">Strict Redaction Rules</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Raw cookie <code className="text-zinc-300">.value</code> strings are immediately discarded in memory.
            Sensitive query parameters (<code className="text-zinc-300">?token=</code>, <code className="text-zinc-300">?auth=</code>, <code className="text-zinc-300">?key=</code>) are masked to <code className="text-zinc-300">[REDACTED]</code>. Authorization headers and request bodies are never stored.
          </p>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/80 p-5 space-y-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-zinc-100 light:text-zinc-900">Neutral Analytical Phrasing</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            TraceGuard adheres to strict engineering rules: we never emit alarmist labels like &quot;SAFE&quot;,
            &quot;UNSAFE&quot;, or &quot;MALICIOUS&quot;. Findings present factual observations, explain why they matter,
            and explicitly state what cannot be concluded.
          </p>
        </Card>
      </div>

      {/* 2. Redaction Matrix Table */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 light:text-zinc-900">
            Telemetry Redaction & Boundary Matrix
          </h2>
          <p className="text-xs text-zinc-400">
            Granular breakdown of what is captured versus what is mathematically rejected.
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/90 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Browser Telemetry Signal</TableHead>
                <TableHead>Captured Attributes</TableHead>
                <TableHead>Strict Redaction Rule</TableHead>
                <TableHead>Transmission Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-xs">HTTP Request Cookies</TableCell>
                <TableCell className="text-2xs font-mono text-zinc-300">
                  name, domain, path, Secure, HttpOnly, SameSite, expirationDays
                </TableCell>
                <TableCell className="text-2xs text-emerald-400 font-mono">
                  Raw .value is NEVER read or stored
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-2xs font-mono border-emerald-500/40 text-emerald-400">
                    Metadata Only
                  </Badge>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium text-xs">URL Query Parameters</TableCell>
                <TableCell className="text-2xs font-mono text-zinc-300">
                  protocol, hostname, pathname, benign query keys
                </TableCell>
                <TableCell className="text-2xs text-amber-400 font-mono">
                  token, auth, key, secret, password, session, code, jwt → [REDACTED]
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-2xs font-mono border-amber-500/40 text-amber-400">
                    Sanitized
                  </Badge>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium text-xs">HTTP Headers</TableCell>
                <TableCell className="text-2xs font-mono text-zinc-300">
                  Content-Type, method, status code, security response headers (CSP, HSTS)
                </TableCell>
                <TableCell className="text-2xs text-red-400 font-mono">
                  Authorization, Cookie, Set-Cookie headers scrubbed
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-2xs font-mono border-red-500/40 text-red-400">
                    Scrubbed
                  </Badge>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium text-xs">HTTP Request / POST Bodies</TableCell>
                <TableCell className="text-2xs font-mono text-zinc-300">
                  None (Resource type and method only)
                </TableCell>
                <TableCell className="text-2xs text-red-400 font-mono">
                  Body payloads are NEVER captured or buffered
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-2xs font-mono border-zinc-700 text-zinc-400">
                    Zero Capture
                  </Badge>
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell className="font-medium text-xs">Web Storage (localStorage / sessionStorage)</TableCell>
                <TableCell className="text-2xs font-mono text-zinc-300">
                  Storage key name, accessing domain, timestamp
                </TableCell>
                <TableCell className="text-2xs text-emerald-400 font-mono">
                  Stored values and object contents are never read
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-2xs font-mono border-emerald-500/40 text-emerald-400">
                    Keys Only
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* 3. Transparent Scoring Model */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 light:text-zinc-900">
            Scoring Deduction Model & Risk Bands
          </h2>
          <p className="text-xs text-zinc-400">
            Sites begin with 100 baseline points. Deductions apply across 7 bounded categories.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Deductions Table */}
          <Card className="border-zinc-800 bg-zinc-900/90 p-4">
            <h3 className="text-xs font-mono uppercase text-indigo-400 mb-3 font-semibold">
              Penalty Categories (Max 100 total deduction)
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-zinc-200">Trackers detected (Radar classification)</span>
                <span className="font-mono font-bold text-amber-400">Max -25 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-zinc-200">Insecure transport / mixed HTTP content</span>
                <span className="font-mono font-bold text-red-400">Max -25 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-zinc-200">Third-party persistent cookies</span>
                <span className="font-mono font-bold text-amber-400">Max -15 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-zinc-200">Third-party request concentration</span>
                <span className="font-mono font-bold text-zinc-300">Max -10 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-zinc-200">Cookie configuration (Missing Secure/HttpOnly)</span>
                <span className="font-mono font-bold text-zinc-300">Max -10 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-zinc-200">Privacy-sensitive permissions requested</span>
                <span className="font-mono font-bold text-zinc-300">Max -10 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-850">
                <span className="text-zinc-200">Storage & other technical indicators</span>
                <span className="font-mono font-bold text-zinc-300">Max -5 pts</span>
              </div>
            </div>
          </Card>

          {/* Standardized Risk Bands */}
          <Card className="border-zinc-800 bg-zinc-900/90 p-4">
            <h3 className="text-xs font-mono uppercase text-indigo-400 mb-3 font-semibold">
              Standardized Risk Bands
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-zinc-950 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-emerald-400 block">90 – 100 · MINIMAL</span>
                  <span className="text-2xs text-zinc-400">Minimal observed risk indicators</span>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono text-2xs">
                  MINIMAL
                </Badge>
              </div>

              <div className="p-2.5 rounded bg-zinc-950 border border-lime-500/30 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-lime-400 block">75 – 89 · LOW</span>
                  <span className="text-2xs text-zinc-400">Low observed risk indicators</span>
                </div>
                <Badge variant="outline" className="border-lime-500/40 text-lime-400 font-mono text-2xs">
                  LOW
                </Badge>
              </div>

              <div className="p-2.5 rounded bg-zinc-950 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-amber-400 block">55 – 74 · MODERATE</span>
                  <span className="text-2xs text-zinc-400">Moderate observed risk indicators</span>
                </div>
                <Badge variant="outline" className="border-amber-500/40 text-amber-400 font-mono text-2xs">
                  MODERATE
                </Badge>
              </div>

              <div className="p-2.5 rounded bg-zinc-950 border border-orange-500/30 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-orange-400 block">35 – 54 · ELEVATED</span>
                  <span className="text-2xs text-zinc-400">Elevated observed risk indicators</span>
                </div>
                <Badge variant="outline" className="border-orange-500/40 text-orange-400 font-mono text-2xs">
                  ELEVATED
                </Badge>
              </div>

              <div className="p-2.5 rounded bg-zinc-950 border border-red-500/30 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-red-400 block">0 – 34 · HIGH</span>
                  <span className="text-2xs text-zinc-400">High observed risk indicators</span>
                </div>
                <Badge variant="outline" className="border-red-500/40 text-red-400 font-mono text-2xs">
                  HIGH
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. Product Limitations & Disclaimers */}
      <section id="limits" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 light:text-zinc-900">
            Product Boundaries & Limitations
          </h2>
          <p className="text-xs text-zinc-400">
            Explicit technical disclaimers on what TraceGuard can and cannot determine.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-1.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2 font-semibold text-zinc-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Client-Side Observation Window</span>
            </div>
            <p className="leading-relaxed">
              TraceGuard inspects network requests, cookies, and DOM indicators initiated while the browser tab is open and being audited. Requests or cookies initiated outside the observation window or after deferred user interactions cannot be captured retrospectively.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-1.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2 font-semibold text-zinc-200">
              <Server className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Server-Side Tracking & Processing</span>
            </div>
            <p className="leading-relaxed">
              TraceGuard cannot inspect server-side logging, server-to-server tracking APIs (e.g., Meta Conversions API, Google Server-Side Tag Manager), or backend data brokers. A website with zero observed client-side trackers may still forward user analytics via backend relays.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-1.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2 font-semibold text-zinc-200">
              <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>No Legal or Compliance Guarantees</span>
            </div>
            <p className="leading-relaxed">
              TraceGuard is strictly a technical auditing and security awareness tool. It does not provide legal opinions regarding GDPR, ePrivacy Directive, CCPA/CPRA, or HIPAA compliance. Audit scores reflect client-side technical indicators, not legal certification.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Call to Action */}
      <div className="p-8 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/40 text-center space-y-4">
        <h3 className="text-xl font-bold text-zinc-100 light:text-zinc-900">
          Ready to audit websites with transparent intelligence?
        </h3>
        <p className="text-xs text-zinc-400 max-w-lg mx-auto">
          Install the local Chrome extension or explore our pre-seeded Demo Mode dashboard in one click.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button size="sm" className="gap-2">
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" variant="outline" className="gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Launch Demo Mode</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
