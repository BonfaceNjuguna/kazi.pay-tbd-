import { http, HttpResponse } from 'msw';

import { authHandlers } from './handlers/auth.handlers';

/**
 * MSW request handlers — composition root.
 *
 * Handlers are split by domain under `src/mocks/handlers/*.ts` so each domain
 * file matches the structure of the real backend (auth, projects, documents,
 * payments, etc.). Add new domains by importing their handlers array here.
 *
 * Pattern for new handlers: always return the standard envelope from ADR-004:
 *   { status: 'success', data: ... }   |   { status: 'error', message, code }
 *
 * Phase status:
 *   - Phase 1.8 → auth handlers ✓ (this file)
 *   - Phase 1.9 → brand-settings handlers (TBD)
 *   - Phase 2.x → projects, documents, signing handlers (TBD)
 */
export const handlers = [
  // Health check — useful for verifying MSW is intercepting at all.
  http.get('/api/v1/health', () =>
    HttpResponse.json({
      status: 'success',
      data: { ok: true, mocked: true, timestamp: new Date().toISOString() },
    }),
  ),

  ...authHandlers,
];
