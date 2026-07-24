/** Plan model invariants + the upgrade comparison used to gate upsell CTAs. */
import { describe, it, expect } from 'vitest';
import { PLANS, PLAN_ORDER, isUpgrade } from './plans';

describe('plans', () => {
  it('orders plans free → pro → business → agency by price and credits', () => {
    const prices = PLAN_ORDER.map((id) => PLANS[id].priceMonthly);
    const credits = PLAN_ORDER.map((id) => PLANS[id].monthlyCredits);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(credits).toEqual([...credits].sort((a, b) => a - b));
  });

  it('matches the advertised prices', () => {
    expect(PLANS.pro.priceMonthly).toBe(20);
    expect(PLANS.business.priceMonthly).toBe(49);
    expect(PLANS.agency.priceMonthly).toBe(99);
    expect(PLANS.free.priceMonthly).toBe(0);
  });

  it('yearly is cheaper per month than monthly for paid plans', () => {
    for (const id of ['pro', 'business', 'agency'] as const) {
      expect(PLANS[id].priceYearlyPerMonth).toBeLessThan(PLANS[id].priceMonthly);
    }
  });

  it('isUpgrade is directional', () => {
    expect(isUpgrade('free', 'pro')).toBe(true);
    expect(isUpgrade('pro', 'agency')).toBe(true);
    expect(isUpgrade('agency', 'pro')).toBe(false);
    expect(isUpgrade('pro', 'pro')).toBe(false);
  });

  it('only paid plans carry Stripe price env mappings', () => {
    expect(PLANS.free.stripePriceEnv).toBeNull();
    expect(PLANS.pro.stripePriceEnv).not.toBeNull();
  });
});
