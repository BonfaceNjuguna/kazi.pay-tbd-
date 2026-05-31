import { http, HttpResponse } from 'msw';

/**
 * MSW request handlers.
 *
 * Phase 1.7 (this scaffold): empty handler array — no mocked endpoints yet.
 * Real handlers land alongside the screens they back:
 *   - Phase 1.8 → auth handlers (login, register, refresh, me, logout)
 *   - Phase 1.9 → brand-settings handlers
 *   - Phase 2.x → projects, documents, signing handlers
 *
 * Pattern for new handlers:
 *
 *   http.post('/api/v1/auth/login', async ({ request }) => {
 *     const body = await request.json();
 *     return HttpResponse.json({
 *       status: 'success',
 *       data: { accessToken: 'mock-token', user: { ... } },
 *     });
 *   })
 *
 * Always return the standard envelope from ADR-004:
 *   { status: 'success', data: ... }   |   { status: 'error', message, code }
 */
export const handlers = [
  // Health check — useful for verifying MSW is intercepting at all.
  http.get('/api/v1/health', () => {
    return HttpResponse.json({
      status: 'success',
      data: { ok: true, mocked: true, timestamp: new Date().toISOString() },
    });
  }),
];

// Force HttpResponse to be referenced so future imports stay tree-shake-safe.
void HttpResponse;
