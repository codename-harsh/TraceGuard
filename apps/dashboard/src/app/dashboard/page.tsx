'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, SitesOverview } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';
import {
  Shield,
  Layers,
  Fingerprint,
  Activity,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
} from 'recharts';

export default function DashboardOverviewPage() {
  const [data, setData] = useState<SitesOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.sites.getOverview();
      setData(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load overview data');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="font-mono text-xs text-zinc-400">Loading live site metrics...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 space-y-3">
        <div className="font-semibold text-sm">Failed to load dashboard metrics</div>
        <p className="text-xs">{error || 'Unknown error occurred'}</p>
        <Button size="sm" variant="outline" onClick={fetchOverview} className="border-red-500/40">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  // Risk Distribution Chart Data
  const riskChartData = [
    { name: 'MINIMAL', count: data.risk_distribution.MINIMAL, color: '#22c55e', desc: '90–100' },
    { name: 'LOW', count: data.risk_distribution.LOW, color: '#84cc16', desc: '75–89' },
    { name: 'MODERATE', count: data.risk_distribution.MODERATE, color: '#f59e0b', desc: '55–74' },
    { name: 'ELEVATED', count: data.risk_distribution.ELEVATED, color: '#f97316', desc: '35–54' },
    { name: 'HIGH', count: data.risk_distribution.HIGH, color: '#ef4444', desc: '0–34' },
  ];

  // Recent Scan Scores Trend
  const recentScoresData = (data.recent_scans || [])
    .slice()
    .reverse()
    .map((s) => ({
      name: s.hostname.length > 14 ? s.hostname.substring(0, 12) + '…' : s.hostname,
      score: s.overall_score,
      risk: s.risk_level,
      trackers: s.tracker_count,
    }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 light:text-zinc-900 tracking-tight">
            Security & Privacy Overview
          </h1>
          <p className="text-xs text-zinc-400 light:text-zinc-500">
            Real-time aggregate intelligence calculated from authenticated database records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOverview}
            className="text-xs h-8 gap-1.5"
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
          <Link href="/dashboard/scans">
            <Button size="sm" className="text-xs h-8 gap-1.5">
              <span>View All Scans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sites Analyzed */}
        <Card className="p-4 bg-zinc-900/90 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
              Sites Analyzed
            </span>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100 light:text-zinc-900">
              {data.total_scans}
            </span>
            <span className="text-2xs text-zinc-500 font-mono">
              ({data.unique_hostnames} unique domains)
            </span>
          </div>
        </Card>

        {/* Average Observed Score */}
        <Card className="p-4 bg-zinc-900/90 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
              Average Observed Score
            </span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100 light:text-zinc-900">
              {data.average_score}
            </span>
            <span className="text-2xs text-zinc-500 font-mono">/ 100</span>
          </div>
        </Card>

        {/* Trackers Observed */}
        <Card className="p-4 bg-zinc-900/90 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
              Trackers Observed
            </span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
              <Fingerprint className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {data.total_trackers}
            </span>
            <span className="text-2xs text-zinc-500">classified endpoints</span>
          </div>
        </Card>

        {/* Third-Party Domains */}
        <Card className="p-4 bg-zinc-900/90 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
              Third-Party Domains
            </span>
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100 light:text-zinc-900">
              {data.total_third_parties}
            </span>
            <span className="text-2xs text-zinc-500">cross-origin requests</span>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Risk Classification Distribution</CardTitle>
            <p className="text-2xs text-zinc-400">
              Count of saved scans falling into standardized neutral risk score bands.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#71717a"
                    fontSize={10}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={10}
                    fontFamily="monospace"
                    allowDecimals={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs shadow-md">
                            <div className="font-mono font-semibold" style={{ color: item.color }}>
                              {item.name} ({item.desc})
                            </div>
                            <div className="text-zinc-300 font-mono mt-0.5">
                              {item.count} {item.count === 1 ? 'website' : 'websites'}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {riskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-2xs font-mono text-zinc-400">
              {riskChartData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>
                    {d.name}: {d.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Scan Scores */}
        <Card className="border-zinc-800 bg-zinc-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Scan Scores</CardTitle>
            <p className="text-2xs text-zinc-400">
              Observed score (0–100) across your most recent website security audits.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-60 w-full pt-2">
              {recentScoresData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentScoresData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#71717a"
                      fontSize={10}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      fontFamily="monospace"
                      domain={[0, 100]}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-xs shadow-md">
                              <div className="font-mono font-semibold text-zinc-100">{item.name}</div>
                              <div className="text-indigo-400 font-mono mt-0.5">
                                Score: {item.score} / 100 ({item.risk})
                              </div>
                              <div className="text-amber-400 font-mono text-2xs mt-0.5">
                                Trackers: {item.trackers}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="#6366f1" fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                  No scan scores recorded yet.
                </div>
              )}
            </div>
            <div className="text-center pt-3 text-2xs text-zinc-500 font-mono">
              Higher score denotes fewer observed trackers and privacy issues.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Scans Table */}
      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm">Recent Website Scans</CardTitle>
            <p className="text-2xs text-zinc-400">
              Latest audits with immediate access to technical breakdowns and finding cards.
            </p>
          </div>
          <Link href="/dashboard/scans">
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {data.recent_scans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website Hostname</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Observed Risk</TableHead>
                  <TableHead>Trackers</TableHead>
                  <TableHead>Third Parties</TableHead>
                  <TableHead>Audit Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent_scans.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell className="font-mono font-medium text-zinc-100 light:text-zinc-900">
                      <Link
                        href={`/dashboard/scans/${scan.id}`}
                        className="hover:text-indigo-400 hover:underline flex items-center gap-1.5"
                      >
                        <span>{scan.hostname}</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-xs">
                        {scan.overall_score}
                      </span>
                      <span className="text-zinc-500 text-2xs font-mono ml-0.5">/100</span>
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={scan.risk_level} size="sm" />
                    </TableCell>
                    <TableCell className="font-mono text-zinc-300">
                      {scan.tracker_count}
                    </TableCell>
                    <TableCell className="font-mono text-zinc-300">
                      {scan.third_party_count}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-2xs">
                      {formatDate(scan.started_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/scans/${scan.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono space-y-2">
              <p>No scans found in database.</p>
              <p className="text-2xs text-zinc-600">
                Install the extension to capture live website audits, or click Demo Mode on login.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
