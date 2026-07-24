/**
 * Health module. Exists so load balancers, Docker, and uptime monitors have a
 * cheap liveness endpoint from the very first deploy (Architecture §7 — the app
 * is meant to be observable and horizontally scalable from day one).
 */
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';

@Module({ controllers: [HealthController] })
export class HealthModule {}
