import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { useAuthStore, type AuthUser } from '@/store/auth.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { ProtectedRoute } from './ProtectedRoute';

const FAKE_USER: AuthUser = {
  id: 'test-id',
  email: 'test@example.com',
  fullName: 'Test User',
  emailVerified: true,
  profession: 'Graphic Designer',
  city: 'Nairobi',
  businessName: 'Test User',
  country: 'Kenya',
  currency: 'KES',
  plan: 'FREE',
  onboardingComplete: true,
};

afterEach(() => {
  // Reset the store between tests so state doesn't leak.
  useAuthStore.getState().logout();
});

describe('<ProtectedRoute>', () => {
  it('redirects unauthenticated visitors to /login', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );

    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('renders the protected outlet when authenticated', () => {
    useAuthStore.getState().setSession({
      user: FAKE_USER,
      accessToken: 'test-token',
    });

    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.queryByText('Login screen')).not.toBeInTheDocument();
  });
});
