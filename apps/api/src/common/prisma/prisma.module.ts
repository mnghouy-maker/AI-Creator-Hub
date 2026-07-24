/**
 * Global module so any feature can inject PrismaService without re-importing.
 * DB access is cross-cutting, so it lives in `common/`.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
