import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { IconLogout } from '@/components/ui';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';

/**
 * OnboardingLayout — full-page layout for the onboarding wizard.
 *
 * Distinct from AuthLayout's centered card: onboarding is a richer,
 * multi-step experience where the page itself is the canvas. Top bar
 * carries only the Perxli wordmark and a sign-out affordance (in case
 * the user wants to bail and finish later). The page itself owns the
 * progress indicator + step content.
 *
 * Dark theme — same surface as the rest of the creative app, so the
 * jump from onboarding into the dashboard feels like one continuous
 * environment, not two products.
 */
export function OnboardingLayout() {
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-dark-surface text-dark-t1">
      <TopBar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-6 md:py-12">
        <Outlet />
      </main>
    </div>
  );
}

function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-20 border-b border-dark-border bg-dark-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link
          to="/onboarding"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tighter"
        >
          Perx<span className="text-lime">li</span>
        </Link>

        {user && (
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dark-border px-3 text-sm font-semibold text-dark-t2 transition-colors duration-fast hover:border-dark-border-hover hover:text-dark-t1 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Sign out"
          >
            <IconLogout className="h-4 w-4" />
            <span className="hidden sm:inline">Finish later</span>
            <span className="sm:hidden">Exit</span>
          </button>
        )}
      </div>
    </header>
  );
}
