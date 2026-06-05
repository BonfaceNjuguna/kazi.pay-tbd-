import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';

/**
 * Validates `req.body` against a zod schema. Throws ZodError on
 * failure — the central error handler turns that into a 400
 * VALIDATION_ERROR envelope.
 *
 * On success the parsed (and possibly transformed) value REPLACES
 * `req.body`, so handlers downstream receive the typed/coerced data
 * instead of whatever the client sent.
 */
export function validateBody<S extends ZodTypeAny>(schema: S): RequestHandler {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body) as z.infer<S>;
      next();
    } catch (err) {
      next(err);
    }
  };
}
