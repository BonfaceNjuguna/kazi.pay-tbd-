import { useLocation } from 'react-router-dom';

import { LoginForm } from '@/components/features/auth';

interface LocationStateMaybe {
  passwordResetSuccess?: boolean;
}

export function LoginPage() {
  const location = useLocation();
  const state = location.state as LocationStateMaybe | null;
  const showResetSuccess = state?.passwordResetSuccess === true;

  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight">Karibu — sign in</h2>
      <p className="mt-1 text-base text-dark-t2">
        Get the project formalised, get paid, and have proof of everything.
      </p>

      {showResetSuccess && (
        <div className="mt-4 rounded-md border border-success-bg bg-success-bg px-3 py-2 text-sm font-semibold text-success">
          Your password has been reset. Sign in with the new one.
        </div>
      )}

      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
