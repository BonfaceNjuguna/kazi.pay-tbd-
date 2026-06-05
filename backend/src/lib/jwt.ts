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

function loadOrGenerateKeys(): { privateKey: string; publicKey: string } {
  if (env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY) {
    return { privateKey: env.JWT_PRIVATE_KEY, publicKey: env.JWT_PUBLIC_KEY };
  }

  if (fs.existsSync(PRIVATE_PATH) && fs.existsSync(PUBLIC_PATH)) {
    return {
      privateKey: fs.readFileSync(PRIVATE_PATH, 'utf8'),
      publicKey: fs.readFileSync(PUBLIC_PATH, 'utf8'),
    };
  }

  logger.warn(
    `No JWT keys found in env or ${KEYS_DIR}. Generating a dev keypair (saved to disk, gitignored).`,
  );
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.mkdirSync(KEYS_DIR, { recursive: true });
  fs.writeFileSync(PRIVATE_PATH, privateKey, { mode: 0o600 });
  fs.writeFileSync(PUBLIC_PATH, publicKey, { mode: 0o600 });

  return { privateKey, publicKey };
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
    issuer: 'kazipay-backend',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'kazipay-backend',
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
