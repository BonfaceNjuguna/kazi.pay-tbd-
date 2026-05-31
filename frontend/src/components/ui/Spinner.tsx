import { cn } from '@/lib/cn';

export interface SpinnerProps {
  className?: string;
  label?: string;
}

/** Indeterminate spinner. Inline SVG — no icon CDN per CLAUDE.md. */
export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('h-5 w-5 animate-spin', className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
