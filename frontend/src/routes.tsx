import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/features/auth';
import { OnboardingGate } from '@/components/features/onboarding';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ClientLayout } from '@/layouts/ClientLayout';
import { CreativeLayout } from '@/layouts/CreativeLayout';

import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { SharePlaceholder } from '@/pages/client/SharePlaceholder';
import { DashboardPlaceholder } from '@/pages/creative/DashboardPlaceholder';
import { ProjectsPlaceholder } from '@/pages/creative/ProjectsPlaceholder';
import { SettingsPlaceholder } from '@/pages/creative/SettingsPlaceholder';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { NotFound } from '@/pages/NotFound';

/**
 * Route tree.
 *
 * Three top-level surfaces (see ADR-002 and architecture/system-overview.md):
 *
 *   /login, /register, /forgot-password, /reset-password  →  AuthLayout (dark)
 *   /onboarding                                           →  AuthLayout (dark)
 *                                                            — gated by auth only;
 *                                                            shown to new accounts
 *                                                            before /dashboard.
 *   /dashboard, /projects, /settings                      →  CreativeLayout
 *                                                            (dark, top nav,
 *                                                            gated by auth +
 *                                                            onboarding complete)
 *   /s/:token                                             →  ClientLayout (light, public)
 *
 * The creative tree is wrapped in <ProtectedRoute> + <OnboardingGate>.
 * /onboarding itself is inside ProtectedRoute but ABOVE OnboardingGate
 * — otherwise a user with `onboardingComplete: false` who navigates to
 * /onboarding would infinite-redirect.
 *
 * useLogin / useRegister redirect to /onboarding or /dashboard based on
 * `user.onboardingComplete` — the route-level gate is the safety net for
 * URL-bar access.
 *
 * Note: these are UX gates only. Backend enforces auth + onboarding-state
 * on every endpoint regardless of what the frontend allows — see
 * Cross-Surface Rules in AGENTS.md.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ── Auth surface ── */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* ── Protected surface (signed in required) ── */}
      <Route element={<ProtectedRoute />}>
        {/* Onboarding lives here directly — accessible whether or not
            onboarding is complete (otherwise we'd loop). */}
        <Route element={<AuthLayout />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* Everything else requires onboarding to be done. */}
        <Route element={<OnboardingGate />}>
          <Route element={<CreativeLayout />}>
            <Route path="/dashboard" element={<DashboardPlaceholder />} />
            <Route path="/projects" element={<ProjectsPlaceholder />} />
            <Route path="/settings" element={<SettingsPlaceholder />} />
          </Route>
        </Route>
      </Route>

      {/* ── Client surface (light, public) ── */}
      <Route element={<ClientLayout />}>
        <Route path="/s/:token" element={<SharePlaceholder />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
