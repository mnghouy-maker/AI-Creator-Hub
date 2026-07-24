/**
 * Billing logic. Stripe is the source of truth; our DB is a projection updated
 * by webhooks (Architecture §5.3). Everything money-related is fail-closed and
 * idempotent:
 *   - checkout/portal just create Stripe sessions.
 *   - the webhook path dedupes by event id BEFORE acting, upserts subscription
 *     state, and grants monthly credits exactly once per paid invoice.
 *   - the first successful payment rewards the referrer (referral hook).
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';
import { grantCredits } from '@hub/db';
import { PLANS, type BillingInterval, type PlanId } from '@hub/shared';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { StripeService } from './stripe.service.js';

const REFERRAL_REWARD_CREDITS = 500;

/**
 * Read the current period end across Stripe API versions: older versions expose
 * it on the subscription, newer ones on the subscription item. Cast narrowly
 * rather than pin an apiVersion so an SDK bump doesn't break the build.
 */
function currentPeriodEnd(sub: Stripe.Subscription): Date | undefined {
  const fromSub = (sub as unknown as { current_period_end?: number }).current_period_end;
  const fromItem = (sub.items.data[0] as unknown as { current_period_end?: number } | undefined)
    ?.current_period_end;
  const ts = fromSub ?? fromItem;
  return ts ? new Date(ts * 1000) : undefined;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  private appUrl() {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
  }

  // --------------------------------------------------------------------------
  // Checkout & portal
  // --------------------------------------------------------------------------
  async createCheckout(orgId: string, plan: PlanId, interval: BillingInterval) {
    if (plan === 'free') throw new BadRequestException('Free plan needs no checkout');
    const priceId = this.stripe.priceIdFor(plan, interval);
    if (!priceId) throw new BadRequestException('That plan/interval is not available');

    const customerId = await this.ensureCustomer(orgId);
    const session = await this.stripe.requireClient().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // client_reference_id + metadata let the webhook tie the session to our org.
      client_reference_id: orgId,
      subscription_data: { metadata: { orgId, plan, interval } },
      allow_promotion_codes: true, // Stripe-managed coupons
      success_url: `${this.appUrl()}/billing?status=success`,
      cancel_url: `${this.appUrl()}/billing?status=cancelled`,
    });
    return { url: session.url };
  }

  async createPortal(orgId: string) {
    const customerId = await this.ensureCustomer(orgId);
    const session = await this.stripe.requireClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.appUrl()}/billing`,
    });
    return { url: session.url };
  }

  async listInvoices(orgId: string) {
    return this.prisma.client.invoice.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        pdfUrl: true,
        createdAt: true,
      },
    });
  }

  /** Get-or-create the Stripe customer for an org, persisting the id. */
  private async ensureCustomer(orgId: string): Promise<string> {
    const sub = await this.prisma.client.subscription.findUnique({ where: { orgId } });
    if (sub?.stripeCustomerId) return sub.stripeCustomerId;

    const org = await this.prisma.client.organization.findUnique({
      where: { id: orgId },
      include: { owner: { select: { email: true, name: true } } },
    });
    const customer = await this.stripe.requireClient().customers.create({
      email: org?.owner.email,
      name: org?.owner.name ?? undefined,
      metadata: { orgId },
    });
    await this.prisma.client.subscription.upsert({
      where: { orgId },
      update: { stripeCustomerId: customer.id },
      create: { orgId, plan: 'FREE', status: 'ACTIVE', stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  // --------------------------------------------------------------------------
  // Webhook — the only writer of subscription/credit state from Stripe
  // --------------------------------------------------------------------------
  async handleEvent(event: Stripe.Event): Promise<void> {
    // Idempotency: record the event id first; a duplicate delivery is skipped.
    try {
      await this.prisma.client.webhookEvent.create({
        data: { id: event.id, provider: 'stripe', type: event.type },
      });
    } catch {
      this.logger.log(`Duplicate webhook ${event.id} ignored`);
      return;
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await this.onInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      default:
        break; // ignore the many events we don't act on
    }
  }

  /** Project Stripe subscription state into our DB. */
  private async syncSubscription(sub: Stripe.Subscription) {
    const orgId = sub.metadata?.orgId;
    if (!orgId) return;
    const priceId = sub.items.data[0]?.price.id;
    const mapped = priceId ? this.stripe.planForPriceId(priceId) : null;

    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      incomplete: 'INCOMPLETE',
    };
    const canceled = sub.status === 'canceled';

    await this.prisma.client.subscription.upsert({
      where: { orgId },
      update: {
        plan: canceled ? 'FREE' : ((mapped?.plan.toUpperCase() as never) ?? undefined),
        status: (statusMap[sub.status] ?? 'ACTIVE') as never,
        interval: (mapped?.interval?.toUpperCase() as never) ?? undefined,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: currentPeriodEnd(sub),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
      create: {
        orgId,
        plan: (mapped?.plan.toUpperCase() as never) ?? 'FREE',
        status: (statusMap[sub.status] ?? 'ACTIVE') as never,
        stripeSubscriptionId: sub.id,
      },
    });
  }

  /** On a paid invoice: record it, grant the plan's monthly credits, reward referral. */
  private async onInvoicePaid(invoice: Stripe.Invoice) {
    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    const sub = await this.prisma.client.subscription.findFirst({
      where: { stripeCustomerId: customerId },
      include: { org: { include: { owner: true } } },
    });
    if (!sub) return;

    await this.prisma.client.invoice.create({
      data: {
        orgId: sub.orgId,
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_paid,
        currency: invoice.currency,
        status: 'PAID',
        pdfUrl: invoice.invoice_pdf ?? null,
      },
    });

    // Grant this plan's monthly credit allowance (deduped by the webhook event id).
    const planId = sub.plan.toLowerCase() as PlanId;
    const monthlyCredits = PLANS[planId]?.monthlyCredits ?? 0;
    if (monthlyCredits > 0) {
      await grantCredits(
        this.prisma.client,
        sub.orgId,
        monthlyCredits,
        `${sub.plan} monthly credits`,
      );
    }

    await this.maybeRewardReferral(sub.org.ownerId);
  }

  /** First paid invoice for a referred user → reward the referrer once. */
  private async maybeRewardReferral(referredUserId: string) {
    const referral = await this.prisma.client.referral.findFirst({
      where: { referredId: referredUserId, status: 'PENDING' },
    });
    if (!referral) return;

    const referrerOrg = await this.prisma.client.organization.findFirst({
      where: { ownerId: referral.referrerId, isPersonal: true },
      select: { id: true },
    });
    if (referrerOrg) {
      await grantCredits(
        this.prisma.client,
        referrerOrg.id,
        REFERRAL_REWARD_CREDITS,
        'Referral reward',
      );
    }
    await this.prisma.client.referral.update({
      where: { id: referral.id },
      data: { status: 'REWARDED', rewardCredits: REFERRAL_REWARD_CREDITS },
    });
  }
}
