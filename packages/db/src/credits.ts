/**
 * Credit ledger primitives — the ONE piece of business logic shared verbatim by
 * the API (which reserves credits) and the worker (which settles them). Living
 * in @hub/db keeps it next to the tables it operates on, and lets both apps call
 * the exact same code so a hold can never be captured two different ways.
 *
 * Model (Architecture §5.1, docs/DATA_MODEL.md):
 *   balance          = SUM(CreditLedgerEntry.amount)          (append-only)
 *   availableBalance = balance − SUM(active CreditHold.amount)
 *   hold → capture   writes a DEBIT entry (final cost) and closes the hold
 *   hold → release   closes the hold with no charge (failure/refund path)
 *
 * All mutations run in Serializable transactions so two concurrent jobs can't
 * both "see" the same credits and overspend.
 */
import { PrismaClient, Prisma } from '@prisma/client';

/** Thrown when an org lacks the available credits for a requested hold. */
export class InsufficientCreditsError extends Error {
  constructor(
    public required: number,
    public available: number,
  ) {
    super(`Insufficient credits: need ${required}, have ${available}`);
    this.name = 'InsufficientCreditsError';
  }
}

type Db = PrismaClient | Prisma.TransactionClient;

/** Settled balance for an org (sum of all ledger entries). */
export async function getBalance(db: Db, orgId: string): Promise<number> {
  const { _sum } = await db.creditLedgerEntry.aggregate({
    where: { orgId },
    _sum: { amount: true },
  });
  return _sum.amount ?? 0;
}

/** Sum of credits currently reserved by in-flight jobs. */
export async function getActiveHoldTotal(db: Db, orgId: string): Promise<number> {
  const { _sum } = await db.creditHold.aggregate({
    where: { orgId, status: 'ACTIVE' },
    _sum: { amount: true },
  });
  return _sum.amount ?? 0;
}

/** What the org can actually spend right now = balance − active holds. */
export async function getAvailableCredits(db: Db, orgId: string): Promise<number> {
  const [balance, held] = await Promise.all([getBalance(db, orgId), getActiveHoldTotal(db, orgId)]);
  return balance - held;
}

/** Add credits (plan renewal, referral reward, admin grant) as a GRANT entry. */
export async function grantCredits(
  db: Db,
  orgId: string,
  amount: number,
  description: string,
  expiresAt?: Date,
): Promise<void> {
  await db.creditLedgerEntry.create({
    data: { orgId, type: 'GRANT', amount, description, expiresAt },
  });
}

/**
 * Reserve credits before starting work. Fails closed: if available < amount we
 * throw and no hold is created. Runs Serializable so the availability check and
 * the hold insert are atomic against other spenders.
 */
export async function holdCredits(
  prisma: PrismaClient,
  orgId: string,
  amount: number,
  opts: { jobId?: string } = {},
): Promise<{ holdId: string }> {
  return prisma.$transaction(
    async (tx) => {
      const available = await getAvailableCredits(tx, orgId);
      if (available < amount) throw new InsufficientCreditsError(amount, available);
      const hold = await tx.creditHold.create({
        data: { orgId, amount, status: 'ACTIVE', jobId: opts.jobId },
      });
      return { holdId: hold.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/**
 * Finalize a successful job: close the hold and write the actual DEBIT. The
 * final cost may differ from the reserved amount (e.g. true video duration);
 * we charge the real cost, linked to the job for a full audit trail.
 */
export async function captureHold(
  prisma: PrismaClient,
  holdId: string,
  finalAmount: number,
  opts: { jobId?: string; description?: string } = {},
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const hold = await tx.creditHold.findUnique({ where: { id: holdId } });
    if (!hold || hold.status !== 'ACTIVE') return; // idempotent: already settled
    await tx.creditHold.update({
      where: { id: holdId },
      data: { status: 'CAPTURED', settledAt: new Date() },
    });
    await tx.creditLedgerEntry.create({
      data: {
        orgId: hold.orgId,
        type: 'DEBIT',
        amount: -Math.abs(finalAmount),
        jobId: opts.jobId ?? hold.jobId,
        description: opts.description ?? 'AI job',
      },
    });
  });
}

/** Cancel a hold with no charge (job failed/canceled). Idempotent. */
export async function releaseHold(prisma: PrismaClient, holdId: string): Promise<void> {
  await prisma.creditHold.updateMany({
    where: { id: holdId, status: 'ACTIVE' },
    data: { status: 'RELEASED', settledAt: new Date() },
  });
}

/**
 * Worker conveniences: settle by jobId (the worker knows the job, not the hold).
 * One ACTIVE hold exists per job (CreditHold.jobId is unique).
 */
export async function captureHoldByJob(
  prisma: PrismaClient,
  jobId: string,
  finalAmount: number,
  description?: string,
): Promise<void> {
  const hold = await prisma.creditHold.findUnique({ where: { jobId } });
  if (hold) await captureHold(prisma, hold.id, finalAmount, { jobId, description });
}

export async function releaseHoldByJob(prisma: PrismaClient, jobId: string): Promise<void> {
  const hold = await prisma.creditHold.findUnique({ where: { jobId } });
  if (hold) await releaseHold(prisma, hold.id);
}
