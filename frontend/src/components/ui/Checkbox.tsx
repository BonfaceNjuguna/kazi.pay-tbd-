import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
}

/**
 * Checkbox primitive. Used heavily by the document picker in Phase 2.4
 * (12 documents grouped by phase with checkboxes; recommended defaults pre-checked).
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id, label, description, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <label htmlFor={inputId} className={cn('group flex cursor-pointer items-start gap-3', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 rounded-sm border ' +
            'border-dark-border bg-dark-surface-input ' +
            'accent-lime ' +
            '[[data-theme=light]_&]:border-light-border [[data-theme=light]_&]:bg-white ' +
            'focus:ring-2 focus:ring-lime focus:ring-offset-0',
        )}
        {...rest}
      />
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && <span className="text-base font-semibold leading-tight">{label}</span>}
          {description && (
            <span className="text-sm text-dark-t3 [[data-theme=light]_&]:text-light-t3">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
});
