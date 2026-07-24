/**
 * Turns "a new user exists" into "a user ready to use the product".
 *
 * Every signup path (email/password AND OAuth) funnels through here so the
 * Phase-3 invariants always hold: a user gets a PERSONAL organization, a FREE
 * subscription, and a welcome credit GRANT (as a ledger entry, never a mutable
 * balance). Doing this in ONE place means no signup path can forget a step.
 *
 * The whole thing runs in a transaction: a half-provisioned account (user but
 * no org, or org but no credits) must never exist.
 */
import { Injectable } from '@nestjs/common';
import { PLANS } from '@hub/shared';
import type { Prisma } from '@hub/db';
import { PrismaService } from '../../common/prisma/prisma.service.js';

interface NewUserInput {
  email: string;
  name?: string | null;
  image?: string | null;
  passwordHash?: string | null;
  emailVerified?: Date | null;
  referredById?: string | null;
}

@Injectable()
export class ProvisioningService {
  constructor(private readonly prisma: PrismaService) {}

  async createUserWithWorkspace(input: NewUserInput) {
    return this.prisma.client.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name ?? null,
          image: input.image ?? null,
          passwordHash: input.passwordHash ?? null,
          emailVerified: input.emailVerified ?? null,
          referredById: input.referredById ?? null,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: input.name || input.email.split('@')[0] || 'My workspace',
          // Personal-org slug is derived from the user id → always unique.
          slug: `personal-${user.id}`,
          isPersonal: true,
          ownerId: user.id,
          members: { create: { userId: user.id, role: 'OWNER' } },
          subscription: { create: { plan: 'FREE', status: 'ACTIVE' } },
        },
      });

      // Welcome credits as an append-only GRANT (Architecture §4.3).
      await tx.creditLedgerEntry.create({
        data: {
          orgId: org.id,
          type: 'GRANT',
          amount: PLANS.free.monthlyCredits,
          description: 'Welcome grant (Free plan)',
        },
      });

      // If this signup came from a referral, record it as PENDING. The reward
      // grant to the referrer happens on conversion (Phase 7 billing hook).
      if (input.referredById) {
        await this.recordReferral(tx, input.referredById, user.id);
      }

      return { user, org };
    });
  }

  private async recordReferral(
    tx: Prisma.TransactionClient,
    referrerId: string,
    referredId: string,
  ) {
    await tx.referral.create({
      data: { referrerId, referredId, code: `ref_${referrerId}`, status: 'PENDING' },
    });
  }
}
