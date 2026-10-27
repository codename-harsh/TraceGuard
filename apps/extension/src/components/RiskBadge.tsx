/**
 * RiskBadge.tsx — Neutral risk level indicator
 * Uses only sanctioned phrasing per GEMINI.md rules.
 */

import type { RiskLevel } from '@traceguard/shared-types';

interface RiskBadgeProps {
  riskLevel: RiskLevel;
  className?: string;
}

const LABELS: Record<RiskLevel, string> = {
  MINIMAL: 'Minimal observed risk',
  LOW: 'Low observed risk',
  MODERATE: 'Moderate observed risk',
  ELEVATED: 'Elevated observed risk',
  HIGH: 'High observed risk',
};

const CLASS_MAP: Record<RiskLevel, string> = {
  MINIMAL: 'badge-risk-minimal',
  LOW: 'badge-risk-low',
  MODERATE: 'badge-risk-moderate',
  ELEVATED: 'badge-risk-elevated',
  HIGH: 'badge-risk-high',
};

export function RiskBadge({ riskLevel, className = '' }: RiskBadgeProps) {
  return (
    <span className={`${CLASS_MAP[riskLevel]} ${className}`}>
      {LABELS[riskLevel]}
    </span>
  );
}

export function RiskChip({ riskLevel, className = '' }: RiskBadgeProps) {
  return (
    <span className={`${CLASS_MAP[riskLevel]} ${className}`}>
      {riskLevel}
    </span>
  );
}
