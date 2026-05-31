import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type BadgeTone = 'neutral' | 'lime' | 'purple' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const tones: Record<BadgeTone, string> = {
  neutral:
    'bg-dark-surface-chip text-dark-t2 ' +
    '[[data-theme=light]_&]:bg-light-surface-chip [[data-theme=light]_&]:text-light-t2',
  lime: 'bg-lime-bg text-lime',
  purple: 'bg-purple-bg text-purple',
  success:
    'bg-success-bg text-success ' +
    '[[data-theme=light]_&]:bg-success-bg-light [[data-theme=light]_&]:text-success-light',
  warning:
    'bg-warning-bg text-warning ' +
    '[[data-theme=light]_&]:bg-warning-bg-light [[data-theme=light]_&]:text-warning-light',
  danger: 'bg-danger-bg text-danger',
};

export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xl px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
