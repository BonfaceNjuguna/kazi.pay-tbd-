import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-dark-surface px-6 py-16 text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-dark-t3">404</p>
        <h1 className="mt-2 text-5xl font-extrabold tracking-tighter">Page not found</h1>
        <p className="mt-3 text-base text-dark-t2">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center rounded-md bg-lime px-5 py-2.5 text-base font-bold text-dark-surface hover:bg-lime-hover"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
