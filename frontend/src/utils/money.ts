/**
 * Money formatting helpers.
 *
 * Per ADR-003, all amounts are stored as integer **KES cents**.
 * Per ADR-004, frontend formats with thousands separators on display.
 * Per CLAUDE.md, currency is always KES at v1 — multi-currency is a
 * future-features.md item, not Phase 1–4 scope.
 */

const KES_FORMATTER = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Convert integer cents to a display string. e.g. 1_250_000 → "KES 12,500". */
export function formatKesCents(cents: number): string {
  return KES_FORMATTER.format(cents / 100);
}

/** Convert a display value (e.g. "12500" or 12500) into integer KES cents. */
export function toKesCents(input: string | number): number {
  const n = typeof input === 'string' ? Number(input.replace(/[, ]/g, '')) : input;
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid KES amount: ${String(input)}`);
  }
  return Math.round(n * 100);
}
