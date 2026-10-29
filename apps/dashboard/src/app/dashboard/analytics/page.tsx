'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, ScanItem, ScanDetail, Finding } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import {
  BarChart3,
  Layers,
  Fingerprint,
  Cookie,
  ShieldCheck,
  ShieldAlert,
  Activity,
  RefreshCw,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';

interface DomainStat {
  hostname: string;
  category: string;
  isTracker: boolean;
  scanCount: number;
  totalRequests: number;
}

export default function AnalyticsPage() {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [scanDetails, setScanDetails] = useState<ScanDetail[]>([]);
  const [allFindings, setAllFindings] = useState<Finding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const scanList = await api.scans.list();
      setScans(scanList);

      // Fetch details for up to 10 recent scans for deep cross-scan telemetry
      const details = await Promise.all(
        scanList.slice(0, 10).map((s) => api.scans.get(s.id).catch(() => null))
      );
      setScanDetails(details.filter((d): d is ScanDetail => d !== null));

      // Fetch all findings
      const findings = await api.findings.list().catch(() => []);
      setAllFindings(findings);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compile cross-scan analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  // 1. Tracker Category Distribution
  const trackerCategoryData = useMemo(() => {
    const counts: Record<string, number> = {
      Advertising: 0,
      Analytics: 0,
      'Social Media': 0,
      'Session Replay': 0,
      'Customer Support': 0,
      'CDN/Infrastructure': 0,
      Content: 0,
      Unknown: 0,
    };

    scanDetails.forEach((scan) => {
      scan.scan_domains.forEach((sd) => {
        if (sd.domain?.is_tracker) {
          const cat = sd.domain.category || 'Unknown';
          counts[cat] = (counts[cat] || 0) + 1;
        }
      });
    });

    const colors: Record<string, string> = {
      Advertising: '#ef4444',
      Analytics: '#f59e0b',
      'Social Media': '#ec4899',
      'Session Replay': '#8b5cf6',
      'Customer Support': '#3b82f6',
      'CDN/Infrastructure': '#10b981',
      Content: '#6366f1',
      Unknown: '#71717a',
    };

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: colors[name] || '#6366f1',
      }))
      .sort((a, b) => b.value - a.value);
  }, [scanDetails]);

  // 2. Cookie Hygiene Analysis
  const cookieHygieneStats = useMemo(() => {
    let totalCookies = 0;
    let secureCount = 0;
    let httpOnlyCount = 0;
    let sessionCount = 0;
    let persistentCount = 0;
    let thirdPartyCount = 0;
    const sameSiteCounts: Record<string, number> = {
      Strict: 0,
      Lax: 0,
      None: 0,
      Unspecified: 0,
    };

    scanDetails.forEach((scan) => {
      scan.cookies.forEach((c) => {
        totalCookies++;
        if (c.is_secure) secureCount++;
        if (c.is_http_only) httpOnlyCount++;
        if (c.is_session) sessionCount++;
        else persistentCount++;
        if (c.is_third_party) thirdPartyCount++;
        const ss = c.same_site || 'Unspecified';
        sameSiteCounts[ss] = (sameSiteCounts[ss] || 0) + 1;
      });
    });

    return {
      total: totalCookies,
      securePercent: totalCookies > 0 ? Math.round((secureCount / totalCookies) * 100) : 0,
      httpOnlyPercent: totalCookies > 0 ? Math.round((httpOnlyCount / totalCookies) * 100) : 0,
      thirdPartyPercent: totalCookies > 0 ? Math.round((thirdPartyCount / totalCookies) * 100) : 0,
      persistentPercent: totalCookies > 0 ? Math.round((persistentCount / totalCookies) * 100) : 0,
      sameSiteData: Object.entries(sameSiteCounts).map(([name, value]) => ({ name, value })),
    };
  }, [scanDetails]);

  // 3. Most Prevalent Third-Party Domains
  const topThirdParties = useMemo<DomainStat[]>(() => {
    const domainMap = new Map<string, DomainStat>();

    scanDetails.forEach((scan) => {
      scan.scan_domains.forEach((sd) => {
        if (!sd.is_third_party || !sd.domain) return;
        const key = sd.domain.hostname;
        const existing = domainMap.get(key);
        if (existing) {
          existing.scanCount += 1;
          existing.totalRequests += sd.request_count;
        } else {
          domainMap.set(key, {
            hostname: sd.domain.hostname,
            category: sd.domain.category,
            isTracker: sd.domain.is_tracker,
            scanCount: 1,
            totalRequests: sd.request_count,
          });
        }
      });
    });

    return Array.from(domainMap.values())
      .sort((a, b) => b.scanCount - a.scanCount || b.totalRequests - a.totalRequests)
      .slice(0, 10);
  }, [scanDetails]);

  // 4. Score Trends
  const scoreTrendData = useMemo(() => {
    return scans
      .slice()
      .reverse()
      .map((s) => ({
        hostname: s.hostname.length > 12 ? s.hostname.substring(0, 10) + '…' : s.hostname,
        fullHostname: s.hostname,
        score: s.overall_score,
        risk: s.risk_level,
      }));
  }, [scans]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 light:text-zinc-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Cross-Scan Intelligence</span>
          </h1>
          <p className="text-xs text-zinc-400 light:text-zinc-500">
            Aggregate privacy signals, tracker prevalence, and cookie hygiene across all audited sites.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAnalyticsData}
          className="text-xs h-8 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="font-mono text-xs text-zinc-400">Compiling cross-scan analytics...</span>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          {error}
        </div>
      ) : scans.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
          <BarChart3 className="w-10 h-10 mx-auto text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-200">No scan telemetry recorded</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Audit websites with the TraceGuard extension or switch to Demo Mode to explore live
            analytics charts.
          </p>
          <Link href="/login">
            <Button size="sm">Explore Demo Mode</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-zinc-900/90 border-zinc-800">
              <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                Audited Sites
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-zinc-100 light:text-zinc-900">
                  {scans.length}
                </span>
                <span className="text-2xs text-zinc-500 font-mono">records</span>
              </div>
            </Card>

            <Card className="p-4 bg-zinc-900/90 border-zinc-800">
              <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                Observed Cookies
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-zinc-100 light:text-zinc-900">
                  {cookieHygieneStats.total}
                </span>
                <span className="text-2xs text-zinc-500 font-mono">
                  ({cookieHygieneStats.thirdPartyPercent}% 3rd-party)
                </span>
              </div>
            </Card>

            <Card className="p-4 bg-zinc-900/90 border-zinc-800">
              <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                Secure Cookie Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold font-mono ${
                    cookieHygieneStats.securePercent >= 80
                      ? 'text-emerald-400'
                      : cookieHygieneStats.securePercent >= 50
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {cookieHygieneStats.securePercent}%
                </span>
                <span className="text-2xs text-zinc-500 font-mono">HTTPS-only</span>
              </div>
            </Card>

            <Card className="p-4 bg-zinc-900/90 border-zinc-800">
              <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                HttpOnly Guard Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold font-mono ${
                    cookieHygieneStats.httpOnlyPercent >= 60 ? 'text-indigo-400' : 'text-zinc-300'
                  }`}
                >
                  {cookieHygieneStats.httpOnlyPercent}%
                </span>
                <span className="text-2xs text-zinc-500 font-mono">script-isolated</span>
              </div>
            </Card>
          </div>

          {/* Charts Row: Tracker Categories & Cookie SameSite */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tracker Category Breakdown */}
            <Card className="border-zinc-800 bg-zinc-900/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tracker Category Distribution</CardTitle>
                <p className="text-2xs text-zinc-400">
                  Classified tracking endpoints observed across all audited websites.
                </p>
              </CardHeader>
              <CardContent>
                {trackerCategoryData.length === 0 ? (
                  <div className="h-60 flex items-center justify-center text-xs text-zinc-500">
                    No tracker endpoints recorded in recent scans.
                  </div>
                ) : (
                  <div className="h-60 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trackerCategoryData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#71717a"
                          fontSize={10}
                          fontFamily="monospace"
                          angle={-15}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          stroke="#71717a"
                          fontSize={10}
                          fontFamily="monospace"
                          allowDecimals={false}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs shadow-md">
                                  <span className="font-semibold" style={{ color: d.color }}>
                                    {d.name}:
                                  </span>{' '}
                                  <span className="font-mono text-zinc-200">
                                    {d.value} observed endpoints
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {trackerCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Score History / Trend across Scans */}
            <Card className="border-zinc-800 bg-zinc-900/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Audit Score History</CardTitle>
                <p className="text-2xs text-zinc-400">
                  Scores calculated for chronological website audits (0–100 scale).
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-60 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={scoreTrendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="hostname"
                        stroke="#71717a"
                        fontSize={10}
                        fontFamily="monospace"
                        angle={-15}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#71717a"
                        fontSize={10}
                        fontFamily="monospace"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs shadow-md">
                                <div className="font-mono font-semibold text-zinc-200">
                                  {d.fullHostname}
                                </div>
                                <div className="text-indigo-400 font-mono mt-0.5">
                                  Score: {d.score} / 100 ({d.risk})
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]}>
                        {scoreTrendData.map((entry, index) => {
                          const color =
                            entry.score >= 90
                              ? '#22c55e'
                              : entry.score >= 75
                              ? '#84cc16'
                              : entry.score >= 55
                              ? '#f59e0b'
                              : entry.score >= 35
                              ? '#f97316'
                              : '#ef4444';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prevalent Third-Party Domains Matrix */}
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-sm">Prevalent Third-Party Domains</CardTitle>
              <p className="text-2xs text-zinc-400">
                Third-party domains appearing most frequently across multiple website audits.
              </p>
            </CardHeader>
            <CardContent>
              {topThirdParties.length === 0 ? (
                <div className="text-xs text-zinc-500 py-4 text-center">
                  No third-party domains recorded.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Observed Domain</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Tracker Classification</TableHead>
                      <TableHead>Appears In</TableHead>
                      <TableHead>Total Requests</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topThirdParties.map((tp) => (
                      <TableRow key={tp.hostname}>
                        <TableCell className="font-mono text-xs font-semibold text-zinc-200">
                          {tp.hostname}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-2xs">
                            {tp.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tp.isTracker ? (
                            <span className="inline-flex items-center gap-1 text-2xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                              <Fingerprint className="w-3 h-3" />
                              Classified Tracker
                            </span>
                          ) : (
                            <span className="text-2xs font-mono text-zinc-400">
                              Neutral Third Party
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {tp.scanCount} {tp.scanCount === 1 ? 'scan' : 'scans'}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-300">
                          {tp.totalRequests}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Privacy & Architecture Disclaimer */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-2xs text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-300 font-mono">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Analytical Phrasing & Telemetry Disclaimer</span>
            </div>
            <p>
              TraceGuard aggregates client-side network and DOM indicators captured during scan sessions.
              Counts reflect observed activity in the browser sandbox. No cookie values, request payloads,
              or authorization credentials are ever collected or aggregated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
