/**
 * Thin Stripe wrapper. The client is built lazily from STRIPE_SECRET_KEY so the
 * app boots fine without billing configured; billing routes call `requireClient`
 * and return 503 if it isn't. Also builds the price↔plan map from @hub/shared +
 * env, so a Stripe price id can be resolved back to our plan on webhook events.
 */
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PLANS, PLAN_ORDER, type PlanId, type BillingInterval } from '@hub/shared';

export interface PriceInfo {
  plan: PlanId;
  interval: BillingInterval;
}

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key) : null;
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  requireClient(): Stripe {
    if (!this.stripe) throw new ServiceUnavailableException('Billing is not configured');
    return this.stripe;
  }

  /** Resolve our plan+interval → the configured Stripe price id (or null). */
  priceIdFor(plan: PlanId, interval: BillingInterval): string | null {
    const envKeys = PLANS[plan].stripePriceEnv;
    if (!envKeys) return null;
    return this.config.get<string>(envKeys[interval]) ?? null;
  }

  /** Reverse map: Stripe price id → { plan, interval } (for webhook events). */
  planForPriceId(priceId: string): PriceInfo | null {
    for (const plan of PLAN_ORDER) {
      for (const interval of ['monthly', 'yearly'] as BillingInterval[]) {
        if (this.priceIdFor(plan, interval) === priceId) return { plan, interval };
      }
    }
    return null;
  }

  /** Verify a webhook signature against the raw body (throws on mismatch). */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Webhook secret not configured');
    return this.requireClient().webhooks.constructEvent(rawBody, signature, secret);
  }
}
