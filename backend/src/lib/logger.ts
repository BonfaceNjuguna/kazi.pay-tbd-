import { pino } from 'pino';

import { env, isProd } from '@/config/env.js';

/**
 * Pino logger.
 *
 * Dev: pretty-printed via pino-pretty for human readability.
 * Prod: structured JSON (one event per line) so log aggregators can
 *       parse it cleanly.
 *
 * PII redaction: keys listed in `redact` are replaced with [Redacted]
 * before serialization. Add anything sensitive that might leak into a
 * log message here — phone numbers, M-Pesa receipts, KRA PINs, tokens,
 * etc. Per AGENTS.md security rules: never log PII in plaintext.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'password',
      '*.password',
      'passwordHash',
      '*.passwordHash',
      'token',
      '*.token',
      'refreshToken',
      '*.refreshToken',
      'accessToken',
      '*.accessToken',
      'authorization',
      'req.headers.authorization',
      'req.headers.cookie',
      'kraPin',
      '*.kraPin',
      'msisdn',
      '*.msisdn',
    ],
    censor: '[Redacted]',
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
      },
});
