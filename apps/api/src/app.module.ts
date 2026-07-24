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
import { validateEnv } from './common/config/env.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { MailModule } from './common/mail/mail.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    // Validate env on boot — fail fast rather than misbehave at runtime.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Global default rate limit; sensitive routes tighten it with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    MailModule,
    HealthModule,
    AuthModule,
    // --- Added in later phases ---
    // CreditsModule,       // Phase 6
    // ProjectsModule,      // Phase 5/6
    // AiModule,            // Phase 6
    // VideoModule,         // Phase 6
    // BillingModule,       // Phase 7
    // AdminModule,         // Phase 8
    // NotificationsModule, // Phase 5
  ],
  providers: [
    // Apply the rate limiter globally (per-route overrides via @Throttle).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
