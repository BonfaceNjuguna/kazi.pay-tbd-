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
 * Final submit of the 4-step onboarding wizard. Captures profession,
 * city, business name, optional brand details, and the selected plan
 * tier in a single round trip. Flips `onboardingComplete` to true and
 * returns the updated user so the auth store can be reseeded without a
 * separate `/auth/me` round trip.
 *
 * Paid-plan selection sets the tier server-side but does NOT charge
 * the user — actual M-Pesa payment for paid plans happens in Phase 3.
 * Feature gates respect the tier from this point forward.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<AuthUser> {
  const { data } = await api.post<ApiSuccess<AuthUser>>('/users/me/onboarding', input);
  return data.data;
}
