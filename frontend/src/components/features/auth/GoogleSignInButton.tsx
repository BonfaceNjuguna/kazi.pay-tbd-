import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';

import { useGoogleSignIn } from '@/hooks/useAuth';
import type { ApiError } from '@/lib/api';

/**
 * "Sign in with Google" — wraps Google Identity Services (GIS).
 *
 * GIS is loaded via the `<script>` tag in `index.html` (async/defer, so
 * the SPA boots without waiting). Once it's available on `window.google`,
 * we initialise the client with our VITE_GOOGLE_CLIENT_ID and render the
 * official button into a div. The callback fires with an ID token (JWT),
 * which we hand to the backend via useGoogleSignIn.
 *
 * If VITE_GOOGLE_CLIENT_ID isn't set (e.g. local dev before you wire
 * Google up), the component renders nothing — the password form stays
 * fully functional on its own.
 */

// Minimal subset of the GIS surface we use. The full SDK types are not
// bundled with TypeScript or the Google libraries — declaring just what
// we touch keeps the dependency surface tiny.
interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
    itp_support?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    },
  ) => void;
  cancel: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

export interface GoogleSignInButtonProps {
  /** "signin_with" on Login, "signup_with" on Register. Default: "continue_with". */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  /** Page surface — affects the popup heading wording. */
  context?: 'signin' | 'signup';
  /** Surface label for screen readers. */
  ariaLabel?: string;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function GoogleSignInButton({
  text = 'continue_with',
  context = 'signin',
  ariaLabel = 'Sign in with Google',
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const googleSignIn = useGoogleSignIn();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CLIENT_ID) {
      // Component renders empty in environments where Google isn't wired.
      // Password form on the same page handles auth on its own.
      return;
    }
    if (!buttonRef.current) return;

    // GIS script is async, may not be on window yet. Poll briefly until
    // it loads, then initialise + render. ~100 polls × 50ms = 5s timeout;
    // if it hasn't loaded by then, something's wrong (blocked? offline?).
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled) return;
      if (window.google?.accounts?.id) {
        const gis = window.google.accounts.id;
        gis.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (!response.credential) {
              setError('Google did not return a sign-in token. Please retry.');
              return;
            }
            setError(null);
            googleSignIn.mutate(response.credential, {
              onError: (err) => {
                if (isAxiosError<ApiError>(err) && err.response?.data) {
                  setError(err.response.data.message);
                  return;
                }
                setError('Could not complete Google sign-in. Please try again.');
              },
            });
          },
          ux_mode: 'popup',
          context,
          itp_support: true,
        });
        if (buttonRef.current) {
          gis.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'filled_black',     // matches the dark surface
            size: 'large',
            text,
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320,                 // ≈ same width as our Input + Button
          });
        }
        return;
      }
      if (attempts++ < 100) {
        setTimeout(tick, 50);
      } else {
        setError('Google sign-in is unavailable. Try refreshing the page.');
      }
    };
    tick();

    return () => {
      cancelled = true;
      // Cancel any open prompt — defensive, GIS handles this internally too.
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* fine — script not loaded yet */
      }
    };
  }, [text, context, googleSignIn]);

  if (!CLIENT_ID) return null;

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={buttonRef}
        className="flex justify-center"
        role="button"
        aria-label={ariaLabel}
      />
      {(error || googleSignIn.isPending) && (
        <p
          role="status"
          className={
            error
              ? 'text-center text-sm font-semibold text-danger'
              : 'text-center text-sm text-dark-t2'
          }
        >
          {error ?? 'Signing in…'}
        </p>
      )}
    </div>
  );
}
