/**
 * Admin bootstrap. On API startup, promotes any user whose email is listed in
 * ADMIN_EMAILS (comma-separated) to SUPERADMIN. This is the deploy-friendly way
 * to grant admin without opening a psql shell against the managed database —
 * you just set an env var and redeploy.
 *
 * Safe by construction: it only ever promotes the exact emails you list, is
 * idempotent (skips users already SUPERADMIN), and never throws into boot — a
 * DB hiccup here must not take the API down.
 */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const raw = this.config.get<string>('ADMIN_EMAILS');
    if (!raw) return;

    const emails = raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0) return;

    try {
      const result = await this.prisma.client.user.updateMany({
        where: { email: { in: emails }, role: { not: 'SUPERADMIN' } },
        data: { role: 'SUPERADMIN' },
      });
      if (result.count > 0) {
        this.logger.log(`Promoted ${result.count} user(s) to SUPERADMIN via ADMIN_EMAILS.`);
      }
    } catch (err) {
      // Don't let admin promotion block or crash startup.
      this.logger.warn(`Admin bootstrap skipped: ${String(err)}`);
    }
  }
}
