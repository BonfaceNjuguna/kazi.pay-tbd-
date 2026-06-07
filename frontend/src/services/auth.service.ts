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
 * Sent to `POST /api/v1/users/me/onboarding` when the user clicks
 * "Finish" on the last step of the wizard. Splits into the 4 wizard
 * steps so the wizard component can track partial state cleanly.
 *
 * Splitting it from RegisterInput keeps registration to the bare
 * minimum a user needs to provide upfront (name, email, password)
 * and defers identity, brand, and plan choice to dedicated steps.
 */

import type { SubscriptionPlan } from '@/store/auth.store';

export interface ProfileStepData {
  profession: string;
  city: string;
}

export interface BusinessStepData {
  businessName: string;
}

export interface BrandStepData {
  /** Optional — KRA PIN drives eTIMS compliance (Phase 4); not required at v1. */
  kraPin?: string;
  /** Optional — appears on documents when set. */
  businessAddress?: string;
}

export interface PlanStepData {
  plan: SubscriptionPlan;
}

export type OnboardingInput = ProfileStepData &
  BusinessStepData &
  BrandStepData &
  PlanStepData;

export interface VerifyEmailInput {
  token: string;
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

/**
 * Result of a successful POST /auth/google. Shape is `AuthSession` plus an
 * `isNew` flag the caller uses to decide whether to send the user to
 * `/onboarding` (fresh JIT-provisioned account) or straight to `/` (returning
 * user or an existing email/password user we just linked Google to).
 */
export interface GoogleSignInResponse extends AuthSession {
  isNew: boolean;
}

export async function googleSignIn(idToken: string): Promise<GoogleSignInResponse> {
  const { data } = await api.post<ApiSuccess<GoogleSignInResponse>>(
    '/auth/google',
    { idToken },
  );
  return data.data;
}

/**
 * Result of a successful POST /auth/register. NO session is issued —
 * the account is created with `emailVerified: false` and the user must
 * click the link in the verification email before they can log in.
 * The frontend redirects to `/verify-email` after register, passing
 * `email` so the page can render "we sent a link to <email>".
 */
export interface RegisterResponse {
  email: string;
  message: string;
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const { data } = await api.post<ApiSuccess<RegisterResponse>>('/auth/register', input);
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

// ── Email verification ────────────────────────────────────────────────

/**
 * Verifies the user's email address. Token comes from the link in the
 * verification email (`/verify-email?token=...`). On success the user's
 * `emailVerified` flag flips to true and they can log in.
 */
export async function verifyEmail(input: VerifyEmailInput): Promise<void> {
  await api.post('/auth/verify-email', input);
}

/**
 * Sends a fresh verification email to the address. Same anti-enumeration
 * stance as forgotPassword — succeeds regardless of whether the email is
 * registered or already verified.
 */
export async function resendVerification(email: string): Promise<void> {
  await api.post('/auth/resend-verification', { email });
}
