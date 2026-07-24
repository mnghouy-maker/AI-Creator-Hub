/**
 * Billing API for the in-app billing page: read the current subscription, start
 * a checkout, open the Stripe customer portal, and list invoices. All org-scoped
 * and behind the global auth guard. The webhook lives in its own controller
 * (raw body + public).
 */
import { Body, Controller, Get, Post } from '@nestjs/common';
import type { PlanId } from '@hub/shared';
import { PLANS } from '@hub/shared';
import { BillingService } from './billing.service.js';
import { StripeService } from './stripe.service.js';
import { OrgService } from '../../common/org/org.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe.js';
import { CurrentUser } from '../auth/decorators.js';
import type { Principal } from '../auth/auth.types.js';
import { checkoutSchema, type CheckoutDto } from './billing.dto.js';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly stripe: StripeService,
    private readonly org: OrgService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('subscription')
  async subscription(@CurrentUser() user: Principal) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    const sub = await this.prisma.client.subscription.findUnique({ where: { orgId } });
    const planId = (sub?.plan.toLowerCase() ?? 'free') as PlanId;
    return {
      plan: planId,
      status: sub?.status ?? 'ACTIVE',
      interval: sub?.interval ?? 'MONTHLY',
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      monthlyCredits: PLANS[planId].monthlyCredits,
      billingConfigured: this.stripe.isConfigured(),
    };
  }

  @Post('checkout')
  async checkout(
    @CurrentUser() user: Principal,
    @Body(new ZodValidationPipe(checkoutSchema)) dto: CheckoutDto,
  ) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return this.billing.createCheckout(orgId, dto.plan, dto.interval);
  }

  @Post('portal')
  async portal(@CurrentUser() user: Principal) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return this.billing.createPortal(orgId);
  }

  @Get('invoices')
  async invoices(@CurrentUser() user: Principal) {
    const orgId = await this.org.getDefaultOrgId(user.userId);
    return { invoices: await this.billing.listInvoices(orgId) };
  }
}
