import { prisma } from '@/lib/prisma.js';

/**
 * Verification + password-reset tokens. Same pattern as sessions: store
 * the sha256 hash, look up by hashing the incoming token. One-time use:
 * `usedAt` gets set when the token's been redeemed.
 */

// ── Email verification ──────────────────────────────────────────────

export function createEmailVerification(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.emailVerificationToken.create({ data: input });
}

export function findEmailVerificationByHash(tokenHash: string) {
  return prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
}

export function markEmailVerificationUsed(id: string) {
  return prisma.emailVerificationToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

/** Invalidate all unused verification tokens for a user — called when issuing a fresh one. */
export function invalidateEmailVerifications(userId: string) {
  return prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
}

// ── Password reset ──────────────────────────────────────────────────

export function createPasswordReset(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.passwordResetToken.create({ data: input });
}

export function findPasswordResetByHash(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
}

export function markPasswordResetUsed(id: string) {
  return prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
