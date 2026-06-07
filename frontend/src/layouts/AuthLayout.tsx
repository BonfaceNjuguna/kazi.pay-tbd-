import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { Logo } from '@/components/ui';

/**
 * Centered-card layout for login / register / password reset.
 * Dark theme (same surface as the creative app), no nav.
 */
export function AuthLayout() {
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
  }, []);

  return (
    <div className="grid min-h-full place-items-center bg-dark-surface px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="xl" />
          <p className="mt-4 text-base text-dark-t2">
            Get the project formalised, get paid, and have proof of everything.
          </p>
        </div>
        <div className="rounded-lg border border-dark-border bg-dark-surface-raised p-6 shadow-raised">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
