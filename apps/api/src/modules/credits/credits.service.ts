/**
 * Credits service — a thin Nest wrapper over the shared ledger primitives in
 * @hub/db (the SAME code the worker uses to settle). The API's job is to REPORT
 * balances and RESERVE credits before enqueuing work; the worker CAPTURES or
 * RELEASES the hold when the job finishes.
 */
import { Injectable } from '@nestjs/common';
import { getAvailableCredits, getBalance, holdCredits, InsufficientCreditsError } from '@hub/db';
import { PrismaService } from '../../common/prisma/prisma.service.js';

export { InsufficientCreditsError };

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalances(orgId: string) {
    const [balance, available] = await Promise.all([
      getBalance(this.prisma.client, orgId),
      getAvailableCredits(this.prisma.client, orgId),
    ]);
    return { balance, available, reserved: balance - available };
  }

  /** Reserve `amount` credits; throws InsufficientCreditsError (→ 402) if short. */
  async reserve(orgId: string, amount: number) {
    return holdCredits(this.prisma.client, orgId, amount);
  }

  /** Recent ledger entries for the account/history views. */
  async ledger(orgId: string, take = 50) {
    return this.prisma.client.creditLedgerEntry.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, type: true, amount: true, description: true, createdAt: true },
    });
  }
}
