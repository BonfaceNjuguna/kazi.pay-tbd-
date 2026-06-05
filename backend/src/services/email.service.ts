import { logger } from '@/lib/logger.js';

/**
 * Email sender. Phase 1 stub — logs the message instead of sending it,
 * so devs/testers can grab the verification + reset links from console
 * output without standing up SendGrid/SES.
 *
 * Phase 3 swaps this for a real provider (SendGrid or AWS SES per
 * docs/deployment/environment-variables.md). The interface stays the
 * same; only the implementation changes.
 */

const FRONTEND_BASE = process.env.FRONTEND_URL ?? 'http://localhost:5173';

export function sendVerificationEmail(args: { to: string; token: string }) {
  const link = `${FRONTEND_BASE}/verify-email?token=${args.token}`;
  logger.warn(
    { to: args.to, link },
    `[EmailService:stub] Verification email for ${args.to}. Visit: ${link}`,
  );
  return Promise.resolve();
}

export function sendPasswordResetEmail(args: { to: string; token: string }) {
  const link = `${FRONTEND_BASE}/reset-password?token=${args.token}`;
  logger.warn(
    { to: args.to, link },
    `[EmailService:stub] Password-reset email for ${args.to}. Visit: ${link}`,
  );
  return Promise.resolve();
}
