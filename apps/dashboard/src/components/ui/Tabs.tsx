'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value,
  defaultValue = '',
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [currentVal, setCurrentVal] = React.useState<string>(value || defaultValue);

  const activeValue = value !== undefined ? value : currentVal;

  const handleValueChange = (val: string) => {
    if (value === undefined) {
      setCurrentVal(val);
    }
    onValueChange?.(val);
  };

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-start rounded-lg bg-zinc-900/90 p-1 text-zinc-400 border border-zinc-800/80 overflow-x-auto max-w-full light:bg-zinc-100 light:border-zinc-200 light:text-zinc-600',
        className
      )}
      {...props}
    />
  );
}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  badge?: number | string;
}

export function TabsTrigger({ value, badge, className, children, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 select-none gap-1.5',
        isActive
          ? 'bg-zinc-800 text-zinc-100 shadow-sm light:bg-white light:text-zinc-900 light:shadow-sm font-semibold'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50 light:text-zinc-600 light:hover:text-zinc-900 light:hover:bg-zinc-200/60',
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            'px-1.5 py-0.2 rounded-full text-2xs font-mono',
            isActive
              ? 'bg-indigo-500/20 text-indigo-300 light:bg-indigo-100 light:text-indigo-800'
              : 'bg-zinc-800 text-zinc-400 light:bg-zinc-200 light:text-zinc-600'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.value !== value) return null;

  return (
    <div
      className={cn(
        'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 animate-fade-in',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
