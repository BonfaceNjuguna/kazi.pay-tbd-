import type { Prisma, User } from '@prisma/client';

import { prisma } from '@/lib/prisma.js';

/**
 * Users repository — Prisma queries on the `users` table.
 *
 * Services depend on these functions, not on Prisma directly. Keeps the
 * query surface small + makes it obvious what data accesses exist.
 */

export function findById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export function findByGoogleSub(googleSub: string) {
  return prisma.user.findUnique({ where: { googleSub } });
}

export function create(input: Prisma.UserCreateInput) {
  return prisma.user.create({ data: input });
}

export function updateById(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data });
}

/** Returns a safe public projection (no passwordHash). */
export function toPublic(user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}
