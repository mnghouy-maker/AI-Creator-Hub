/**
 * Root module — the composition root of the API.
 *
 * Feature modules (auth, users, billing, projects, ai, video, credits, admin,
 * notifications) get imported here as they land in Phases 4–8. For Phase 2 we
 * wire only global config and the HealthModule, so the app boots and is
 * deployable/monitorable before any feature exists.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    // Loads .env once and makes config injectable everywhere. Validation of
    // required env vars is added alongside the modules that need them.
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
    // --- Added in later phases ---
    // AuthModule,          // Phase 4
    // UsersModule,         // Phase 4
    // CreditsModule,       // Phase 6 (spans everything billable)
    // ProjectsModule,      // Phase 5/6
    // AiModule,            // Phase 6
    // VideoModule,         // Phase 6
    // BillingModule,       // Phase 7
    // AdminModule,         // Phase 8
    // NotificationsModule, // Phase 5
  ],
})
export class AppModule {}
