import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'mono' | 'success' | 'warning' | 'danger';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default:
      'border-transparent bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    secondary:
      'border-transparent bg-zinc-800 text-zinc-300 light:bg-zinc-200 light:text-zinc-800',
    outline:
      'border border-zinc-750 text-zinc-300 light:border-zinc-300 light:text-zinc-700',
    mono:
      'font-mono text-2xs uppercase tracking-wider bg-zinc-850/80 text-zinc-300 border border-zinc-750/80 px-1.5 py-0.5 rounded',
    success:
      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    warning:
      'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    danger:
      'bg-red-500/10 text-red-400 border border-red-500/30',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors select-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
