import { ResetPasswordForm } from '@/components/features/auth';

export function ResetPasswordPage() {
  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight">Choose a new password</h2>
      <p className="mt-1 text-base text-dark-t2">
        Pick something you'll remember. Pro tip: a short phrase beats a
        random string of symbols every time.
      </p>

      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
