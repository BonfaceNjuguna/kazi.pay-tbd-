import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import jwt from 'jsonwebtoken';

import { env } from '@/config/env.js';
import { logger } from './logger.js';

/**
 * RS256 JWT signing + verification — per ADR-002.
 *
 * Asymmetric keys mean future microservices can verify tokens with the
 * public key alone, no shared secret. Keys come from env vars in prod;
 * for dev we auto-generate a keypair into `backend/.keys/` on first
 * boot so sessions survive backend restarts.
 *
 * Access-token payload:
 *   { sub: userId, role, plan, iat, exp }
 * Refresh tokens are NOT JWTs — they're opaque random strings stored
 * hashed in `user_sessions`. See sessions.repository for that side.
 */

const KEYS_DIR = path.resolve(process.cwd(), '.keys');
const PRIVATE_PATH = path.join(KEYS_DIR, 'jwt-private.pem');
const PUBLIC_PATH = path.join(KEYS_DIR, 'jwt-public.pem');

function readKeyPair(): { privateKey: string; publicKey: string } | null {
  // Single-fd open avoids the TOCTOU window of existsSync + readFileSync —
  // either both files exist and we read them, or we fall through and
  // generate. Any other errno (EACCES, EISDIR, etc.) propagates.
  let privFd: number | undefined;
  let pubFd: number | undefined;
  try {
    privFd = fs.openSync(PRIVATE_PATH, 'r');
    pubFd = fs.openSync(PUBLIC_PATH, 'r');
    return {
      privateKey: fs.readFileSync(privFd, 'utf8'),
      publicKey: fs.readFileSync(pubFd, 'utf8'),
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  } finally {
    if (privFd !== undefined) fs.closeSync(privFd);
    if (pubFd !== undefined) fs.closeSync(pubFd);
  }
}

function loadOrGenerateKeys(): { privateKey: string; publicKey: string } {
  if (env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY) {
    return { privateKey: env.JWT_PRIVATE_KEY, publicKey: env.JWT_PUBLIC_KEY };
  }

  const existing = readKeyPair();
  if (existing) return existing;

  logger.warn(
    `No JWT keys found in env or ${KEYS_DIR}. Generating a dev keypair (saved to disk, gitignored).`,
  );
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.mkdirSync(KEYS_DIR, { recursive: true });

  // `wx` = O_CREAT | O_EXCL — atomic "create if not exists". If another
  // process raced us and wrote the file first, EEXIST tells us to re-read
  // their keys instead of clobbering them with our freshly-generated pair.
  try {
    fs.writeFileSync(PRIVATE_PATH, privateKey, { mode: 0o600, flag: 'wx' });
    fs.writeFileSync(PUBLIC_PATH, publicKey, { mode: 0o600, flag: 'wx' });
    return { privateKey, publicKey };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    const raced = readKeyPair();
    if (!raced) throw err;
    return raced;
  }
}

const { privateKey, publicKey } = loadOrGenerateKeys();

export interface AccessTokenPayload {
  /** User id */
  sub: string;
  /** Subscription plan — included so feature-gates can read it without DB */
  plan: 'FREE' | 'SINGLE_PROJECT' | 'PRO';
  /** Email verified — relevant for routes that demand verified accounts */
  emailVerified: boolean;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
    issuer: 'perxli-backend',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'perxli-backend',
  });
  if (typeof decoded === 'string') {
    throw new Error('Unexpected JWT payload (string)');
  }
  return decoded as AccessTokenPayload;
}

/**
 * Refresh tokens are opaque — not JWTs. We use a 32-byte random buffer
 * encoded as URL-safe base64. The hash of this token is what's stored
 * in `user_sessions`; the raw token is sent to the client as an httpOnly
 * cookie. On refresh, we hash the incoming cookie and look it up.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
