/**
 * GET /api/health — liveness probe. Intentionally does no DB/Redis work so it
 * stays fast and green even under load; deeper readiness checks (DB, Redis, S3)
 * are added as those modules come online.
 *
 * @Public so it answers without a session — platform health checks (Render,
 * compose, k8s) hit it unauthenticated, and the global AuthGuard would otherwise
 * 401 it and mark the service unhealthy.
 */
import { Controller, Get } from '@nestjs/common';
import { Public } from '../modules/auth/decorators.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'ai-creator-hub-api',
      timestamp: new Date().toISOString(),
    };
  }
}
