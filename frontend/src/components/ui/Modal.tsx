import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';
import { IconClose } from './icons';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Set false to disable closing on backdrop click — e.g. for M-Pesa STK prompt waiting state. */
  closeOnBackdrop?: boolean;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
} as const;

/**
 * Simple modal using <dialog> portaled to <body>.
 *
 * Themed automatically via the surrounding [data-theme] attribute. No focus
 * trap helper yet — for Phase 1 this is good enough; richer focus management
 * (Radix Dialog or a custom focus trap) gets added when we hit a screen that
 * needs it, per the "boring architecture" rule in Coding Standards.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-8 animate-fade-up"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={cn(
          'w-full rounded-lg border shadow-deep ' +
            'bg-dark-surface-raised border-dark-border ' +
            '[[data-theme=light]_&]:bg-light-surface-raised [[data-theme=light]_&]:border-light-border',
          sizes[size],
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-dark-border p-5 [[data-theme=light]_&]:border-light-border">
            <div>
              {title && (
                <h2 id="modal-title" className="text-xl font-extrabold tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-base text-dark-t2 [[data-theme=light]_&]:text-light-t2">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-dark-t2 hover:bg-white/[0.04] hover:text-dark-t1 [[data-theme=light]_&]:text-light-t2 [[data-theme=light]_&]:hover:bg-black/[0.04] [[data-theme=light]_&]:hover:text-light-t1"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-dark-border p-4 [[data-theme=light]_&]:border-light-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
