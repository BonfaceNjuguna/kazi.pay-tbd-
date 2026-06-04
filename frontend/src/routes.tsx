import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/features/auth';
import { OnboardingGate } from '@/components/features/onboarding';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ClientLayout } from '@/layouts/ClientLayout';
import { CreativeLayout } from '@/layouts/CreativeLayout';
import { OnboardingLayout } from '@/layouts/OnboardingLayout';

import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { SharePlaceholder } from '@/pages/client/SharePlaceholder';
import { DashboardPlaceholder } from '@/pages/creative/DashboardPlaceholder';
import { ProjectsPlaceholder } from '@/pages/creative/ProjectsPlaceholder';
import { SettingsPlaceholder } from '@/pages/creative/SettingsPlaceholder';
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { NotFound } from '@/pages/NotFound';

/**
 * Route tree.
 *
 * Four top-level surfaces:
 *
 *   /login, /register, /forgot-password,                  →  AuthLayout
 *   /reset-password, /verify-email                          (dark, centered card)
 *
 *   /onboarding                                           →  OnboardingLayout
 *                                                            (dark, full page,
 *                                                            multi-step wizard;
 *                                                            gated by auth only)
 *
 *   /dashboard, /projects, /settings                      →  CreativeLayout
 *                                                            (dark, top nav,
 *                                                            gated by auth +
 *                                                            onboarding complete)
 *
 *   /s/:token                                             →  ClientLayout
 *                                                            (light, public)
 *
 * /verify-email is PUBLIC because the user clicks a link in their email
 * BEFORE they can log in — they have no session at that point.
 *
 * /onboarding sits inside ProtectedRoute but ABOVE OnboardingGate so a
 * user with `onboardingComplete: false` can actually reach it without
 * infinite-redirecting.
 *
 * Note: route-level gates are UX safety nets. Backend (Phase 1.4+)
 * independently enforces every check — never trust the frontend for
 * data security. See Cross-Surface Rules in AGENTS.md.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ── Auth surface (public) ── */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      {/* ── Protected surface (signed in required) ── */}
      <Route element={<ProtectedRoute />}>
        {/* Onboarding wizard — full-page layout, only requires auth. */}
        <Route element={<OnboardingLayout />}>
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
