import { z } from 'zod';

/**
 * Zod schemas for /users/me/* request bodies.
 *
 * OnboardingSchema mirrors the frontend wizard's combined output across
 * its 4 steps (Profile + Business + Brand + Plan).
 */

export const OnboardingSchema = z.object({
  profession: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  businessName: z.string().trim().min(2).max(255),
  kraPin: z.string().trim().min(1).max(20).optional().or(z.literal('').transform(() => undefined)),
  businessAddress: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  plan: z.enum(['FREE', 'SINGLE_PROJECT', 'PRO']),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;
