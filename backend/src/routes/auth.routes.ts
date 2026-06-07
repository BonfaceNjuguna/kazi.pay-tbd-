import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '@/config/env.js';
import * as auth from '@/controllers/auth.controller.js';
import { requireUser } from '@/middleware/require-user.js';
import { validateBody } from '@/middleware/validate.js';
import {
  ForgotPasswordSchema,
  GoogleSignInSchema,
  LoginSchema,
  RegisterSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from '@/schemas/auth.schema.js';

/**
 * /api/v1/auth/* routes.
 *
 * Rate-limited on the abuse-prone endpoints (login, register, the email
 * + password flows). The numbers come from env so they can be tightened
 * in prod without a code change.
 */

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many attempts — please wait a few minutes.',
    code: 'RATE_LIMITED',
  },
});

export const authRouter: Router = Router();

authRouter.post(
  '/register',
  authLimiter,
  validateBody(RegisterSchema),
  auth.register,
);
authRouter.post('/login', authLimiter, validateBody(LoginSchema), auth.login);
authRouter.post(
  '/google',
  authLimiter,
  validateBody(GoogleSignInSchema),
  auth.googleSignIn,
);
authRouter.post('/logout', auth.logout);
authRouter.post('/refresh', auth.refresh);

authRouter.post(
  '/verify-email',
  authLimiter,
  validateBody(VerifyEmailSchema),
  auth.verifyEmail,
);
authRouter.post(
  '/resend-verification',
  authLimiter,
  validateBody(ResendVerificationSchema),
  auth.resendVerification,
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validateBody(ForgotPasswordSchema),
  auth.forgotPassword,
);
authRouter.post(
  '/reset-password',
  authLimiter,
  validateBody(ResetPasswordSchema),
  auth.resetPassword,
);

authRouter.get('/me', authLimiter, requireUser, auth.me);
