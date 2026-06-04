import { ForgotPasswordForm } from '@/components/features/auth';

export function ForgotPasswordPage() {
  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight">Reset your password</h2>

      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
