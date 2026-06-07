/**
 * Perxli wordmark logo — the lime circular mark + 'perxli.' wordmark.
 *
 * The SVG lives in `frontend/public/perxli_logo.svg` (served verbatim
 * at the root URL by Vite) and is mirrored at the repo root for the
 * static coming-soon deploy. Both copies must stay in sync — when the
 * brand changes, update both files. (Vite serves `public/` assets as
 * string URLs, not bundled imports, hence the literal path.)
 *
 * The wordmark is rendered in white, so the component is intended for
 * dark surfaces only. A light-mode variant will live next to this file
 * once the client-facing screens grow a real brand surface.
 */

const LOGO_URL = '/perxli_logo.svg';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<LogoSize, string> = {
  sm: 'h-6',   // 24px — for compact nav rows
  md: 'h-8',   // 32px — default; matches text-lg wordmark it replaces
  lg: 'h-9',   // 36px — header / onboarding hero
  xl: 'h-12',  // 48px — auth screens, marketing hero
};

export interface LogoProps {
  size?: LogoSize;
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  return (
    <img
      src={LOGO_URL}
      alt="Perxli"
      // `w-auto` keeps the aspect ratio honest while the height drives
      // the visible scale via the size token above.
      className={`${SIZE_CLASS[size]} w-auto select-none ${className}`.trim()}
      draggable={false}
    />
  );
}
