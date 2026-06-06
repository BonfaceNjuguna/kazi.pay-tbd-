import { http, HttpResponse } from 'msw';

import type { AuthUser, SubscriptionPlan } from '@/store/auth.store';

/**
 * MSW handlers for /api/v1/auth/* and /api/v1/users/me/*.
 *
 * Backs Phase 1.8's UI until the real backend lands in Phase 1.4. Patterns
 * established here (envelope shape, error codes, demo profiles) are what
 * the backend should match.
 *
 * Two seeded demo profiles per CLAUDE.md:
 *   - DEMO_USER     Rowlex Karimi · onboarded · plan FREE · verified true
 *                   → use for testing dashboard/sign-out etc.
 *   - TEST_USER     Amina Otieno · NOT onboarded · email verified
 *                   → use for testing the wizard end-to-end without
 *                     re-registering (and re-going through verify-email).
 *
 * Refresh-token cookie isn't actually set/read by MSW (out of scope for a
 * service-worker mock). The frontend behaves as if the cookie exists; tests
 * exercise the refresh path by simulating a 401 and asserting the retry.
 */

const DEMO_USER: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'rowlex@demo.perxli.com',
  fullName: 'Rowlex Karimi',
  emailVerified: true,
  profession: 'Graphic Designer',
  city: 'Nairobi',
  businessName: 'Rowlex Karimi',
  kraPin: undefined,
  businessAddress: undefined,
  country: 'Kenya',
  currency: 'KES',
  plan: 'FREE',
  // Demo user is already onboarded — signing in takes them straight to
  // /dashboard.
  onboardingComplete: true,
};

const TEST_USER: AuthUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'test@demo.perxli.com',
  fullName: 'Amina Otieno',
  emailVerified: true,
  // Empty onboarding fields + onboardingComplete=false so signing in
  // bounces to /onboarding. Lets testers exercise the whole wizard
  // without re-registering and re-verifying every time.
  profession: '',
  city: '',
  businessName: '',
  kraPin: undefined,
  businessAddress: undefined,
  country: 'Kenya',
  currency: 'KES',
  plan: 'FREE',
  onboardingComplete: false,
};

const DEMO_PASSWORD = 'Demo1234!';
const TEST_PASSWORD = 'Test1234!';
const MOCK_ACCESS_TOKEN_DEMO = 'mock-access-token-rowlex';
const MOCK_ACCESS_TOKEN_TEST = 'mock-access-token-amina';

/**
 * In-memory registry of users created via /auth/register during this MSW
 * session. The /users/me/onboarding handler reads from here to flip a
 * user's onboardingComplete flag; verify-email reads from here to flip
 * emailVerified. Resets on page reload — fine for dev.
 */
const REGISTERED_USERS = new Map<string, AuthUser>();

/**
 * Map of `verifyToken` → user id, so /auth/verify-email can find which
 * user a token belongs to. One token per user; regenerated on resend.
 */
const VERIFY_TOKENS = new Map<string, string>();

function makeVerifyToken(userId: string): string {
  const token = `mock-verify-${userId.slice(0, 8)}`;
  VERIFY_TOKENS.set(token, userId);
  return token;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RegisterBody {
  email: string;
  password: string;
  fullName: string;
}

interface OnboardingBody {
  profession: string;
  city: string;
  businessName: string;
  kraPin?: string;
  businessAddress?: string;
  plan: SubscriptionPlan;
}

interface ForgotBody {
  email: string;
}

interface ResetBody {
  token: string;
  password: string;
}

interface VerifyEmailBody {
  token: string;
}

interface ResendVerificationBody {
  email: string;
}

export const authHandlers = [
  // ── POST /auth/login ───────────────────────────────────────────────
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginBody;

    if (body.email === DEMO_USER.email && body.password === DEMO_PASSWORD) {
      return HttpResponse.json({
        status: 'success',
        data: { user: DEMO_USER, accessToken: MOCK_ACCESS_TOKEN_DEMO },
      });
    }

    if (body.email === TEST_USER.email && body.password === TEST_PASSWORD) {
      return HttpResponse.json({
        status: 'success',
        data: { user: TEST_USER, accessToken: MOCK_ACCESS_TOKEN_TEST },
      });
    }

    // Look up registered users by email.
    const registered = Array.from(REGISTERED_USERS.values()).find(
      (u) => u.email === body.email,
    );
    if (registered) {
      // Block login until email is verified — per the product rule:
      // "after registration they will always need to confirm email
      // before proceeding".
      if (!registered.emailVerified) {
        return HttpResponse.json(
          {
            status: 'error',
            message:
              'Verify your email first. Check your inbox for the link we sent.',
            code: 'EMAIL_NOT_VERIFIED',
          },
          { status: 403 },
        );
      }
      // Password is not stored on registered users (we only kept email/profile);
      // accept anything ≥ 8 chars for the demo. Real backend will hash + check.
      if (body.password.length >= 8) {
        return HttpResponse.json({
          status: 'success',
          data: {
            user: registered,
            accessToken: `mock-access-token-${registered.id.slice(0, 8)}`,
          },
        });
      }
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

    // Block re-registration of the seeded demo emails so the form's
    // error path is exercisable in dev.
    if (body.email === DEMO_USER.email || body.email === TEST_USER.email) {
      return HttpResponse.json(
        {
          status: 'error',
          message: 'That email already has an account.',
          code: 'DUPLICATE_EMAIL',
        },
        { status: 409 },
      );
    }

    // Also block re-registration of a previously-registered email in this
    // MSW session.
    const exists = Array.from(REGISTERED_USERS.values()).some(
      (u) => u.email === body.email,
    );
    if (exists) {
      return HttpResponse.json(
        {
          status: 'error',
          message: 'That email already has an account.',
          code: 'DUPLICATE_EMAIL',
        },
        { status: 409 },
      );
    }

    // Registration captures the minimum to create an account — name, email,
    // password. The user is NOT verified yet — they must follow the link
    // in the verification email before they can log in. Profession, city,
    // business details, and plan are captured later in the onboarding
    // wizard.
    const user: AuthUser = {
      id: crypto.randomUUID(),
      email: body.email,
      fullName: body.fullName,
      emailVerified: false,
      profession: '',
      city: '',
      businessName: '',
      kraPin: undefined,
      businessAddress: undefined,
      country: 'Kenya',
      currency: 'KES',
      plan: 'FREE',
      onboardingComplete: false,
    };

    REGISTERED_USERS.set(user.id, user);
    const verifyToken = makeVerifyToken(user.id);

    console.warn(
      `[MSW] Verification email simulated for ${body.email}. Visit /verify-email?token=${verifyToken} to verify.`,
    );

    // Returns 202 Accepted (not 201 Created with a session) — there's no
    // access token yet because the account isn't usable until verified.
    return HttpResponse.json(
      {
        status: 'success',
        data: {
          email: user.email,
          message: "We've sent a verification link to your email.",
        },
      },
      { status: 202 },
    );
  }),

  // ── POST /auth/verify-email ────────────────────────────────────────
  http.post('/api/v1/auth/verify-email', async ({ request }) => {
    const body = (await request.json()) as VerifyEmailBody;
    const userId = VERIFY_TOKENS.get(body.token);
    if (!userId) {
      return HttpResponse.json(
        {
          status: 'error',
          message: 'This verification link has expired or is invalid.',
          code: 'INVALID_VERIFY_TOKEN',
        },
        { status: 400 },
      );
    }
    const user = REGISTERED_USERS.get(userId);
    if (!user) {
      return HttpResponse.json(
        {
          status: 'error',
          message: 'Account not found.',
          code: 'NOT_FOUND',
        },
        { status: 404 },
      );
    }
    const updated: AuthUser = { ...user, emailVerified: true };
    REGISTERED_USERS.set(userId, updated);
    VERIFY_TOKENS.delete(body.token);
    return HttpResponse.json({
      status: 'success',
      data: { email: updated.email, verified: true },
    });
  }),

  // ── POST /auth/resend-verification ─────────────────────────────────
  // Same anti-enumeration stance as forgot-password — succeeds regardless
  // of whether the email exists or is already verified.
  http.post('/api/v1/auth/resend-verification', async ({ request }) => {
    const body = (await request.json()) as ResendVerificationBody;
    const user = Array.from(REGISTERED_USERS.values()).find(
      (u) => u.email === body.email && !u.emailVerified,
    );
    if (user) {
      const token = makeVerifyToken(user.id);
      console.warn(
        `[MSW] Verification email re-simulated for ${body.email}. Visit /verify-email?token=${token} to verify.`,
      );
    }
    return HttpResponse.json({ status: 'success', data: { sent: true } });
  }),

  // ── POST /users/me/onboarding ──────────────────────────────────────
  // Final submit of the 4-step wizard. Captures profession + city
  // (Profile), business name (Business), KRA PIN + business address
  // (Brand), and plan tier (Plan). Flips `onboardingComplete` to true.
  http.post('/api/v1/users/me/onboarding', async ({ request }) => {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer mock-access-token')) {
      return HttpResponse.json(
        {
          status: 'error',
          message: 'Authentication required.',
          code: 'UNAUTHENTICATED',
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as OnboardingBody;

    // Resolve which user the token belongs to. Try the well-known
    // seeded users first, then fall back to the registered users map
    // (token shape is `mock-access-token-<id-prefix>`).
    const tokenSuffix = auth.replace('Bearer mock-access-token-', '');
    let existing: AuthUser | undefined;
    if (auth === `Bearer ${MOCK_ACCESS_TOKEN_DEMO}`) existing = DEMO_USER;
    else if (auth === `Bearer ${MOCK_ACCESS_TOKEN_TEST}`) existing = TEST_USER;
    else
      existing = Array.from(REGISTERED_USERS.values()).find((u) =>
        u.id.startsWith(tokenSuffix),
      );

    if (!existing) {
      return HttpResponse.json(
        { status: 'error', message: 'Session not found.', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    const updated: AuthUser = {
      ...existing,
      profession: body.profession,
      city: body.city,
      businessName: body.businessName,
      kraPin: body.kraPin || undefined,
      businessAddress: body.businessAddress || undefined,
      plan: body.plan,
      onboardingComplete: true,
    };

    // Persist the change. For the seeded TEST_USER we keep the original
    // hardcoded state unchanged (so a page reload sends them back to
    // /onboarding for re-testing) and only mutate registered users.
    if (REGISTERED_USERS.has(existing.id)) {
      REGISTERED_USERS.set(existing.id, updated);
    }

    return HttpResponse.json({ status: 'success', data: updated });
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
      data: { accessToken: MOCK_ACCESS_TOKEN_DEMO },
    }),
  ),

  // ── GET /auth/me ───────────────────────────────────────────────────
  http.get('/api/v1/auth/me', ({ request }) => {
    const auth = request.headers.get('authorization');
    if (auth === `Bearer ${MOCK_ACCESS_TOKEN_DEMO}`) {
      return HttpResponse.json({ status: 'success', data: DEMO_USER });
    }
    if (auth === `Bearer ${MOCK_ACCESS_TOKEN_TEST}`) {
      return HttpResponse.json({ status: 'success', data: TEST_USER });
    }
    if (auth?.startsWith('Bearer mock-access-token-')) {
      const tokenSuffix = auth.replace('Bearer mock-access-token-', '');
      const user = Array.from(REGISTERED_USERS.values()).find((u) =>
        u.id.startsWith(tokenSuffix),
      );
      if (user) {
        return HttpResponse.json({ status: 'success', data: user });
      }
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
export const __TEST__ = {
  DEMO_USER,
  DEMO_PASSWORD,
  MOCK_ACCESS_TOKEN: MOCK_ACCESS_TOKEN_DEMO,
  TEST_USER,
  TEST_PASSWORD,
  MOCK_ACCESS_TOKEN_TEST,
};
