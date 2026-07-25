/** Startup tasks that run once when the API boots (PrismaModule is global, so
 *  PrismaService injects without a re-import). */
import { Module } from '@nestjs/common';
import { AdminBootstrapService } from './admin-bootstrap.service.js';

@Module({ providers: [AdminBootstrapService] })
export class BootstrapModule {}
