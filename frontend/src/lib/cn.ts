import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditional + merged class name helper.
 * Use everywhere instead of raw clsx so duplicate Tailwind utilities are
 * resolved deterministically (last-write-wins via twMerge).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
