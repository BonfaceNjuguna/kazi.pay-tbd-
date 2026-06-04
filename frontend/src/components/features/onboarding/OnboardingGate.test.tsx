import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { useAuthStore, type AuthUser } from '@/store/auth.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { OnboardingGate } from './OnboardingGate';

const ONBOARDED_USER: AuthUser = {
  id: 'onboarded',
  email: 'rowlex@demo.kazi.pay',
  fullName: 'Rowlex Karimi',
  emailVerified: true,
  profession: 'Graphic Designer',
  city: 'Nairobi',
  businessName: 'Rowlex Karimi',
  country: 'Kenya',
  currency: 'KES',
  plan: 'FREE',
  onboardingComplete: true,
};

const FRESH_USER: AuthUser = {
  ...ONBOARDED_USER,
  id: 'fresh',
  profession: '',
  city: '',
  businessName: '',
  onboardingComplete: false,
};

afterEach(() => {
  useAuthStore.getState().logout();
});

describe('<OnboardingGate>', () => {
  it('redirects to /onboarding when the user has not completed onboarding', () => {
    useAuthStore.getState().setSession({
      user: FRESH_USER,
      accessToken: 'test-token',
    });

    renderWithProviders(
      <Routes>
        <Route path="/onboarding" element={<div>Onboarding screen</div>} />
        <Route element={<OnboardingGate />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );

    expect(screen.getByText('Onboarding screen')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('renders the Outlet when the user has completed onboarding', () => {
    useAuthStore.getState().setSession({
      user: ONBOARDED_USER,
      accessToken: 'test-token',
    });

    renderWithProviders(
      <Routes>
        <Route path="/onboarding" element={<div>Onboarding screen</div>} />
        <Route element={<OnboardingGate />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.queryByText('Onboarding screen')).not.toBeInTheDocument();
  });

  it('does not redirect when there is no user (lets ProtectedRoute handle it)', () => {
    // Auth store is logged out (no user). The OnboardingGate should pass
    // through; the outer ProtectedRoute (not in this test) sends to /login.
    renderWithProviders(
      <Routes>
        <Route path="/onboarding" element={<div>Onboarding screen</div>} />
        <Route element={<OnboardingGate />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      { route: '/dashboard' },
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
    expect(screen.queryByText('Onboarding screen')).not.toBeInTheDocument();
  });
});
