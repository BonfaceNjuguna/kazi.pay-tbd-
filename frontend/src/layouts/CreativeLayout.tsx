import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/lib/cn';

/**
 * Layout for the creative-facing surface (dark theme, top nav, no sidebar).
 *
 * Per CLAUDE.md: "No sidebar — top nav only". The standalone HTML prototype
 * (kazipay_prototype.html) renders a sidebar — that prototype predates the
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
  return (
    <header className="sticky top-0 z-20 border-b border-dark-border bg-dark-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
        <Brand />
        <nav className="flex items-center gap-1">
          <TopNavLink to="/dashboard">Dashboard</TopNavLink>
          <TopNavLink to="/projects">Projects</TopNavLink>
          <TopNavLink to="/settings">Settings</TopNavLink>
        </nav>
      </div>
    </header>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-lime">
        <span className="text-base font-extrabold text-dark-surface">k</span>
      </div>
      <span className="text-lg font-extrabold tracking-tighter">
        kazi<span className="text-lime">pay</span>
      </span>
    </div>
  );
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
