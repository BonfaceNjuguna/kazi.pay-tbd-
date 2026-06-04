import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { authHandlers, __TEST__ } from '@/mocks/handlers/auth.handlers';
import { useAuthStore } from '@/store/auth.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { LoginForm } from './LoginForm';

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.getState().logout();
});
afterAll(() => server.close());

describe('<LoginForm>', () => {
  it('populates the auth store on successful login', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), __TEST__.DEMO_USER.email);
    await user.type(screen.getByLabelText(/password/i), __TEST__.DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
    expect(useAuthStore.getState().user?.email).toBe(__TEST__.DEMO_USER.email);
    expect(useAuthStore.getState().accessToken).toBe(__TEST__.MOCK_ACCESS_TOKEN);
  });

  it('renders the server error message on failure and does not authenticate', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), __TEST__.DEMO_USER.email);
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText(/email or password is incorrect/i),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
