import type { AccessTokenPayload } from '@/lib/jwt.js';

/**
 * Augments Express's Request with `user` (set by the `requireUser`
 * middleware after JWT verification).
 *
 * Express 5 dropped the `express-serve-static-core` sub-module that
 * Express 4 used for this. The supported pattern is now the global
 * `Express.Request` namespace.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// Marker export to keep the file as a module (declare global only works in modules).
export {};
