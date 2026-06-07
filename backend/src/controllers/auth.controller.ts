import type { RequestHandler } from 'express';

import * as authService from '@/services/auth.service.js';
import * as oauthService from '@/services/oauth.service.js';
import * as usersRepo from '@/repositories/users.repository.js';
import { success } from '@/utils/api-response.js';
import { Unauthorized } from '@/utils/app-error.js';

import type {
  ForgotPasswordInput,
  GoogleSignInInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from '@/schemas/auth.schema.js';

/**
 * Auth controllers — thin wrappers around services. The only logic here
 * is HTTP plumbing: extract request meta, set/clear cookies, format the
 * response envelope. Anything more belongs in the service.
 */

export const register: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as RegisterInput;
    const result = await authService.register(body);
    // 202 Accepted — the account exists but isn't usable until verified.
    res.status(202).json(success(result));
  } catch (err) {
    next(err);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as LoginInput;
    const meta = authService.extractRequestMeta(req);
    const { user, tokens } = await authService.login({ ...body, meta });

    res.cookie(
      authService.REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      authService.refreshCookieOptions(tokens.refreshExpiresAt),
    );

    res.json(
      success({
        user: usersRepo.toPublic(user),
        accessToken: tokens.accessToken,
      }),
    );
  } catch (err) {
    next(err);
  }
};

export const googleSignIn: RequestHandler = async (req, res, next) => {
  try {
    const { idToken } = req.body as GoogleSignInInput;
    const meta = authService.extractRequestMeta(req);
    const { user, tokens, isNew } = await oauthService.signInWithGoogle(
      idToken,
      meta,
    );

    res.cookie(
      authService.REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      authService.refreshCookieOptions(tokens.refreshExpiresAt),
    );

    // 200 for both new and returning users. `isNew` lets the frontend
    // decide whether to send the user to /onboarding or straight to /.
    res.json(
      success({
        user: usersRepo.toPublic(user),
        accessToken: tokens.accessToken,
        isNew,
      }),
    );
  } catch (err) {
    next(err);
  }
};

export const refresh: RequestHandler = async (req, res, next) => {
  try {
    const raw = req.cookies?.[authService.REFRESH_COOKIE_NAME];
    if (!raw || typeof raw !== 'string') {
      throw Unauthorized('No refresh token.', 'NO_REFRESH_TOKEN');
    }

    const meta = authService.extractRequestMeta(req);
    const { user, tokens } = await authService.refresh({
      refreshTokenRaw: raw,
      meta,
    });

    res.cookie(
      authService.REFRESH_COOKIE_NAME,
      tokens.refreshToken,
      authService.refreshCookieOptions(tokens.refreshExpiresAt),
    );

    res.json(success({ accessToken: tokens.accessToken, user: usersRepo.toPublic(user) }));
  } catch (err) {
    // Always clear the cookie on refresh failure so the browser stops
    // sending the (now-revoked) token on subsequent requests.
    res.clearCookie(
      authService.REFRESH_COOKIE_NAME,
      authService.refreshCookieOptions(),
    );
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const raw = req.cookies?.[authService.REFRESH_COOKIE_NAME];
    await authService.logout(typeof raw === 'string' ? raw : undefined);
    res.clearCookie(
      authService.REFRESH_COOKIE_NAME,
      authService.refreshCookieOptions(),
    );
    res.json(success({ loggedOut: true }));
  } catch (err) {
    next(err);
  }
};

export const verifyEmail: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as VerifyEmailInput;
    await authService.verifyEmail(body.token);
    res.json(success({ verified: true }));
  } catch (err) {
    next(err);
  }
};

export const resendVerification: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as ResendVerificationInput;
    await authService.resendVerification(body.email);
    // Always 200 — no-enumeration.
    res.json(success({ sent: true }));
  } catch (err) {
    next(err);
  }
};

export const forgotPassword: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as ForgotPasswordInput;
    await authService.forgotPassword(body.email);
    res.json(success({ sent: true }));
  } catch (err) {
    next(err);
  }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as ResetPasswordInput;
    await authService.resetPassword(body);
    res.json(success({ reset: true }));
  } catch (err) {
    next(err);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw Unauthorized();
    const user = await usersRepo.findById(req.user.sub);
    if (!user) throw Unauthorized('Account no longer exists.', 'NOT_FOUND');
    res.json(success(usersRepo.toPublic(user)));
  } catch (err) {
    next(err);
  }
};
