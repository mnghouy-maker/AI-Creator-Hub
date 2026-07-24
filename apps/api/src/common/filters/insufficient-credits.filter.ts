/**
 * Maps the domain InsufficientCreditsError to HTTP 402 Payment Required, with
 * the amounts in the body so the frontend can show a precise upsell ("You need
 * 180 credits, you have 40 — upgrade to Pro"). Keeping this mapping in a filter
 * means feature code just throws the domain error and never thinks about HTTP.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { InsufficientCreditsError } from '@hub/db';

@Catch(InsufficientCreditsError)
export class InsufficientCreditsFilter implements ExceptionFilter {
  catch(exception: InsufficientCreditsError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(HttpStatus.PAYMENT_REQUIRED).json({
      statusCode: HttpStatus.PAYMENT_REQUIRED,
      error: 'InsufficientCredits',
      message: exception.message,
      required: exception.required,
      available: exception.available,
    });
  }
}
