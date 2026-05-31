export function DashboardPlaceholder() {
  return (
    <div>
      <h1 className="text-4xl font-extrabold tracking-tighter">Karibu 👋</h1>
      <p className="mt-1 text-base text-dark-t2">
        Real dashboard ships in Phase 1.9. This is the scaffold rendering correctly.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['Active projects', 'Awaiting deposit', 'In delivery', 'Outstanding'] as const).map(
          (label) => (
            <div
              key={label}
              className="rounded-lg border border-dark-border bg-dark-surface-raised p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-t3">{label}</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tighter">—</p>
            </div>
          ),
        )}
      </div>

      <div className="mt-10 rounded-lg border border-dashed border-dark-border bg-dark-surface-raised p-10 text-center">
        <p className="text-lg font-bold">No projects yet</p>
        <p className="mt-1 text-base text-dark-t2">
          Start your first project. kazipay generates the documents for you.
        </p>
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-lime px-5 py-2.5 text-base font-bold text-dark-surface transition-colors duration-fast hover:bg-lime-hover"
        >
          Start your first project
        </button>
      </div>
    </div>
  );
}
