/** Checkout request schema. */
import { z } from 'zod';

export const checkoutSchema = z.object({
  plan: z.enum(['pro', 'business', 'agency']),
  interval: z.enum(['monthly', 'yearly']),
});
export type CheckoutDto = z.infer<typeof checkoutSchema>;
