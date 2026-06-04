import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';

import { Button, Input } from '@/components/ui';
import { useResetPassword } from '@/hooks/useAuth';
import type { ApiError } from '@/lib/api';

/**
 * Reset-password form.
 *
 * Reads the reset token from `?token=...` in the URL (the link the user
 * clicked in their email). The token is included in the API call but not
 * displayed in the UI — no value in showing it.
 *
 * Includes a client-side confirm-password match check. The server still
 * validates everything; this is just earlier feedback for the user.
 */
export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();
  const [serverError, setServerError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger"
        >
          This reset link is missing its token. It may have been copied
          incorrectly.
        </div>
        <Link
          to="/forgot-password"
          className="text-base font-semibold text-lime hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setMismatch(false);
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    // Token presence already verified by the early return above.
    if (!token) return;

    resetPassword.mutate(
      { token, password },
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
        label="New password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="At least 8 characters"
      />

      <Input
        label="Confirm new password"
        type="password"
        name="confirm"
        autoComplete="new-password"
        required
        minLength={8}
        error={mismatch ? 'Passwords do not match.' : undefined}
      />

      <Button type="submit" fullWidth loading={resetPassword.isPending}>
        Reset password
      </Button>
    </form>
  );
}
