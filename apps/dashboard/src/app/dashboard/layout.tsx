'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  History,
  GitCompare,
  BarChart3,
  Settings,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, loginAsDemo } = useAuth();

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/scans', label: 'Scan History', icon: History },
    { href: '/dashboard/compare', label: 'Site Comparison', icon: GitCompare },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="font-mono text-xs text-zinc-400">Loading TraceGuard session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-zinc-900/90 p-8 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100">Authentication Required</h2>
          <p className="text-xs text-zinc-400">
            The dashboard connects to your authenticated FastAPI account to display real database
            scans, risk distributions, and telemetry records.
          </p>
          <div className="space-y-2 pt-2">
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold gap-2"
              onClick={async () => {
                await loginAsDemo();
                router.refresh();
              }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Demo Mode (1-Click)</span>
            </Button>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full">
                Sign In With Existing Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDemo = user?.email === 'demo@traceguard.local';

  return (
    <div className="flex flex-1 flex-col md:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 gap-6">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-56 shrink-0 no-print">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-3 space-y-4 light:bg-white light:border-zinc-200">
          {/* User Account Capsule */}
          <div className="p-2.5 rounded-lg bg-zinc-850/80 border border-zinc-800 light:bg-zinc-100 light:border-zinc-200">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
                Active Account
              </span>
              {isDemo && (
                <span className="text-2xs font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                  DEMO
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-zinc-200 light:text-zinc-800 truncate mt-1">
              {user?.full_name || user?.email.split('@')[0]}
            </div>
            <div className="text-2xs font-mono text-zinc-500 truncate">
              {user?.email}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 light:text-zinc-600 light:hover:text-zinc-900 light:hover:bg-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick Info Box */}
          <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-850 text-2xs text-zinc-400 space-y-1 light:bg-zinc-50 light:border-zinc-200">
            <div className="font-mono text-zinc-300 font-semibold">Local Audit Policy</div>
            <p className="text-zinc-500 leading-tight">
              Cookie values & tokens are stripped prior to backend submission.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
