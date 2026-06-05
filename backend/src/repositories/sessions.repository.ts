import type { UserSession } from '@prisma/client';

import { prisma } from '@/lib/prisma.js';

/**
 * Sessions repository — refresh-token persistence per ADR-002.
 *
 * Each row represents one refresh token. We store only the sha256 hash,
 * never the raw token. Rotation: on each /auth/refresh use, the old
 * row is marked revoked and a new row is created.
 */

export function create(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}) {
  return prisma.userSession.create({ data: input });
}

export function findByTokenHash(tokenHash: string) {
  return prisma.userSession.findUnique({ where: { tokenHash } });
}

export function markUsed(id: string) {
  return prisma.userSession.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}

export function revoke(id: string) {
  return prisma.userSession.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}

/**
 * Stolen-token detection — if a revoked refresh token is reused, treat
 * it as a leaked credential and nuke every session for that user. The
 * user will be logged out everywhere and have to sign in fresh.
 */
export function revokeAllForUser(userId: string) {
  return prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** True if the session is still valid (not expired, not revoked). */
export function isUsable(session: UserSession): boolean {
  if (session.revokedAt) return false;
  if (session.expiresAt.getTime() < Date.now()) return false;
  return true;
}
