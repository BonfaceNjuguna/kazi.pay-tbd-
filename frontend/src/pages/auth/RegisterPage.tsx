import { RegisterForm } from '@/components/features/auth';

export function RegisterPage() {
  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight">Create your account</h2>
      <p className="mt-1 text-base text-dark-t2">
        Free to start. No card needed. You can upgrade when you're ready.
      </p>

      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
