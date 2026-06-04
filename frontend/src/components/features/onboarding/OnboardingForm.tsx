import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';

import { Button, Input, Select, type SelectOption } from '@/components/ui';
import { useCompleteOnboarding } from '@/hooks/useAuth';
import type { ApiError } from '@/lib/api';

/**
 * Onboarding form — first thing a freshly-registered user sees.
 *
 * Captures the bare minimum identity info needed to make the rest of the
 * product useful: what kind of creative work you do (drives smart
 * document-template suggestions later) and where you're based. Both
 * become part of the user record and surface on documents the user
 * generates.
 *
 * Profession dropdown values per CLAUDE.md target users — graphic
 * designers, photographers, videographers, illustrators, copywriters —
 * plus an "Other" escape hatch so we don't bounce edge cases.
 *
 * Future: this is a single-step form for v1. Brand settings (logo,
 * signature, business name, KRA PIN) happen later via Settings — see
 * Phase 1.9. If onboarding grows multi-step, split into a wizard then.
 */

const PROFESSIONS: ReadonlyArray<SelectOption> = [
  { value: 'Graphic Designer', label: 'Graphic Designer' },
  { value: 'Photographer', label: 'Photographer' },
  { value: 'Videographer', label: 'Videographer' },
  { value: 'Illustrator', label: 'Illustrator' },
  { value: 'Copywriter', label: 'Copywriter' },
  { value: 'Other', label: 'Other' },
];

export function OnboardingForm() {
  const completeOnboarding = useCompleteOnboarding();
  const [serverError, setServerError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const form = new FormData(e.currentTarget);

    completeOnboarding.mutate(
      {
        profession: String(form.get('profession') ?? ''),
        city: String(form.get('city') ?? '').trim(),
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

      <Select
        label="What you do"
        name="profession"
        required
        placeholder="Pick one"
        options={PROFESSIONS}
        defaultValue=""
      />

      <Input
        label="City"
        type="text"
        name="city"
        autoComplete="address-level2"
        required
        minLength={2}
        placeholder="Nairobi"
      />

      <Button type="submit" fullWidth loading={completeOnboarding.isPending}>
        Continue to dashboard
      </Button>
    </form>
  );
}
