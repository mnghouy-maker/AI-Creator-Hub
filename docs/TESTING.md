# Testing (Phase 10)

The test strategy is deliberately **risk-weighted**: the most coverage goes to
the code where a bug costs money or breaks trust — the credit ledger, the cost
model, crypto, and billing mapping — not to chasing a coverage percentage.

**34 tests, all green**, run in ~1s: 8 ledger integration tests against a real
Postgres plus 26 pure unit tests.

## Runner

**Vitest**, one config at the repo root (`vitest.config.ts`), `pnpm test` →
`vitest run`. Chosen over Jest for speed and zero-config TS/ESM handling. Test
files live next to the code they cover (`*.test.ts`) and are excluded from the
production `tsc` build.

## What's covered

| Suite                           | File                                          | Why it matters                                                                                             |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Credit ledger (integration)** | `packages/db/src/credits.integration.test.ts` | The highest-risk code. Runs against a **real Postgres** with the same Serializable transactions that ship. |
| **Cost model**                  | `packages/shared/src/credits.test.ts`         | Money math: partial minutes round **up**, per-generation/per-image rules.                                  |
| **Plans**                       | `packages/shared/src/plans.test.ts`           | Price/credit ordering, advertised prices, upgrade direction.                                               |
| **Crypto**                      | `apps/api/.../crypto.util.test.ts`            | Password verify/reject, salting, AES-GCM round-trip + **tamper rejection**, token/hash properties.         |
| **Stripe mapping**              | `apps/api/.../stripe.service.test.ts`         | Plan↔price round-trip the webhook relies on.                                                               |
| **Mock providers**              | `packages/providers/src/mock.test.ts`         | The deterministic backbone that keeps the pipeline runnable.                                               |

## The ledger tests (the important ones)

They assert the invariants the business depends on, against a live database:

- Grant increases balance; a **hold reduces _available_ but not settled
  balance** (holds aren't ledger entries).
- A hold that exceeds available credits is **rejected** (`InsufficientCreditsError`)
  and **no hold row is created** — you can't overspend.
- **Capture charges the FINAL cost, not the reserved estimate** (reserve 300,
  capture 250 → balance drops by 250) — the estimate-vs-final settlement.
- **Capture is idempotent**: a double settle does not double-charge.
- **Release** returns reserved credits with no charge.
- Settle-by-`jobId` (the worker path) writes the correct signed `DEBIT`.

## Running

```bash
pnpm test                       # unit tests; ledger suite self-skips without a DB
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/testdb pnpm test   # + ledger
```

The integration suite **self-skips** when `TEST_DATABASE_URL` is unset, so
`pnpm test` is always green locally; **CI provides a throwaway Postgres service**
(and runs `prisma db push` first), so the ledger tests run on every push.

## What's intentionally not unit-tested

- Nest controllers/guards end-to-end (would need a booted app + DB) — the pure
  logic they call is tested directly instead; a small e2e layer is the natural
  next addition.
- The mock providers stand in for real vendors, so provider-integration tests
  come with the real adapters.

## CI gate

`.github/workflows/ci.yml` runs, on every push: format → typecheck → lint →
build → **db push + test**. Nothing merges that doesn't compile, lint, build, and
pass the suite — the concrete backing for "production-ready".
