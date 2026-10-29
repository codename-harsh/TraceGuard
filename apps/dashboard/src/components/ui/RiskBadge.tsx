import React from 'react';
import { cn, getRiskMeta, getRiskMetaByLevel, RiskLevel } from '@/lib/utils';

interface RiskBadgeProps {
  score?: number;
  level?: string | RiskLevel;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RiskBadge({
  score,
  level,
  showDescription = false,
  size = 'md',
  className,
}: RiskBadgeProps) {
  const meta = score !== undefined ? getRiskMeta(score) : getRiskMetaByLevel(level || 'MODERATE');

  const sizeClasses = {
    sm: 'text-2xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono uppercase tracking-wider rounded-md border transition-colors select-none font-medium',
        meta.badgeClass,
        sizeClasses[size],
        className
      )}
      title={meta.description}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
        style={{ backgroundColor: meta.color }}
      />
      <span>{meta.label}</span>
      {showDescription && (
        <span className="opacity-80 normal-case font-sans tracking-normal font-normal text-2xs ml-0.5">
          ({meta.description})
        </span>
      )}
    </span>
  );
}
