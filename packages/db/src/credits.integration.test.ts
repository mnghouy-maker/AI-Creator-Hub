/**
 * Credit-ledger integration tests — the highest-risk code in the product, run
 * against a REAL Postgres (the same Serializable transactions ship to prod).
 * Self-skips unless TEST_DATABASE_URL is set (CI provides a throwaway DB; see
 * .github/workflows/ci.yml). Verifies the hold → capture/release lifecycle and
 * that balances are derived correctly, never overspent.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  grantCredits,
  getBalance,
  getAvailableCredits,
  holdCredits,
  captureHold,
  releaseHold,
  captureHoldByJob,
  InsufficientCreditsError,
} from './index';

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;

suite('credit ledger (integration)', () => {
  // Constructed in beforeAll so a skipped suite (no TEST_DATABASE_URL) never
  // builds a client with an undefined URL.
  let prisma: PrismaClient;
  let orgId = '';

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url } } });
    const user = await prisma.user.create({
      data: { email: `ledger-${randomUUID()}@test.local` },
    });
    const org = await prisma.organization.create({
      data: { name: 'Ledger Test', slug: `ledger-${randomUUID()}`, ownerId: user.id },
    });
    orgId = org.id;
  });

  afterAll(async () => {
    // Cascades delete holds + ledger entries for this org.
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  it('starts at zero balance', async () => {
    expect(await getBalance(prisma, orgId)).toBe(0);
    expect(await getAvailableCredits(prisma, orgId)).toBe(0);
  });

  it('grant increases balance and available', async () => {
    await grantCredits(prisma, orgId, 1000, 'test grant');
    expect(await getBalance(prisma, orgId)).toBe(1000);
    expect(await getAvailableCredits(prisma, orgId)).toBe(1000);
  });

  it('hold reduces available but not settled balance', async () => {
    const { holdId } = await holdCredits(prisma, orgId, 300);
    expect(await getBalance(prisma, orgId)).toBe(1000); // ledger unchanged
    expect(await getAvailableCredits(prisma, orgId)).toBe(700); // minus active hold
    // Cleanup for later tests.
    await releaseHold(prisma, holdId);
    expect(await getAvailableCredits(prisma, orgId)).toBe(1000);
  });

  it('rejects a hold that exceeds available credits', async () => {
    await expect(holdCredits(prisma, orgId, 999_999)).rejects.toBeInstanceOf(
      InsufficientCreditsError,
    );
    // A rejected hold must not have been created.
    const active = await prisma.creditHold.count({ where: { orgId, status: 'ACTIVE' } });
    expect(active).toBe(0);
  });

  it('capture writes a DEBIT for the FINAL cost (estimate ≠ final)', async () => {
    const { holdId } = await holdCredits(prisma, orgId, 300); // reserve 300
    await captureHold(prisma, holdId, 250, { description: 'final 250' }); // charge 250
    expect(await getBalance(prisma, orgId)).toBe(750); // 1000 − 250
    expect(await getAvailableCredits(prisma, orgId)).toBe(750); // hold closed
    const hold = await prisma.creditHold.findUnique({ where: { id: holdId } });
    expect(hold?.status).toBe('CAPTURED');
  });

  it('capture is idempotent (double settle does not double charge)', async () => {
    const { holdId } = await holdCredits(prisma, orgId, 100);
    await captureHold(prisma, holdId, 100);
    await captureHold(prisma, holdId, 100); // second call is a no-op
    expect(await getBalance(prisma, orgId)).toBe(650); // 750 − 100, once
  });

  it('release returns reserved credits with no charge', async () => {
    const before = await getBalance(prisma, orgId);
    const { holdId } = await holdCredits(prisma, orgId, 200);
    await releaseHold(prisma, holdId);
    expect(await getBalance(prisma, orgId)).toBe(before); // unchanged
    expect(await getAvailableCredits(prisma, orgId)).toBe(before);
  });

  it('settles by jobId (worker path)', async () => {
    const job = await prisma.job.create({
      data: { orgId, queue: 'ai-text', action: 'script', status: 'QUEUED' },
    });
    const { holdId } = await holdCredits(prisma, orgId, 12, { jobId: job.id });
    expect(holdId).toBeTruthy();
    await captureHoldByJob(prisma, job.id, 12, 'script');
    const debit = await prisma.creditLedgerEntry.findFirst({
      where: { orgId, jobId: job.id, type: 'DEBIT' },
    });
    expect(debit?.amount).toBe(-12);
  });
});
