import { Router } from 'express';

import { authRouter } from './auth.routes.js';
import { healthRouter } from './health.routes.js';
import { usersRouter } from './users.routes.js';

/**
 * Top-level /api/v1 router. Mount per-domain routers here so the
 * composition is visible in one place.
 */
export const apiRouter: Router = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users/me', usersRouter);
