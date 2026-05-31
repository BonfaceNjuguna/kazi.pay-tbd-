import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

/**
 * Button primitive — used across both dark (creative) and light (client) surfaces.
 *
 * Variants:
 *  - primary   — lime, dark text. The default. Use sparingly per screen (1 max).
 *  - secondary — purple, white text. Use for "alternative" primary actions.
 *  - ghost     — bordered transparent. Use for cancel / secondary actions.
 *  - danger    — red. Use for destructive actions (revoke link, void document).
 *  - link      — text-only, underline on hover.
 *
 * Sizes: sm / md (default) / lg
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-lime text-dark-surface hover:bg-lime-hover hover:shadow-lime-glow ' +
    'disabled:bg-lime/40 disabled:text-dark-surface/60 disabled:shadow-none',
  secondary:
    'bg-purple text-white hover:bg-purple-hover hover:shadow-purple-glow ' +
    'disabled:bg-purple/40 disabled:text-white/60 disabled:shadow-none',
  ghost:
    'bg-transparent text-dark-t2 border border-dark-border ' +
    'hover:text-dark-t1 hover:border-dark-border-hover ' +
    '[[data-theme=light]_&]:text-light-t2 [[data-theme=light]_&]:border-light-border ' +
    '[[data-theme=light]_&]:hover:text-light-t1 [[data-theme=light]_&]:hover:border-light-border-hover',
  danger:
    'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/40 disabled:text-white/60',
  link: 'bg-transparent text-lime underline-offset-2 hover:underline disabled:text-lime/40',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-6 text-lg gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold ' +
          'transition-all duration-fast outline-none ' +
          'disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});
