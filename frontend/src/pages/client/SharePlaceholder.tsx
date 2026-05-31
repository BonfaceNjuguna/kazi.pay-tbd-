import { useParams } from 'react-router-dom';

export function SharePlaceholder() {
  const { token } = useParams<{ token: string }>();

  return (
    <div>
      <div className="rounded-xl bg-light-surface-raised p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wider text-light-t3">
          Document review
        </p>
        <p className="mt-2 text-lg font-extrabold">Real client share view ships in Phase 2.7.</p>
        <p className="mt-1 text-base text-light-t2">
          Token resolved from URL: <code className="font-mono text-xs">{token}</code>
        </p>
      </div>
    </div>
  );
}
