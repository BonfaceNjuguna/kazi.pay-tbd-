import { Navigate, Route, Routes } from 'react-router-dom';

import { CreativeLayout } from '@/layouts/CreativeLayout';
import { ClientLayout } from '@/layouts/ClientLayout';
import { AuthLayout } from '@/layouts/AuthLayout';

import { DashboardPlaceholder } from '@/pages/creative/DashboardPlaceholder';
import { ProjectsPlaceholder } from '@/pages/creative/ProjectsPlaceholder';
import { SettingsPlaceholder } from '@/pages/creative/SettingsPlaceholder';
import { LoginPlaceholder } from '@/pages/auth/LoginPlaceholder';
import { RegisterPlaceholder } from '@/pages/auth/RegisterPlaceholder';
import { SharePlaceholder } from '@/pages/client/SharePlaceholder';
import { NotFound } from '@/pages/NotFound';

/**
 * Route tree.
 *
 * Three top-level surfaces (see ADR-002 and architecture/system-overview.md):
 *
 *   /login, /register, /forgot-password   →  AuthLayout (dark, centered card)
 *   /dashboard, /projects, /settings      →  CreativeLayout (dark, top nav)
 *   /s/:token                             →  ClientLayout (light, no nav, no auth)
 *
 * The dashboard tree is gated by a protected wrapper (Phase 1.8 work).
 * Right now every page is a placeholder confirming the scaffold renders.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ── Auth surface ── */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPlaceholder />} />
        <Route path="/register" element={<RegisterPlaceholder />} />
      </Route>

      {/* ── Creative surface (dark) ── */}
      <Route element={<CreativeLayout />}>
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
        <Route path="/projects" element={<ProjectsPlaceholder />} />
        <Route path="/settings" element={<SettingsPlaceholder />} />
      </Route>

      {/* ── Client surface (light, public) ── */}
      <Route element={<ClientLayout />}>
        <Route path="/s/:token" element={<SharePlaceholder />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
