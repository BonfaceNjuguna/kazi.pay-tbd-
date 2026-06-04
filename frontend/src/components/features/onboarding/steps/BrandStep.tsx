import { useState, type FormEvent } from 'react';

import { Button, Input } from '@/components/ui';
import type { BrandStepData } from '@/services/auth.service';

/**
 * Step 3 — Brand. Optional details that appear on documents. KRA PIN
 * powers eTIMS compliance (Phase 4 backend; UI hidden until announced
 * as a Pro feature per CLAUDE.md). Business address renders on
 * invoices when set.
 *
 * Logo + type-to-sign signature live in Settings — they need file
 * upload / canvas capture which is Phase 1.9 work. We mention that
 * inline so users know it's coming, not that we forgot.
 *
 * Both fields are optional — users can skip the entire step.
 */

export interface BrandStepProps {
  initial?: BrandStepData;
  onBack: () => void;
  onNext: (data: BrandStepData) => void;
}

export function BrandStep({ initial, onBack, onNext }: BrandStepProps) {
  const [kraPin, setKraPin] = useState(initial?.kraPin ?? '');
  const [businessAddress, setBusinessAddress] = useState(
    initial?.businessAddress ?? '',
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onNext({
      kraPin: kraPin.trim() || undefined,
      businessAddress: businessAddress.trim() || undefined,
    });
  }

  function onSkip() {
    onNext({ kraPin: undefined, businessAddress: undefined });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Brand details</h2>
        <p className="mt-1 text-base text-dark-t2">
          Optional. Skip if you want — you can fill these in later from
          Settings.
        </p>
      </div>

      <Input
        label="KRA PIN"
        type="text"
        name="kraPin"
        placeholder="A123456789B"
        value={kraPin}
        onChange={(e) => setKraPin(e.target.value)}
        hint="We'll use this for KRA / eTIMS compliance when that feature lands."
      />

      <Input
        label="Business address"
        type="text"
        name="businessAddress"
        autoComplete="street-address"
        placeholder="e.g. PO Box 12345, Nairobi"
        value={businessAddress}
        onChange={(e) => setBusinessAddress(e.target.value)}
        hint="Appears on invoices and receipts. Leave blank to skip."
      />

      <p className="rounded-md border border-purple-border bg-purple-bg px-3 py-2 text-sm text-dark-t2">
        Logo upload + type-to-sign signature live in Settings (coming
        next phase) so you can keep moving here.
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button type="submit">Continue →</Button>
        </div>
      </div>
    </form>
  );
}
