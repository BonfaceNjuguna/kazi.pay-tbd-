import { useState } from 'react';

import { Button } from '@/components/ui';
import { PlanCard } from '../PlanCard';
import type { PlanStepData } from '@/services/auth.service';
import type { SubscriptionPlan } from '@/store/auth.store';

/**
 * Step 4 — Plan. The user picks Free, Single Project, or Pro.
 *
 * Pricing + features per CLAUDE.md:
 *   Free            KES 0      1 active project · 3 doc types · watermark
 *   Single Project  KES 499    one-time · all docs · own logo · 1 project
 *   Pro             KES 299    /month · unlimited projects · all features
 *
 * All three are selectable. Paid plans set the user's tier in the
 * backend but DON'T trigger a payment — actual M-Pesa charge happens
 * when payments ship in Phase 3. The note on paid cards makes this
 * clear so users don't worry about being charged on the spot.
 */

export interface PlanStepProps {
  initial: PlanStepData;
  onBack: () => void;
  onSubmit: (data: PlanStepData) => void;
  submitting: boolean;
}

export function PlanStep({ initial, onBack, onSubmit, submitting }: PlanStepProps) {
  const [selected, setSelected] = useState<SubscriptionPlan>(initial.plan);

  function handleFinish() {
    onSubmit({ plan: selected });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Pick your plan</h2>
        <p className="mt-1 text-base text-dark-t2">
          Free is enough to take your first project all the way to paid.
          Upgrade later when you need it — paid plans don't bill you
          until M-Pesa is wired in (next phase).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PlanCard
          plan="FREE"
          name="Free"
          price="KES 0"
          period="forever"
          features={[
            '1 active project at a time',
            'Quotation, Scope of Work, Contract',
            'Perxli watermark on documents',
            '30-day project history',
          ]}
          selected={selected === 'FREE'}
          onSelect={setSelected}
        />

        <PlanCard
          plan="SINGLE_PROJECT"
          name="Single Project"
          price="KES 499"
          period="one-time"
          features={[
            'Everything unlocked for 1 project',
            'All 12 documents',
            'Your own logo + signature',
            'Permanent project record',
          ]}
          selected={selected === 'SINGLE_PROJECT'}
          note="No charge today — payment happens via M-Pesa when payments ship in Phase 3."
          onSelect={setSelected}
        />

        <PlanCard
          plan="PRO"
          name="Pro"
          price="KES 299"
          period="/ month"
          features={[
            'Unlimited active projects',
            'All 12 documents',
            'AI payment reminders',
            'Full project history + priority support',
          ]}
          selected={selected === 'PRO'}
          recommended
          note="No charge today — payment happens via M-Pesa when payments ship in Phase 3."
          onSelect={setSelected}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>
          ← Back
        </Button>
        <Button type="button" onClick={handleFinish} loading={submitting}>
          Finish & go to dashboard
        </Button>
      </div>
    </div>
  );
}
