'use client';

import React from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import { Button } from '../ui/Button';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className}
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-zinc-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="h-4 w-4 text-zinc-600 hover:text-indigo-600 transition-colors" />
      )}
    </Button>
  );
}
