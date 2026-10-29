import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-xs', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-zinc-800/80 light:[&_tr]:border-zinc-200', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn('[&_tr:last-child]:border-0 [&_tr]:border-b [&_tr]:border-zinc-800/40 light:[&_tr]:border-zinc-100', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-zinc-850/50 light:hover:bg-zinc-100/70 data-[state=selected]:bg-zinc-800',
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-9 px-3 text-left align-middle font-medium text-zinc-400 font-mono uppercase tracking-wider text-2xs light:text-zinc-500 [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('p-3 align-middle [&:has([role=checkbox])]:pr-0 text-zinc-200 light:text-zinc-800', className)}
      {...props}
    />
  );
}
