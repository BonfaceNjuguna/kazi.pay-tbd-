import { useState, type FormEvent } from 'react';

import { Button, Input } from '@/components/ui';
import type { BusinessStepData } from '@/services/auth.service';

/**
 * Step 2 — Business. Captures the trading name that appears on documents
 * sent to clients. Prefilled with the user's full name since most Kenyan
 * creatives are sole proprietors trading under their own name — they can
 * override if they have a registered business.
 */

export interface BusinessStepProps {
  initial: BusinessStepData;
  onBack: () => void;
  onNext: (data: BusinessStepData) => void;
}

export function BusinessStep({ initial, onBack, onNext }: BusinessStepProps) {
  const [businessName, setBusinessName] = useState(initial.businessName);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onNext({ businessName: businessName.trim() });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Your business</h2>
        <p className="mt-1 text-base text-dark-t2">
          What should clients see at the top of invoices and proposals?
        </p>
      </div>

      <Input
        label="Business name"
        type="text"
        name="businessName"
        autoComplete="organization"
        required
        minLength={2}
        placeholder="e.g. Rowlex Karimi or Rowlex Studio"
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        hint="Most freelancers use their own name. You can change this in Settings any time."
      />

      <div className="mt-2 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit">Continue →</Button>
      </div>
    </form>
  );
}
