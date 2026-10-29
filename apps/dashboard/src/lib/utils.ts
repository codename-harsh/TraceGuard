import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type RiskLevel = 'MINIMAL' | 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';

export interface RiskMeta {
  level: RiskLevel;
  label: string;
  description: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeClass: string;
}

export function getRiskMeta(score: number): RiskMeta {
  if (score >= 90) {
    return {
      level: 'MINIMAL',
      label: 'MINIMAL',
      description: 'Minimal observed risk',
      color: '#22c55e',
      textColor: 'text-emerald-400 dark:text-emerald-400 text-emerald-600',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };
  }
  if (score >= 75) {
    return {
      level: 'LOW',
      label: 'LOW',
      description: 'Low observed risk',
      color: '#84cc16',
      textColor: 'text-lime-400 dark:text-lime-400 text-lime-600',
      bgColor: 'bg-lime-500/10',
      borderColor: 'border-lime-500/30',
      badgeClass: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
    };
  }
  if (score >= 55) {
    return {
      level: 'MODERATE',
      label: 'MODERATE',
      description: 'Moderate observed risk',
      color: '#f59e0b',
      textColor: 'text-amber-400 dark:text-amber-400 text-amber-600',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    };
  }
  if (score >= 35) {
    return {
      level: 'ELEVATED',
      label: 'ELEVATED',
      description: 'Elevated observed risk',
      color: '#f97316',
      textColor: 'text-orange-400 dark:text-orange-400 text-orange-600',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    };
  }
  return {
    level: 'HIGH',
    label: 'HIGH',
    description: 'High observed risk',
    color: '#ef4444',
    textColor: 'text-red-400 dark:text-red-400 text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
  };
}

export function getRiskMetaByLevel(level: string): RiskMeta {
  const norm = level ? level.toUpperCase() : 'MODERATE';
  switch (norm) {
    case 'MINIMAL':
      return getRiskMeta(95);
    case 'LOW':
      return getRiskMeta(80);
    case 'MODERATE':
      return getRiskMeta(65);
    case 'ELEVATED':
      return getRiskMeta(45);
    case 'HIGH':
    default:
      return getRiskMeta(20);
  }
}

export function formatDate(dateString: string | number | Date | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatRelativeTime(dateString: string | number | Date): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateString);
  } catch {
    return '—';
  }
}
