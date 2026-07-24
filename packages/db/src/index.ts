/**
 * Single shared PrismaClient instance.
 *
 * Why a singleton: opening a new client per import exhausts the Postgres
 * connection pool under load and in dev hot-reload. Every app imports { prisma }
 * from '@hub/db' and reuses one client. In development we cache it on
 * globalThis so Next.js / ts-node reloads don't leak connections.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export Prisma's generated types so apps import everything DB-related from
// one place: `import { prisma, Prisma } from '@hub/db'`.
export * from '@prisma/client';
