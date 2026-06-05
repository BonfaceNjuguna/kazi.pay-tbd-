import { PrismaClient } from '@prisma/client';

import { isProd } from '@/config/env.js';

/**
 * Prisma client singleton. In dev with hot-reload (`tsx watch`), the
 * module gets re-imported on every file change — without this cache we'd
 * leak connections and eventually exhaust the Postgres connection pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!isProd) {
  globalForPrisma.prisma = prisma;
}
