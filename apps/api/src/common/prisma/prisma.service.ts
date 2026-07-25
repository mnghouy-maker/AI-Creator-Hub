/**
 * Makes the shared PrismaClient (@hub/db singleton) injectable via Nest DI.
 *
 * Why wrap it: services depend on an interface Nest can provide and tests can
 * swap, rather than importing a module-level global directly. The underlying
 * client is still the single pooled instance from @hub/db.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { prisma, type PrismaClient } from '@hub/db';

@Injectable()
export class PrismaService implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  /** The shared, pooled client. Explicitly typed for cross-package portability. */
  readonly client: PrismaClient = prisma;

  async onModuleInit() {
    // Warm the pool, but do NOT let a transient connect failure crash boot: on a
    // freshly provisioned managed DB the first connect can flake, and killing the
    // process turns that into a failed deploy. Prisma connects lazily on the
    // first query anyway, and the liveness probe does no DB work — so log and
    // carry on rather than exit.
    try {
      await this.client.$connect();
    } catch (err) {
      this.logger.warn(
        `Initial database connect failed; will connect lazily on first query. ${String(err)}`,
      );
    }
  }
}
