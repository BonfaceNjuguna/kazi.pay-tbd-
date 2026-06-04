import { api, type ApiSuccess } from '@/lib/api';
import type { AuthUser } from '@/store/auth.store';

/**
 * Auth service — Axios calls for the creative-side auth surface.
 *
 * Endpoints mirror ADR-002 / ADR-004:
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/refresh         (httpOnly cookie carries refresh token)
 *   POST /api/v1/auth/logout
 *   GET  /api/v1/auth/me
 *   POST /api/v1/auth/forgot-password
 *   POST /api/v1/auth/reset-password
 *
 * All responses follow the standard envelope (see ADR-004). The service
 * unwraps `data.data` so callers receive plain payloads.
 *
 * Backed by MSW handlers in src/mocks/handlers/auth.handlers.ts until the
 * real backend lands in Phase 1.4. No code change here is required when
 * the backend ships — same URLs, same envelope.
 */

// ── Input/output types ─────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

/**
 * Sent to `POST /api/v1/users/me/onboarding` after the user fills out the
 * `/onboarding` form. Splitting it from RegisterInput keeps registration to
 * the bare minimum a user needs to provide upfront (name, email, password)
 * and defers identity-of-the-creative to its own dedicated step.
 */
export interface OnboardingInput {
  profession: string;
  city: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

// ── Service functions ─────────────────────────────────────────────────

export async function login(input: LoginInput): Promise<AuthSession> {
  const { data } = await api.post<ApiSuccess<AuthSession>>('/auth/login', input);
  return data.data;
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const { data } = await api.post<ApiSuccess<AuthSession>>('/auth/register', input);
  return data.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function refresh(): Promise<{ accessToken: string }> {
  // Refresh token is sent automatically via httpOnly cookie (withCredentials: true).
  const { data } = await api.post<ApiSuccess<{ accessToken: string }>>('/auth/refresh');
  return data.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await api.get<ApiSuccess<AuthUser>>('/auth/me');
  return data.data;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  // Always returns success regardless of whether the email exists (per ADR-002 — don't leak
  // which addresses are registered). UI shows "if an account exists, we've sent a link".
  await api.post('/auth/forgot-password', input);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await api.post('/auth/reset-password', input);
}
