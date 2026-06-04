import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/features/auth';
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
import { NotFound } from '@/pages/NotFound';

/**
 * Route tree.
 *
 * Three top-level surfaces (see ADR-002 and architecture/system-overview.md):
 *
 *   /login, /register, /forgot-password, /reset-password  →  AuthLayout (dark)
 *   /dashboard, /projects, /settings                      →  CreativeLayout
 *                                                            (dark, top nav,
 *                                                            gated by ProtectedRoute)
 *   /s/:token                                             →  ClientLayout (light, public)
 *
 * The creative tree is wrapped in <ProtectedRoute> — unauthenticated users
 * are redirected to /login with their intended destination preserved on
 * `location.state.from` (see useLogin).
 *
 * Note: this is a UX gate only. Backend enforces auth on every endpoint
 * regardless of what the frontend allows — see Cross-Surface Rules in
 * AGENTS.md.
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

      {/* ── Creative surface (dark) — gated by auth ── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<CreativeLayout />}>
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
          <Route path="/projects" element={<ProjectsPlaceholder />} />
          <Route path="/settings" element={<SettingsPlaceholder />} />
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
