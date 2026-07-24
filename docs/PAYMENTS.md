# Payments (Phase 7)

Billing is built the way money should be: **fail-closed and idempotent**. Stripe
is the system of record; our database is a projection updated only by verified
webhooks (Architecture §5.3). The whole workspace typechecks, lints, and builds
(6/6); the app boots with or without Stripe keys (routes 503 when it isn't
configured).

## The money flow

```
User clicks Upgrade
  → POST /billing/checkout  → Stripe Checkout (hosted)   → user pays
  → Stripe fires webhooks   → POST /billing/webhook (signature-verified)
      customer.subscription.*  → project plan/status into our Subscription row
      invoice.paid             → record Invoice + GRANT the plan's monthly credits
                                  + reward the referrer (first paid invoice)
  → user returns to /billing (Manage billing → Stripe customer portal)
```

## Why it's safe

- **Signature-verified webhooks.** The receiver is `@Public()` (Stripe has no
  session) but authenticity comes from verifying the `Stripe-Signature` header
  against the **raw request bytes** — which is why `main.ts` enables `rawBody`. A
  bad signature is a 400 and nothing runs.
- **Idempotent by construction.** Every event id is inserted into
  `WebhookEvent` **before** it's acted on. Stripe retries deliver duplicates;
  the unique-id insert fails and we skip — so a renewal **never double-grants
  credits**, no matter how many times an event arrives.
- **Credits arrive as ledger grants.** `invoice.paid` calls `grantCredits()` (a
  `GRANT` ledger entry), the same append-only mechanism used everywhere else.
- **Stripe is the source of truth.** We never guess subscription state; we mirror
  what Stripe tells us. Upgrade/downgrade/cancel all flow through the customer
  portal and come back as `customer.subscription.updated`.

## Plan ↔ price mapping

`@hub/shared` names the env var that holds each plan's Stripe price id
(`STRIPE_PRICE_PRO_MONTHLY`, …). `StripeService` builds the map both ways:
plan+interval → price id (for checkout) and price id → plan (for webhooks). So
adding or repricing a plan is config, not code.

## Coupons, invoices, referrals

- **Coupons:** checkout enables `allow_promotion_codes`, so Stripe-managed promo
  codes work at the checkout page; the `Coupon` model is available for
  app-managed codes if we want them later.
- **Invoices:** mirrored into the `Invoice` table on `invoice.paid`, with the
  Stripe-hosted PDF link, and listed on the billing page.
- **Referrals:** the `Referral` row created at signup (PENDING) is marked
  REWARDED on the referred user's **first** paid invoice, granting the referrer
  bonus credits — once, thanks to webhook idempotency.

## Endpoints

```
GET  /api/billing/subscription     POST /api/billing/checkout
POST /api/billing/portal           GET  /api/billing/invoices
POST /api/billing/webhook          (public, signature-verified, raw body)
```

## Frontend

`/billing` shows the current plan + credits, a monthly/yearly plan chooser that
launches Stripe Checkout, a **Manage billing** button (Stripe portal for
upgrade/downgrade/cancel/refunds), and the invoice list. It reads live
subscription state with a graceful "Free" fallback for preview, and surfaces a
clear notice when billing isn't configured.

## PayPal (secondary)

The brief lists PayPal as a secondary option. Stripe is implemented in full;
PayPal is intentionally **deferred behind a feature flag** (`paypal_checkout`,
already seeded off) rather than half-built. When enabled it slots in as a second
checkout provider writing the same `Subscription`/`Invoice` projection through
the same idempotent `WebhookEvent` guard (`provider: "paypal"`). Keeping it
flagged-off avoids shipping an untested payment path.

## Honest status

- Verified by typecheck/lint/build; a real charge requires Stripe test keys +
  Postgres (bring up `pnpm infra:up`, set the `STRIPE_*` env, and use the Stripe
  CLI to forward webhooks).
- Refunds are handled through the Stripe customer portal / dashboard; the
  `PaymentStatus.REFUNDED` state exists for mirroring refund events when we
  choose to surface them in-app.
