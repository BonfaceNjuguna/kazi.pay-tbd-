import { http, HttpResponse } from 'msw';

import type { AuthUser } from '@/store/auth.store';

/**
 * MSW handlers for /api/v1/auth/*.
 *
 * Backs Phase 1.8's UI until the real backend lands in Phase 1.4. Patterns
 * established here (envelope shape, error codes, demo profile) are what the
 * backend should match.
 *
 * Demo profile per CLAUDE.md: Rowlex Karimi, graphic designer, Nairobi, KES.
 * One known-good credential pair; everything else returns INVALID_CREDENTIALS.
 *
 * Refresh-token cookie isn't actually set/read by MSW (out of scope for a
 * service-worker mock). The frontend behaves as if the cookie exists; tests
 * exercise the refresh path by simulating a 401 and asserting the retry.
 */

const DEMO_USER: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'rowlex@demo.kazi.pay',
  fullName: 'Rowlex Karimi',
  profession: 'Graphic Designer',
  city: 'Nairobi',
  country: 'Kenya',
  currency: 'KES',
  plan: 'FREE',
};

const DEMO_PASSWORD = 'Demo1234!';
const MOCK_ACCESS_TOKEN = 'mock-access-token-rowlex';

interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
  fullName: string;
  profession: string;
  city: string;
}

interface ForgotBody {
  email: string;
}

interface ResetBody {
  token: string;
  password: string;
}

export const authHandlers = [
  // ── POST /auth/login ───────────────────────────────────────────────
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginBody;

    if (body.email === DEMO_USER.email && body.password === DEMO_PASSWORD) {
      return HttpResponse.json({
        status: 'success',
        data: { user: DEMO_USER, accessToken: MOCK_ACCESS_TOKEN },
      });
    }

    return HttpResponse.json(
      {
        status: 'error',
        message: 'Email or password is incorrect.',
        code: 'INVALID_CREDENTIALS',
      },
      { status: 401 },
    );
  }),

  // ── POST /auth/register ────────────────────────────────────────────
  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = (await request.json()) as RegisterBody;

    // Block re-registration of the demo email so the form's error path is
    // exercisable in dev.
    if (body.email === DEMO_USER.email) {
      return HttpResponse.json(
        {
          status: 'error',
          message: 'That email already has an account.',
          code: 'DUPLICATE_EMAIL',
        },
        { status: 409 },
      );
    }

    const user: AuthUser = {
      id: crypto.randomUUID(),
      email: body.email,
      fullName: body.fullName,
      profession: body.profession,
      city: body.city,
      country: 'Kenya',
      currency: 'KES',
      plan: 'FREE',
    };

    return HttpResponse.json(
      {
        status: 'success',
        data: { user, accessToken: `mock-access-token-${user.id.slice(0, 8)}` },
      },
      { status: 201 },
    );
  }),

  // ── POST /auth/logout ──────────────────────────────────────────────
  http.post('/api/v1/auth/logout', () =>
    HttpResponse.json({ status: 'success', data: { loggedOut: true } }),
  ),

  // ── POST /auth/refresh ─────────────────────────────────────────────
  // In a real backend the refresh token comes from the httpOnly cookie.
  // MSW can't set/read cookies the way real cross-origin requests do, so
  // we mock "session present" by always returning a fresh token. Tests
  // that need to simulate refresh failure should override this handler.
  http.post('/api/v1/auth/refresh', () =>
    HttpResponse.json({
      status: 'success',
      data: { accessToken: MOCK_ACCESS_TOKEN },
    }),
  ),

  // ── GET /auth/me ───────────────────────────────────────────────────
  http.get('/api/v1/auth/me', ({ request }) => {
    const auth = request.headers.get('authorization');
    if (auth?.startsWith('Bearer mock-access-token')) {
      return HttpResponse.json({ status: 'success', data: DEMO_USER });
    }
    return HttpResponse.json(
      {
        status: 'error',
        message: 'Authentication required.',
        code: 'UNAUTHENTICATED',
      },
      { status: 401 },
    );
  }),

  // ── POST /auth/forgot-password ─────────────────────────────────────
  // Always returns success regardless of email validity (don't leak which
  // emails are registered — see ADR-002). In dev we log the reset link
  // to the console so testers can use it.
  http.post('/api/v1/auth/forgot-password', async ({ request }) => {
    const body = (await request.json()) as ForgotBody;
    // console.warn is permitted by our ESLint config — it's dev-only signal.
    console.warn(
      `[MSW] Reset-link email simulated for ${body.email}. Use token "mock-reset-token" at /reset-password.`,
    );
    return HttpResponse.json({ status: 'success', data: { sent: true } });
  }),

  // ── POST /auth/reset-password ──────────────────────────────────────
  http.post('/api/v1/auth/reset-password', async ({ request }) => {
    const body = (await request.json()) as ResetBody;
    if (body.token !== 'mock-reset-token') {
      return HttpResponse.json(
        {
          status: 'error',
          message: 'This reset link has expired or is invalid.',
          code: 'INVALID_RESET_TOKEN',
        },
        { status: 400 },
      );
    }
    return HttpResponse.json({ status: 'success', data: { reset: true } });
  }),
];

// Exported for tests that want to assert against known fixtures.
export const __TEST__ = { DEMO_USER, DEMO_PASSWORD, MOCK_ACCESS_TOKEN };
