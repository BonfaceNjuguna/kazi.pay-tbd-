import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';

import { Button, Input } from '@/components/ui';
import { useLogin } from '@/hooks/useAuth';
import type { ApiError } from '@/lib/api';

import { GoogleSignInButton } from './GoogleSignInButton';

/**
 * Login form.
 *
 * Uses uncontrolled inputs read on submit + native HTML5 validation
 * (`required`, `type="email"`) for the common cases. The submit handler
 * collects values into the useLogin mutation. On error, the API's
 * structured message is rendered above the form.
 *
 * Demo creds (per src/mocks/handlers/auth.handlers.ts):
 *   rowlex@demo.perxli.com / Demo1234!
 */
export function LoginForm() {
  const login = useLogin();
  const navigate = useNavigate();
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
          if (isAxiosError<ApiError>(err) && err.response?.data) {
            // EMAIL_NOT_VERIFIED is a soft failure — bounce them to
            // /verify-email with the email in state so they can re-send
            // and complete the loop. No "wrong credentials" framing.
            if (err.response.data.code === 'EMAIL_NOT_VERIFIED') {
              navigate('/verify-email', { state: { email } });
              return;
            }
            setServerError(err.response.data.message);
            return;
          }
          setServerError('Something went wrong. Please try again.');
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleSignInButton text="signin_with" context="signin" ariaLabel="Sign in with Google" />

      <OrDivider />

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
          New to Perxli?{' '}
          <Link to="/register" className="font-semibold text-lime hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}

/**
 * Visual separator between the Google button and the email/password form.
 * Hides the dividing rule on the smallest viewports where the AuthLayout
 * card already provides enough visual grouping.
 */
function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-dark-t3">
      <span className="h-px flex-1 bg-dark-border" />
      <span>or</span>
      <span className="h-px flex-1 bg-dark-border" />
    </div>
  );
}
