import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '@/store/auth.store';

/**
 * OnboardingGate — for routes that require BOTH authentication AND a
 * completed onboarding profile. Nests inside `<ProtectedRoute>` in the
 * route tree (ProtectedRoute handles "are you signed in?"; this handles
 * "have you finished telling us who you are?").
 *
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/onboarding" element={<OnboardingPage />} />
 *     <Route element={<OnboardingGate />}>
 *       <Route element={<CreativeLayout />}>
 *         <Route path="/dashboard" ... />
 *         ...
 *       </Route>
 *     </Route>
 *   </Route>
 *
 * The `/onboarding` route lives ABOVE the gate so a not-yet-onboarded user
 * can actually reach it without infinite-redirecting.
 *
 * Note (mirrors the comment on ProtectedRoute): this is a UX gate only.
 * The backend must independently refuse to serve project/document data
 * for an account with `onboardingComplete: false` — never trust the
 * frontend's checks (see Cross-Surface Rules in AGENTS.md).
 */
export function OnboardingGate() {
  const user = useAuthStore((s) => s.user);

  // If the auth store has no user (race during boot), let the inner
  // ProtectedRoute redirect handle it. Don't double-redirect here.
  if (user && !user.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
