import { useState, type FormEvent } from 'react';

import { Button, Input, Select, type SelectOption } from '@/components/ui';
import type { ProfileStepData } from '@/services/auth.service';

/**
 * Step 1 — Profile. Captures what the user does and where they work from.
 * Drives smart document-template suggestions later and surfaces on every
 * document KaziPay generates.
 *
 * Profession dropdown values per CLAUDE.md target users — graphic
 * designers, photographers, videographers, illustrators, copywriters —
 * plus "Other" so we don't bounce edge cases.
 */

const PROFESSIONS: ReadonlyArray<SelectOption> = [
  { value: 'Graphic Designer', label: 'Graphic Designer' },
  { value: 'Photographer', label: 'Photographer' },
  { value: 'Videographer', label: 'Videographer' },
  { value: 'Illustrator', label: 'Illustrator' },
  { value: 'Copywriter', label: 'Copywriter' },
  { value: 'Other', label: 'Other' },
];

export interface ProfileStepProps {
  initial?: ProfileStepData;
  onNext: (data: ProfileStepData) => void;
}

export function ProfileStep({ initial, onNext }: ProfileStepProps) {
  const [profession, setProfession] = useState(initial?.profession ?? '');
  const [city, setCity] = useState(initial?.city ?? '');

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onNext({ profession, city: city.trim() });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Tell us about you</h2>
        <p className="mt-1 text-base text-dark-t2">
          Two quick details — this shows up on every document you send.
        </p>
      </div>

      <Select
        label="What you do"
        name="profession"
        required
        placeholder="Pick one"
        options={PROFESSIONS}
        value={profession}
        onChange={(e) => setProfession(e.target.value)}
      />

      <Input
        label="City"
        type="text"
        name="city"
        autoComplete="address-level2"
        required
        minLength={2}
        placeholder="Nairobi"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />

      <div className="mt-2 flex justify-end">
        <Button type="submit">Continue →</Button>
      </div>
    </form>
  );
}
