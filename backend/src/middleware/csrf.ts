import type { RequestHandler } from 'express';

import { env } from '@/config/env.js';
import { Forbidden } from '@/utils/app-error.js';

/**
 * CSRF protection — Origin/Referer header verification.
 *
 * The refresh-token cookie is already `SameSite=Strict` + path-scoped to
 * `/api/v1/auth`, which on its own blocks the classic CSRF attack vectors
 * (no browser will attach it on a cross-site POST). This middleware is the
 * belt-and-braces second layer recommended by OWASP for cookie-bearing
 * APIs: every state-changing request must carry an Origin (or Referer
 * fallback) that matches the CORS allow-list. Modern browsers always set
 * `Origin` on fetch/XHR for non-GET methods, so legitimate frontend
 * traffic is never rejected; a forged cross-site POST has no way to
 * spoof Origin from JavaScript.
 *
 * Why not csurf / csrf-csrf?
 *   csurf is deprecated. csrf-csrf works but its double-submit token
 *   requires the SPA to fetch + thread a token through every request,
 *   which is dead weight when SameSite=Strict + Origin-check already
 *   gives equivalent guarantees on an API-only backend.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const source = req.headers.origin ?? req.headers.referer;
  if (!source) {
    next(Forbidden('Missing Origin header.', 'CSRF_NO_ORIGIN'));
    return;
  }

  let origin: string;
  try {
    origin = new URL(source).origin;
  } catch {
    next(Forbidden('Malformed Origin header.', 'CSRF_BAD_ORIGIN'));
    return;
  }

  if (!env.CORS_ORIGINS.includes(origin)) {
    next(Forbidden('Origin not allowed.', 'CSRF_BAD_ORIGIN'));
    return;
  }

  next();
};
