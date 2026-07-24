/**
 * GET /api/health — liveness probe. Intentionally does no DB/Redis work so it
 * stays fast and green even under load; deeper readiness checks (DB, Redis, S3)
 * are added as those modules come online.
 */
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'ai-creator-hub-api',
      timestamp: new Date().toISOString(),
    };
  }
}
