import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '@/config/env.js';
import * as users from '@/controllers/users.controller.js';
import { requireUser } from '@/middleware/require-user.js';
import { validateBody } from '@/middleware/validate.js';
import { OnboardingSchema } from '@/schemas/users.schema.js';

/**
 * /api/v1/users/me/* — operations on the currently-authenticated user.
 * Profile edits, account deletion, settings, etc. will land here.
 */

export const usersRouter: Router = Router();

const onboardingLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many attempts — please wait a few minutes.',
    code: 'RATE_LIMITED',
  },
});

usersRouter.post(
  '/onboarding',
  onboardingLimiter,
  requireUser,
  validateBody(OnboardingSchema),
  users.completeOnboarding,
);
