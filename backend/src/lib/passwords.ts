import bcrypt from 'bcryptjs';

/**
 * Password hashing — bcrypt with cost factor 12 per ADR-002.
 *
 * `bcryptjs` is pure JS (no native build step) and works on any Node
 * runtime without rebuild. Slower than the native `bcrypt` lib but
 * still well within budget for auth requests (~100ms/hash on a laptop).
 *
 * NEVER log or store the plaintext password. The hash is what goes
 * into the DB; the plaintext disappears at the end of the request.
 */

const COST_FACTOR = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, COST_FACTOR);
}

export async function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
