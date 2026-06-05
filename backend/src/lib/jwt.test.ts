import { describe, expect, it } from 'vitest';

import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from './jwt.js';

describe('jwt', () => {
  it('signs an RS256 access token and verifies it back', () => {
    const payload = {
      sub: '11111111-1111-4111-8111-111111111111',
      plan: 'FREE' as const,
      emailVerified: true,
    };
    const token = signAccessToken(payload);
    expect(token.split('.').length).toBe(3); // header.payload.signature

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.plan).toBe(payload.plan);
    expect(decoded.emailVerified).toBe(true);
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken({
      sub: 'user-id',
      plan: 'PRO',
      emailVerified: true,
    });
    const [header, , signature] = token.split('.');
    const tampered = `${header}.eyJzdWIiOiJzb21lb25lLWVsc2UifQ.${signature}`;
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe('refresh tokens', () => {
  it('generates URL-safe 32-byte base64 strings', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43); // ~43 chars for 32 bytes base64url
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hashRefreshToken is deterministic + 64 hex chars (sha256)', () => {
    const raw = 'some-opaque-token';
    const h1 = hashRefreshToken(raw);
    const h2 = hashRefreshToken(raw);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});
