/**
 * Admin API. The whole controller is gated by @Roles('ADMIN','SUPERADMIN') — the
 * global RolesGuard (Phase 4) enforces it, so a normal user hitting any route
 * here gets 403. Mutations are audited inside AdminService.
 */
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { Roles, CurrentUser } from '../auth/decorators.js';
import type { Principal } from '../auth/auth.types.js';

@Roles('ADMIN', 'SUPERADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metrics')
  metrics() {
    return this.admin.metrics();
  }

  @Get('users')
  users(@Query('q') q?: string) {
    return this.admin.listUsers(q).then((users) => ({ users }));
  }

  @Patch('users/:id/role')
  setRole(
    @CurrentUser() actor: Principal,
    @Param('id') id: string,
    @Body() body: { role: 'USER' | 'ADMIN' | 'SUPERADMIN' },
  ) {
    return this.admin.setUserRole(actor.userId, id, body.role);
  }

  @Post('users/:id/credits')
  grant(
    @CurrentUser() actor: Principal,
    @Param('id') id: string,
    @Body() body: { amount: number; reason?: string },
  ) {
    return this.admin.grantUserCredits(actor.userId, id, body.amount, body.reason ?? '');
  }

  @Get('subscriptions')
  subscriptions() {
    return this.admin.listSubscriptions().then((subscriptions) => ({ subscriptions }));
  }

  @Get('jobs')
  jobs() {
    return this.admin.recentJobs().then((jobs) => ({ jobs }));
  }

  @Get('errors')
  errors() {
    return this.admin.errorLogs().then((errors) => ({ errors }));
  }

  @Get('coupons')
  coupons() {
    return this.admin.listCoupons().then((coupons) => ({ coupons }));
  }

  @Post('coupons')
  createCoupon(
    @CurrentUser() actor: Principal,
    @Body()
    body: { code: string; percentOff?: number; amountOffCents?: number; maxRedemptions?: number },
  ) {
    return this.admin.createCoupon(actor.userId, body);
  }

  @Get('announcements')
  announcements() {
    return this.admin.listAnnouncements().then((announcements) => ({ announcements }));
  }

  @Post('announcements')
  createAnnouncement(
    @CurrentUser() actor: Principal,
    @Body() body: { title: string; body: string; level?: 'INFO' | 'WARN' | 'ERROR' },
  ) {
    return this.admin.createAnnouncement(actor.userId, body);
  }

  @Get('flags')
  flags() {
    return this.admin.listFlags().then((flags) => ({ flags }));
  }

  @Patch('flags/:key')
  setFlag(
    @CurrentUser() actor: Principal,
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.admin.setFlag(actor.userId, key, body.enabled);
  }
}
