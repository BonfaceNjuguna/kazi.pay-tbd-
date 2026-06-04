import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { isAxiosError } from 'axios';

import { authHandlers, __TEST__ } from '@/mocks/handlers/auth.handlers';
import * as authService from './auth.service';

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('auth.service', () => {
  describe('login', () => {
    it('returns user + accessToken for valid credentials', async () => {
      const result = await authService.login({
        email: __TEST__.DEMO_USER.email,
        password: __TEST__.DEMO_PASSWORD,
      });

      expect(result.user.email).toBe(__TEST__.DEMO_USER.email);
      expect(result.user.plan).toBe('FREE');
      expect(result.accessToken).toBe(__TEST__.MOCK_ACCESS_TOKEN);
    });

    it('throws with INVALID_CREDENTIALS for wrong password', async () => {
      await expect(
        authService.login({
          email: __TEST__.DEMO_USER.email,
          password: 'wrong-password',
        }),
      ).rejects.toSatisfy((err: unknown) => {
        if (!isAxiosError(err)) return false;
        return (
          err.response?.status === 401 &&
          err.response.data?.code === 'INVALID_CREDENTIALS'
        );
      });
    });

    it('throws with INVALID_CREDENTIALS for unknown email', async () => {
      await expect(
        authService.login({
          email: 'nobody@example.com',
          password: __TEST__.DEMO_PASSWORD,
        }),
      ).rejects.toSatisfy((err: unknown) => {
        return isAxiosError(err) && err.response?.data?.code === 'INVALID_CREDENTIALS';
      });
    });
  });

  describe('register', () => {
    it('creates a new account and returns a session', async () => {
      const result = await authService.register({
        email: 'new@example.com',
        password: 'Test1234!',
        fullName: 'New User',
        profession: 'Photographer',
        city: 'Mombasa',
      });

      expect(result.user.email).toBe('new@example.com');
      expect(result.user.profession).toBe('Photographer');
      expect(result.user.country).toBe('Kenya');
      expect(result.user.currency).toBe('KES');
      expect(result.user.plan).toBe('FREE');
      expect(result.accessToken).toMatch(/^mock-access-token-/);
    });

    it('rejects re-registration of the demo email with DUPLICATE_EMAIL', async () => {
      await expect(
        authService.register({
          email: __TEST__.DEMO_USER.email,
          password: 'Test1234!',
          fullName: 'Imposter',
          profession: 'Graphic Designer',
          city: 'Nairobi',
        }),
      ).rejects.toSatisfy((err: unknown) => {
        return (
          isAxiosError(err) &&
          err.response?.status === 409 &&
          err.response.data?.code === 'DUPLICATE_EMAIL'
        );
      });
    });
  });

  describe('forgotPassword', () => {
    it('returns success regardless of whether the email exists', async () => {
      // Per ADR-002 — don't leak which addresses are registered.
      await expect(
        authService.forgotPassword({ email: __TEST__.DEMO_USER.email }),
      ).resolves.toBeUndefined();
      await expect(
        authService.forgotPassword({ email: 'never-registered@example.com' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('succeeds with the valid mock token', async () => {
      await expect(
        authService.resetPassword({ token: 'mock-reset-token', password: 'NewPass123!' }),
      ).resolves.toBeUndefined();
    });

    it('rejects an invalid token with INVALID_RESET_TOKEN', async () => {
      await expect(
        authService.resetPassword({ token: 'wrong-token', password: 'NewPass123!' }),
      ).rejects.toSatisfy((err: unknown) => {
        return (
          isAxiosError(err) &&
          err.response?.status === 400 &&
          err.response.data?.code === 'INVALID_RESET_TOKEN'
        );
      });
    });
  });

  describe('getCurrentUser', () => {
    it('returns the user when a valid token is presented', async () => {
      // The Axios instance reads the token from the auth store — set it
      // here via the same store.
      const { useAuthStore } = await import('@/store/auth.store');
      useAuthStore.getState().setAccessToken(__TEST__.MOCK_ACCESS_TOKEN);

      const user = await authService.getCurrentUser();
      expect(user.email).toBe(__TEST__.DEMO_USER.email);

      // Clean up so other tests aren't affected.
      useAuthStore.getState().logout();
    });

    it('throws UNAUTHENTICATED without a token', async () => {
      // Make sure the store is clean.
      const { useAuthStore } = await import('@/store/auth.store');
      useAuthStore.getState().logout();

      // The default MSW refresh handler always returns success, so the
      // Axios interceptor's silent-refresh would mask the 401. Override
      // it just for this test to simulate "no valid session anywhere".
      server.use(
        http.post('/api/v1/auth/refresh', () =>
          HttpResponse.json(
            { status: 'error', message: 'Refresh failed', code: 'UNAUTHENTICATED' },
            { status: 401 },
          ),
        ),
      );

      await expect(authService.getCurrentUser()).rejects.toSatisfy((err: unknown) => {
        return (
          isAxiosError(err) &&
          err.response?.status === 401 &&
          err.response.data?.code === 'UNAUTHENTICATED'
        );
      });
    });
  });
});
