import { api, type ApiSuccess } from '@/lib/api';
import type { AuthUser } from '@/store/auth.store';

import type { OnboardingInput } from './auth.service';

/**
 * User service — non-auth mutations on the current user (`/users/me/*`).
 *
 * Kept separate from `auth.service` because completing onboarding,
 * editing the profile, deleting the account, etc. are user-account
 * operations, not authentication-flow operations. The split also
 * matches the planned backend route grouping (`/api/v1/auth/*` vs
 * `/api/v1/users/me/*`).
 */

/**
 * POST /api/v1/users/me/onboarding
 *
 * Captures the profession + city the user picked on the `/onboarding`
 * page and flips their `onboardingComplete` flag to `true`. Returns the
 * updated user so the auth store can be reseeded without a separate
 * `/auth/me` round trip.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<AuthUser> {
  const { data } = await api.post<ApiSuccess<AuthUser>>('/users/me/onboarding', input);
  return data.data;
}
