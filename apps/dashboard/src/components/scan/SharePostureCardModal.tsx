'use client';

import React, { useState } from 'react';
import {
  Shield,
  Copy,
  Check,
  Share2,
  FileCode,
  Download,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { ScanDetail } from '@/lib/api';

interface SharePostureCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  scan: ScanDetail;
}

export function SharePostureCardModal({
  isOpen,
  onClose,
  scan,
}: SharePostureCardModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const copyMarkdownBadge = () => {
    const badgeMarkdown = `[![TraceGuard Score](https://img.shields.io/badge/TraceGuard-${scan.overall_score}%2F100_${scan.risk_level}-indigo)](https://tracegu4rd.vercel.app)`;
    navigator.clipboard.writeText(badgeMarkdown);
    setCopiedType('badge');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copySummaryJson = () => {
    const summary = {
      product: 'TraceGuard Web Privacy & Security Intelligence',
      hostname: scan.hostname,
      url_redacted: scan.url_redacted,
      audited_at: scan.started_at,
      score: scan.overall_score,
      risk_level: scan.risk_level,
      metrics: {
        trackers_count: scan.tracker_count,
        third_parties_count: scan.third_party_count,
        cookies_count: scan.cookie_count,
        insecure_resources: scan.insecure_resource_count,
      },
      rule_version: scan.rule_version,
      privacy_guarantee: 'Zero raw cookie values captured. Pure client-side audit.',
    };
    navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    setCopiedType('json');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedType('link');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Security Posture Card"
      description="Export a verified security summary badge or audit JSON for documentation and pull requests."
      className="max-w-md"
    >
      <div className="space-y-6">
        {/* Posture Card Preview */}
        <div className="p-6 rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl relative overflow-hidden font-mono">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Card Top */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold tracking-wider text-zinc-100">
                TRACEGUARD AUDIT
              </span>
            </div>
            <span className="text-3xs text-zinc-500">v{scan.rule_version}</span>
          </div>

          {/* Card Body */}
          <div className="py-5 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <h4 className="text-lg font-bold text-zinc-100 break-all">
                {scan.hostname}
              </h4>
              <div className="text-2xs text-zinc-400">
                Audited: {new Date(scan.started_at).toLocaleDateString()}
              </div>
              <div className="pt-1">
                <RiskBadge score={scan.overall_score} size="sm" showDescription />
              </div>
            </div>

            <ScoreRing
              score={scan.overall_score}
              size={90}
              strokeWidth={7}
              showDetails={true}
            />
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-zinc-800 text-center text-2xs">
            <div className="p-1.5 rounded bg-zinc-900 border border-zinc-850">
              <span className="text-3xs text-zinc-500 block">TRACKERS</span>
              <span className="font-bold text-zinc-200">{scan.tracker_count}</span>
            </div>
            <div className="p-1.5 rounded bg-zinc-900 border border-zinc-850">
              <span className="text-3xs text-zinc-500 block">3RD PARTIES</span>
              <span className="font-bold text-zinc-200">{scan.third_party_count}</span>
            </div>
            <div className="p-1.5 rounded bg-zinc-900 border border-zinc-850">
              <span className="text-3xs text-zinc-500 block">COOKIES</span>
              <span className="font-bold text-zinc-200">{scan.cookie_count}</span>
            </div>
            <div className="p-1.5 rounded bg-zinc-900 border border-zinc-850">
              <span className="text-3xs text-zinc-500 block">INSECURE</span>
              <span className="font-bold text-zinc-200">{scan.insecure_resource_count}</span>
            </div>
          </div>

          {/* Privacy Guarantee Footer */}
          <div className="mt-4 pt-3 border-t border-zinc-850/80 flex items-center justify-between text-3xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Zero Raw Values Captured</span>
            </span>
            <span>traceguard.local</span>
          </div>
        </div>

        {/* Copy Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyMarkdownBadge}
            className="text-xs h-9 gap-1.5 border-zinc-800 hover:border-zinc-700"
          >
            {copiedType === 'badge' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>{copiedType === 'badge' ? 'Copied Badge!' : 'Copy Badge'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={copySummaryJson}
            className="text-xs h-9 gap-1.5 border-zinc-800 hover:border-zinc-700"
          >
            {copiedType === 'json' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{copiedType === 'json' ? 'Copied JSON!' : 'Copy JSON'}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={copyLink}
            className="text-xs h-9 gap-1.5"
          >
            {copiedType === 'link' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-zinc-300" />
            )}
            <span>{copiedType === 'link' ? 'Copied Link!' : 'Share Link'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
