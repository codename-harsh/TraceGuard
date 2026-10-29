import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-2xs font-mono text-zinc-400 mb-1">{label}</label>}
        <div className="relative">
          <select
            className={cn(
              'flex h-9 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1 pr-8 text-xs text-zinc-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 light:bg-white light:border-zinc-300 light:text-zinc-900',
              error && 'border-red-500',
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <span className="text-2xs text-red-400 mt-1 block">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
