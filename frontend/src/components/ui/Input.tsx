import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * Input primitive. Works on both themes via the dark/light surface tokens.
 * Always pass a `label` — or wrap externally in <Label> and pass `id`.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leadingAddon?: ReactNode;
  trailingAddon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, hint, error, leadingAddon, trailingAddon, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy =
    [error ? `${inputId}-error` : null, hint && !error ? `${inputId}-hint` : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold uppercase tracking-wide text-dark-t3 [[data-theme=light]_&]:text-light-t3"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border bg-dark-surface-input px-3 ' +
            'border-dark-border ' +
            'focus-within:border-lime ' +
            '[[data-theme=light]_&]:bg-light-surface-input [[data-theme=light]_&]:border-light-border',
          error && 'border-danger focus-within:border-danger',
        )}
      >
        {leadingAddon && <span className="text-dark-t3">{leadingAddon}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full bg-transparent text-base text-dark-t1 placeholder:text-dark-t3 ' +
              'outline-none ' +
              '[[data-theme=light]_&]:text-light-t1 [[data-theme=light]_&]:placeholder:text-light-t3',
            className,
          )}
          {...rest}
        />
        {trailingAddon && <span className="text-dark-t3">{trailingAddon}</span>}
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-dark-t3 [[data-theme=light]_&]:text-light-t3">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
