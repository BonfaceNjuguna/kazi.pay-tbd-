import {
  forwardRef,
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

import { cn } from '@/lib/cn';
import { IconChevronDown } from './icons';

/**
 * Select primitive — native <select> styled to match Input.
 *
 * Native <select> chosen over a custom dropdown for: accessibility (free
 * keyboard nav + screen-reader support), mobile UX (system-native picker
 * on phones, which matches the KaziPay mobile-first rule in CLAUDE.md),
 * and zero JS dependencies.
 *
 * Pass `options` as a typed array; the component renders them. For
 * disabled placeholder semantics, set `placeholder` and the empty option
 * value will be selected by default and the form will refuse to submit
 * with `required`.
 */
export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string = string>
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  hint?: string;
  error?: string;
  options: ReadonlyArray<SelectOption<T>>;
  placeholder?: string;
  leadingAddon?: ReactNode;
}

function SelectInner<T extends string = string>(
  {
    id,
    label,
    hint,
    error,
    options,
    placeholder,
    leadingAddon,
    className,
    ...rest
  }: SelectProps<T>,
  ref: React.Ref<HTMLSelectElement>,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy =
    [error ? `${selectId}-error` : null, hint && !error ? `${selectId}-hint` : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
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
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full appearance-none bg-transparent text-base text-dark-t1 ' +
              'outline-none ' +
              '[[data-theme=light]_&]:text-light-t1',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <IconChevronDown
          className="h-4 w-4 text-dark-t3 [[data-theme=light]_&]:text-light-t3"
          aria-hidden="true"
        />
      </div>
      {hint && !error && (
        <p
          id={`${selectId}-hint`}
          className="text-xs text-dark-t3 [[data-theme=light]_&]:text-light-t3"
        >
          {hint}
        </p>
      )}
      {error && (
        <p id={`${selectId}-error`} className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// forwardRef + generics needs a small dance.
// See: https://fettblog.eu/typescript-react-generic-forward-refs/
export const Select = forwardRef(SelectInner) as <T extends string = string>(
  props: SelectProps<T> & { ref?: React.Ref<HTMLSelectElement> },
) => ReturnType<typeof SelectInner>;
