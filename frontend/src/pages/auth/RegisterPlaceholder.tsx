import { Link } from 'react-router-dom';

export function RegisterPlaceholder() {
  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight">Create your account</h2>
      <p className="mt-1 text-base text-dark-t2">
        Real registration form ships in Phase 1.8.
      </p>
      <p className="mt-6 text-base text-dark-t2">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-lime hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
