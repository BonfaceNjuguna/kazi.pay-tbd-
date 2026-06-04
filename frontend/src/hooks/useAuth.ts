import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import * as authService from '@/services/auth.service';
import * as userService from '@/services/user.service';
import { useAuthStore, type AuthUser } from '@/store/auth.store';

/**
 * Auth hooks. Compose the auth service with the Zustand session store and
 * the React Query cache, and own navigation side-effects (redirect on
 * success/failure).
 *
 * Hooks intentionally do NOT use the API response envelope directly —
 * `authService` already unwraps to plain payloads.
 *
 * For the post-login redirect: we honour an optional `from.pathname` on
 * react-router location state so deep-linked URLs survive the auth
 * detour (see ProtectedRoute).
 */

const ME_QUERY_KEY = ['auth', 'me'] as const;

interface LocationState {
  from?: { pathname?: string };
}

/**
 * Where to send a freshly-authenticated user. New accounts (and any
 * pre-existing account that hasn't finished onboarding) land on
 * `/onboarding`; everyone else goes to `/dashboard`. Kept as a helper so
 * useLogin + useRegister stay in sync.
 */
function postAuthDestination(user: AuthUser): string {
  return user.onboardingComplete ? '/dashboard' : '/onboarding';
}

// ── Login ──────────────────────────────────────────────────────────────

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: ({ user, accessToken }) => {
      setSession({ user, accessToken });
      // Seed the /me query so ProtectedRoute doesn't refetch immediately.
      qc.setQueryData(ME_QUERY_KEY, user);
      navigate(postAuthDestination(user), { replace: true });
    },
  });
}

// ── Register ───────────────────────────────────────────────────────────

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authService.register,
    onSuccess: ({ user, accessToken }) => {
      setSession({ user, accessToken });
      qc.setQueryData(ME_QUERY_KEY, user);
      // Newly-registered users always have onboardingComplete: false → /onboarding
      navigate(postAuthDestination(user), { replace: true });
    },
  });
}

// ── Complete onboarding ────────────────────────────────────────────────

export function useCompleteOnboarding() {
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: userService.completeOnboarding,
    onSuccess: (user) => {
      // Replace the stored user with the post-onboarding version (so
      // onboardingComplete flips to true) while preserving the same
      // access token — onboarding doesn't change the session.
      if (accessToken) {
        setSession({ user, accessToken });
      }
      qc.setQueryData(ME_QUERY_KEY, user);
      navigate('/dashboard', { replace: true });
    },
  });
}

// ── Logout ─────────────────────────────────────────────────────────────

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    // We log out client-side even if the server call fails — the session is
    // already toast at that point, and refusing to clear local state would
    // leave the user in a broken half-authenticated state.
    onSettled: () => {
      logout();
      qc.clear();
      navigate('/login', { replace: true });
    },
  });
}

// ── Forgot / reset password ────────────────────────────────────────────

export function useForgotPassword() {
  return useMutation({
    mutationFn: authService.forgotPassword,
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: () => {
      navigate('/login', {
        replace: true,
        state: { passwordResetSuccess: true },
      });
    },
  });
}

// ── Current user (bootstrap) ───────────────────────────────────────────

/**
 * Fetches the current user via `/auth/me`. Used by `<App>` on first mount
 * to restore the session after a page refresh — the refresh token is in
 * the httpOnly cookie, so calling `/me` either succeeds (we have a
 * session) or returns 401 (interceptor refreshes; if that also fails, we
 * stay logged out).
 *
 * Disabled by default; call as `useCurrentUser({ enabled: true })` at the
 * app root. Returns `undefined` on failure rather than throwing — auth
 * failure is not an error condition for this query.
 */
export function useCurrentUser({ enabled = true } = {}) {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: authService.getCurrentUser,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min — auth state doesn't change often
  });
}

// Re-export the location-state typing for ProtectedRoute and friends.
export type { LocationState };
