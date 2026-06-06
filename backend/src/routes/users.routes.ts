import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import * as users from '@/controllers/users.controller.js';
import { requireUser } from '@/middleware/require-user.js';
import { validateBody } from '@/middleware/validate.js';
import { OnboardingSchema } from '@/schemas/users.schema.js';

/**
 * /api/v1/users/me/* — operations on the currently-authenticated user.
 * Profile edits, account deletion, settings, etc. will land here.
 */

export const usersRouter: Router = Router();

const onboardingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each user/IP to 20 onboarding attempts per window
});

usersRouter.post(
  '/onboarding',
  onboardingRateLimiter,
  requireUser,
  validateBody(OnboardingSchema),
  users.completeOnboarding,
);
