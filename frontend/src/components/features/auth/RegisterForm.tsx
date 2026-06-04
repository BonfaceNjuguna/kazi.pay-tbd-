import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';

import { Button, Input } from '@/components/ui';
import { useRegister } from '@/hooks/useAuth';
import type { ApiError } from '@/lib/api';

/**
 * Register form.
 *
 * Captures only the minimum needed to create an account: full name, email,
 * password. Profession + city are deliberately deferred to the `/onboarding`
 * step that fires immediately after first sign-in — registration shouldn't
 * be a survey, and asking who-you-are-as-a-creative belongs to onboarding,
 * not authentication.
 *
 * Country (Kenya) and currency (KES) are hardcoded at v1 — multi-country
 * is a future-features.md item, not Phase 1–4 scope.
 */
export function RegisterForm() {
  const register = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const form = new FormData(e.currentTarget);

    register.mutate(
      {
        fullName: String(form.get('fullName') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
      },
      {
        onError: (err) => {
          if (isAxiosError<ApiError>(err) && err.response?.data?.message) {
            setServerError(err.response.data.message);
          } else {
            setServerError('Something went wrong. Please try again.');
          }
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger"
        >
          {serverError}
        </div>
      )}

      <Input
        label="Your full name"
        type="text"
        name="fullName"
        autoComplete="name"
        required
        minLength={2}
        placeholder="Rowlex Karimi"
      />

      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />

      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="At least 8 characters"
        hint="8+ characters. Use a phrase you'll actually remember."
      />

      <Button type="submit" fullWidth loading={register.isPending}>
        Create my account
      </Button>

      <p className="text-center text-base text-dark-t2">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-lime hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
