/**
 * Environment validation.
 *
 * The app FAILS FAST on boot if required config is missing or malformed, rather
 * than crashing mysteriously mid-request (Architecture §6: fail closed on
 * anything security/billing related). OAuth/Stripe keys are optional so local
 * dev works without them; the features that need them check at use-time.
 */
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Signs session JWTs and derives the encryption key for TOTP secrets.
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 chars'),

  // OAuth — optional; providers are only registered when both id+secret exist.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  EMAIL_FROM: z.string().default('hello@aicreatorhub.app'),
  SMTP_URL: z.string().optional(),

  // Payments — optional so local dev boots without billing configured. Billing
  // routes check at use-time and 503 if Stripe isn't set up.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
  STRIPE_PRICE_BUSINESS_MONTHLY: z.string().optional(),
  STRIPE_PRICE_BUSINESS_YEARLY: z.string().optional(),
  STRIPE_PRICE_AGENCY_MONTHLY: z.string().optional(),
  STRIPE_PRICE_AGENCY_YEARLY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Called once by ConfigModule.forRoot({ validate }). */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  return parsed.data;
}

/** True when both halves of an OAuth provider's credentials are present. */
export function hasGoogleOAuth(env: Env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}
export function hasGithubOAuth(env: Env) {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}
export function hasStripe(env: Pick<Env, 'STRIPE_SECRET_KEY'>) {
  return Boolean(env.STRIPE_SECRET_KEY);
}
