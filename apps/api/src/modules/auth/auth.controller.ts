/**
 * HTTP surface for authentication.
 *
 * Notes on the shape:
 *  - Auth-state changes set/clear the session COOKIE server-side; the browser
 *    never handles the token directly.
 *  - Public endpoints are marked @Public() so the global AuthGuard lets them
 *    through; everything else requires a session.
 *  - Sensitive endpoints are rate-limited (@Throttle) to blunt brute force /
 *    enumeration (Architecture §6).
 *  - OAuth uses Passport guards; the callback converts the provider identity
 *    into OUR session and redirects back to the app.
 */
import { Body, Controller, Delete, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe.js';
import { Public, CurrentUser } from './decorators.js';
import type { Principal } from './auth.types.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  twoFactorLoginSchema,
  twoFactorCodeSchema,
  type RegisterDto,
  type LoginDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  type VerifyEmailDto,
  type TwoFactorLoginDto,
  type TwoFactorCodeDto,
} from './auth.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Registration & login ------------------------------------------------

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto);
    if (result.kind === '2fa_required') {
      return { twoFactorRequired: true, ticket: result.ticket };
    }
    await this.startSession(res, req, result.userId, result.role);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('2fa/login')
  async twoFactorLogin(
    @Body(new ZodValidationPipe(twoFactorLoginSchema)) dto: TwoFactorLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, role } = await this.auth.verifyTwoFactorLogin(dto.ticket, dto.code);
    await this.startSession(res, req, userId, role);
    return { ok: true };
  }

  @Post('logout')
  async logout(@CurrentUser() user: Principal, @Res({ passthrough: true }) res: Response) {
    await this.sessions.revoke(user.sessionId);
    this.sessions.clearCookie(res);
    return { ok: true };
  }

  // ---- Current user & session (device) management --------------------------

  @Get('me')
  async me(@CurrentUser() user: Principal) {
    const profile = await this.prisma.client.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        referralCode: true,
      },
    });
    return { user: profile };
  }

  @Get('sessions')
  async listSessions(@CurrentUser() user: Principal) {
    const sessions = await this.prisma.client.session.findMany({
      where: { userId: user.userId },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expires: true },
      orderBy: { createdAt: 'desc' },
    });
    // Flag which row is the caller's current device.
    return { sessions: sessions.map((s) => ({ ...s, current: s.id === user.sessionId })) };
  }

  @Delete('sessions/:id')
  async revokeSession(@CurrentUser() user: Principal, @Param('id') id: string) {
    // Only allow revoking one's own sessions.
    const owned = await this.prisma.client.session.findFirst({
      where: { id, userId: user.userId },
      select: { id: true },
    });
    if (owned) await this.sessions.revoke(id);
    return { ok: true };
  }

  // ---- Email verification --------------------------------------------------

  @Public()
  @Post('verify-email')
  async verifyEmail(@Body(new ZodValidationPipe(verifyEmailSchema)) dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto.token);
  }

  // ---- Password reset ------------------------------------------------------

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto) {
    const { userId } = await this.auth.resetPassword(dto.token, dto.password);
    // Force re-login on every device after a reset.
    await this.sessions.revokeAllForUser(userId);
    return { ok: true };
  }

  // ---- 2FA enrollment ------------------------------------------------------

  @Post('2fa/setup')
  async setup2fa(@CurrentUser() user: Principal) {
    return this.auth.beginTwoFactorSetup(user.userId, user.email);
  }

  @Post('2fa/confirm')
  async confirm2fa(
    @CurrentUser() user: Principal,
    @Body(new ZodValidationPipe(twoFactorCodeSchema)) dto: TwoFactorCodeDto,
  ) {
    return this.auth.confirmTwoFactor(user.userId, dto.code);
  }

  @Post('2fa/disable')
  async disable2fa(
    @CurrentUser() user: Principal,
    @Body(new ZodValidationPipe(twoFactorCodeSchema)) dto: TwoFactorCodeDto,
  ) {
    return this.auth.disableTwoFactor(user.userId, dto.code);
  }

  // ---- OAuth: Google -------------------------------------------------------

  @Public()
  @Get('google')
  @UseGuards(PassportAuthGuard('google'))
  googleStart() {
    /* Passport redirects to Google; body never runs. */
  }

  @Public()
  @Get('google/callback')
  @UseGuards(PassportAuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    await this.completeOAuth(req, res);
  }

  // ---- OAuth: GitHub -------------------------------------------------------

  @Public()
  @Get('github')
  @UseGuards(PassportAuthGuard('github'))
  githubStart() {
    /* Passport redirects to GitHub. */
  }

  @Public()
  @Get('github/callback')
  @UseGuards(PassportAuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    await this.completeOAuth(req, res);
  }

  // ---- helpers -------------------------------------------------------------

  /** Issue a session + set the cookie for a freshly authenticated user. */
  private async startSession(res: Response, req: Request, userId: string, role: Principal['role']) {
    const token = await this.sessions.issue(userId, role, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.sessions.setCookie(res, token);
  }

  /** Shared OAuth callback tail: turn the passport user into our session. */
  private async completeOAuth(req: Request, res: Response) {
    const oauthUser = req.user as { userId: string; role: Principal['role'] };
    const token = await this.sessions.issue(oauthUser.userId, oauthUser.role, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    this.sessions.setCookie(res, token);
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    res.redirect(`${appUrl}/dashboard`);
  }
}
