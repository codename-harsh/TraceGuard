'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, ScanItem, FilterScansParams } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';
import {
  Search,
  Filter,
  Trash2,
  ExternalLink,
  RefreshCw,
  X,
  AlertTriangle,
} from 'lucide-react';

export default function ScansHistoryPage() {
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [hostnameSearch, setHostnameSearch] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Delete modal state
  const [deleteScanId, setDeleteScanId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchScans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: FilterScansParams = {};
      if (hostnameSearch.trim()) params.hostname = hostnameSearch.trim();
      if (riskLevelFilter) params.risk_level = riskLevelFilter;
      if (minScore !== '') params.min_score = parseInt(minScore, 10);
      if (maxScore !== '') params.max_score = parseInt(maxScore, 10);
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) params.date_to = new Date(dateTo).toISOString();

      const res = await api.scans.list(params);
      setScans(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch scans');
      }
    } finally {
      setIsLoading(false);
    }
  }, [hostnameSearch, riskLevelFilter, minScore, maxScore, dateFrom, dateTo]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const handleResetFilters = () => {
    setHostnameSearch('');
    setRiskLevelFilter('');
    setMinScore('');
    setMaxScore('');
    setDateFrom('');
    setDateTo('');
  };

  const confirmDelete = async () => {
    if (!deleteScanId) return;
    setIsDeleting(true);
    try {
      await api.scans.delete(deleteScanId);
      setScans((prev) => prev.filter((s) => s.id !== deleteScanId));
      setDeleteScanId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete scan');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 light:text-zinc-900 tracking-tight">
            Website Scan History
          </h1>
          <p className="text-xs text-zinc-400 light:text-zinc-500">
            Browse, filter, and inspect detailed client-side telemetry audits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchScans}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-zinc-800 bg-zinc-900/90 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Hostname Search */}
          <div className="lg:col-span-2">
            <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
              Search Hostname
            </label>
            <Input
              placeholder="e.g. example.com"
              icon={<Search className="w-3.5 h-3.5" />}
              value={hostnameSearch}
              onChange={(e) => setHostnameSearch(e.target.value)}
            />
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
              Risk Level
            </label>
            <Select
              value={riskLevelFilter}
              onChange={(e) => setRiskLevelFilter(e.target.value)}
            >
              <option value="">All Risk Bands</option>
              <option value="MINIMAL">MINIMAL (90–100)</option>
              <option value="LOW">LOW (75–89)</option>
              <option value="MODERATE">MODERATE (55–74)</option>
              <option value="ELEVATED">ELEVATED (35–54)</option>
              <option value="HIGH">HIGH (0–34)</option>
            </Select>
          </div>

          {/* Score Range */}
          <div>
            <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
              Min Score
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="0"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
            />
          </div>

          <div>
            <label className="text-2xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
              Max Score
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="100"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
          </div>

          {/* Reset Action */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="w-full text-xs h-9 gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Scans Table */}
      <Card className="border-zinc-800 bg-zinc-900/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">
            Audited Sites ({scans.length} {scans.length === 1 ? 'record' : 'records'})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-zinc-400 font-mono flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <span>Querying database records...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-red-400 font-mono">
              {error}
            </div>
          ) : scans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risk Classification</TableHead>
                  <TableHead>Trackers</TableHead>
                  <TableHead>Third Parties</TableHead>
                  <TableHead>Cookies</TableHead>
                  <TableHead>Audit Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scans.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell className="font-mono font-medium text-zinc-100 light:text-zinc-900">
                      <Link
                        href={`/dashboard/scans/${scan.id}`}
                        className="hover:text-indigo-400 hover:underline flex items-center gap-1.5"
                      >
                        <span>{scan.hostname}</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </Link>
                      <div className="text-2xs text-zinc-500 truncate max-w-xs font-mono">
                        {scan.url_redacted}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-xs">{scan.overall_score}</span>
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
                    <TableCell className="font-mono text-zinc-300">
                      {scan.cookie_count}
                    </TableCell>
                    <TableCell className="text-zinc-400 text-2xs">
                      {formatDate(scan.started_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link href={`/dashboard/scans/${scan.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteScanId(scan.id)}
                          className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete scan record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-xs text-zinc-500 font-mono space-y-2">
              <p>No scans match the current filter criteria.</p>
              <Button size="sm" variant="outline" onClick={handleResetFilters} className="text-xs">
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteScanId}
        onClose={() => setDeleteScanId(null)}
        title="Confirm Scan Deletion"
        description="Are you sure you want to permanently delete this audit record?"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>
              This will permanently remove the scan, its classified domains, cookie metadata, and
              associated finding cards from your account database.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteScanId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={confirmDelete}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
