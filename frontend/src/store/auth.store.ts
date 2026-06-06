import { create } from 'zustand';

/**
 * Auth store (Zustand).
 *
 * Holds the current creative session in memory. Per ADR-002:
 *  - Access token is stored in memory only (not localStorage) — refresh comes
 *    via the httpOnly cookie on /api/v1/auth/refresh.
 *  - Subscription plan is included so feature gating can read it without
 *    a roundtrip. The backend remains the source of truth — frontend gates
 *    are UX only (see Coding Standards in AGENTS.md).
 *
 * Real population of this store happens in Phase 1.8 (auth UI) by calling
 * /api/v1/auth/login or /api/v1/auth/me on app boot. For Phase 1.7 it stays
 * inert.
 */

export type SubscriptionPlan = 'FREE' | 'SINGLE_PROJECT' | 'PRO';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  /**
   * `false` immediately after registration. Flipped to `true` when the user
   * follows the verification link from `/verify-email?token=...`. The login
   * handler refuses to issue a session for an unverified email; UI redirects
   * those users to `/verify-email` with a "resend" affordance.
   */
  emailVerified: boolean;
  /**
   * Set during onboarding step 1, not registration. May be empty string
   * for users who haven't completed the wizard yet — combined with
   * `onboardingComplete: false` below.
   */
  profession: string;
  /** Set during onboarding step 1. */
  city: string;
  /** Set during onboarding step 2. Defaults to fullName at wizard start. */
  businessName: string;
  /** Optional, captured during onboarding step 3 (Brand). */
  kraPin?: string;
  /** Optional, captured during onboarding step 3 (Brand). */
  businessAddress?: string;
  country: string;
  currency: string;
  /**
   * Set during onboarding step 4 (Plan). All three plans are user-selectable
   * during onboarding; payment for paid plans is requested at upgrade time
   * (Phase 3). For Phase 1.8 the backend accepts the selection and sets the
   * tier without payment; feature-gates respect the tier from this moment on.
   */
  plan: SubscriptionPlan;
  /**
   * `false` immediately after registration; flipped to `true` when the user
   * completes the `/onboarding` wizard's final step. The `OnboardingGate`
   * component reads this to decide whether to redirect to `/onboarding`
   * instead of letting `/dashboard` render.
   */
  onboardingComplete: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setSession: (params: { user: AuthUser; accessToken: string }) => void;
  setAccessToken: (token: string) => void;
  /**
   * Set the user without touching the access token. Used by the boot-time
   * session restore (`<SessionBootstrap>` in `App.tsx`): a GET /auth/me on
   * app mount returns just the user, while the access token has already
   * been re-minted by the axios refresh interceptor as a side-effect of
   * the 401 → /auth/refresh dance.
   */
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setSession: ({ user, accessToken }) =>
    set({ user, accessToken, isAuthenticated: true }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setUser: (user) => set({ user, isAuthenticated: true }),

  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
