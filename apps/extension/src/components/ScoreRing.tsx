/**
 * ScoreRing.tsx — Animated SVG score ring component
 *
 * Displays the privacy/security score (0–100) as an animated circular progress
 * ring with the score number and risk level colour.
 */

import type { RiskLevel } from '@traceguard/shared-types';
import { useEffect, useRef } from 'react';

interface ScoreRingProps {
  score: number;
  riskLevel: RiskLevel;
  size?: number;
  strokeWidth?: number;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  MINIMAL: '#22c55e',
  LOW: '#84cc16',
  MODERATE: '#f59e0b',
  ELEVATED: '#f97316',
  HIGH: '#ef4444',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  MINIMAL: 'MINIMAL',
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  ELEVATED: 'ELEVATED',
  HIGH: 'HIGH',
};

export function ScoreRing({
  score,
  riskLevel,
  size = 88,
  strokeWidth = 7,
}: ScoreRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = RISK_COLORS[riskLevel];
  const cx = size / 2;
  const cy = size / 2;

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    // Animate from full offset (empty) to target offset
    circle.style.strokeDashoffset = String(circumference);
    circle.style.transition = 'none';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        circle.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)';
        circle.style.strokeDashoffset = String(offset);
      });
    });
  }, [score, circumference, offset]);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
        aria-label={`Privacy score: ${score} out of 100`}
      >
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          ref={circleRef}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>

      {/* Center content (counter-rotated) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-bold leading-none"
          style={{ fontSize: size * 0.28, color }}
        >
          {score}
        </span>
        <span className="text-zinc-500 leading-none" style={{ fontSize: size * 0.12 }}>
          /100
        </span>
      </div>
    </div>
  );
}

export function ScoreRingCompact({
  score,
  riskLevel,
}: ScoreRingProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <ScoreRing score={score} riskLevel={riskLevel} size={88} strokeWidth={7} />
      <span className="text-2xs font-mono uppercase tracking-widest" style={{ color: RISK_COLORS[riskLevel] }}>
        {RISK_LABELS[riskLevel]}
      </span>
    </div>
  );
}
