import { Link } from 'react-router-dom';

export function LoginPlaceholder() {
  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight">Karibu — sign in</h2>
      <p className="mt-1 text-base text-dark-t2">
        Real login form ships in Phase 1.8.
      </p>
      <p className="mt-6 text-base text-dark-t2">
        New here?{' '}
        <Link to="/register" className="font-semibold text-lime hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
