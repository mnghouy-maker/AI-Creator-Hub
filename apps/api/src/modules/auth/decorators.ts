/**
 * Route decorators for auth.
 *
 *  - @Public()        marks a route as not requiring a session (login, register…).
 *  - @Roles(...)      restricts a route to global roles (admin panel).
 *  - @CurrentUser()   injects the verified Principal into a handler param.
 *
 * Keeping these tiny and declarative means access rules read off the controller
 * at a glance instead of being buried in method bodies.
 */
import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@hub/db';
import type { Principal } from './auth.types.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as Principal;
  },
);
