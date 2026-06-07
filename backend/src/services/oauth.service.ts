import type { User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';

import { env } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import * as usersRepo from '@/repositories/users.repository.js';
import {
  BadRequest,
  Forbidden,
  AppError,
} from '@/utils/app-error.js';

import { issueTokens, type AuthSessionTokens, type RequestMeta } from './auth.service.js';

/**
 * Google OAuth — ID-token verification + just-in-time user provisioning.
 *
 * Flow (driven from the controller):
 *   1. Frontend obtains a Google ID token from GIS popup
 *   2. POST /api/v1/auth/google { idToken } hits the controller
 *   3. Controller calls signInWithGoogle(idToken, meta)
 *   4. We verify the ID token signature against Google's public JWKs and
 *      check the audience matches our GOOGLE_CLIENT_ID
 *   5. Find user by google_sub (preferred — stable, immutable) or by email
 *      (auto-link path; safe because Google guarantees email_verified=true)
 *   6. Create a fresh user if neither matches
 *   7. Issue our own access + refresh tokens just like a password login
 *
 * The Google ID token is verified, used to identify the human, then
 * discarded. We never store it. The cookie + access token returned are
 * ours, not Google's — so the rest of the auth surface (refresh rotation,
 * stolen-token detection, logout) just works without a Google round-trip.
 */

// Single client per process — google-auth-library caches Google's JWKs
// internally, so reusing the instance avoids re-fetching them per request.
let _client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(
      'Google sign-in is not configured on this server.',
      503,
      'GOOGLE_DISABLED',
    );
  }
  if (!_client) {
    _client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }
  return _client;
}

export interface VerifiedGoogleClaims {
  /** Google's opaque user ID — stable across email changes */
  sub: string;
  email: string;
  emailVerified: boolean;
  /** Display name, may be empty for some accounts */
  name: string;
  /** Profile picture URL — useful later, not stored today */
  picture?: string | undefined;
}

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<VerifiedGoogleClaims> {
  const client = getClient();

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
  } catch (err) {
    // verifyIdToken throws on invalid signature, expired token, wrong
    // audience, untrusted issuer, etc. We don't differentiate the cause
    // to the client — any of them mean "this token can't be trusted."
    logger.warn({ err }, 'Google ID token verification failed');
    throw BadRequest(
      'Google sign-in token could not be verified.',
      'INVALID_GOOGLE_TOKEN',
    );
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw BadRequest(
      'Google sign-in token was missing required claims.',
      'INVALID_GOOGLE_TOKEN',
    );
  }

  // Defence-in-depth: google-auth-library already enforces these, but
  // checking again means a future library bug can't downgrade our trust.
  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
    throw BadRequest(
      'Google sign-in token has unexpected issuer.',
      'INVALID_GOOGLE_TOKEN',
    );
  }
  if (payload.aud !== env.GOOGLE_CLIENT_ID) {
    throw BadRequest(
      'Google sign-in token was issued for a different application.',
      'INVALID_GOOGLE_TOKEN',
    );
  }
  if (payload.email_verified === false) {
    // Google occasionally returns unverified emails (legacy account states).
    // We require verification because the auto-link path treats matching
    // emails as proof of ownership — without verification, that's exploitable.
    throw Forbidden(
      'Your Google account email is not verified. Verify it with Google first.',
      'GOOGLE_EMAIL_UNVERIFIED',
    );
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: true,
    name: typeof payload.name === 'string' ? payload.name : '',
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
  };
}

/**
 * Find-or-create-or-link path. Returns the resolved user; never throws
 * on existing accounts (auto-link is the documented policy per ADR-002).
 */
export async function findOrCreateGoogleUser(
  claims: VerifiedGoogleClaims,
): Promise<{ user: User; isNew: boolean }> {
  // 1. Stable lookup by Google sub — wins even if the email changed in
  //    Google since the original signup.
  const bySub = await usersRepo.findByGoogleSub(claims.sub);
  if (bySub) return { user: bySub, isNew: false };

  // 2. Auto-link by verified email — pre-existing password user adopts
  //    Google as a second sign-in method. Google has already proven the
  //    user owns the inbox, so this is safe per ADR-002 §"OAuth linking".
  const byEmail = await usersRepo.findByEmail(claims.email);
  if (byEmail) {
    const linked = await usersRepo.updateById(byEmail.id, {
      googleSub: claims.sub,
      // If the email was unverified for the password account but Google
      // says it's verified, mark it verified — same proof either way.
      emailVerified: byEmail.emailVerified || claims.emailVerified,
    });
    logger.info(
      { userId: linked.id },
      'Linked Google account to existing user',
    );
    return { user: linked, isNew: false };
  }

  // 3. Fresh JIT provisioning — same shape as password register, just no
  //    password hash and email already verified. Onboarding wizard fills
  //    in profession / city / business name afterwards.
  const created = await usersRepo.create({
    email: claims.email,
    fullName: claims.name || claims.email.split('@')[0] || 'New user',
    passwordHash: null,
    googleSub: claims.sub,
    emailVerified: true,
    onboardingComplete: false,
  });
  logger.info({ userId: created.id }, 'Created new user via Google sign-in');
  return { user: created, isNew: true };
}

export async function signInWithGoogle(
  idToken: string,
  meta: RequestMeta,
): Promise<{ user: User; tokens: AuthSessionTokens; isNew: boolean }> {
  const claims = await verifyGoogleIdToken(idToken);
  const { user, isNew } = await findOrCreateGoogleUser(claims);
  const tokens = await issueTokens(user, meta);
  return { user, tokens, isNew };
}
