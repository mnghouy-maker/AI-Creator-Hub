/** Payments feature: Stripe checkout/portal, invoices, and the webhook that
 *  projects subscription + credit state into our DB. */
import { Module } from '@nestjs/common';
import { BillingService } from './billing.service.js';
import { StripeService } from './stripe.service.js';
import { BillingController } from './billing.controller.js';
import { WebhookController } from './webhook.controller.js';

@Module({
  providers: [BillingService, StripeService],
  controllers: [BillingController, WebhookController],
})
export class BillingModule {}
