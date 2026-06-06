import { useState } from 'react';
import { isAxiosError } from 'axios';

import {
  BrandStep,
  BusinessStep,
  OnboardingProgress,
  PlanStep,
  ProfileStep,
} from '@/components/features/onboarding';
import { useCompleteOnboarding } from '@/hooks/useAuth';
import type { ApiError } from '@/lib/api';
import type {
  BrandStepData,
  BusinessStepData,
  PlanStepData,
  ProfileStepData,
} from '@/services/auth.service';
import { useAuthStore, type SubscriptionPlan } from '@/store/auth.store';

/**
 * OnboardingPage — 4-step wizard state machine.
 *
 * Owns:
 *   - current step index (0-3)
 *   - accumulated form data across all 4 steps
 *   - final submit (`useCompleteOnboarding`)
 *
 * Each step is its own component receiving the slice of state it cares
 * about + an `onNext(stepData)` callback that merges the step's output
 * into the accumulated draft and advances. Last step calls `onSubmit`
 * which fires the API mutation. Back navigates without losing data
 * — useful when a user wants to tweak an earlier answer.
 *
 * Design choice: keep state local to this component (no context, no
 * Zustand slice). The wizard isn't accessed from anywhere else.
 */

const STEPS = [
  { key: 'profile', label: 'Profile' },
  { key: 'business', label: 'Business' },
  { key: 'brand', label: 'Brand' },
  { key: 'plan', label: 'Plan' },
] as const;

interface WizardDraft {
  profile?: ProfileStepData;
  business?: BusinessStepData;
  brand?: BrandStepData;
  plan?: PlanStepData;
}

export function OnboardingPage() {
  const user = useAuthStore((s) => s.user);
  const completeOnboarding = useCompleteOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState<WizardDraft>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Sensible default for the wizard — businessName starts as fullName since
  // most Kenyan creatives are sole proprietors trading under their own name.
  const defaultBusinessName = user?.fullName ?? '';

  const goNext = (slice: Partial<WizardDraft>) => {
    setDraft((d) => ({ ...d, ...slice }));
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleFinish = (planData: PlanStepData) => {
    setServerError(null);
    const finalDraft = { ...draft, plan: planData };
    if (!finalDraft.profile || !finalDraft.business) {
      // Should be unreachable — earlier steps gate progression.
      setServerError('Some steps are incomplete. Please go back and finish them.');
      return;
    }
    completeOnboarding.mutate(
      {
        profession: finalDraft.profile.profession,
        city: finalDraft.profile.city,
        businessName: finalDraft.business.businessName,
        kraPin: finalDraft.brand?.kraPin,
        businessAddress: finalDraft.brand?.businessAddress,
        plan: planData.plan,
      },
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
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome header */}
      <header>
        <h1 className="text-3xl font-extrabold tracking-tighter md:text-4xl">
          Karibu, {user?.fullName?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="mt-1 text-base text-dark-t2">
          Let's set up your account so Perxli can do its thing. Should
          take about a minute.
        </p>
      </header>

      {/* Progress indicator */}
      <OnboardingProgress
        steps={STEPS.map((s) => ({ label: s.label }))}
        current={currentStep}
      />

      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger-bg px-3 py-2 text-sm font-semibold text-danger"
        >
          {serverError}
        </div>
      )}

      {/* Current step */}
      <div className="rounded-lg border border-dark-border bg-dark-surface-raised p-6 md:p-8">
        {currentStep === 0 && (
          <ProfileStep
            initial={draft.profile}
            onNext={(profile) => goNext({ profile })}
          />
        )}
        {currentStep === 1 && (
          <BusinessStep
            initial={draft.business ?? { businessName: defaultBusinessName }}
            onBack={goBack}
            onNext={(business) => goNext({ business })}
          />
        )}
        {currentStep === 2 && (
          <BrandStep
            initial={draft.brand}
            onBack={goBack}
            onNext={(brand) => goNext({ brand })}
          />
        )}
        {currentStep === 3 && (
          <PlanStep
            initial={draft.plan ?? { plan: 'FREE' as SubscriptionPlan }}
            onBack={goBack}
            onSubmit={handleFinish}
            submitting={completeOnboarding.isPending}
          />
        )}
      </div>
    </div>
  );
}
