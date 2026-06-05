import * as usersRepo from '@/repositories/users.repository.js';
import { NotFound } from '@/utils/app-error.js';

import type { OnboardingInput } from '@/schemas/users.schema.js';

/**
 * User service — operations on the authenticated user record.
 * The me-* and onboarding endpoints route through here.
 */

export async function getCurrentUser(userId: string) {
  const user = await usersRepo.findById(userId);
  if (!user) throw NotFound('Account no longer exists.', 'NOT_FOUND');
  return user;
}

export async function completeOnboarding(userId: string, input: OnboardingInput) {
  const user = await usersRepo.findById(userId);
  if (!user) throw NotFound('Account no longer exists.', 'NOT_FOUND');

  const updated = await usersRepo.updateById(userId, {
    profession: input.profession,
    city: input.city,
    businessName: input.businessName,
    kraPin: input.kraPin ?? null,
    businessAddress: input.businessAddress ?? null,
    plan: input.plan,
    onboardingComplete: true,
  });
  return updated;
}
