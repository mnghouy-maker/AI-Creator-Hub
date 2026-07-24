/**
 * Session lifecycle — issue, verify, and revoke.
 *
 * Design (Architecture §4.6): the cookie carries a signed JWT so the common case
 * (verify a request) is a fast, stateless signature check. But the JWT embeds a
 * session id (`sid`) that maps to a Session row, so we can REVOKE individual
 * devices — a plain stateless JWT can't be revoked before it expires. A short
 * Redis cache of "sid is valid" keeps steady-state verification off the DB while
 * still honoring logout within seconds.
 *
 * The cookie is http-only + secure + sameSite=lax, so browser JS can never read
 * the token and it isn't sent on cross-site requests (CSRF mitigation).
 */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import IORedis from 'ioredis';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { randomToken } from '../../common/crypto/crypto.util.js';
import type { Principal, SessionJwtClaims } from './auth.types.js';

export const SESSION_COOKIE = 'hub_session';
const SESSION_TTL_DAYS = 30;
const CACHE_TTL_SECONDS = 60; // how long a "valid sid" stays cached in Redis

@Injectable()
export class SessionService {
  private readonly redis: IORedis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.redis = new IORedis(this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
  }

  /** Create a Session row for a user's device and return the signed cookie JWT. */
  async issue(
    userId: string,
    role: Principal['role'],
    ctx: { userAgent?: string; ip?: string } = {},
  ): Promise<string> {
    const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    const session = await this.prisma.client.session.create({
      data: {
        sessionToken: randomToken(),
        userId,
        expires,
        userAgent: ctx.userAgent,
        ip: ctx.ip,
      },
    });
    const claims: SessionJwtClaims = { sub: userId, sid: session.id, role };
    return this.jwt.signAsync(claims, { expiresIn: `${SESSION_TTL_DAYS}d` });
  }

  /** Verify a cookie token → Principal, or null if invalid/revoked/expired. */
  async verify(token: string): Promise<Principal | null> {
    let claims: SessionJwtClaims;
    try {
      claims = await this.jwt.verifyAsync<SessionJwtClaims>(token);
    } catch {
      return null; // bad signature or expired JWT
    }

    // Fast path: Redis remembers this sid is live.
    const cached = await this.redis.get(this.key(claims.sid));
    if (cached === '1') {
      return { userId: claims.sub, email: '', role: claims.role, sessionId: claims.sid };
    }

    // Slow path: confirm the session still exists and hasn't expired.
    const session = await this.prisma.client.session.findUnique({
      where: { id: claims.sid },
      include: { user: { select: { email: true, role: true } } },
    });
    if (!session || session.expires < new Date()) return null;

    await this.redis.set(this.key(claims.sid), '1', 'EX', CACHE_TTL_SECONDS);
    return {
      userId: session.userId,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id,
    };
  }

  /** Revoke one device/session (logout) and invalidate the cache immediately. */
  async revoke(sessionId: string): Promise<void> {
    await this.prisma.client.session.deleteMany({ where: { id: sessionId } });
    await this.redis.del(this.key(sessionId));
  }

  /** Revoke every session for a user (e.g. after a password reset). */
  async revokeAllForUser(userId: string): Promise<void> {
    const sessions = await this.prisma.client.session.findMany({
      where: { userId },
      select: { id: true },
    });
    await this.prisma.client.session.deleteMany({ where: { userId } });
    if (sessions.length) {
      await this.redis.del(...sessions.map((s) => this.key(s.id)));
    }
  }

  /** Attach/clear the session cookie on a response. */
  setCookie(res: Response, token: string) {
    res.cookie(SESSION_COOKIE, token, this.cookieOptions());
  }
  clearCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  private cookieOptions() {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true, // unreadable by browser JS → XSS can't steal it
      secure: isProd, // HTTPS-only in production
      sameSite: 'lax' as const, // not sent on cross-site requests → CSRF mitigation
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
      path: '/',
    };
  }

  private key(sid: string) {
    return `session:${sid}`;
  }
}
