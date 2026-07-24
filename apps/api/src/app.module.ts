/**
 * Root module — the composition root of the API.
 *
 * Phase 4 wires the cross-cutting infrastructure (validated config, Prisma,
 * mail, rate limiting) and the AuthModule, which installs the global auth +
 * roles guards. Feature modules (projects, ai, video, billing, admin) land in
 * Phases 5–8.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { APP_FILTER } from '@nestjs/core';
import { validateEnv } from './common/config/env.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { MailModule } from './common/mail/mail.module.js';
import { QueueModule } from './common/queue/queue.module.js';
import { OrgModule } from './common/org/org.module.js';
import { InsufficientCreditsFilter } from './common/filters/insufficient-credits.filter.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CreditsModule } from './modules/credits/credits.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { VideoModule } from './modules/video/video.module.js';
import { ProjectsModule } from './modules/projects/projects.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

@Module({
  imports: [
    // Validate env on boot — fail fast rather than misbehave at runtime.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Global default rate limit; sensitive routes tighten it with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    MailModule,
    QueueModule,
    OrgModule,
    HealthModule,
    AuthModule,
    CreditsModule,
    JobsModule,
    AiModule,
    VideoModule,
    ProjectsModule,
    BillingModule,
    AdminModule,
    // --- Added in later phases ---
    // NotificationsModule
  ],
  providers: [
    // Apply the rate limiter globally (per-route overrides via @Throttle).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Map domain InsufficientCreditsError → HTTP 402 for the whole API.
    { provide: APP_FILTER, useClass: InsufficientCreditsFilter },
  ],
})
export class AppModule {}
