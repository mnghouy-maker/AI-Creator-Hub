/**
 * The primary authentication guard, applied GLOBALLY (see AuthModule).
 *
 * Every route is protected by default; a route must opt out with @Public().
 * "Secure by default" means a forgotten decorator fails closed (401), never
 * open — the safe direction (Architecture §6).
 *
 * Flow: read the session JWT from the http-only cookie → verify signature →
 * confirm the session still exists and isn't expired/revoked (with a short Redis
 * cache to avoid a DB hit on every request) → attach the Principal.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators.js';
import { SessionService, SESSION_COOKIE } from '../session.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const token: string | undefined = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Not authenticated');

    const principal = await this.sessions.verify(token);
    if (!principal) throw new UnauthorizedException('Session expired or revoked');

    req.user = principal; // the only trusted identity for this request
    return true;
  }
}
