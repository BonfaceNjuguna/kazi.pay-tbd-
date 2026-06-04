import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button, Input } from '@/components/ui';
import { useForgotPassword } from '@/hooks/useAuth';

/**
 * Forgot-password form.
 *
 * Per ADR-002, the server response is the same regardless of whether the
 * email is registered (no enumeration). The success state shows a generic
 * "if an account exists, we've sent a link" message even on transport
 * failure-ish cases — better to err on the side of not leaking.
 */
export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    forgotPassword.mutate(
      { email },
      // Show the same success message even on failure — see the
      // ADR-002 rationale on not leaking which emails exist.
      { onSettled: () => setSubmittedEmail(email) },
    );
  }

  if (submittedEmail) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-lime/30 bg-lime-bg px-3 py-3 text-sm font-semibold text-dark-t1">
          If an account exists for{' '}
          <span className="text-lime">{submittedEmail}</span>, we've sent
          instructions to reset your password.
        </div>
        <p className="text-base text-dark-t2">
          Check your inbox (and spam folder). The link is good for 30
          minutes.
        </p>
        <Link
          to="/login"
          className="text-base font-semibold text-lime hover:underline"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-base text-dark-t2">
        Type the email you used to sign up. We'll send a reset link.
      </p>

      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />

      <Button type="submit" fullWidth loading={forgotPassword.isPending}>
        Send reset link
      </Button>

      <p className="text-center text-base text-dark-t2">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-lime hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
