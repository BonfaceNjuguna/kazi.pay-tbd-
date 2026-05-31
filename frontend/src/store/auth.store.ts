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
  profession: string;
  city: string;
  country: string;
  currency: string;
  plan: SubscriptionPlan;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setSession: (params: { user: AuthUser; accessToken: string }) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setSession: ({ user, accessToken }) =>
    set({ user, accessToken, isAuthenticated: true }),

  setAccessToken: (accessToken) => set({ accessToken }),

  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
