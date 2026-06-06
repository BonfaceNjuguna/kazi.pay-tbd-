/**
 * MSW (Mock Service Worker) bootstrap.
 *
 * Three modes:
 *
 *   1. **Real backend (default in dev)** — Vite's `server.proxy` routes
 *      `/api/*` to http://localhost:3000. MSW does NOT start. To use this
 *      mode, run `pnpm --filter @perxli/backend dev` alongside the
 *      frontend dev server (see docs/deployment/local-setup.md).
 *
 *   2. **MSW mock (opt-in)** — set `VITE_USE_MSW=true` in frontend/.env.
 *      MSW intercepts all requests; the real backend doesn't need to
 *      be running. Useful for frontend-only iteration or when the
 *      backend is wedged.
 *
 *   3. **Tests** — Vitest test files import handlers + setupServer
 *      directly (see render-with-providers.tsx). The browser SW
 *      isn't involved.
 *
 * Production builds never start MSW regardless of env vars.
 */
export async function enableMockServiceWorker(): Promise<void> {
  if (!import.meta.env.DEV) return;
  if (import.meta.env.VITE_USE_MSW !== 'true') return;

  // Lazy import so the worker isn't bundled into production builds.
  const { worker } = await import('@/mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}
