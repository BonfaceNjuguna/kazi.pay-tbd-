import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/store/auth.store';

/**
 * ProtectedRoute — gates a sub-tree of routes behind authentication.
 *
 * Usage in routes.tsx:
 *
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<CreativeLayout />}>
 *       <Route path="/dashboard" element={<DashboardPage />} />
 *       ...
 *     </Route>
 *   </Route>
 *
 * Unauthenticated visitors are redirected to /login. The intended
 * destination is preserved on `location.state.from`, so after login they
 * can be sent back to where they were trying to go (see useLogin).
 *
 * Note: this is a frontend visibility gate ONLY. Per the Cross-Surface
 * Rules in AGENTS.md, every backend endpoint must independently enforce
 * auth — never trust the frontend to gate sensitive data.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
