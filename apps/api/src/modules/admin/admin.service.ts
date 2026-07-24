/**
 * Admin operations — the data behind the admin panel. Every mutating action
 * (credit grants, role changes, flag toggles) writes an AuditLog entry, so
 * privileged actions are always traceable (Architecture §6). Read methods power
 * the revenue/usage dashboards; MRR is derived from active paid subscriptions ×
 * the plan prices in @hub/shared, so it can't drift from what we charge.
 */
import { Injectable } from '@nestjs/common';
import { grantCredits } from '@hub/db';
import type { Prisma } from '@hub/db';
import { PLANS, type PlanId } from '@hub/shared';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Revenue / usage overview -------------------------------------------
  async metrics() {
    const db = this.prisma.client;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalUsers, newUsersToday, paidSubs, revenue, jobStatuses] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { createdAt: { gte: startOfToday } } }),
      db.subscription.groupBy({
        by: ['plan'],
        where: { status: { in: ['ACTIVE', 'TRIALING'] } },
        _count: { _all: true },
      }),
      db.invoice.aggregate({ where: { status: 'PAID' }, _sum: { amountCents: true } }),
      db.job.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    // MRR from active paid subscriptions × monthly price.
    let mrrCents = 0;
    const planCounts: Record<string, number> = {};
    for (const row of paidSubs) {
      const planId = row.plan.toLowerCase() as PlanId;
      planCounts[planId] = row._count._all;
      mrrCents += (PLANS[planId]?.priceMonthly ?? 0) * 100 * row._count._all;
    }
    const jobs: Record<string, number> = {};
    for (const j of jobStatuses) jobs[j.status] = j._count._all;

    return {
      totalUsers,
      newUsersToday,
      activePaidSubs: Object.entries(planCounts)
        .filter(([p]) => p !== 'free')
        .reduce((n, [, c]) => n + c, 0),
      planCounts,
      mrrCents,
      lifetimeRevenueCents: revenue._sum.amountCents ?? 0,
      jobs,
    };
  }

  // ---- Users ---------------------------------------------------------------
  async listUsers(query?: string, take = 50) {
    const where: Prisma.UserWhereInput = query
      ? {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.client.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        emailVerified: true,
      },
    });
  }

  async setUserRole(actorId: string, userId: string, role: 'USER' | 'ADMIN' | 'SUPERADMIN') {
    const user = await this.prisma.client.user.update({ where: { id: userId }, data: { role } });
    await this.audit(actorId, 'user.role.set', 'user', userId, { role });
    return { id: user.id, role: user.role };
  }

  /** Grant credits to a user's personal org (admin gift / support). Audited. */
  async grantUserCredits(actorId: string, userId: string, amount: number, reason: string) {
    const org = await this.prisma.client.organization.findFirst({
      where: { ownerId: userId, isPersonal: true },
      select: { id: true },
    });
    if (!org) return { ok: false };
    await grantCredits(this.prisma.client, org.id, amount, reason || 'Admin grant');
    await this.audit(actorId, 'credits.grant', 'org', org.id, { amount, reason });
    return { ok: true };
  }

  // ---- Subscriptions -------------------------------------------------------
  async listSubscriptions(take = 50) {
    return this.prisma.client.subscription.findMany({
      where: { plan: { not: 'FREE' } },
      orderBy: { updatedAt: 'desc' },
      take,
      select: {
        id: true,
        plan: true,
        status: true,
        interval: true,
        currentPeriodEnd: true,
        org: { select: { name: true, owner: { select: { email: true } } } },
      },
    });
  }

  // ---- Processing queue + error logs --------------------------------------
  async recentJobs(take = 30) {
    return this.prisma.client.job.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        action: true,
        status: true,
        progress: true,
        error: true,
        createdAt: true,
      },
    });
  }

  async errorLogs(take = 50) {
    return this.prisma.client.errorLog.findMany({ orderBy: { createdAt: 'desc' }, take });
  }

  // ---- Coupons -------------------------------------------------------------
  async listCoupons() {
    return this.prisma.client.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }
  async createCoupon(
    actorId: string,
    data: { code: string; percentOff?: number; amountOffCents?: number; maxRedemptions?: number },
  ) {
    const coupon = await this.prisma.client.coupon.create({ data });
    await this.audit(actorId, 'coupon.create', 'coupon', coupon.id, data);
    return coupon;
  }

  // ---- Announcements -------------------------------------------------------
  async listAnnouncements() {
    return this.prisma.client.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  }
  async createAnnouncement(
    actorId: string,
    data: { title: string; body: string; level?: 'INFO' | 'WARN' | 'ERROR' },
  ) {
    const a = await this.prisma.client.announcement.create({
      data: { title: data.title, body: data.body, level: data.level ?? 'INFO' },
    });
    await this.audit(actorId, 'announcement.create', 'announcement', a.id, {});
    return a;
  }

  // ---- Feature flags + settings -------------------------------------------
  async listFlags() {
    return this.prisma.client.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }
  async setFlag(actorId: string, key: string, enabled: boolean) {
    const flag = await this.prisma.client.featureFlag.upsert({
      where: { key },
      update: { enabled },
      create: { key, enabled },
    });
    await this.audit(actorId, 'flag.set', 'flag', key, { enabled });
    return flag;
  }

  async getSetting(key: string) {
    return this.prisma.client.systemSetting.findUnique({ where: { key } });
  }
  async setSetting(actorId: string, key: string, value: Prisma.InputJsonValue) {
    const setting = await this.prisma.client.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    await this.audit(actorId, 'setting.set', 'setting', key, {});
    return setting;
  }

  // ---- shared audit helper -------------------------------------------------
  private async audit(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Prisma.InputJsonValue,
  ) {
    await this.prisma.client.auditLog.create({
      data: { actorId, action, targetType, targetId, metadata },
    });
  }
}
