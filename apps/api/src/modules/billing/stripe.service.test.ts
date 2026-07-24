/**
 * StripeService price mapping. No Nest, no network — we hand it a fake config and
 * check the plan↔price map round-trips both ways (the piece the webhook relies on
 * to turn a Stripe price id back into our plan).
 */
import { describe, it, expect } from 'vitest';
import { StripeService } from './stripe.service';

// Minimal ConfigService stand-in.
function fakeConfig(values: Record<string, string | undefined>) {
  return { get: (k: string) => values[k] } as never;
}

describe('StripeService price mapping', () => {
  const svc = new StripeService(
    fakeConfig({
      // No STRIPE_SECRET_KEY → not configured, but mapping still works from env.
      STRIPE_PRICE_PRO_MONTHLY: 'price_pro_m',
      STRIPE_PRICE_PRO_YEARLY: 'price_pro_y',
      STRIPE_PRICE_BUSINESS_MONTHLY: 'price_biz_m',
    }),
  );

  it('reports not configured without a secret key', () => {
    expect(svc.isConfigured()).toBe(false);
  });

  it('resolves plan+interval → price id', () => {
    expect(svc.priceIdFor('pro', 'monthly')).toBe('price_pro_m');
    expect(svc.priceIdFor('pro', 'yearly')).toBe('price_pro_y');
    expect(svc.priceIdFor('business', 'monthly')).toBe('price_biz_m');
  });

  it('returns null for an unmapped plan/interval', () => {
    expect(svc.priceIdFor('business', 'yearly')).toBeNull();
    expect(svc.priceIdFor('free', 'monthly')).toBeNull();
  });

  it('reverse-maps a price id → plan+interval (webhook path)', () => {
    expect(svc.planForPriceId('price_pro_m')).toEqual({ plan: 'pro', interval: 'monthly' });
    expect(svc.planForPriceId('price_pro_y')).toEqual({ plan: 'pro', interval: 'yearly' });
    expect(svc.planForPriceId('price_unknown')).toBeNull();
  });
});
