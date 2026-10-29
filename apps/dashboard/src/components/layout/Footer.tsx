import React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-zinc-800/80 bg-zinc-950 py-8 text-zinc-400 light:bg-zinc-50 light:border-zinc-200 light:text-zinc-600 no-print">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono text-sm font-bold text-zinc-100 light:text-zinc-900 tracking-wider">
                TRACEGUARD
              </span>
            </div>
            <p className="text-xs text-zinc-400 light:text-zinc-500 max-w-md leading-relaxed">
              Defensive web privacy & security intelligence. We observe client-side telemetry, classify
              tracking services against public radar rules, and calculate transparent scores with zero
              cookie value transmission.
            </p>
            <div className="text-2xs font-mono text-zinc-500 light:text-zinc-400 pt-1">
              Rule engine v1.0.0 · Dual Local-First Architecture
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200 light:text-zinc-800 mb-3">
              Auditing Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-indigo-400 transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/dashboard/scans" className="hover:text-indigo-400 transition-colors">
                  Scan History
                </Link>
              </li>
              <li>
                <Link href="/dashboard/compare" className="hover:text-indigo-400 transition-colors">
                  Site Comparison
                </Link>
              </li>
              <li>
                <Link href="/dashboard/analytics" className="hover:text-indigo-400 transition-colors">
                  Cross-Scan Analytics
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-200 light:text-zinc-800 mb-3">
              Privacy & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-indigo-400 transition-colors">
                  Privacy & Redaction Spec
                </Link>
              </li>
              <li>
                <Link href="/privacy#limits" className="hover:text-indigo-400 transition-colors">
                  Observation Limits
                </Link>
              </li>
              <li>
                <span className="text-zinc-500">Local-First Sandbox</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-900 pt-6 flex flex-col sm:flex-row items-center justify-between text-2xs text-zinc-500 light:border-zinc-200">
          <p>
            © {new Date().getFullYear()} TraceGuard. Strictly defensive awareness auditing tool.
            Never uses alarmist or arbitrary labels.
          </p>
          <p className="mt-2 sm:mt-0 font-mono">
            Neutral analytical intelligence.
          </p>
        </div>
      </div>
    </footer>
  );
}
