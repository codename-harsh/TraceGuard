import React from 'react';
import { cn, getRiskMeta } from '@/lib/utils';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showDetails?: boolean;
  className?: string;
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 9,
  showDetails = true,
  className,
}: ScoreRingProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const meta = getRiskMeta(safeScore);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore / 100) * circumference;

  return (
    <div className={cn('relative inline-flex flex-col items-center justify-center select-none', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-zinc-800/80 light:text-zinc-200"
          />
          {/* Animated score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={meta.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${meta.color}33)`,
            }}
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className="text-2xl font-bold font-mono tracking-tight text-zinc-100 light:text-zinc-900 leading-none"
            style={{ fontSize: size > 140 ? '2.5rem' : size > 90 ? '1.75rem' : '1.25rem' }}
          >
            {safeScore}
          </span>
          <span className="text-2xs font-mono text-zinc-500 light:text-zinc-400 mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 text-center">
          <div
            className="text-xs font-semibold font-mono uppercase tracking-wider"
            style={{ color: meta.color }}
          >
            {meta.label}
          </div>
          <div className="text-2xs text-zinc-400 light:text-zinc-500">
            {meta.description}
          </div>
        </div>
      )}
    </div>
  );
}
