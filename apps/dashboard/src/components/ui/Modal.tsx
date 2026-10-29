'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div
        className={cn(
          'relative z-50 w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl text-zinc-100 animate-fade-in max-h-[90vh] overflow-y-auto light:bg-white light:border-zinc-200 light:text-zinc-900',
          className
        )}
      >
        <div className="flex items-start justify-between pb-3 border-b border-zinc-800 light:border-zinc-200">
          <div>
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            {description && (
              <p className="text-xs text-zinc-400 light:text-zinc-500 mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 light:hover:bg-zinc-100 light:hover:text-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
