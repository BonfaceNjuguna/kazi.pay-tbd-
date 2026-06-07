/**
 * OAuth service unit tests.
 *
 * The Google verifier and the users repository are mocked — these are
 * pure unit tests on the find/create/link branching, not integration
 * tests against a live DB or Google's API. End-to-end coverage of the
 * full POST /api/v1/auth/google round-trip will land alongside the
 * Phase-1 verification work (supertest + a seeded DB).
 */

import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// GOOGLE_CLIENT_ID is set in src/test/setup.ts before env.ts is imported.
// Setting it inside this file is too late — env.ts has already parsed.

// vi.hoisted runs before any vi.mock factory, so we can safely reference
// these mocks from the factories without "Cannot access before init."
const { verifyIdTokenMock, usersRepoMock, issueTokensMock } = vi.hoisted(() => ({
  verifyIdTokenMock: vi.fn(),
  usersRepoMock: {
    findByGoogleSub: vi.fn(),
    findByEmail: vi.fn(),
    updateById: vi.fn(),
    create: vi.fn(),
  },
  issueTokensMock: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  // Class so `new OAuth2Client(...)` works; arrow-fn factories aren't
  // constructable.
  OAuth2Client: class MockOAuth2Client {
    verifyIdToken = verifyIdTokenMock;
  },
}));

vi.mock('@/repositories/users.repository.js', () => usersRepoMock);

vi.mock('@/services/auth.service.js', () => ({
  issueTokens: issueTokensMock,
}));

import {
  findOrCreateGoogleUser,
  signInWithGoogle,
  verifyGoogleIdToken,
  type VerifiedGoogleClaims,
} from './oauth.service.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'alice@example.com',
    passwordHash: null,
    fullName: 'Alice Example',
    googleSub: null,
    emailVerified: false,
    profession: '',
    city: '',
    businessName: '',
    kraPin: null,
    businessAddress: null,
    country: 'Kenya',
    currency: 'KES',
    plan: 'FREE',
    onboardingComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function makeGooglePayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'google-sub-123',
    email: 'alice@example.com',
    email_verified: true,
    name: 'Alice Example',
    picture: 'https://lh3.googleusercontent.com/a/x',
    iss: 'https://accounts.google.com',
    aud: 'test-client-id.apps.googleusercontent.com',
    ...overrides,
  };
}

beforeEach(() => {
  verifyIdTokenMock.mockReset();
  usersRepoMock.findByGoogleSub.mockReset();
  usersRepoMock.findByEmail.mockReset();
  usersRepoMock.updateById.mockReset();
  usersRepoMock.create.mockReset();
  issueTokensMock.mockReset();
});

describe('verifyGoogleIdToken', () => {
  it('returns normalized claims on a valid token', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => makeGooglePayload(),
    });

    const claims = await verifyGoogleIdToken('any-id-token');

    expect(claims).toEqual<VerifiedGoogleClaims>({
      sub: 'google-sub-123',
      email: 'alice@example.com',
      emailVerified: true,
      name: 'Alice Example',
      picture: 'https://lh3.googleusercontent.com/a/x',
    });
  });

  it('lowercases the email so DB lookups are case-insensitive', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => makeGooglePayload({ email: 'Alice@Example.COM' }),
    });

    const claims = await verifyGoogleIdToken('any');
    expect(claims.email).toBe('alice@example.com');
  });

  it('rejects when google-auth-library throws (bad signature, expired, etc.)', async () => {
    verifyIdTokenMock.mockRejectedValueOnce(new Error('signature mismatch'));

    await expect(verifyGoogleIdToken('bad-token')).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_TOKEN',
      statusCode: 400,
    });
  });

  it('rejects when payload is missing sub or email', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => ({ email: 'a@b.c' }), // no sub
    });

    await expect(verifyGoogleIdToken('any')).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_TOKEN',
    });
  });

  it('rejects when audience does not match our client ID', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => makeGooglePayload({ aud: 'someone-else.apps.googleusercontent.com' }),
    });

    await expect(verifyGoogleIdToken('any')).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_TOKEN',
    });
  });

  it('rejects when issuer is not Google', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => makeGooglePayload({ iss: 'https://evil.example.com' }),
    });

    await expect(verifyGoogleIdToken('any')).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_TOKEN',
    });
  });

  it('rejects with a distinct code when Google says the email is unverified', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => makeGooglePayload({ email_verified: false }),
    });

    await expect(verifyGoogleIdToken('any')).rejects.toMatchObject({
      code: 'GOOGLE_EMAIL_UNVERIFIED',
      statusCode: 403,
    });
  });
});

describe('findOrCreateGoogleUser', () => {
  const claims: VerifiedGoogleClaims = {
    sub: 'google-sub-123',
    email: 'alice@example.com',
    emailVerified: true,
    name: 'Alice Example',
    picture: undefined,
  };

  it('returns existing user when google_sub matches (returning user)', async () => {
    const existing = makeUser({ googleSub: claims.sub });
    usersRepoMock.findByGoogleSub.mockResolvedValueOnce(existing);

    const result = await findOrCreateGoogleUser(claims);

    expect(result).toEqual({ user: existing, isNew: false });
    expect(usersRepoMock.findByEmail).not.toHaveBeenCalled();
    expect(usersRepoMock.create).not.toHaveBeenCalled();
  });

  it('auto-links to existing email when google_sub is unknown but email matches', async () => {
    const existing = makeUser({
      googleSub: null,
      emailVerified: false,
      passwordHash: 'bcrypt-hash',
    });
    usersRepoMock.findByGoogleSub.mockResolvedValueOnce(null);
    usersRepoMock.findByEmail.mockResolvedValueOnce(existing);
    usersRepoMock.updateById.mockResolvedValueOnce({
      ...existing,
      googleSub: claims.sub,
      emailVerified: true,
    });

    const result = await findOrCreateGoogleUser(claims);

    expect(usersRepoMock.updateById).toHaveBeenCalledWith(existing.id, {
      googleSub: claims.sub,
      emailVerified: true,
    });
    expect(result.isNew).toBe(false);
    expect(result.user.googleSub).toBe(claims.sub);
    expect(result.user.emailVerified).toBe(true);
    expect(usersRepoMock.create).not.toHaveBeenCalled();
  });

  it('creates a fresh user when neither sub nor email match', async () => {
    usersRepoMock.findByGoogleSub.mockResolvedValueOnce(null);
    usersRepoMock.findByEmail.mockResolvedValueOnce(null);
    usersRepoMock.create.mockResolvedValueOnce(
      makeUser({
        email: claims.email,
        fullName: claims.name,
        googleSub: claims.sub,
        emailVerified: true,
      }),
    );

    const result = await findOrCreateGoogleUser(claims);

    expect(usersRepoMock.create).toHaveBeenCalledWith({
      email: claims.email,
      fullName: claims.name,
      passwordHash: null,
      googleSub: claims.sub,
      emailVerified: true,
      onboardingComplete: false,
    });
    expect(result.isNew).toBe(true);
  });

  it('falls back to email local-part as fullName when Google gives an empty name', async () => {
    usersRepoMock.findByGoogleSub.mockResolvedValueOnce(null);
    usersRepoMock.findByEmail.mockResolvedValueOnce(null);
    usersRepoMock.create.mockResolvedValueOnce(makeUser());

    await findOrCreateGoogleUser({ ...claims, name: '' });

    expect(usersRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'alice' }),
    );
  });
});

describe('signInWithGoogle', () => {
  it('verifies, find-or-creates, and issues tokens', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      getPayload: () => makeGooglePayload(),
    });
    const user = makeUser({ googleSub: 'google-sub-123' });
    usersRepoMock.findByGoogleSub.mockResolvedValueOnce(user);
    issueTokensMock.mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      refreshExpiresAt: new Date(),
    });

    const result = await signInWithGoogle('id-token', {});

    expect(result.user).toBe(user);
    expect(result.isNew).toBe(false);
    expect(result.tokens.accessToken).toBe('access');
    expect(issueTokensMock).toHaveBeenCalledWith(user, {});
  });
});
