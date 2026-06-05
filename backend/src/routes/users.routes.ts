import { Router } from 'express';

import * as users from '@/controllers/users.controller.js';
import { requireUser } from '@/middleware/require-user.js';
import { validateBody } from '@/middleware/validate.js';
import { OnboardingSchema } from '@/schemas/users.schema.js';

/**
 * /api/v1/users/me/* — operations on the currently-authenticated user.
 * Profile edits, account deletion, settings, etc. will land here.
 */

export const usersRouter: Router = Router();

usersRouter.post(
  '/onboarding',
  requireUser,
  validateBody(OnboardingSchema),
  users.completeOnboarding,
);
