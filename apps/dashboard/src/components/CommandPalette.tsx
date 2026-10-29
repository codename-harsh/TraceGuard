'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  ShieldAlert,
  GitCompare,
  BarChart3,
  Settings,
  Shield,
  FileCode2,
  ExternalLink,
  Sun,
  Moon,
  Globe,
  Sparkles,
  X,
} from 'lucide-react';
import { useTheme } from './providers/ThemeProvider';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Scans' | 'Actions';
  icon: React.ReactNode;
  action: () => void;
  badge?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Dashboard Overview',
      subtitle: 'View security aggregates, recent audits & risk distribution',
      category: 'Navigation',
      icon: <LayoutDashboard className="w-4 h-4 text-indigo-400" />,
      action: () => router.push('/dashboard'),
    },
    {
      id: 'nav-scans',
      title: 'Scan History',
      subtitle: 'Filter, inspect, and export all recorded website scans',
      category: 'Navigation',
      icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
      action: () => router.push('/dashboard/scans'),
    },
    {
      id: 'nav-sandbox',
      title: 'Privacy & Redaction Sandbox',
      subtitle: 'Simulate live signals, URL query masking & Base-100 scoring',
      category: 'Navigation',
      icon: <FileCode2 className="w-4 h-4 text-emerald-400" />,
      badge: 'Live Tool',
      action: () => router.push('/sandbox'),
    },
    {
      id: 'nav-compare',
      title: 'Site-by-Site Comparison',
      subtitle: 'Side-by-side Score Ring comparison and tracker deltas',
      category: 'Navigation',
      icon: <GitCompare className="w-4 h-4 text-cyan-400" />,
      action: () => router.push('/dashboard/compare'),
    },
    {
      id: 'nav-analytics',
      title: 'Analytics & Risk Radar',
      subtitle: '7-category penalty distribution & tracker prevalence',
      category: 'Navigation',
      icon: <BarChart3 className="w-4 h-4 text-purple-400" />,
      action: () => router.push('/dashboard/analytics'),
    },
    {
      id: 'nav-settings',
      title: 'Settings & Security Profile',
      subtitle: 'Manage cloud sync, default strict redaction & themes',
      category: 'Navigation',
      icon: <Settings className="w-4 h-4 text-zinc-400" />,
      action: () => router.push('/dashboard/settings'),
    },
    {
      id: 'nav-privacy',
      title: 'Privacy Specification & Rules',
      subtitle: 'Review GEMINI.md hard redaction model & boundaries',
      category: 'Navigation',
      icon: <Shield className="w-4 h-4 text-blue-400" />,
      action: () => router.push('/privacy'),
    },

    // Seeded Scans
    {
      id: 'scan-news',
      title: 'Inspect: news.example',
      subtitle: 'Score: 48 (ELEVATED) • 5 Trackers • Insecure HTTP asset',
      category: 'Scans',
      icon: <Globe className="w-4 h-4 text-amber-400" />,
      badge: 'Score 48',
      action: () => router.push('/dashboard/scans/scan-demo-news-1'),
    },
    {
      id: 'scan-shop',
      title: 'Inspect: shop.example',
      subtitle: 'Score: 68 (MODERATE) • Session Replay script observed',
      category: 'Scans',
      icon: <Globe className="w-4 h-4 text-blue-400" />,
      badge: 'Score 68',
      action: () => router.push('/dashboard/scans/scan-demo-shop-2'),
    },
    {
      id: 'scan-blog',
      title: 'Inspect: blog.example',
      subtitle: 'Score: 94 (MINIMAL) • Zero 3rd-party trackers • Strict isolation',
      category: 'Scans',
      icon: <Globe className="w-4 h-4 text-emerald-400" />,
      badge: 'Score 94',
      action: () => router.push('/dashboard/scans/scan-demo-blog-3'),
    },
    {
      id: 'scan-portal',
      title: 'Inspect: portal.example',
      subtitle: 'Score: 81 (LOW) • Authenticated session with telemetry beacon',
      category: 'Scans',
      icon: <Globe className="w-4 h-4 text-cyan-400" />,
      badge: 'Score 81',
      action: () => router.push('/dashboard/scans/scan-demo-portal-4'),
    },

    // Quick Actions
    {
      id: 'action-compare-demo',
      title: 'Quick Compare: news.example vs shop.example',
      subtitle: 'Compare news media tracking vs e-commerce session replay',
      category: 'Actions',
      icon: <GitCompare className="w-4 h-4 text-indigo-400" />,
      action: () =>
        router.push(
          '/dashboard/compare?scan_a=scan-demo-news-1&scan_b=scan-demo-shop-2'
        ),
    },
    {
      id: 'action-theme-toggle',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: `Current theme: ${theme}`,
      category: 'Actions',
      icon:
        theme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-400" />
        ),
      action: () => toggleTheme(),
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.subtitle && cmd.subtitle.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  const handleSelect = (cmd: CommandItem) => {
    cmd.action();
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleSelect(filteredCommands[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl shadow-indigo-500/10 text-zinc-100 flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800/80 gap-3">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search audits, or jump to a page..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-2xs font-mono text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 rounded">
            ESC to close
          </kbd>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md sm:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 font-mono">
              No matching commands or audits found for &quot;{query}&quot;.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
                      : 'hover:bg-zinc-850/60 border border-transparent text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-zinc-800/80 text-zinc-400'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium tracking-tight truncate">
                          {cmd.title}
                        </span>
                        {cmd.badge && (
                          <span className="px-1.5 py-0.5 text-3xs font-mono rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      {cmd.subtitle && (
                        <span className="text-2xs text-zinc-400 truncate">
                          {cmd.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-3xs font-mono text-zinc-500 uppercase tracking-widest pl-3 shrink-0">
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-zinc-800/80 bg-zinc-950/40 text-3xs font-mono text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>TraceGuard Quick Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
}
