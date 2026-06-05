import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { isProd } from '@/config/env.js';
import { logger } from '@/lib/logger.js';
import { AppError } from '@/utils/app-error.js';
import { errorEnvelope } from '@/utils/api-response.js';

/**
 * Centralized error handler — last middleware in the chain.
 *
 *   - AppError                  → its statusCode + envelope { message, code }
 *   - ZodError                  → 400 VALIDATION_ERROR + per-field details
 *   - Anything else (unknown)   → 500 INTERNAL_ERROR + redacted stack in dev
 *
 * Stack traces NEVER appear in production responses — only in logs.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path }, 'Unhandled AppError');
    }
    res
      .status(err.statusCode)
      .json(errorEnvelope(err.message, err.code, err.details));
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors = err.flatten().fieldErrors;
    res
      .status(400)
      .json(errorEnvelope('Validation failed', 'VALIDATION_ERROR', fieldErrors));
    return;
  }

  logger.error({ err, path: req.path }, 'Unexpected error');
  res
    .status(500)
    .json(
      errorEnvelope(
        isProd ? 'Something went wrong.' : (err as Error)?.message ?? 'Unknown error',
        'INTERNAL_ERROR',
      ),
    );
};
