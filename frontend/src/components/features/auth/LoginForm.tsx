import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';

import { Button, Input } from '@/components/ui';
import { useLogin } from '@/hooks/useAuth';
import type { ApiError } from '@/lib/api';

/**
 * Login form.
 *
 * Uses uncontrolled inputs read on submit + native HTML5 validation
 * (`required`, `type="email"`) for the common cases. The submit handler
 * collects values into the useLogin mutation. On error, the API's
 * structured message is rendered above the form.
 *
 * Demo creds (per src/mocks/handlers/auth.handlers.ts):
 *   rowlex@demo.kazi.pay / Demo1234!
 */
export function LoginForm() {
  const login = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    login.mutate(
      { email, password },
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
    <form onSubmit={onSubmit} noValidate={false} className="flex flex-col gap-4">
      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger"
        >
          {serverError}
        </div>
      )}

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
        autoComplete="current-password"
        required
        minLength={8}
        placeholder="••••••••"
      />

      <div className="-mt-2 text-right">
        <Link
          to="/forgot-password"
          className="text-sm font-semibold text-dark-t2 hover:text-lime"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" fullWidth loading={login.isPending}>
        Sign in
      </Button>

      <p className="text-center text-base text-dark-t2">
        New to KaziPay?{' '}
        <Link to="/register" className="font-semibold text-lime hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
