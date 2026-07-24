/**
 * Makes the shared PrismaClient (@hub/db singleton) injectable via Nest DI.
 *
 * Why wrap it: services depend on an interface Nest can provide and tests can
 * swap, rather than importing a module-level global directly. The underlying
 * client is still the single pooled instance from @hub/db.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { prisma, type PrismaClient } from '@hub/db';

@Injectable()
export class PrismaService implements OnModuleInit {
  /** The shared, pooled client. Explicitly typed for cross-package portability. */
  readonly client: PrismaClient = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }
}
