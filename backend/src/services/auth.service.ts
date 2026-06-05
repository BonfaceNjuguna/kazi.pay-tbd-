import crypto from 'node:crypto';

import type { User } from '@prisma/client';

import { env } from '@/config/env.js';
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '@/lib/jwt.js';
import { logger } from '@/lib/logger.js';
import { hashPassword, verifyPassword } from '@/lib/passwords.js';
import * as sessionsRepo from '@/repositories/sessions.repository.js';
import * as usersRepo from '@/repositories/users.repository.js';
import * as verifyRepo from '@/repositories/verification.repository.js';
import {
  BadRequest,
  Conflict,
  Forbidden,
  Unauthorized,
} from '@/utils/app-error.js';
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './email.service.js';

/**
 * Auth service — all the business logic for /auth/* endpoints.
 *
 * Controllers stay thin: parse → call service → format response. This
 * file is where the rules live (anti-enumeration, token rotation,
 * stolen-token detection, etc.).
 *
 * Per ADR-002:
 *   - bcrypt cost 12 (lib/passwords.ts)
 *   - RS256 JWT access token, 15min default TTL
 *   - Opaque refresh token, 7 day default TTL, rotated on every use
 *   - Reuse of a revoked refresh = revoke all sessions for that user
 */

const REFRESH_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 30 * 60 * 1000; // 30min

export interface RequestMeta {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuthSessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

// ── Register ────────────────────────────────────────────────────────

export async function register(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  const existing = await usersRepo.findByEmail(input.email);
  if (existing) {
    throw Conflict('That email already has an account.', 'DUPLICATE_EMAIL');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await usersRepo.create({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
  });

  // Issue + send a verification token. We don't return the token to the
  // client — they get it from the email (or in dev, the console log).
  const token = await issueVerificationToken(user.id);
  await sendVerificationEmail({ to: user.email, token });

  return {
    email: user.email,
    message: "We've sent a verification link to your email.",
  };
}

// ── Email verification ──────────────────────────────────────────────

async function issueVerificationToken(userId: string): Promise<string> {
  // Invalidate any previous unused tokens for this user, then create one.
  await verifyRepo.invalidateEmailVerifications(userId);
  const raw = generateRefreshToken(); // same generator pattern — opaque random
  const tokenHash = hashRefreshToken(raw);
  await verifyRepo.createEmailVerification({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
  });
  return raw;
}

export async function verifyEmail(token: string) {
  const tokenHash = hashRefreshToken(token);
  const record = await verifyRepo.findEmailVerificationByHash(tokenHash);

  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw BadRequest(
      'This verification link has expired or is invalid.',
      'INVALID_VERIFY_TOKEN',
    );
  }

  await verifyRepo.markEmailVerificationUsed(record.id);
  await usersRepo.updateById(record.userId, { emailVerified: true });
}

/**
 * No-enumeration: returns success regardless of whether the email is
 * registered or already verified. In dev the email service logs the
 * link if a token was actually issued.
 */
export async function resendVerification(email: string) {
  const user = await usersRepo.findByEmail(email);
  if (!user || user.emailVerified) return;
  const token = await issueVerificationToken(user.id);
  await sendVerificationEmail({ to: user.email, token });
}

// ── Login + sessions ────────────────────────────────────────────────

export async function login(input: {
  email: string;
  password: string;
  meta: RequestMeta;
}): Promise<{ user: User; tokens: AuthSessionTokens }> {
  const user = await usersRepo.findByEmail(input.email);
  if (!user) {
    throw Unauthorized(
      'Email or password is incorrect.',
      'INVALID_CREDENTIALS',
    );
  }
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    throw Unauthorized(
      'Email or password is incorrect.',
      'INVALID_CREDENTIALS',
    );
  }
  if (!user.emailVerified) {
    throw Forbidden(
      'Verify your email first. Check your inbox for the link we sent.',
      'EMAIL_NOT_VERIFIED',
    );
  }

  const tokens = await issueTokens(user, input.meta);
  return { user, tokens };
}

async function issueTokens(
  user: User,
  meta: RequestMeta,
): Promise<AuthSessionTokens> {
  const accessToken = signAccessToken({
    sub: user.id,
    plan: user.plan,
    emailVerified: user.emailVerified,
  });

  const refreshTokenRaw = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshTokenRaw);
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await sessionsRepo.create({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: refreshExpiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { accessToken, refreshToken: refreshTokenRaw, refreshExpiresAt };
}

// ── Refresh (rotation + stolen-token detection) ─────────────────────

export async function refresh(input: {
  refreshTokenRaw: string;
  meta: RequestMeta;
}): Promise<{ user: User; tokens: AuthSessionTokens }> {
  const tokenHash = hashRefreshToken(input.refreshTokenRaw);
  const session = await sessionsRepo.findByTokenHash(tokenHash);

  if (!session) {
    throw Unauthorized('Session not found.', 'SESSION_NOT_FOUND');
  }

  // Stolen-token detection: a revoked token being reused implies
  // someone else has the cookie. Nuke every session for that user.
  if (session.revokedAt) {
    logger.warn(
      { userId: session.userId, sessionId: session.id },
      'Reuse of revoked refresh token — revoking all user sessions.',
    );
    await sessionsRepo.revokeAllForUser(session.userId);
    throw Unauthorized(
      'Session compromised — please sign in again.',
      'SESSION_REUSED',
    );
  }

  if (!sessionsRepo.isUsable(session)) {
    throw Unauthorized('Session expired.', 'SESSION_EXPIRED');
  }

  const user = await usersRepo.findById(session.userId);
  if (!user) {
    throw Unauthorized('Account no longer exists.', 'NOT_FOUND');
  }

  // Rotate: revoke the old session, mint a new pair.
  await sessionsRepo.revoke(session.id);
  const tokens = await issueTokens(user, input.meta);
  return { user, tokens };
}

// ── Logout ──────────────────────────────────────────────────────────

export async function logout(refreshTokenRaw: string | undefined) {
  if (!refreshTokenRaw) return;
  const tokenHash = hashRefreshToken(refreshTokenRaw);
  const session = await sessionsRepo.findByTokenHash(tokenHash);
  if (session && !session.revokedAt) {
    await sessionsRepo.revoke(session.id);
  }
}

// ── Password reset ──────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  // No-enumeration: always succeed for the caller.
  const user = await usersRepo.findByEmail(email);
  if (!user) return;
  const raw = generateRefreshToken();
  const tokenHash = hashRefreshToken(raw);
  await verifyRepo.createPasswordReset({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  await sendPasswordResetEmail({ to: user.email, token: raw });
}

export async function resetPassword(input: { token: string; password: string }) {
  const tokenHash = hashRefreshToken(input.token);
  const record = await verifyRepo.findPasswordResetByHash(tokenHash);
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw BadRequest(
      'This reset link has expired or is invalid.',
      'INVALID_RESET_TOKEN',
    );
  }

  const newHash = await hashPassword(input.password);
  await usersRepo.updateById(record.userId, { passwordHash: newHash });
  await verifyRepo.markPasswordResetUsed(record.id);

  // Revoke every active session — force re-login on all devices after
  // a password change. Standard security hygiene.
  await sessionsRepo.revokeAllForUser(record.userId);
}

// ── Helpers ─────────────────────────────────────────────────────────

export function extractRequestMeta(req: {
  ip?: string | undefined;
  headers: { 'user-agent'?: string | undefined };
}): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']?.slice(0, 500),
  };
}

/** Helper for setting/clearing the refresh-token cookie consistently. */
export const REFRESH_COOKIE_NAME = 'kazipay_rt';

export function refreshCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    expires: expiresAt,
  };
}

// Re-export so the password-reset hash-construction stays available to
// other services that need it (none today, but kept symmetric with auth.service.ts).
export { hashRefreshToken, generateRefreshToken };

// `crypto` is referenced in case future helpers want it.
void crypto;
