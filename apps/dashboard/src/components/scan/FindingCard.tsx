import React from 'react';
import { Finding } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, AlertCircle, Info, ShieldAlert, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FindingCard({ finding }: { finding: Finding }) {
  const severityColors = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    LOW: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
    INFO: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  };

  const getSeverityIcon = () => {
    switch (finding.severity) {
      case 'CRITICAL':
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'MEDIUM':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'LOW':
      case 'INFO':
      default:
        return <Info className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/80 hover:border-zinc-700/80 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {getSeverityIcon()}
            <CardTitle className="text-sm font-semibold text-zinc-100 light:text-zinc-900">
              {finding.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-2xs font-mono px-2 py-0.5 rounded border uppercase tracking-wider font-semibold',
                severityColors[finding.severity] || severityColors.INFO
              )}
            >
              {finding.severity}
            </span>
            {finding.score_penalty > 0 && (
              <span className="font-mono text-2xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                -{finding.score_penalty} pts
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-2xs font-mono text-zinc-500">
          <span>Category: {finding.category}</span>
          <span>·</span>
          <span>Type: {finding.finding_type}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-xs">
        {/* What was observed */}
        <div className="space-y-1">
          <div className="text-2xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            <span>Factual Observation</span>
          </div>
          <p className="text-zinc-300 light:text-zinc-700 leading-relaxed bg-zinc-950/60 light:bg-zinc-100 p-2.5 rounded-lg border border-zinc-850 light:border-zinc-200">
            {finding.what_was_observed}
          </p>
        </div>

        {/* Why it matters */}
        <div className="space-y-1">
          <div className="text-2xs font-mono uppercase tracking-wider text-zinc-400">
            Privacy & Security Significance
          </div>
          <p className="text-zinc-400 light:text-zinc-600 leading-relaxed">
            {finding.why_it_matters}
          </p>
        </div>

        {/* What TraceGuard cannot conclude */}
        <div className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80 light:bg-zinc-50 light:border-zinc-200 space-y-1">
          <div className="text-2xs font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-zinc-400" />
            <span>Audit Limitation Note</span>
          </div>
          <p className="text-2xs text-zinc-400 light:text-zinc-500 leading-relaxed italic">
            {finding.limitation_note}
          </p>
        </div>

        {/* Evidence summary if present */}
        {finding.evidence_summary && (
          <div className="text-2xs font-mono text-zinc-400 bg-zinc-950 p-2 rounded border border-zinc-850">
            <span className="text-zinc-500">Evidence: </span>
            {finding.evidence_summary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
