import type { RequestHandler } from 'express';

import { verifyAccessToken } from '@/lib/jwt.js';
import { Unauthorized } from '@/utils/app-error.js';

/**
 * Auth middleware — verifies the JWT and attaches the decoded payload
 * to `req.user`. Subsequent handlers can rely on `req.user` being set.
 */
export const requireUser: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(Unauthorized());
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(Unauthorized());
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(Unauthorized('Your session has expired.', 'TOKEN_EXPIRED'));
  }
};

// Note: the `Request.user` augmentation lives in `src/types/express.d.ts`
// (global namespace declaration — Express 5 doesn't expose the
// 'express-serve-static-core' sub-module the way Express 4 did).
