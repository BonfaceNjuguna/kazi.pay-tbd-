import { describe, expect, it } from 'vitest';

import { formatKesCents, toKesCents } from './money';

describe('money helpers', () => {
  it('formats integer cents as a KES string with thousands separators', () => {
    expect(formatKesCents(1_250_000)).toBe('KES 12,500');
    expect(formatKesCents(0)).toBe('KES 0');
    expect(formatKesCents(49_900)).toBe('KES 499');
  });

  it('parses a numeric string to integer cents', () => {
    expect(toKesCents('12500')).toBe(1_250_000);
    expect(toKesCents('12,500')).toBe(1_250_000);
    expect(toKesCents(12500)).toBe(1_250_000);
  });

  it('rejects invalid amounts', () => {
    expect(() => toKesCents('abc')).toThrow();
    expect(() => toKesCents(-1)).toThrow();
  });
});
