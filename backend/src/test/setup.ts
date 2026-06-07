/**
 * Vitest setup — runs once before any test file. Sets the minimum env
 * vars needed for `src/config/env.ts` to validate, so unit tests can
 * import modules that depend on it (jwt, prisma, etc.) without
 * blowing up.
 *
 * Integration tests against a real DB would set a real DATABASE_URL
 * pointing at a test schema. For pure-function unit tests, any
 * syntactically-valid URL is fine.
 */
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??=
  'postgresql://test:test@localhost:5432/perxli_test?schema=public';
process.env.LOG_LEVEL ??= 'fatal'; // silence pino during tests
// OAuth tests need a non-empty client ID so getClient() doesn't throw
// GOOGLE_DISABLED — env.ts parses process.env once at import, before any
// test file's body can set it. Any syntactically-valid value works; the
// verifier itself is mocked.
process.env.GOOGLE_CLIENT_ID ??= 'test-client-id.apps.googleusercontent.com';
