import { useEffect } from 'react';

import { useCurrentUser } from '@/hooks/useAuth';
import { AppRoutes } from '@/routes';
import { useAuthStore } from '@/store/auth.store';

/**
 * Top-level App shell.
 *
 * Routing for the two surfaces (creative + client) lives in `routes.tsx`.
 * Theme is set via `data-theme` on a route layout — see CreativeLayout
 * (dark) and ClientLayout (light).
 */
export default function App() {
  return (
    <SessionBootstrap>
      <AppRoutes />
    </SessionBootstrap>
  );
}

/**
 * SessionBootstrap — restores the user's session on app mount / browser
 * refresh.
 *
 * Why this exists: per ADR-002 the access token lives in memory only
 * (Zustand) — it's deliberately NOT in localStorage to keep XSS from
 * harvesting it. That means a hard refresh wipes the in-memory session.
 * The httpOnly refresh cookie survives though, so we can mint a fresh
 * access token by calling /auth/me — which 401s on the first try, the
 * axios interceptor catches it, calls /auth/refresh (cookie attached),
 * gets a new access token, retries the /auth/me, and we're back in.
 *
 * Without this component, ProtectedRoute reads `isAuthenticated: false`
 * immediately and bounces to /login before the refresh dance can even
 * start — which is the "I refresh and get kicked to login" bug.
 *
 * Tricky race: `useEffect` runs AFTER render. If we render `children`
 * the moment the query resolves, ProtectedRoute will redirect in the
 * gap between data-arrives and store-receives-user. So we keep the
 * spinner up until EITHER the query failed (no session — let
 * ProtectedRoute do its thing) OR the user is already mirrored into
 * the Zustand store (so ProtectedRoute will read `isAuthenticated:
 * true` synchronously on its first render).
 *
 * We render nothing visible during the bootstrap — just a blank dark
 * background that matches both the auth + creative layouts so there's
 * no theme flash on the way in.
 */
function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const storedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { data: user, isLoading } = useCurrentUser({ enabled: true });

  useEffect(() => {
    if (user && !storedUser) {
      setUser(user);
    }
  }, [user, storedUser, setUser]);

  // Two reasons to stay on the spinner:
  //  1. The bootstrap query is still in flight (/auth/me, possibly +
  //     /auth/refresh + retry).
  //  2. The query resolved with a user but the effect hasn't pushed it
  //     into the Zustand store yet — releasing the UI here would let
  //     ProtectedRoute redirect to /login in that one-render gap.
  const awaitingStoreSync = !!user && !storedUser;

  if (isLoading || awaitingStoreSync) {
    return <div className="min-h-dvh bg-dark-surface" aria-busy="true" />;
  }

  return <>{children}</>;
}
