import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { IconLogout, Logo } from '@/components/ui';
import { useLogout } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';

/**
 * Layout for the creative-facing surface (dark theme, top nav, no sidebar).
 *
 * Per CLAUDE.md: "No sidebar — top nav only". The standalone HTML prototype
 * (perxli_prototype.html) renders a sidebar — that prototype predates the
 * top-nav-only decision. This React layout is the source of truth.
 */
export function CreativeLayout() {
  // Ensure the dark theme is active whenever a creative route is mounted.
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
  }, []);

  return (
    <div className="min-h-full bg-dark-surface text-dark-t1">
      <TopNav />
      <main className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <Outlet />
      </main>
    </div>
  );
}

function TopNav() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const firstName = user?.fullName?.split(' ')[0] ?? '';

  return (
    <header className="sticky top-0 z-20 border-b border-dark-border bg-dark-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6 md:px-10">
        <Brand />
        <nav className="flex items-center gap-1">
          <TopNavLink to="/dashboard">Dashboard</TopNavLink>
          <TopNavLink to="/projects">Projects</TopNavLink>
          <TopNavLink to="/settings">Settings</TopNavLink>
        </nav>
        <div className="flex items-center gap-3">
          {firstName && (
            <span className="hidden text-base font-semibold text-dark-t2 sm:inline">
              {firstName}
            </span>
          )}
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border border-dark-border ' +
                'px-3 text-sm font-semibold text-dark-t2 ' +
                'transition-colors duration-fast ' +
                'hover:border-dark-border-hover hover:text-dark-t1 ' +
                'disabled:cursor-not-allowed disabled:opacity-50',
            )}
            aria-label="Sign out"
          >
            <IconLogout className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Brand() {
  return <Logo size="md" />;
}

function TopNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-2 text-base font-semibold transition-colors duration-fast',
          isActive
            ? 'bg-lime-bg text-lime'
            : 'text-dark-t2 hover:bg-white/[0.03] hover:text-dark-t1',
        )
      }
    >
      {children}
    </NavLink>
  );
}
