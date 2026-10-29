'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '../ui/Button';
import { Shield, ShieldAlert, Download, LogIn, LogOut, User, Menu, X, Search, FileCode2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CommandPalette } from '../CommandPalette';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = [
    { href: '/dashboard', label: 'Overview', authRequired: true },
    { href: '/dashboard/scans', label: 'Scans', authRequired: true },
    { href: '/dashboard/compare', label: 'Compare', authRequired: true },
    { href: '/dashboard/analytics', label: 'Analytics', authRequired: true },
    { href: '/sandbox', label: 'Sandbox', authRequired: false },
    { href: '/dashboard/settings', label: 'Settings', authRequired: true },
    { href: '/privacy', label: 'Privacy Spec', authRequired: false },
  ];

  const isDemo = user?.email === 'demo@traceguard.local';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md light:bg-white/90 light:border-zinc-200">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand Tagline */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 group-hover:border-indigo-400/50 transition-colors">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-sm font-bold tracking-wider text-zinc-100 light:text-zinc-900 leading-none">
                  TRACE<span className="text-indigo-400">GUARD</span>
                </span>
                <span className="text-2xs text-zinc-500 light:text-zinc-400 hidden sm:inline leading-none mt-0.5">
                  Web Intelligence
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-zinc-850 text-zinc-100 font-semibold light:bg-zinc-100 light:text-zinc-900'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 light:text-zinc-600 light:hover:text-zinc-900 light:hover:bg-zinc-100'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInstallModalOpen(true)}
              className="hidden sm:inline-flex text-xs h-8 gap-1.5 border-zinc-800 hover:border-indigo-500/40 text-zinc-300 light:border-zinc-300 light:text-zinc-700"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Install Extension</span>
            </Button>

            {/* Quick Cmd+K Palette Trigger */}
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 text-xs text-zinc-400 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors shadow-sm"
              title="Quick command palette (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden lg:inline text-2xs">Quick Jump...</span>
              <kbd className="text-3xs font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-700/60">
                ⌘K
              </kbd>
            </button>

            <ThemeToggle />

            {isAuthenticated ? (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800 light:border-zinc-200">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-mono text-zinc-200 light:text-zinc-800 leading-none">
                    {user?.full_name || user?.email.split('@')[0]}
                  </span>
                  {isDemo && (
                    <span className="text-2xs font-mono text-amber-400 leading-none mt-0.5">
                      Demo Mode
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  title="Sign out"
                  className="text-zinc-400 hover:text-red-400 h-8 px-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline ml-1 text-xs">Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="h-8 text-xs">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-3 light:bg-white light:border-zinc-200 space-y-1">
            {isAuthenticated ? (
              navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-xs font-medium text-zinc-300 hover:bg-zinc-850 light:text-zinc-700 light:hover:bg-zinc-100"
                >
                  {link.label}
                </Link>
              ))
            ) : (
              <Link
                href="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-xs font-medium text-zinc-300 hover:bg-zinc-850 light:text-zinc-700 light:hover:bg-zinc-100"
              >
                Privacy Spec
              </Link>
            )}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setInstallModalOpen(true);
                }}
                className="w-full text-xs h-8"
              >
                Install Extension Guide
              </Button>
            </div>
          </div>
        )}
      </header>

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

      {/* Global Command Palette */}
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
