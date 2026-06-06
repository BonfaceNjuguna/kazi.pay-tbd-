import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import { prisma } from '@/lib/prisma.js';
import { createApp } from './app.js';

/**
 * Backend entrypoint. Starts the HTTP server and handles graceful
 * shutdown — important for Prisma connection cleanup and for not
 * dropping in-flight requests when nodemon/tsx restarts on edits.
 */
async function main() {
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Perxli backend listening on http://localhost:${env.PORT}`);
    logger.info(`Mode: ${env.NODE_ENV} · CORS: ${env.CORS_ORIGINS.join(', ')}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down…');
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Goodbye.');
      process.exit(0);
    });
    // Hard-kill if shutdown drags on.
    setTimeout(() => {
      logger.warn('Forceful exit after 10s.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Backend failed to start');
  process.exit(1);
});
