import { cn } from '@/lib/cn';
import { IconCheck } from '@/components/ui';

/**
 * Visual progress indicator for the onboarding wizard.
 *
 * Renders a horizontal row of numbered step pills connected by lines.
 * Each step is in one of three states:
 *   - done    (lime fill, check icon)        — user already finished it
 *   - current (lime border, lime number)     — user is here now
 *   - upcoming (muted, dark border, gray number) — not reached yet
 *
 * Step labels show on md+ screens; on mobile only the numbers + lines
 * render to keep the chrome thin.
 */

export interface ProgressStep {
  /** Short label shown under the dot on md+ screens. */
  label: string;
}

export interface OnboardingProgressProps {
  steps: ReadonlyArray<ProgressStep>;
  /** 0-indexed. Steps with index < current are "done"; ===, "current"; >, "upcoming". */
  current: number;
}

export function OnboardingProgress({ steps, current }: OnboardingProgressProps) {
  return (
    <ol
      className="flex w-full items-center justify-between gap-2"
      aria-label="Onboarding progress"
    >
      {steps.map((step, i) => {
        const state: 'done' | 'current' | 'upcoming' =
          i < current ? 'done' : i === current ? 'current' : 'upcoming';
        const isLast = i === steps.length - 1;
        return (
          <li key={step.label} className="flex flex-1 items-center gap-2">
            <StepDot index={i} state={state} label={step.label} />
            {!isLast && <StepConnector state={state} />}
          </li>
        );
      })}
    </ol>
  );
}

function StepDot({
  index,
  state,
  label,
}: {
  index: number;
  state: 'done' | 'current' | 'upcoming';
  label: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <span
        aria-current={state === 'current' ? 'step' : undefined}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-extrabold transition-colors duration-fast',
          state === 'done' && 'border-lime bg-lime text-dark-surface',
          state === 'current' && 'border-lime bg-dark-surface text-lime',
          state === 'upcoming' && 'border-dark-border bg-dark-surface text-dark-t3',
        )}
      >
        {state === 'done' ? (
          <IconCheck className="h-4 w-4" aria-label={`${label} complete`} />
        ) : (
          <span>{index + 1}</span>
        )}
      </span>
      <span
        className={cn(
          'hidden text-xs font-semibold uppercase tracking-wide md:block',
          state === 'done' && 'text-dark-t1',
          state === 'current' && 'text-lime',
          state === 'upcoming' && 'text-dark-t3',
        )}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ state }: { state: 'done' | 'current' | 'upcoming' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'h-0.5 flex-1 rounded transition-colors duration-fast',
        state === 'done' ? 'bg-lime' : 'bg-dark-border',
      )}
    />
  );
}
