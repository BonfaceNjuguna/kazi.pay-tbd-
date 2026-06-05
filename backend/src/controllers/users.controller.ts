import type { RequestHandler } from 'express';

import * as usersRepo from '@/repositories/users.repository.js';
import * as usersService from '@/services/users.service.js';
import { success } from '@/utils/api-response.js';
import { Unauthorized } from '@/utils/app-error.js';

import type { OnboardingInput } from '@/schemas/users.schema.js';

export const completeOnboarding: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw Unauthorized();
    const body = req.body as OnboardingInput;
    const updated = await usersService.completeOnboarding(req.user.sub, body);
    res.json(success(usersRepo.toPublic(updated)));
  } catch (err) {
    next(err);
  }
};
