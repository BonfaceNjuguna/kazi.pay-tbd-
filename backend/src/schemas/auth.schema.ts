import { z } from 'zod';

/**
 * Zod schemas for /auth/* request bodies. The validateBody middleware
 * parses against these before controllers run, so handlers receive
 * already-typed, already-trimmed data.
 *
 * Matches the frontend's `auth.service.ts` payload shapes 1:1.
 */

export const RegisterSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(8).max(200),
  fullName: z.string().trim().min(2).max(255),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1).max(200),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

export const ResendVerificationSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
});
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// Google ID tokens are JWTs — three base64url segments separated by dots,
// typically ~900-1500 bytes. The cap is generous so we don't reject
// future Google payload growth, but tight enough that a request body
// can't smuggle a megabyte through this field.
export const GoogleSignInSchema = z.object({
  idToken: z.string().min(20).max(4096),
});
export type GoogleSignInInput = z.infer<typeof GoogleSignInSchema>;
