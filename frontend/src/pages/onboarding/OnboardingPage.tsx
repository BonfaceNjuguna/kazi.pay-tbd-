import { OnboardingForm } from '@/components/features/onboarding';
import { useAuthStore } from '@/store/auth.store';

export function OnboardingPage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight">
        Karibu, {firstName} 👋
      </h2>
      <p className="mt-1 text-base text-dark-t2">
        Just two quick questions so KaziPay knows who's billing the client
        and where you're based. You can change either later in Settings.
      </p>

      <div className="mt-6">
        <OnboardingForm />
      </div>
    </div>
  );
}
