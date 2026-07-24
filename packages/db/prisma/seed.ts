/**
 * Database seed.
 *
 * Purpose beyond convenience: it encodes the two invariants the app relies on,
 * so they're demonstrated in one readable place —
 *   1. Every user gets a PERSONAL organization + a FREE subscription on signup.
 *   2. Credits arrive as GRANT ledger entries (never a mutable balance column);
 *      the balance is always SUM(amount).
 *
 * Run with: `pnpm --filter @hub/db exec tsx prisma/seed.ts`
 * (Requires the local Postgres from `pnpm infra:up`.)
 */
import { PrismaClient } from '@prisma/client';
// Plan config is the single source of truth for credit grants (@hub/shared).
import { PLANS } from '@hub/shared';

const prisma = new PrismaClient();

async function main() {
  // --- Feature flags backing the admin panel toggles ---
  const flags = [
    { key: 'video_translator', description: 'AI Video Translator', enabled: true },
    { key: 'voice_cloning', description: 'Voice cloning (future)', enabled: false },
    { key: 'paypal_checkout', description: 'PayPal as a checkout option', enabled: false },
  ];
  for (const f of flags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: { description: f.description },
      create: { ...f, rolloutPercent: f.enabled ? 100 : 0 },
    });
  }

  // --- A demo user, provisioned exactly how signup will provision (Phase 4) ---
  const user = await prisma.user.upsert({
    where: { email: 'demo@aicreatorhub.app' },
    update: {},
    create: {
      email: 'demo@aicreatorhub.app',
      name: 'Demo Creator',
      emailVerified: new Date(),
    },
  });

  // Personal org — so a solo user never sees "teams".
  const org = await prisma.organization.upsert({
    where: { slug: `personal-${user.id}` },
    update: {},
    create: {
      name: 'Demo Creator',
      slug: `personal-${user.id}`,
      isPersonal: true,
      ownerId: user.id,
      members: { create: { userId: user.id, role: 'OWNER' } },
      subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
    },
  });

  // Initial credit grant = the FREE plan's monthly allowance, as a ledger entry.
  const existingGrant = await prisma.creditLedgerEntry.findFirst({
    where: { orgId: org.id, type: 'GRANT' },
  });
  if (!existingGrant) {
    await prisma.creditLedgerEntry.create({
      data: {
        orgId: org.id,
        type: 'GRANT',
        amount: PLANS.free.monthlyCredits,
        description: 'Welcome grant (Free plan)',
      },
    });
  }

  // Balance is always derived, never stored.
  const { _sum } = await prisma.creditLedgerEntry.aggregate({
    where: { orgId: org.id },
    _sum: { amount: true },
  });
  // eslint-disable-next-line no-console
  console.log(`Seeded org ${org.slug} with balance = ${_sum.amount ?? 0} credits`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
