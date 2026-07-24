/**
 * Global-role guard for admin surfaces. Runs after AuthGuard, so `req.user` is
 * already a verified Principal. Enforces @Roles('admin' | 'superadmin') on the
 * admin panel routes (Phase 8). Absence of @Roles means "any authenticated user".
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@hub/db';
import { ROLES_KEY } from '../decorators.js';
import type { Principal } from '../auth.types.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest().user as Principal | undefined;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
