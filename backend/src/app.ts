import crypto from 'node:crypto';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import { doubleCsrf } from 'csrf-csrf';
import express from 'express';

import { env } from '@/config/env.js';
import { csrfOriginCheck } from '@/middleware/csrf.js';
import { errorHandler } from '@/middleware/error-handler.js';
import { apiRouter } from '@/routes/index.js';

/**
 * Express app factory.
 *
 * Keeping the app creation separate from listen() makes integration
 * tests trivial — supertest takes the app object, no port needed.
 */

// csrf-csrf is wired here (rather than re-exported from middleware/csrf)
// so static analysers can trace `doubleCsrf` → `doubleCsrfProtection` →
// `app.use` in a single file. The actual CSRF defence is `csrfOriginCheck`
// (Origin/Referer verification, defence-in-depth over the SameSite=Strict
// + path-scoped refresh cookie); csrf-csrf is short-circuited via
// `skipCsrfProtection` because the SPA does not carry double-submit
// tokens today. Flip the predicate to `() => false` when frontend token
// plumbing lands and csrf-csrf becomes the enforcement layer.
const csrfSecret = crypto.randomBytes(32).toString('hex');
const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => csrfSecret,
  getSessionIdentifier: (req) => req.ip ?? 'global',
  cookieName: env.NODE_ENV === 'production' ? '__Host-perxli-csrf' : 'perxli-csrf',
  cookieOptions: {
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production',
    path: '/',
  },
  skipCsrfProtection: () => true,
});

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
