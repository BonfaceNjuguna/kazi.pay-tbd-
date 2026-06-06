import { cn } from '@/lib/cn';
import { IconCheck } from '@/components/ui';
import type { SubscriptionPlan } from '@/store/auth.store';

/**
 * Selectable plan card — renders one of the three Perxli tiers.
 *
 * Visual states:
 *  - default     dark surface, dark border
 *  - hover       lime border (subtle)
 *  - selected    lime border, lime glow shadow, lime "Selected" pill in
 *                top-right
 *  - recommended optional lime pill in top-right (Free is the default
 *                pick for first-time users; we mark Pro as recommended
 *                separately when it makes sense)
 *
 * Price + period rendered prominently. Feature list uses lime check
 * icons to feel positive (this is what you GET, not what's missing).
 *
 * For paid plans, a small note clarifies that payment happens later
 * (M-Pesa STK Push lands in Phase 3) — so users can pick without
 * worrying about being charged on the spot.
 */

export interface PlanCardProps {
  plan: SubscriptionPlan;
  name: string;
  price: string;
  period: string;
  features: ReadonlyArray<string>;
  /** Selected = this is the user's currently-chosen plan. */
  selected: boolean;
  /** Recommended = surfaces a lime "Recommended" pill in top-right. */
  recommended?: boolean;
  /** Optional disclosure line beneath features. */
  note?: string;
  onSelect: (plan: SubscriptionPlan) => void;
}

export function PlanCard({
  plan,
  name,
  price,
  period,
  features,
  selected,
  recommended = false,
  note,
  onSelect,
}: PlanCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      aria-pressed={selected}
      className={cn(
        'group relative flex flex-col gap-4 rounded-lg border-2 p-5 text-left transition-all duration-fast',
        'bg-dark-surface-raised',
        selected
          ? 'border-lime shadow-lime-glow'
          : 'border-dark-border hover:border-lime/40',
      )}
    >
      {/* Top-right pill: Selected wins over Recommended */}
      {selected ? (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-xl bg-lime px-2.5 py-0.5 text-xs font-bold text-dark-surface">
          <IconCheck className="h-3 w-3" />
          Selected
        </span>
      ) : recommended ? (
        <span className="absolute right-3 top-3 inline-flex items-center rounded-xl bg-lime-bg px-2.5 py-0.5 text-xs font-bold text-lime">
          Recommended
        </span>
      ) : null}

      <div>
        <h3 className="text-lg font-extrabold tracking-tight">{name}</h3>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold tracking-tighter">{price}</span>
          <span className="text-sm font-semibold text-dark-t2">{period}</span>
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-dark-t1">
            <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {note && <p className="text-xs text-dark-t3">{note}</p>}
    </button>
  );
}
