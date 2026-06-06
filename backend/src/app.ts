import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { env } from '@/config/env.js';
import { csrfOriginCheck, doubleCsrfProtection } from '@/middleware/csrf.js';
import { errorHandler } from '@/middleware/error-handler.js';
import { apiRouter } from '@/routes/index.js';

/**
 * Express app factory.
 *
 * Keeping the app creation separate from listen() makes integration
 * tests trivial — supertest takes the app object, no port needed.
 */
export function createApp() {
  const app = express();

  // Trust the first proxy hop (Vite dev proxy, future NGINX) so
  // req.ip + secure-cookie detection work correctly.
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(doubleCsrfProtection);
  app.use(csrfOriginCheck);

  app.use('/api/v1', apiRouter);

  // 404 for anything not handled above.
  app.use((_req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Not found.',
      code: 'NOT_FOUND',
    });
  });

  app.use(errorHandler);

  return app;
}
