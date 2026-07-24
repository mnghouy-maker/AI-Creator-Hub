/**
 * Stripe webhook receiver. It is:
 *   - @Public() — Stripe isn't a logged-in user; authenticity comes from the
 *     signature, not a session.
 *   - raw-body verified — we validate the Stripe-Signature header against the
 *     exact bytes (why main.ts enables rawBody). A bad/malformed signature is a
 *     400 and nothing is processed.
 * All state changes and idempotency live in BillingService.handleEvent.
 */
import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { BillingService } from './billing.service.js';
import { StripeService } from './stripe.service.js';
import { Public } from '../auth/decorators.js';

@Controller('billing')
export class WebhookController {
  constructor(
    private readonly billing: BillingService,
    private readonly stripe: StripeService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody || !signature) throw new BadRequestException('Missing signature or body');
    let event;
    try {
      event = this.stripe.constructEvent(req.rawBody, signature);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${String(err)}`);
    }
    await this.billing.handleEvent(event);
    return { received: true };
  }
}
