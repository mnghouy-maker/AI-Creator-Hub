/**
 * Request schemas for the auth endpoints, as Zod. These are the single
 * definition of what each endpoint accepts; the ZodValidationPipe turns any
 * violation into a clean 400. Password policy lives here so it's enforced
 * identically everywhere a password is set.
 */
import { z } from 'zod';

// Minimum viable strength: length does the heavy lifting; we avoid absurd rules
// that push users toward reuse. Tunable in one place.
const password = z.string().min(8, 'Use at least 8 characters').max(200);

export const registerSchema = z.object({
  email: z.string().email(),
  password,
  name: z.string().min(1).max(120).optional(),
  /** Optional referral code from a share link. */
  referralCode: z.string().optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: z.string().email() });
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({ token: z.string().min(1), password });
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({ token: z.string().min(1) });
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;

export const twoFactorLoginSchema = z.object({
  ticket: z.string().min(1),
  code: z.string().length(6),
});
export type TwoFactorLoginDto = z.infer<typeof twoFactorLoginSchema>;

export const twoFactorCodeSchema = z.object({ code: z.string().length(6) });
export type TwoFactorCodeDto = z.infer<typeof twoFactorCodeSchema>;
