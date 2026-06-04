/**
 * Money formatting helpers.
 *
 * Per ADR-003, all amounts are stored as integer **KES cents**.
 * Per ADR-004, frontend formats with thousands separators on display.
 * Per CLAUDE.md, currency is always KES at v1 — multi-currency is a
 * future-features.md item, not Phase 1–4 scope.
 */

/*
 * `currencyDisplay: 'code'` forces the ISO 4217 code "KES" instead of the
 * Kenya locale's colloquial symbol "Ksh" (which is what en-KE returns by
 * default in newer ICU/CLDR versions). CLAUDE.md spec is "KES 12,500".
 */
const KES_FORMATTER = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Replaces non-breaking spaces that ICU inserts between the currency code
 * and the number with a regular space. Both characters render identically
 * but break strict equality checks (tests, snapshot diffs, clipboard text).
 *
 * - U+00A0: NO-BREAK SPACE (older ICU versions)
 * - U+202F: NARROW NO-BREAK SPACE (newer ICU versions, used in some locales)
 */
const SPACE_NORMALIZE_RE = /[  ]/g;

/** Convert integer cents to a display string. e.g. 1_250_000 → "KES 12,500". */
export function formatKesCents(cents: number): string {
  return KES_FORMATTER.format(cents / 100).replace(SPACE_NORMALIZE_RE, ' ');
}

/** Convert a display value (e.g. "12500" or 12500) into integer KES cents. */
export function toKesCents(input: string | number): number {
  const n = typeof input === 'string' ? Number(input.replace(/[, ]/g, '')) : input;
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Invalid KES amount: ${String(input)}`);
  }
  return Math.round(n * 100);
}
