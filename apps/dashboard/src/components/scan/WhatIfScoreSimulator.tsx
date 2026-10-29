'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Shield,
  TrendingUp,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { ScanDetail } from '@/lib/api';

interface RemediationFix {
  id: string;
  category: string;
  title: string;
  description: string;
  potentialPoints: number;
  applicable: boolean;
}

interface WhatIfScoreSimulatorProps {
  scan: ScanDetail;
}

export function WhatIfScoreSimulator({ scan }: WhatIfScoreSimulatorProps) {
  // Dynamically analyze which remediation toggles apply to this scan
  const availableFixes = useMemo<RemediationFix[]>(() => {
    const fixes: RemediationFix[] = [];

    // 1. Insecure Resources
    if (scan.insecure_resource_count > 0) {
      fixes.push({
        id: 'fix-https',
        category: 'Network Security',
        title: 'Upgrade Insecure HTTP Subresources',
        description: 'Enforce full HTTPS transport across all background asset loads and script endpoints.',
        potentialPoints: 10,
        applicable: true,
      });
    }

    // 2. Session Replay / Trackers
    const hasReplay = scan.findings.some((f) => f.finding_type.includes('replay'));
    if (hasReplay) {
      fixes.push({
        id: 'fix-replay',
        category: 'Data Harvesting',
        title: 'Deactivate Session Replay Telemetry',
        description: 'Remove background mouse tracking and DOM mutation recording scripts on client views.',
        potentialPoints: 18,
        applicable: true,
      });
    }

    // 3. Ad & General Trackers
    if (scan.tracker_count > 0 && !hasReplay) {
      fixes.push({
        id: 'fix-trackers',
        category: 'Tracker Domains',
        title: 'Consent-Gate Third-Party Trackers',
        description: 'Block or defer cross-site analytics and advertising beacons until explicit user interaction.',
        potentialPoints: Math.min(25, scan.tracker_count * 5),
        applicable: true,
      });
    } else if (scan.tracker_count > 1 && hasReplay) {
      fixes.push({
        id: 'fix-trackers',
        category: 'Tracker Domains',
        title: 'Consent-Gate Advertising Beacons',
        description: 'Prevent cross-site advertising networks from establishing tracking contexts.',
        potentialPoints: 10,
        applicable: true,
      });
    }

    // 4. Cookies Hygiene
    const hasInsecureCookies = scan.cookies.some((c) => !c.is_secure || c.same_site === 'Unspecified' || c.same_site === 'None');
    if (hasInsecureCookies) {
      fixes.push({
        id: 'fix-cookies',
        category: 'Cookies & Storage',
        title: 'Enforce SameSite=Strict & Secure Flags',
        description: 'Prevent client cookies from being transmitted in cross-site contexts and restrict script tampering.',
        potentialPoints: 12,
        applicable: true,
      });
    }

    // 5. Premature Permissions
    if (scan.permission_count > 0) {
      fixes.push({
        id: 'fix-permissions',
        category: 'Browser Permissions',
        title: 'Eliminate Premature Permission Prompts',
        description: 'Defer Geolocation and Notification prompts until explicit user gesture.',
        potentialPoints: 5,
        applicable: true,
      });
    }

    // Default fallback fix if scan is already near-perfect
    if (fixes.length === 0) {
      fixes.push({
        id: 'fix-harden',
        category: 'General Hygiene',
        title: 'Partition All Client Storage Keys',
        description: 'Ensure all first-party persistent UI state adheres to partitioned client isolation.',
        potentialPoints: Math.max(1, 100 - scan.overall_score),
        applicable: true,
      });
    }

    return fixes;
  }, [scan]);

  // Track checked fixes
  const [activeFixIds, setActiveFixIds] = useState<string[]>([]);

  const toggleFix = (id: string) => {
    setActiveFixIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setActiveFixIds(availableFixes.map((f) => f.id));
  };

  const resetAll = () => {
    setActiveFixIds([]);
  };

  // Compute Simulated Score
  const simulatedScore = useMemo(() => {
    const pointsGained = availableFixes
      .filter((f) => activeFixIds.includes(f.id))
      .reduce((sum, f) => sum + f.potentialPoints, 0);

    return Math.min(100, scan.overall_score + pointsGained);
  }, [scan.overall_score, availableFixes, activeFixIds]);

  const scoreDelta = simulatedScore - scan.overall_score;

  return (
    <Card className="border-zinc-800 bg-zinc-900/90 shadow-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base font-bold font-sans text-zinc-100">
                &quot;What-If&quot; Remediation Score Simulator
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400 mt-0.5">
              Simulate architectural improvements and observe projected Base-100 score recovery in real time.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-2xs h-7 px-2.5 text-zinc-300 border-zinc-700 hover:border-zinc-600"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              className="text-2xs h-7 px-2 text-zinc-400 hover:text-zinc-200"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* ============================================================= */}
          {/* Remediation Toggles (7 Cols) */}
          {/* ============================================================= */}
          <div className="lg:col-span-7 space-y-3">
            <div className="text-2xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
              Select Simulated Mitigations:
            </div>

            {availableFixes.map((fix) => {
              const isChecked = activeFixIds.includes(fix.id);
              return (
                <div
                  key={fix.id}
                  onClick={() => toggleFix(fix.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    isChecked
                      ? 'border-indigo-500/50 bg-indigo-500/10 shadow-sm'
                      : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          isChecked ? 'text-indigo-200' : 'text-zinc-200'
                        }`}
                      >
                        {fix.title}
                      </span>
                      <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-750">
                        {fix.category}
                      </span>
                    </div>
                    <p className="text-2xs text-zinc-400 leading-relaxed">
                      {fix.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        isChecked
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      +{fix.potentialPoints} pts
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent div
                      className="rounded border-zinc-700 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================================= */}
          {/* Before & After Comparison Showcase (5 Cols) */}
          {/* ============================================================= */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-center space-y-4">
            <span className="text-2xs font-mono text-zinc-500 uppercase tracking-widest">
              Simulated Remediation Projection
            </span>

            <div className="flex items-center justify-center gap-6">
              {/* Baseline Original */}
              <div className="flex flex-col items-center space-y-1">
                <span className="text-3xs font-mono text-zinc-500 uppercase">Original</span>
                <ScoreRing
                  score={scan.overall_score}
                  size={80}
                  strokeWidth={6}
                  showDetails={false}
                />
                <span className="text-xs font-mono text-zinc-400">
                  {scan.overall_score}/100
                </span>
              </div>

              {/* Transition Arrow */}
              <div className="flex flex-col items-center justify-center gap-1 text-indigo-400">
                <ArrowRight className="w-5 h-5 animate-pulse" />
                {scoreDelta > 0 && (
                  <span className="text-2xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    +{scoreDelta}
                  </span>
                )}
              </div>

              {/* Simulated Result */}
              <div className="flex flex-col items-center space-y-1">
                <span className="text-3xs font-mono text-indigo-400 uppercase font-semibold">
                  Projected
                </span>
                <ScoreRing
                  score={simulatedScore}
                  size={96}
                  strokeWidth={8}
                  showDetails={false}
                />
                <span className="text-sm font-mono font-bold text-zinc-100">
                  {simulatedScore}/100
                </span>
              </div>
            </div>

            {/* Projected Risk Badge */}
            <div className="pt-2">
              <RiskBadge score={simulatedScore} size="md" showDescription />
            </div>

            {/* Summary Explanation */}
            <p className="text-2xs text-zinc-400 max-w-xs leading-relaxed">
              {scoreDelta > 0
                ? `Applying these ${activeFixIds.length} simulated mitigations recovers ${scoreDelta} penalty points, moving the website posture into the ${simulatedScore >= 90 ? 'MINIMAL' : simulatedScore >= 75 ? 'LOW' : 'MODERATE'} observed risk band.`
                : 'Select one or more simulated mitigations on the left to project potential score improvements.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
