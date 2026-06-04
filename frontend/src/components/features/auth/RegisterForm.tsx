import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';

import { Button, Input, Select, type SelectOption } from '@/components/ui';
import { useRegister } from '@/hooks/useAuth';
import type { ApiError } from '@/lib/api';

/**
 * Register form.
 *
 * Collects the minimum needed for a creative to start using KaziPay (per
 * the §1.8 milestone DoD): name, email, password, profession, city. Country
 * is hardcoded to Kenya at v1; currency follows from country.
 *
 * Profession dropdown values per CLAUDE.md target users — graphic designers,
 * photographers, videographers, illustrators, copywriters — plus an "Other"
 * escape hatch so we don't bounce edge cases.
 */

const PROFESSIONS: ReadonlyArray<SelectOption> = [
  { value: 'Graphic Designer', label: 'Graphic Designer' },
  { value: 'Photographer', label: 'Photographer' },
  { value: 'Videographer', label: 'Videographer' },
  { value: 'Illustrator', label: 'Illustrator' },
  { value: 'Copywriter', label: 'Copywriter' },
  { value: 'Other', label: 'Other' },
];

export function RegisterForm() {
  const register = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const form = new FormData(e.currentTarget);

    register.mutate(
      {
        fullName: String(form.get('fullName') ?? '').trim(),
        email: String(form.get('email') ?? '').trim(),
        password: String(form.get('password') ?? ''),
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

      <Input
        label="Your full name"
        type="text"
        name="fullName"
        autoComplete="name"
        required
        minLength={2}
        placeholder="Rowlex Karimi"
      />

      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />

      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="At least 8 characters"
        hint="8+ characters. Use a phrase you'll actually remember."
      />

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

      <Button type="submit" fullWidth loading={register.isPending}>
        Create my account
      </Button>

      <p className="text-center text-base text-dark-t2">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-lime hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
