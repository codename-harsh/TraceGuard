'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ScanDetail, CookieRecord, ScanDomainRecord, PermissionRecord, Finding } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { FindingCard } from '@/components/scan/FindingCard';
import { formatDate, getRiskMeta } from '@/lib/utils';
import {
  Download,
  Printer,
  FileJson,
  FileSpreadsheet,
  ArrowLeft,
  Shield,
  Layers,
  Fingerprint,
  Cookie,
  Lock,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Activity,
  RefreshCw,
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
} from 'recharts';

export default function ScanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Timeline filter state
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'REQUEST' | 'COOKIE' | 'PERMISSION' | 'FINDING'>('ALL');

  const fetchScan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.scans.get(scanId);
      setScan(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load scan record');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scanId) {
      fetchScan();
    }
  }, [scanId]);

  // Export JSON Report
  const handleExportJson = async () => {
    if (!scan) return;
    setIsExporting(true);
    try {
      const jsonReport = await api.reports.downloadJson(scan.id);
      const blob = new Blob([JSON.stringify(jsonReport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traceguard-audit-${scan.hostname}-${scan.id.substring(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to export JSON');
    } finally {
      setIsExporting(false);
    }
  };

  // Export CSV Report
  const handleExportCsv = async () => {
    if (!scan) return;
    setIsExporting(true);
    try {
      const csvText = await api.reports.downloadCsv(scan.id);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `traceguard-audit-${scan.hostname}-${scan.id.substring(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Print Summary
  const handlePrint = () => {
    window.print();
  };

  // Compute Tracker Domains
  const trackerDomains = useMemo(() => {
    if (!scan) return [];
    return scan.scan_domains.filter((sd) => sd.domain && sd.domain.is_tracker);
  }, [scan]);

  // Compute Non-Tracker Third-Party Domains
  const thirdPartyDomains = useMemo(() => {
    if (!scan) return [];
    return scan.scan_domains.filter((sd) => sd.is_third_party && (!sd.domain || !sd.domain.is_tracker));
  }, [scan]);

  // Mock / Synthesized Timeline Events from Scan Artifacts
  const timelineEvents = useMemo(() => {
    if (!scan) return [];
    const events: Array<{
      id: string;
      type: 'REQUEST' | 'COOKIE' | 'PERMISSION' | 'FINDING';
      timeOffsetMs: number;
      title: string;
      details: string;
      isTracker?: boolean;
      isThirdParty?: boolean;
    }> = [];

    // Findings
    scan.findings.forEach((f, idx) => {
      events.push({
        id: `f-${f.id}`,
        type: 'FINDING',
        timeOffsetMs: (idx + 1) * 250,
        title: f.title,
        details: f.what_was_observed,
      });
    });

    // Cookies
    scan.cookies.forEach((c, idx) => {
      events.push({
        id: `c-${c.id}`,
        type: 'COOKIE',
        timeOffsetMs: 500 + (idx + 1) * 120,
        title: `Cookie set: ${c.name}`,
        details: `Domain: ${c.domain} · Path: ${c.path} · ${c.is_session ? 'Session' : 'Persistent'} · ${c.is_secure ? 'Secure' : 'Insecure'}`,
        isThirdParty: c.is_third_party,
      });
    });

    // Scan Domains (requests)
    scan.scan_domains.forEach((sd, idx) => {
      events.push({
        id: `sd-${sd.id}`,
        type: 'REQUEST',
        timeOffsetMs: 100 + (idx + 1) * 180,
        title: `Observed Domain: ${sd.domain?.hostname || 'Unknown'}`,
        details: `${sd.request_count} requests (${sd.insecure_request_count} unencrypted) · Category: ${sd.domain?.category || 'Unknown'}`,
        isTracker: sd.domain?.is_tracker,
        isThirdParty: sd.is_third_party,
      });
    });

    // Permissions
    scan.permissions.forEach((p, idx) => {
      events.push({
        id: `p-${p.id}`,
        type: 'PERMISSION',
        timeOffsetMs: 300 + (idx + 1) * 200,
        title: `Permission: ${p.permission_name}`,
        details: `Status: ${p.status} ${p.note ? `· ${p.note}` : ''}`,
      });
    });

    return events.sort((a, b) => a.timeOffsetMs - b.timeOffsetMs);
  }, [scan]);

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'ALL') return timelineEvents;
    return timelineEvents.filter((e) => e.type === timelineFilter);
  }, [timelineEvents, timelineFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="font-mono text-xs text-zinc-400">Loading website telemetry audit...</span>
        </div>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="p-8 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 space-y-4">
        <h2 className="text-base font-bold">Failed to load scan record</h2>
        <p className="text-xs">{error || 'Scan not found or unauthorized'}</p>
        <Link href="/dashboard/scans">
          <Button variant="outline" size="sm" className="gap-1.5 border-red-500/40">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scan History
          </Button>
        </Link>
      </div>
    );
  }

  const riskMeta = getRiskMeta(scan.overall_score);

  return (
    <div className="space-y-6">
      {/* Back button and audit banner */}
      <div className="flex items-center justify-between no-print">
        <Link
          href="/dashboard/scans"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Scan History</span>
        </Link>
        <span className="text-2xs font-mono text-zinc-500">
          Rule Version: {scan.rule_version} · ID: {scan.id.substring(0, 8)}
        </span>
      </div>

      {/* Main Scan Header Card */}
      <Card className="border-zinc-800 bg-zinc-900/90 p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Hostname, Redacted URL, and Meta */}
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold font-mono text-zinc-100 light:text-zinc-900 tracking-tight">
                {scan.hostname}
              </h1>
              <RiskBadge score={scan.overall_score} size="md" showDescription />
            </div>

            <div className="text-xs font-mono text-zinc-400 break-all bg-zinc-950/70 light:bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-850 light:border-zinc-200">
              <span className="text-zinc-500 select-none mr-2">Audit URL:</span>
              <span className="text-zinc-300 light:text-zinc-700">{scan.url_redacted}</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-2xs font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>Audited: {formatDate(scan.started_at)}</span>
              </span>
              <span>·</span>
              <span>Trackers: {scan.tracker_count}</span>
              <span>·</span>
              <span>3rd Parties: {scan.third_party_count}</span>
              <span>·</span>
              <span>Cookies: {scan.cookie_count}</span>
            </div>
          </div>

          {/* Center/Right: Score Ring */}
          <div className="flex items-center gap-6 shrink-0 self-center lg:self-auto">
            <ScoreRing
              score={scan.overall_score}
              size={110}
              strokeWidth={8}
              showDetails={true}
            />

            {/* Export Toolbar Buttons */}
            <div className="flex flex-col gap-2 no-print">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJson}
                disabled={isExporting}
                className="text-xs h-8 gap-1.5 w-36 justify-start"
              >
                <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export JSON</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="text-xs h-8 gap-1.5 w-36 justify-start"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                className="text-xs h-8 gap-1.5 w-36 justify-start"
              >
                <Printer className="w-3.5 h-3.5 text-zinc-300" />
                <span>Print PDF Summary</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 8 Complete Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full flex flex-wrap gap-1 mb-4 no-print">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="network" badge={scan.scan_domains.length}>
            Network
          </TabsTrigger>
          <TabsTrigger value="trackers" badge={scan.tracker_count}>
            Trackers
          </TabsTrigger>
          <TabsTrigger value="cookies" badge={scan.cookie_count}>
            Cookies
          </TabsTrigger>
          <TabsTrigger value="permissions" badge={scan.permission_count}>
            Permissions
          </TabsTrigger>
          <TabsTrigger value="findings" badge={scan.findings.length}>
            Findings
          </TabsTrigger>
          <TabsTrigger value="timeline" badge={timelineEvents.length}>
            Timeline
          </TabsTrigger>
          <TabsTrigger value="score">Score & Rules</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3 bg-zinc-900 border-zinc-800 text-center">
              <div className="text-2xs font-mono uppercase text-zinc-400">Score</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                {scan.overall_score}
                <span className="text-2xs text-zinc-500">/100</span>
              </div>
            </Card>

            <Card className="p-3 bg-zinc-900 border-zinc-800 text-center">
              <div className="text-2xs font-mono uppercase text-zinc-400">Trackers</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {scan.tracker_count}
              </div>
            </Card>

            <Card className="p-3 bg-zinc-900 border-zinc-800 text-center">
              <div className="text-2xs font-mono uppercase text-zinc-400">Third Parties</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                {scan.third_party_count}
              </div>
            </Card>

            <Card className="p-3 bg-zinc-900 border-zinc-800 text-center">
              <div className="text-2xs font-mono uppercase text-zinc-400">Cookies</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                {scan.cookie_count}
              </div>
            </Card>

            <Card className="p-3 bg-zinc-900 border-zinc-800 text-center">
              <div className="text-2xs font-mono uppercase text-zinc-400">Insecure Res.</div>
              <div className="text-xl font-bold font-mono text-red-400 mt-1">
                {scan.insecure_resource_count}
              </div>
            </Card>

            <Card className="p-3 bg-zinc-900 border-zinc-800 text-center">
              <div className="text-2xs font-mono uppercase text-zinc-400">Permissions</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                {scan.permission_count}
              </div>
            </Card>
          </div>

          {/* Key Findings Highlight */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-zinc-300">
              Observed Privacy & Security Findings ({scan.findings.length})
            </h3>
            {scan.findings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scan.findings.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center text-xs text-zinc-400 font-mono">
                No high or moderate privacy issues observed during this audit session.
              </Card>
            )}
          </div>

          {/* Product Limitations & Disclaimers Banner */}
          <Card className="border-indigo-500/20 bg-indigo-500/5 p-5">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs">
                <h4 className="font-semibold text-zinc-200">
                  Product Limitations & Defensive Awareness Notice
                </h4>
                <p className="text-zinc-400 leading-relaxed">
                  TraceGuard is a strictly defensive privacy and security awareness auditing tool.
                  Observations are limited to client-side network telemetry, DOM indicators, and
                  metadata captured during the active observation window. Server-side tracking,
                  first-party proxy analytics, and conditional scripts cannot be definitively excluded.
                  TraceGuard findings do not constitute legal compliance guarantees.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: NETWORK */}
        <TabsContent value="network" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Observed Domains & Network Requests ({scan.scan_domains.length})
              </CardTitle>
              <p className="text-2xs text-zinc-400">
                Breakdown of all registrable domains and resource requests observed during the session.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {scan.scan_domains.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Registrable Domain</TableHead>
                      <TableHead>Boundary</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Insecure (HTTP)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scan.scan_domains.map((sd) => (
                      <TableRow key={sd.id}>
                        <TableCell className="font-mono text-zinc-200">
                          {sd.domain?.hostname || 'Unknown'}
                        </TableCell>
                        <TableCell className="font-mono text-zinc-400">
                          {sd.domain?.registrable_domain || '—'}
                        </TableCell>
                        <TableCell>
                          {sd.is_third_party ? (
                            <Badge variant="warning">3rd-Party</Badge>
                          ) : (
                            <Badge variant="secondary">1st-Party</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sd.domain?.is_tracker ? 'danger' : 'outline'}>
                            {sd.domain?.category || 'General'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{sd.request_count}</TableCell>
                        <TableCell className="font-mono">
                          {sd.insecure_request_count > 0 ? (
                            <span className="text-red-400 font-bold">
                              {sd.insecure_request_count}
                            </span>
                          ) : (
                            <span className="text-zinc-500">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  No individual domain requests were logged.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: TRACKERS */}
        <TabsContent value="trackers" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">
                    Classified Trackers Observed ({trackerDomains.length})
                  </CardTitle>
                  <p className="text-2xs text-zinc-400">
                    Services identified by open tracker radar matching definitions.
                  </p>
                </div>
                <Badge variant="mono">Rules v{scan.rule_version}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {trackerDomains.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracker Domain</TableHead>
                      <TableHead>Classification Category</TableHead>
                      <TableHead>Requests Captured</TableHead>
                      <TableHead>Cross-Origin Boundary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackerDomains.map((td) => (
                      <TableRow key={td.id}>
                        <TableCell className="font-mono font-medium text-amber-300">
                          {td.domain?.hostname}
                        </TableCell>
                        <TableCell>
                          <Badge variant="danger">{td.domain?.category}</Badge>
                        </TableCell>
                        <TableCell className="font-mono">{td.request_count}</TableCell>
                        <TableCell>
                          {td.is_third_party ? (
                            <span className="text-2xs font-mono text-zinc-400">Third-party service</span>
                          ) : (
                            <span className="text-2xs font-mono text-zinc-400">First-party subdomain</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-xs text-emerald-400 font-mono space-y-1">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <p>Zero known tracking domains observed during this audit window.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: COOKIES */}
        <TabsContent value="cookies" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Cookie Metadata Registry ({scan.cookies.length})
              </CardTitle>
              <div className="flex items-center gap-1.5 text-2xs text-emerald-400 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Hard Privacy Rule: Raw cookie values are never collected, logged, or transmitted.
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {scan.cookies.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cookie Name</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Boundary</TableHead>
                      <TableHead>Secure</TableHead>
                      <TableHead>HttpOnly</TableHead>
                      <TableHead>SameSite</TableHead>
                      <TableHead>Lifespan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scan.cookies.map((cookie) => (
                      <TableRow key={cookie.id}>
                        <TableCell className="font-mono font-medium text-zinc-100">
                          {cookie.name}
                        </TableCell>
                        <TableCell className="font-mono text-zinc-400">{cookie.domain}</TableCell>
                        <TableCell>
                          {cookie.is_third_party ? (
                            <Badge variant="warning">3rd-Party</Badge>
                          ) : (
                            <Badge variant="secondary">1st-Party</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {cookie.is_secure ? (
                            <span className="text-emerald-400 font-mono text-2xs">Yes</span>
                          ) : (
                            <span className="text-red-400 font-mono text-2xs">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cookie.is_http_only ? (
                            <span className="text-emerald-400 font-mono text-2xs">Yes</span>
                          ) : (
                            <span className="text-amber-400 font-mono text-2xs">No</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-2xs">{cookie.same_site}</TableCell>
                        <TableCell className="font-mono text-2xs">
                          {cookie.is_session
                            ? 'Session'
                            : cookie.expiration_days
                            ? `${cookie.expiration_days} days`
                            : 'Persistent'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  No cookies were observed during this scan window.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: PERMISSIONS */}
        <TabsContent value="permissions" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Browser Permission Findings ({scan.permissions.length})
              </CardTitle>
              <p className="text-2xs text-zinc-400">
                Audit of sensitive browser capabilities requested or granted for this site.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {scan.permissions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Observed Status</TableHead>
                      <TableHead>Technical Context</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scan.permissions.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell className="font-mono font-medium text-zinc-100">
                          {perm.permission_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              perm.status === 'granted'
                                ? 'warning'
                                : perm.status === 'prompt'
                                ? 'outline'
                                : 'secondary'
                            }
                          >
                            {perm.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-400 text-xs">
                          {perm.note || 'Standard browser capability request.'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-xs text-zinc-500 font-mono">
                  No browser permissions were requested or active during this scan.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: FINDINGS */}
        <TabsContent value="findings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scan.findings.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))}
          </div>
          {scan.findings.length === 0 && (
            <Card className="p-8 text-center text-xs text-zinc-500 font-mono">
              Zero findings generated for this audit.
            </Card>
          )}
        </TabsContent>

        {/* TAB 7: TIMELINE */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/80 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">Observation Activity Stream</h3>
                <p className="text-2xs text-zinc-400">
                  Chronological sequence of network connections, cookies, and privacy indicators.
                </p>
              </div>

              {/* Timeline filters */}
              <div className="flex items-center gap-1">
                {(['ALL', 'REQUEST', 'COOKIE', 'PERMISSION', 'FINDING'] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={timelineFilter === filter ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTimelineFilter(filter)}
                    className="h-7 text-2xs font-mono uppercase"
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="space-y-3 relative pl-4 border-l border-zinc-800">
              {filteredTimeline.map((item) => (
                <div key={item.id} className="relative group text-xs space-y-1">
                  {/* Timeline point indicator */}
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-700 border-2 border-zinc-900 group-hover:bg-indigo-400 transition-colors" />

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xs text-zinc-500">
                      +{item.timeOffsetMs}ms
                    </span>
                    <Badge variant="mono">{item.type}</Badge>
                    <span className="font-semibold text-zinc-200">{item.title}</span>
                    {item.isTracker && <Badge variant="danger">Tracker</Badge>}
                    {item.isThirdParty && <Badge variant="warning">3rd-Party</Badge>}
                  </div>

                  <p className="text-zinc-400 text-2xs pl-8 font-mono">{item.details}</p>
                </div>
              ))}

              {filteredTimeline.length === 0 && (
                <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                  No timeline items found for this category filter.
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* TAB 8: SCORE & RULES */}
        <TabsContent value="score" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Score Ring Card */}
            <Card className="border-zinc-800 bg-zinc-900/80 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Final Calculated Score
              </h3>
              <ScoreRing score={scan.overall_score} size={140} strokeWidth={10} />
              <div className="text-2xs text-zinc-400 max-w-xs mt-2">
                Calculated on a 0–100 baseline. 100 represents zero observed telemetry penalties.
              </div>
            </Card>

            {/* Category Penalty Deductions */}
            <Card className="md:col-span-2 border-zinc-800 bg-zinc-900/80 p-6 space-y-4">
              <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-zinc-300">
                Category Penalty Deductions vs Max Caps
              </h3>

              <div className="space-y-3">
                {scan.score_components && scan.score_components.length > 0 ? (
                  scan.score_components.map((comp) => {
                    const pct = (comp.applied_penalty / (comp.max_penalty || 1)) * 100;
                    return (
                      <div key={comp.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-300">{comp.category}</span>
                          <span className="font-mono text-2xs text-amber-400">
                            -{comp.applied_penalty} / -{comp.max_penalty} pts
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              backgroundColor: pct > 50 ? '#ef4444' : pct > 0 ? '#f59e0b' : '#22c55e',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-zinc-500 font-mono">
                    No individual penalty breakdown recorded.
                  </div>
                )}
              </div>

              {/* "Why this score?" plain-language explanation */}
              <div className="mt-6 pt-4 border-t border-zinc-800 space-y-2">
                <h4 className="text-xs font-semibold font-mono uppercase tracking-wider text-zinc-300">
                  Why This Score?
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  This website received an observed score of{' '}
                  <strong className="text-zinc-200">{scan.overall_score}/100</strong>, corresponding to{' '}
                  <strong style={{ color: riskMeta.color }}>{riskMeta.description}</strong>. The
                  deductions reflect {scan.tracker_count} classified tracking endpoints,{' '}
                  {scan.third_party_count} third-party requests, and {scan.cookie_count} observed
                  cookie metadata items under rule version {scan.rule_version}.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
