'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api, ScanItem, ScanCompare, ScanDetail } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import {
  GitCompare,
  ArrowRightLeft,
  Shield,
  Layers,
  Fingerprint,
  Cookie,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';

export default function SiteComparisonPage() {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [selectedScanA, setSelectedScanA] = useState<string>('');
  const [selectedScanB, setSelectedScanB] = useState<string>('');
  const [comparison, setComparison] = useState<ScanCompare | null>(null);
  const [detailA, setDetailA] = useState<ScanDetail | null>(null);
  const [detailB, setDetailB] = useState<ScanDetail | null>(null);
  const [isLoadingScans, setIsLoadingScans] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available scans for dropdown
  useEffect(() => {
    async function loadScans() {
      setIsLoadingScans(true);
      try {
        const list = await api.scans.list();
        setScans(list);
        if (list.length >= 2) {
          setSelectedScanA(list[0].id);
          setSelectedScanB(list[1].id);
        } else if (list.length === 1) {
          setSelectedScanA(list[0].id);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load saved scans');
      } finally {
        setIsLoadingScans(false);
      }
    }
    loadScans();
  }, []);

  // Fetch comparison when selections change
  const runComparison = async (idA: string, idB: string) => {
    if (!idA || !idB || idA === idB) {
      setComparison(null);
      setDetailA(null);
      setDetailB(null);
      return;
    }

    setIsComparing(true);
    setError(null);
    try {
      const [compRes, detA, detB] = await Promise.all([
        api.sites.compare(idA, idB),
        api.scans.get(idA),
        api.scans.get(idB),
      ]);
      setComparison(compRes);
      setDetailA(detA);
      setDetailB(detB);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setIsComparing(false);
    }
  };

  useEffect(() => {
    if (selectedScanA && selectedScanB && selectedScanA !== selectedScanB) {
      runComparison(selectedScanA, selectedScanB);
    }
  }, [selectedScanA, selectedScanB]);

  const handleSwap = () => {
    const temp = selectedScanA;
    setSelectedScanA(selectedScanB);
    setSelectedScanB(temp);
  };

  // Category penalty comparative chart data
  const penaltyComparisonData = useMemo(() => {
    if (!detailA || !detailB) return [];

    const categories = [
      'Trackers detected',
      'Insecure transport / mixed content',
      'Third-party persistent cookies',
      'Third-party request concentration',
      'Cookie configuration issues',
      'Privacy-sensitive permissions',
      'Storage & other indicators',
    ];

    const getPenalty = (scanDetail: ScanDetail, catName: string) => {
      const comp = scanDetail.score_components.find(
        (c) => c.category.toLowerCase() === catName.toLowerCase()
      );
      return comp ? comp.applied_penalty : 0;
    };

    return categories.map((cat) => ({
      category: cat.length > 20 ? cat.substring(0, 18) + '…' : cat,
      fullCategory: cat,
      [detailA.hostname]: getPenalty(detailA, cat),
      [detailB.hostname]: getPenalty(detailB, cat),
    }));
  }, [detailA, detailB]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 light:text-zinc-900 tracking-tight flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-400" />
            <span>Site-by-Site Comparison</span>
          </h1>
          <p className="text-xs text-zinc-400 light:text-zinc-500">
            Compare privacy & security signals side-by-side using real database records.
          </p>
        </div>
      </div>

      {/* Selectors Bar */}
      <Card className="p-4 border-zinc-800 bg-zinc-900/90 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Site A */}
          <div className="w-full md:flex-1 space-y-1">
            <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
              Target Site A
            </label>
            <Select
              value={selectedScanA}
              onChange={(e) => setSelectedScanA(e.target.value)}
              disabled={isLoadingScans}
              className="w-full"
            >
              <option value="">Select first website...</option>
              {scans.map((s) => (
                <option key={`a-${s.id}`} value={s.id}>
                  {s.hostname} — Score {s.overall_score} ({s.risk_level})
                </option>
              ))}
            </Select>
          </div>

          {/* Swap Button */}
          <div className="pt-4 flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSwap}
              disabled={!selectedScanA || !selectedScanB}
              title="Swap Site A and Site B"
              className="h-9 w-9 rounded-full border-zinc-700 bg-zinc-800/80 hover:bg-zinc-750"
            >
              <ArrowRightLeft className="w-4 h-4 text-zinc-300" />
            </Button>
          </div>

          {/* Site B */}
          <div className="w-full md:flex-1 space-y-1">
            <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
              Target Site B
            </label>
            <Select
              value={selectedScanB}
              onChange={(e) => setSelectedScanB(e.target.value)}
              disabled={isLoadingScans}
              className="w-full"
            >
              <option value="">Select second website...</option>
              {scans.map((s) => (
                <option key={`b-${s.id}`} value={s.id}>
                  {s.hostname} — Score {s.overall_score} ({s.risk_level})
                </option>
              ))}
            </Select>
          </div>
        </div>

        {selectedScanA && selectedScanB && selectedScanA === selectedScanB && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>Please choose two distinct scans to observe comparative differences.</span>
          </div>
        )}
      </Card>

      {/* Loading state */}
      {isComparing && (
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <span className="font-mono text-xs text-zinc-400">Computing comparative telemetry...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Empty State when fewer than 2 scans */}
      {!isComparing && scans.length < 2 && (
        <div className="p-12 text-center rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-3">
          <GitCompare className="w-10 h-10 mx-auto text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-200">At least 2 scans required</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            You currently have {scans.length} scan in your history. Run the extension to scan another site,
            or sign into Demo Mode to access 4 pre-seeded website audits.
          </p>
          <Link href="/dashboard/scans">
            <Button size="sm" variant="outline">
              Go to Scan History
            </Button>
          </Link>
        </div>
      )}

      {/* Comparison View */}
      {!isComparing && comparison && detailA && detailB && (
        <div className="space-y-6">
          {/* Side-by-Side Hero Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Site A Card */}
            <Card className="border-zinc-800 bg-zinc-900/90 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-2xs uppercase">
                    Site A
                  </Badge>
                  <RiskBadge score={detailA.overall_score} size="sm" />
                </div>
                <CardTitle className="text-lg font-mono text-zinc-100 light:text-zinc-900 flex items-center justify-between pt-1">
                  <span className="truncate">{detailA.hostname}</span>
                  <Link
                    href={`/dashboard/scans/${detailA.id}`}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-sans"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </CardTitle>
                <div className="text-2xs text-zinc-400 font-mono">
                  Audited: {formatDate(detailA.started_at)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center py-2">
                  <ScoreRing score={detailA.overall_score} size={110} strokeWidth={8} showDetails={true} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-850/70 border border-zinc-800">
                    <span className="text-2xs text-zinc-400 block">Classified Trackers</span>
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {detailA.tracker_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-850/70 border border-zinc-800">
                    <span className="text-2xs text-zinc-400 block">3rd-Party Domains</span>
                    <span className="font-mono text-sm font-bold text-zinc-200">
                      {detailA.third_party_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-850/70 border border-zinc-800">
                    <span className="text-2xs text-zinc-400 block">Observed Cookies</span>
                    <span className="font-mono text-sm font-bold text-zinc-200">
                      {detailA.cookie_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-850/70 border border-zinc-800">
                    <span className="text-2xs text-zinc-400 block">Insecure Endpoints</span>
                    <span className="font-mono text-sm font-bold text-red-400">
                      {detailA.insecure_resource_count}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Site B Card */}
            <Card className="border-zinc-800 bg-zinc-900/90 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-2xs uppercase">
                    Site B
                  </Badge>
                  <RiskBadge score={detailB.overall_score} size="sm" />
                </div>
                <CardTitle className="text-lg font-mono text-zinc-100 light:text-zinc-900 flex items-center justify-between pt-1">
                  <span className="truncate">{detailB.hostname}</span>
                  <Link
                    href={`/dashboard/scans/${detailB.id}`}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-sans"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </CardTitle>
                <div className="text-2xs text-zinc-400 font-mono">
                  Audited: {formatDate(detailB.started_at)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center py-2">
                  <ScoreRing score={detailB.overall_score} size={110} strokeWidth={8} showDetails={true} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-850/70 border border-zinc-800">
                    <span className="text-2xs text-zinc-400 block">Classified Trackers</span>
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {detailB.tracker_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-850/70 border border-zinc-800">
                    <span className="text-2xs text-zinc-400 block">3rd-Party Domains</span>
                    <span className="font-mono text-sm font-bold text-zinc-200">
                      {detailB.third_party_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-850/70 border border-zinc-800">
                    <span className="text-2xs text-zinc-400 block">Observed Cookies</span>
                    <span className="font-mono text-sm font-bold text-zinc-200">
                      {detailB.cookie_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-850/70 border border-zinc-800">
                    <span className="text-2xs text-zinc-400 block">Insecure Endpoints</span>
                    <span className="font-mono text-sm font-bold text-red-400">
                      {detailB.insecure_resource_count}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delta Highlights Banner */}
          <Card className="p-4 border-zinc-800 bg-zinc-950/80">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-850">
                <span className="text-2xs font-mono uppercase text-zinc-400 block mb-1">
                  Overall Score Delta (B vs A)
                </span>
                <span
                  className={`text-xl font-bold font-mono ${
                    comparison.score_delta > 0
                      ? 'text-emerald-400'
                      : comparison.score_delta < 0
                      ? 'text-red-400'
                      : 'text-zinc-300'
                  }`}
                >
                  {comparison.score_delta > 0 ? `+${comparison.score_delta}` : comparison.score_delta} pts
                </span>
                <span className="text-2xs text-zinc-500 block mt-0.5">
                  {comparison.score_delta > 0
                    ? `${detailB.hostname} scored higher (fewer penalties)`
                    : comparison.score_delta < 0
                    ? `${detailA.hostname} scored higher (fewer penalties)`
                    : 'Identical observed score'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-850">
                <span className="text-2xs font-mono uppercase text-zinc-400 block mb-1">
                  Tracker Difference
                </span>
                <span
                  className={`text-xl font-bold font-mono ${
                    comparison.tracker_delta < 0
                      ? 'text-emerald-400'
                      : comparison.tracker_delta > 0
                      ? 'text-red-400'
                      : 'text-zinc-300'
                  }`}
                >
                  {comparison.tracker_delta > 0
                    ? `+${comparison.tracker_delta}`
                    : comparison.tracker_delta}
                </span>
                <span className="text-2xs text-zinc-500 block mt-0.5">
                  {comparison.tracker_delta < 0
                    ? `${detailB.hostname} has ${Math.abs(comparison.tracker_delta)} fewer trackers`
                    : comparison.tracker_delta > 0
                    ? `${detailB.hostname} has ${comparison.tracker_delta} more trackers`
                    : 'Equal tracker count'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-850">
                <span className="text-2xs font-mono uppercase text-zinc-400 block mb-1">
                  3rd-Party Domain Delta
                </span>
                <span
                  className={`text-xl font-bold font-mono ${
                    comparison.third_party_delta < 0
                      ? 'text-emerald-400'
                      : comparison.third_party_delta > 0
                      ? 'text-red-400'
                      : 'text-zinc-300'
                  }`}
                >
                  {comparison.third_party_delta > 0
                    ? `+${comparison.third_party_delta}`
                    : comparison.third_party_delta}
                </span>
                <span className="text-2xs text-zinc-500 block mt-0.5">
                  {comparison.third_party_delta < 0
                    ? `${detailB.hostname} connects to fewer 3rd parties`
                    : comparison.third_party_delta > 0
                    ? `${detailB.hostname} connects to more 3rd parties`
                    : 'Equal third-party domain count'}
                </span>
              </div>
            </div>
          </Card>

          {/* Category Penalty Breakdown Comparison Chart */}
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-sm">Category Penalty Comparison</CardTitle>
              <p className="text-2xs text-zinc-400">
                Points deducted per category (lower penalty indicates higher observed privacy hygiene).
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={penaltyComparisonData}
                    margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                      dataKey="category"
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
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-xs shadow-md space-y-1">
                              <div className="font-semibold text-zinc-200">{item.fullCategory}</div>
                              {payload.map((p) => (
                                <div key={p.name} className="flex justify-between gap-4 font-mono">
                                  <span style={{ color: p.color }}>{p.name}:</span>
                                  <span className="font-bold text-zinc-100">
                                    -{p.value} penalty pts
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontFamily: 'monospace' }}
                    />
                    <Bar dataKey={detailA.hostname} fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={detailB.hostname} fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Metric Differential Table */}
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <CardTitle className="text-sm">Detailed Metric Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Observation Metric</TableHead>
                    <TableHead className="font-mono text-indigo-400">{detailA.hostname}</TableHead>
                    <TableHead className="font-mono text-purple-400">{detailB.hostname}</TableHead>
                    <TableHead>Comparison Delta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium text-xs">Overall Observed Score</TableCell>
                    <TableCell className="font-mono text-xs font-bold">{detailA.overall_score} / 100</TableCell>
                    <TableCell className="font-mono text-xs font-bold">{detailB.overall_score} / 100</TableCell>
                    <TableCell className="font-mono text-xs">
                      {comparison.score_delta > 0
                        ? `+${comparison.score_delta} (B higher)`
                        : comparison.score_delta < 0
                        ? `${comparison.score_delta} (A higher)`
                        : '0 (identical)'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs">Risk Classification</TableCell>
                    <TableCell>
                      <RiskBadge score={detailA.overall_score} size="sm" />
                    </TableCell>
                    <TableCell>
                      <RiskBadge score={detailB.overall_score} size="sm" />
                    </TableCell>
                    <TableCell className="text-2xs text-zinc-400 font-mono">
                      {detailA.risk_level === detailB.risk_level ? 'Same band' : 'Differing bands'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs">Classified Trackers</TableCell>
                    <TableCell className="font-mono text-xs text-amber-400">{detailA.tracker_count}</TableCell>
                    <TableCell className="font-mono text-xs text-amber-400">{detailB.tracker_count}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {comparison.tracker_delta > 0
                        ? `+${comparison.tracker_delta} on B`
                        : comparison.tracker_delta < 0
                        ? `${Math.abs(comparison.tracker_delta)} fewer on B`
                        : 'Identical'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs">Third-Party Domains</TableCell>
                    <TableCell className="font-mono text-xs">{detailA.third_party_count}</TableCell>
                    <TableCell className="font-mono text-xs">{detailB.third_party_count}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {comparison.third_party_delta > 0
                        ? `+${comparison.third_party_delta} on B`
                        : comparison.third_party_delta < 0
                        ? `${Math.abs(comparison.third_party_delta)} fewer on B`
                        : 'Identical'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs">Cookie Count (Metadata only)</TableCell>
                    <TableCell className="font-mono text-xs">{detailA.cookie_count}</TableCell>
                    <TableCell className="font-mono text-xs">{detailB.cookie_count}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {detailB.cookie_count - detailA.cookie_count > 0
                        ? `+${detailB.cookie_count - detailA.cookie_count} on B`
                        : detailB.cookie_count - detailA.cookie_count < 0
                        ? `${detailB.cookie_count - detailA.cookie_count} on B`
                        : 'Identical'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs">Active Browser Permissions</TableCell>
                    <TableCell className="font-mono text-xs">{detailA.permission_count}</TableCell>
                    <TableCell className="font-mono text-xs">{detailB.permission_count}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {detailB.permission_count - detailA.permission_count !== 0
                        ? `${detailB.permission_count - detailA.permission_count > 0 ? '+' : ''}${detailB.permission_count - detailA.permission_count}`
                        : 'Identical'}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium text-xs">Insecure HTTP Resources</TableCell>
                    <TableCell className="font-mono text-xs text-red-400">
                      {detailA.insecure_resource_count}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-red-400">
                      {detailB.insecure_resource_count}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {detailB.insecure_resource_count - detailA.insecure_resource_count !== 0
                        ? `${detailB.insecure_resource_count - detailA.insecure_resource_count > 0 ? '+' : ''}${detailB.insecure_resource_count - detailA.insecure_resource_count}`
                        : 'Identical'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
