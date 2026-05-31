import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Layout for the client-facing share surface (light theme, minimal chrome).
 * No nav, no auth — a client opens a public link from WhatsApp/email and
 * sees just the documents to read and sign.
 *
 * Per CLAUDE.md "Client-facing screens: Light mode".
 */
export function ClientLayout() {
  useEffect(() => {
    document.documentElement.dataset.theme = 'light';
    return () => {
      // Restore dark when leaving the client surface (back to creative app).
      document.documentElement.dataset.theme = 'dark';
    };
  }, []);

  return (
    <div className="min-h-full bg-light-surface text-light-t1">
      <header className="sticky top-0 z-10 border-b border-light-border bg-light-surface-raised shadow-soft">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
          <span className="text-xl font-extrabold tracking-tight">
            kazi<span className="text-lime-hover">pay</span>
          </span>
          <span className="text-xs font-semibold text-light-t2">Secure · Encrypted</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
