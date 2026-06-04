import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { isAxiosError } from 'axios';

import { authHandlers, __TEST__ } from '@/mocks/handlers/auth.handlers';
import { useAuthStore } from '@/store/auth.store';
import * as userService from './user.service';

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().logout();
});
afterAll(() => server.close());

describe('user.service', () => {
  describe('completeOnboarding', () => {
    it('returns the user with onboardingComplete=true + captured wizard data', async () => {
      // Need a token for the request to be accepted by the handler.
      useAuthStore.getState().setAccessToken(__TEST__.MOCK_ACCESS_TOKEN);

      const result = await userService.completeOnboarding({
        profession: 'Photographer',
        city: 'Mombasa',
        businessName: 'Mombasa Pixels',
        kraPin: 'A123456789B',
        businessAddress: 'PO Box 99, Mombasa',
        plan: 'PRO',
      });

      expect(result.profession).toBe('Photographer');
      expect(result.city).toBe('Mombasa');
      expect(result.businessName).toBe('Mombasa Pixels');
      expect(result.kraPin).toBe('A123456789B');
      expect(result.businessAddress).toBe('PO Box 99, Mombasa');
      expect(result.plan).toBe('PRO');
      expect(result.onboardingComplete).toBe(true);
    });

    it('accepts onboarding without optional brand fields', async () => {
      useAuthStore.getState().setAccessToken(__TEST__.MOCK_ACCESS_TOKEN);

      const result = await userService.completeOnboarding({
        profession: 'Illustrator',
        city: 'Kisumu',
        businessName: 'Kisumu Lines',
        plan: 'FREE',
      });

      expect(result.kraPin).toBeUndefined();
      expect(result.businessAddress).toBeUndefined();
      expect(result.plan).toBe('FREE');
    });

    it('rejects when called without a valid token', async () => {
      // No token in the store — request goes unauthenticated.
      useAuthStore.getState().logout();

      // The default MSW refresh handler always returns success, so the
      // Axios interceptor's silent-refresh would mask the 401. Override
      // refresh to also 401 — same pattern as in auth.service.test.ts.
      server.use(
        http.post('/api/v1/auth/refresh', () =>
          HttpResponse.json(
            { status: 'error', message: 'Refresh failed', code: 'UNAUTHENTICATED' },
            { status: 401 },
          ),
        ),
      );

      await expect(
        userService.completeOnboarding({
          profession: 'Illustrator',
          city: 'Kisumu',
          businessName: 'Kisumu Lines',
          plan: 'FREE',
        }),
      ).rejects.toSatisfy((err: unknown) => {
        return (
          isAxiosError(err) &&
          err.response?.status === 401 &&
          err.response.data?.code === 'UNAUTHENTICATED'
        );
      });
    });
  });
});
