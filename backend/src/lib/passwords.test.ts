import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './passwords.js';

describe('passwords', () => {
  it('hashPassword + verifyPassword roundtrip succeeds', async () => {
    const hash = await hashPassword('Demo1234!');
    expect(hash).not.toBe('Demo1234!');
    expect(hash.length).toBeGreaterThan(20);
    await expect(verifyPassword('Demo1234!', hash)).resolves.toBe(true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('Demo1234!');
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('hashes the same plaintext to different hashes (salt)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
    await expect(verifyPassword('same', a)).resolves.toBe(true);
    await expect(verifyPassword('same', b)).resolves.toBe(true);
  });
});
