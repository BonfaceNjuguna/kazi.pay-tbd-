/**
 * MSW (Mock Service Worker) bootstrap.
 *
 * Until the backend lands in Phase 1.1–1.6, the frontend calls the same real
 * URLs it will in production (e.g. `/api/v1/auth/login`) and MSW intercepts
 * them in the browser. When the backend ships, we just stop calling
 * `enableMockServiceWorker()` — no service/hook code changes.
 *
 * The worker is only started in development. Production builds short-circuit.
 */
export async function enableMockServiceWorker(): Promise<void> {
  if (!import.meta.env.DEV) return;

  // Lazy import so the worker isn't bundled into production builds.
  const { worker } = await import('@/mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}
