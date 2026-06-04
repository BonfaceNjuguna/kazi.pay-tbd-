import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';

import { Button } from '@/components/ui';
import { useResendVerification, useVerifyEmail } from '@/hooks/useAuth';
import type { ApiError } from '@/lib/api';

/**
 * VerifyEmailFlow — handles three states the user can arrive in:
 *
 * 1. **From `/register`** — `location.state.email` is set, no token in URL.
 *    Show "We've sent a link to <email>" + a Resend button + return-to-login.
 *
 * 2. **From the verification email link** — URL has `?token=...`. We
 *    automatically POST it to /auth/verify-email on mount. On success,
 *    show "Email verified!" with a "Sign in now" CTA. On expired/invalid
 *    token, surface the error and offer to resend.
 *
 * 3. **Directly via URL bar with no state and no token** — show a generic
 *    "Verify your email" message that nudges back to /login (where the
 *    EMAIL_NOT_VERIFIED handler will bounce them here with the email).
 */

interface LocationStateMaybe {
  email?: string;
}

export function VerifyEmailFlow() {
  const location = useLocation();
  const state = location.state as LocationStateMaybe | null;
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const verifyEmail = useVerifyEmail();
  const resend = useResendVerification();

  const [emailForResend, setEmailForResend] = useState(state?.email ?? '');
  const [serverError, setServerError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  // Auto-verify when a token is present in the URL.
  useEffect(() => {
    if (!token) return;
    verifyEmail.mutate(
      { token },
      {
        onError: (err) => {
          if (isAxiosError<ApiError>(err) && err.response?.data?.message) {
            setServerError(err.response.data.message);
          } else {
            setServerError('Something went wrong verifying your email.');
          }
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function onResend() {
    if (!emailForResend) return;
    setResent(false);
    resend.mutate(emailForResend, {
      onSettled: () => setResent(true),
    });
  }

  // ── State 2: verifying a token from the email link ──
  if (token) {
    if (verifyEmail.isPending) {
      return (
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Verifying your email…
          </h2>
          <p className="mt-2 text-base text-dark-t2">Just a moment.</p>
        </div>
      );
    }
    if (verifyEmail.isSuccess) {
      return (
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Email verified ✓
          </h2>
          <p className="mt-2 text-base text-dark-t2">
            You're all set. Sign in to start setting up your account.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex h-10 items-center rounded-md bg-lime px-5 text-base font-bold text-dark-surface hover:bg-lime-hover"
          >
            Sign in
          </Link>
        </div>
      );
    }
    // Token error path.
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-extrabold tracking-tight">
          We couldn't verify that link
        </h2>
        {serverError && (
          <div
            role="alert"
            className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger"
          >
            {serverError}
          </div>
        )}
        <p className="text-base text-dark-t2">
          Verification links expire. Enter your email below and we'll send
          you a fresh one.
        </p>
        <ResendBlock
          email={emailForResend}
          onEmailChange={setEmailForResend}
          onResend={onResend}
          pending={resend.isPending}
          resent={resent}
        />
        <p className="text-center text-base text-dark-t2">
          <Link to="/login" className="font-semibold text-lime hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  // ── State 1: arrived from /register with an email in state ──
  if (state?.email) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-extrabold tracking-tight">Check your inbox</h2>
        <div className="rounded-md border border-lime/30 bg-lime-bg px-3 py-3 text-sm font-semibold text-dark-t1">
          We sent a verification link to{' '}
          <span className="text-lime">{state.email}</span>. Click it to
          finish setting up your account.
        </div>
        <p className="text-base text-dark-t2">
          Didn't get the email? Check spam, then try again below.
        </p>
        <ResendBlock
          email={emailForResend}
          onEmailChange={setEmailForResend}
          onResend={onResend}
          pending={resend.isPending}
          resent={resent}
        />
        <p className="text-center text-base text-dark-t2">
          <Link to="/login" className="font-semibold text-lime hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  // ── State 3: arrived bare (URL bar, no state, no token) ──
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-extrabold tracking-tight">Verify your email</h2>
      <p className="text-base text-dark-t2">
        Type your email below and we'll send you a fresh verification
        link. Or head back to sign in if you already verified.
      </p>
      <ResendBlock
        email={emailForResend}
        onEmailChange={setEmailForResend}
        onResend={onResend}
        pending={resend.isPending}
        resent={resent}
      />
      <p className="text-center text-base text-dark-t2">
        <Link to="/login" className="font-semibold text-lime hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}

interface ResendBlockProps {
  email: string;
  onEmailChange: (v: string) => void;
  onResend: () => void;
  pending: boolean;
  resent: boolean;
}

function ResendBlock({
  email,
  onEmailChange,
  onResend,
  pending,
  resent,
}: ResendBlockProps) {
  return (
    <div className="flex flex-col gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        className="h-10 rounded-md border border-dark-border bg-dark-surface-input px-3 text-base text-dark-t1 placeholder:text-dark-t3 outline-none focus:border-lime"
      />
      <Button
        type="button"
        variant="ghost"
        onClick={onResend}
        loading={pending}
        disabled={!email}
        fullWidth
      >
        Resend verification email
      </Button>
      {resent && (
        <p className="text-sm text-dark-t2">
          If an account exists for that address, we've sent a fresh link.
        </p>
      )}
    </div>
  );
}
