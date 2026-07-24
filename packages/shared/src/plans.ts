/**
 * Subscription plans + entitlements — the business model as data.
 *
 * Architecture §9: pricing and gates are configuration, not code baked into
 * features. Every feature reads entitlements from here, so we can change limits
 * or prices without editing feature logic. Stripe price IDs come from env in
 * Phase 7; the `stripePriceEnv` keys name which env var holds each ID.
 */

export type PlanId = 'free' | 'pro' | 'business' | 'agency';
export type BillingInterval = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  name: string;
  /** Marketing one-liner. */
  tagline: string;
  /** USD per month (yearly shows the effective monthly rate). */
  priceMonthly: number;
  priceYearlyPerMonth: number;
  /** Credits granted on each monthly renewal (annual = 12x up front). */
  monthlyCredits: number;
  /** Names of the env vars holding the Stripe price IDs (filled in Phase 7). */
  stripePriceEnv: { monthly: string; yearly: string } | null;
  entitlements: {
    /** null = all supported languages. */
    maxLanguages: number | null;
    premiumVoices: boolean;
    watermark: boolean;
    maxExportResolution: '720p' | '1080p' | '4k';
    /** Concurrent AI jobs allowed at once (queue fairness). */
    maxConcurrentJobs: number;
    /** Higher = processed sooner in the shared queue. */
    queuePriority: number;
    teamSeats: number;
    apiAccess: boolean;
    whiteLabel: boolean;
  };
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Try every tool and ship your first videos.',
    priceMonthly: 0,
    priceYearlyPerMonth: 0,
    monthlyCredits: 100,
    stripePriceEnv: null,
    entitlements: {
      maxLanguages: 3,
      premiumVoices: false,
      watermark: true,
      maxExportResolution: '720p',
      maxConcurrentJobs: 1,
      queuePriority: 1,
      teamSeats: 1,
      apiAccess: false,
      whiteLabel: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For creators publishing every week.',
    priceMonthly: 20,
    priceYearlyPerMonth: 16,
    monthlyCredits: 2000,
    stripePriceEnv: { monthly: 'STRIPE_PRICE_PRO_MONTHLY', yearly: 'STRIPE_PRICE_PRO_YEARLY' },
    entitlements: {
      maxLanguages: null,
      premiumVoices: true,
      watermark: false,
      maxExportResolution: '1080p',
      maxConcurrentJobs: 3,
      queuePriority: 5,
      teamSeats: 1,
      apiAccess: false,
      whiteLabel: false,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    tagline: 'For teams and busy brands.',
    priceMonthly: 49,
    priceYearlyPerMonth: 39,
    monthlyCredits: 6000,
    stripePriceEnv: {
      monthly: 'STRIPE_PRICE_BUSINESS_MONTHLY',
      yearly: 'STRIPE_PRICE_BUSINESS_YEARLY',
    },
    entitlements: {
      maxLanguages: null,
      premiumVoices: true,
      watermark: false,
      maxExportResolution: '4k',
      maxConcurrentJobs: 6,
      queuePriority: 8,
      teamSeats: 3,
      apiAccess: false,
      whiteLabel: false,
    },
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    tagline: 'For studios running many clients.',
    priceMonthly: 99,
    priceYearlyPerMonth: 79,
    monthlyCredits: 15000,
    stripePriceEnv: {
      monthly: 'STRIPE_PRICE_AGENCY_MONTHLY',
      yearly: 'STRIPE_PRICE_AGENCY_YEARLY',
    },
    entitlements: {
      maxLanguages: null,
      premiumVoices: true,
      watermark: false,
      maxExportResolution: '4k',
      maxConcurrentJobs: 12,
      queuePriority: 10,
      teamSeats: 10,
      apiAccess: true,
      whiteLabel: true,
    },
  },
};

export const PLAN_ORDER: PlanId[] = ['free', 'pro', 'business', 'agency'];

/** Is `target` an upgrade relative to `current`? Used to gate upsell CTAs. */
export function isUpgrade(current: PlanId, target: PlanId): boolean {
  return PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(current);
}
