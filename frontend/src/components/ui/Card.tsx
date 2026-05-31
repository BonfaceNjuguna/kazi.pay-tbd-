import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

/**
 * Card surface. Themed automatically:
 *   - dark theme  → bg-dark-surface-raised, dark border
 *   - light theme → bg-light-surface-raised, light border, soft shadow
 */
export function Card({ padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-dark-surface-raised border-dark-border ' +
          '[[data-theme=light]_&]:bg-light-surface-raised [[data-theme=light]_&]:border-light-border ' +
          '[[data-theme=light]_&]:shadow-soft',
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('text-lg font-bold', className)}>{children}</h3>;
}

export function CardSubtitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-sm text-dark-t3 [[data-theme=light]_&]:text-light-t3',
        className,
      )}
    >
      {children}
    </p>
  );
}
